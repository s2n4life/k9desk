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
 * Invoice payment failed, mark as past_due
 */
async function handlePaymentFailed(
    invoice: Stripe.Invoice,
    supabase: any
) {
    console.log('[WEBHOOK] Payment failed for invoice:', invoice.id);

    const { error } = await supabase
        .from('businesses')
        .update({ subscription_status: 'past_due' } as any)
        .eq('stripe_customer_id', invoice.customer as string);

    if (error) {
        console.error('[WEBHOOK] Error updating business on payment failed:', error);
        throw error;
    }

    console.log('[WEBHOOK] Successfully marked subscription as past_due');
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

            default:
                console.log('[WEBHOOK] Unhandled event type:', event.type);
        }

        return NextResponse.json({ received: true });
    } catch (error) {
        console.error('[WEBHOOK] Handler error:', error);
        return new NextResponse('Webhook Handler Error', { status: 500 });
    }
}
