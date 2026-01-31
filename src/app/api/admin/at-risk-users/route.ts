import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * GET /api/admin/at-risk-users
 * 
 * Returns detailed list of at-risk users with:
 * - Business name, owner email
 * - Risk reasons (trial_ending, payment_failed, scheduled_cancel)
 * - Risk details (dates, amounts, etc.)
 * 
 * Excludes dismissed users from the at_risk_dismissals table.
 * 
 * Note: This endpoint relies on the /admin layout for authentication.
 */
export async function GET() {
    try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const threeDaysFromNow = Math.floor(Date.now() / 1000) + (3 * 24 * 60 * 60);
        const now = Math.floor(Date.now() / 1000);
        const sevenDaysAgo = now - (7 * 24 * 60 * 60);

        // Get dismissed business IDs
        const { data: dismissals } = await supabase
            .from('at_risk_dismissals')
            .select('business_id');

        const dismissedBusinessIds = dismissals?.map(d => d.business_id) || [];

        const atRiskUsers: Array<{
            businessId: string;
            businessName: string;
            ownerEmail: string;
            reasons: Array<{
                type: 'trial_ending' | 'payment_failed' | 'scheduled_cancel';
                details: string;
            }>;
        }> = [];

        // 1. Check for trials ending soon
        const { data: trialBusinesses } = await supabase
            .from('businesses')
            .select(`
                id,
                name,
                trial_end_date,
                profiles:owner_id (email)
            `)
            .eq('subscription_status', 'trialing')
            .not('trial_end_date', 'is', null);

        if (trialBusinesses) {
            for (const business of trialBusinesses) {
                if (dismissedBusinessIds.includes(business.id)) continue;

                const trialEndTimestamp = new Date(business.trial_end_date).getTime() / 1000;
                if (trialEndTimestamp <= threeDaysFromNow && trialEndTimestamp > now) {
                    const daysLeft = Math.ceil((trialEndTimestamp - now) / (24 * 60 * 60));

                    atRiskUsers.push({
                        businessId: business.id,
                        businessName: business.name,
                        ownerEmail: (business.profiles as any)?.email || 'Unknown',
                        reasons: [{
                            type: 'trial_ending',
                            details: `Trial ends in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`
                        }]
                    });
                }
            }
        }

        // 2. Check for failed payments in Stripe
        const failedInvoices = await stripe.invoices.list({
            status: 'open',
            created: { gte: sevenDaysAgo },
            limit: 100,
        });

        for (const invoice of failedInvoices.data) {
            if (!invoice.customer) continue;

            const { data: business } = await supabase
                .from('businesses')
                .select('id, name, profiles:owner_id (email)')
                .eq('stripe_customer_id', invoice.customer)
                .single();

            if (business && !dismissedBusinessIds.includes(business.id)) {
                const existing = atRiskUsers.find(u => u.businessId === business.id);
                const failedReason = {
                    type: 'payment_failed' as const,
                    details: `Payment of $${(invoice.amount_due / 100).toFixed(2)} failed`
                };

                if (existing) {
                    existing.reasons.push(failedReason);
                } else {
                    atRiskUsers.push({
                        businessId: business.id,
                        businessName: business.name,
                        ownerEmail: (business.profiles as any)?.email || 'Unknown',
                        reasons: [failedReason]
                    });
                }
            }
        }

        // 3. Check for subscriptions scheduled to cancel
        const cancelingSubscriptions = await stripe.subscriptions.list({
            status: 'active',
            limit: 100,
        });

        for (const sub of cancelingSubscriptions.data) {
            if (!sub.cancel_at_period_end) continue;

            const { data: business } = await supabase
                .from('businesses')
                .select('id, name, profiles:owner_id (email)')
                .eq('stripe_subscription_id', sub.id)
                .single();

            if (business && !dismissedBusinessIds.includes(business.id)) {
                const existing = atRiskUsers.find(u => u.businessId === business.id);
                const cancelDate = (sub as any).current_period_end
                    ? new Date((sub as any).current_period_end * 1000).toLocaleDateString()
                    : 'Unknown';
                const cancelReason = {
                    type: 'scheduled_cancel' as const,
                    details: `Cancels on ${cancelDate}`
                };

                if (existing) {
                    existing.reasons.push(cancelReason);
                } else {
                    atRiskUsers.push({
                        businessId: business.id,
                        businessName: business.name,
                        ownerEmail: (business.profiles as any)?.email || 'Unknown',
                        reasons: [cancelReason]
                    });
                }
            }
        }

        return NextResponse.json({
            users: atRiskUsers,
            total: atRiskUsers.length
        });

    } catch (error: any) {
        console.error('[At-Risk Users] Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch at-risk users', details: error.message },
            { status: 500 }
        );
    }
}
