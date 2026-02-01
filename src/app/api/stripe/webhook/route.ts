import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Disable body parsing for Stripe webhook signature verification
export const runtime = 'nodejs';

/**
 * Handle subscription deleted event
 * User canceled their subscription via Stripe Portal
 */
async function handleSubscriptionDeleted(
    subscription: Stripe.Subscription,
    supabase: any
) {
    console.log('[WEBHOOK] Subscription deleted:', subscription.id);

    const { error } = await supabase
        .from('businesses')
        .update({
            subscription_status: 'canceled',
            stripe_subscription_id: null
        } as any)
        .eq('stripe_customer_id', subscription.customer as string);

    if (error) {
        console.error('[WEBHOOK] Error updating business on subscription deleted:', error);
        throw error;
    }

    console.log('[WEBHOOK] Successfully marked subscription as canceled');
}

/**
 * Handle subscription updated event
 * Subscription status changed (active, past_due, trialing, etc.)
 */
async function handleSubscriptionUpdated(
    subscription: Stripe.Subscription,
    supabase: any
) {
    console.log('[WEBHOOK] Subscription updated:', subscription.id, 'Status:', subscription.status);

    // Map Stripe status to our schema
    let status: 'trialing' | 'active' | 'past_due' | 'canceled' = 'active';

    switch (subscription.status) {
        case 'trialing':
            status = 'trialing';
            break;
        case 'active':
            status = 'active';
            break;
        case 'past_due':
            status = 'past_due';
            break;
        case 'canceled':
        case 'unpaid':
            status = 'canceled';
            break;
        default:
            status = 'active';
    }

    const { error } = await supabase
        .from('businesses')
        .update({
            subscription_status: status,
            stripe_subscription_id: subscription.id
        } as any)
        .eq('stripe_customer_id', subscription.customer as string);

    if (error) {
        console.error('[WEBHOOK] Error updating business on subscription updated:', error);
        throw error;
    }

    console.log('[WEBHOOK] Successfully updated subscription status to:', status);
}

/**
 * Handle payment failed event
 * Invoice payment failed, mark as past_due and start grace period
 */
async function handlePaymentFailed(
    invoice: Stripe.Invoice,
    supabase: any
) {
    console.log('[WEBHOOK] Payment failed for invoice:', invoice.id);

    // Get current business state
    const { data: business } = await supabase
        .from('businesses')
        .select('id, name, payment_failed_at')
        .eq('stripe_customer_id', invoice.customer as string)
        .single();

    if (!business) {
        console.warn('[WEBHOOK] No business found for customer:', invoice.customer);
        return;
    }

    // Only set payment_failed_at if this is the FIRST failure (grace period doesn't reset)
    const updates: any = {
        subscription_status: 'past_due',
    };

    if (!business.payment_failed_at) {
        updates.payment_failed_at = new Date().toISOString();
        console.log('[WEBHOOK] Starting grace period for business:', business.id);
    } else {
        console.log('[WEBHOOK] Grace period already started, not resetting timestamp');
    }

    const { error } = await supabase
        .from('businesses')
        .update(updates)
        .eq('stripe_customer_id', invoice.customer as string);

    if (error) {
        console.error('[WEBHOOK] Error updating business on payment failed:', error);
        throw error;
    }

    console.log('[WEBHOOK] Successfully marked subscription as past_due');

    // Send immediate failure notification email (only on first failure)
    if (!business.payment_failed_at) {
        try {
            // Get owner email
            const { data: profile } = await supabase
                .from('profiles')
                .select('email')
                .eq('business_id', business.id)
                .eq('role', 'owner')
                .single();

            if (!profile?.email) {
                console.warn('[WEBHOOK] No owner email for business:', business.id);
                return;
            }

            const { Resend } = await import('resend');
            const { emailTemplates } = await import('@/lib/email-templates');

            const resend = new Resend(process.env.RESEND_API_KEY);
            const template = emailTemplates.paymentFailed(business.name || 'there');

            await resend.emails.send({
                from: 'K9Desk <support@k9desk.com>',
                to: profile.email,
                subject: template.subject,
                html: template.html,
            });

            console.log('[WEBHOOK] Payment failure notification sent to:', profile.email);
        } catch (error) {
            console.error('[WEBHOOK] Failed to send payment failure email:', error);
            // Don't throw - webhook should still succeed even if email fails
        }
    }
}

/**
 * Handle invoice paid event
 * Send payment receipt email to customer
 */
async function handleInvoicePaid(
    invoice: Stripe.Invoice,
    supabase: any
) {
    console.log('[WEBHOOK] Invoice paid:', invoice.id);

    // Get business info
    const { data: business } = await supabase
        .from('businesses')
        .select('id, name')
        .eq('stripe_customer_id', invoice.customer as string)
        .single();

    if (!business) {
        console.warn('[WEBHOOK] No business found for customer:', invoice.customer);
        return;
    }

    // Get owner email
    const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('business_id', business.id)
        .eq('role', 'owner')
        .single();

    if (!profile?.email) {
        console.warn('[WEBHOOK] No owner email for business:', business.id);
        return;
    }

    // Send receipt email
    try {
        const { Resend } = await import('resend');
        const { emailTemplates } = await import('@/lib/email-templates');

        const resend = new Resend(process.env.RESEND_API_KEY);
        const amount = (invoice.amount_paid / 100).toFixed(2);
        const date = new Date(invoice.created * 1000).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
        });

        const template = emailTemplates.paymentReceipt(
            business.name || 'there',
            amount,
            date,
            invoice.hosted_invoice_url || 'https://k9desk.com/settings'
        );

        await resend.emails.send({
            from: 'K9Desk <support@k9desk.com>',
            to: profile.email,
            subject: template.subject,
            html: template.html,
        });

        console.log('[WEBHOOK] Payment receipt sent to:', profile.email);
    } catch (error) {
        console.error('[WEBHOOK] Failed to send payment receipt:', error);
        // Don't throw - webhook should still succeed even if email fails
    }
}

/**
 * Handle payment succeeded event
 * Payment succeeded after failure, restore account and clear grace period
 */
async function handlePaymentSucceeded(
    invoice: Stripe.Invoice,
    supabase: any
) {
    console.log('[WEBHOOK] Payment succeeded for invoice:', invoice.id);

    // Get business info
    const { data: business } = await supabase
        .from('businesses')
        .select('id, name, payment_failed_at')
        .eq('stripe_customer_id', invoice.customer as string)
        .single();

    if (!business) {
        console.warn('[WEBHOOK] No business found for customer:', invoice.customer);
        return;
    }

    // Only process reactivation if there was a previous failure
    if (business.payment_failed_at) {
        console.log('[WEBHOOK] Restoring account after payment failure for business:', business.id);

        // Clear grace period tracking and restore active status
        const { error } = await supabase
            .from('businesses')
            .update({
                subscription_status: 'active',
                payment_failed_at: null,
                grace_period_day2_notified: false,
                grace_period_final_notified: false,
            } as any)
            .eq('stripe_customer_id', invoice.customer as string);

        if (error) {
            console.error('[WEBHOOK] Error restoring business after payment:', error);
            throw error;
        }

        console.log('[WEBHOOK] Successfully restored account to active');

        // Send reactivation email
        try {
            const { data: profile } = await supabase
                .from('profiles')
                .select('email')
                .eq('business_id', business.id)
                .eq('role', 'owner')
                .single();

            if (!profile?.email) {
                console.warn('[WEBHOOK] No owner email for business:', business.id);
                return;
            }

            const { Resend } = await import('resend');
            const { emailTemplates } = await import('@/lib/email-templates');

            const resend = new Resend(process.env.RESEND_API_KEY);
            const template = emailTemplates.paymentRestored(business.name || 'there');

            await resend.emails.send({
                from: 'K9Desk <support@k9desk.com>',
                to: profile.email,
                subject: template.subject,
                html: template.html,
            });

            console.log('[WEBHOOK] Payment restored notification sent to:', profile.email);
        } catch (error) {
            console.error('[WEBHOOK] Failed to send payment restored email:', error);
            // Don't throw - webhook should still succeed even if email fails
        }
    }
}

/**
 * Stripe webhook endpoint
 * Handles subscription lifecycle events
 */
export async function POST(req: Request) {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
        console.error('[WEBHOOK] No signature provided');
        return new NextResponse('No signature', { status: 400 });
    }

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(
            body,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET!
        );
    } catch (err) {
        console.error('[WEBHOOK] Signature verification failed:', err);
        return new NextResponse('Webhook Error: Invalid signature', { status: 400 });
    }

    console.log('[WEBHOOK] Received event:', event.type);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    try {
        switch (event.type) {
            case 'customer.subscription.deleted':
                await handleSubscriptionDeleted(event.data.object as Stripe.Subscription, supabase);
                break;

            case 'customer.subscription.updated':
                await handleSubscriptionUpdated(event.data.object as Stripe.Subscription, supabase);
                break;

            case 'invoice.payment_failed':
                await handlePaymentFailed(event.data.object as Stripe.Invoice, supabase);
                break;

            case 'invoice.paid':
                await handleInvoicePaid(event.data.object as Stripe.Invoice, supabase);
                await handlePaymentSucceeded(event.data.object as Stripe.Invoice, supabase);
                break;

            default:
                console.log('[WEBHOOK] Unhandled event type:', event.type);
        }

        return NextResponse.json({ received: true });
    } catch (error) {
        console.error('[WEBHOOK] Handler error:', error);
        return new NextResponse('Webhook Handler Error', { status: 500 });
    }
}
