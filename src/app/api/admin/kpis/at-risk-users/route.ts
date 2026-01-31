import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * GET /api/admin/kpis/at-risk-users
 * 
 * Returns count of users at risk of churning:
 * - Trial ends in ≤ 3 days
 * - Last Stripe payment failed
 * - Subscription set to cancel_at_period_end
 * 
 * Note: This endpoint relies on the /admin layout for authentication.
 */
export async function GET() {
    try {
        const threeDaysFromNow = Math.floor(Date.now() / 1000) + (3 * 24 * 60 * 60);
        const now = Math.floor(Date.now() / 1000);
        const sevenDaysAgo = now - (7 * 24 * 60 * 60);

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Get dismissed business IDs
        const { data: dismissals } = await supabase
            .from('at_risk_dismissals')
            .select('business_id');

        const dismissedBusinessIds = dismissals?.map(d => d.business_id) || [];

        let atRiskCount = 0;
        const atRiskBusinessIds = new Set<string>();

        // Get all active and trialing subscriptions
        const allSubscriptions = await stripe.subscriptions.list({
            status: 'all',
            limit: 100,
        });

        let trialEnding = 0;
        let cancelScheduled = 0;
        const atRiskCustomerIds = new Set<string>();

        for (const sub of allSubscriptions.data) {
            // Trial ending soon
            if (sub.trial_end && sub.trial_end > now && sub.trial_end <= threeDaysFromNow) {
                trialEnding++;
                atRiskCustomerIds.add(sub.customer as string);
            }

            // Subscription set to cancel
            if (sub.cancel_at_period_end) {
                cancelScheduled++;
                atRiskCustomerIds.add(sub.customer as string);
            }
        }

        // Get failed invoices in last 7 days
        const failedInvoices = await stripe.invoices.list({
            status: 'open',
            created: { gte: sevenDaysAgo },
            limit: 100,
        });

        let paymentFailed = 0;
        for (const invoice of failedInvoices.data) {
            if (invoice.attempt_count > 0 && invoice.customer) {
                paymentFailed++;
                atRiskCustomerIds.add(invoice.customer as string);
            }
        }

        // Map Stripe customer IDs to business IDs and exclude dismissed ones
        for (const customerId of atRiskCustomerIds) {
            const { data: business } = await supabase
                .from('businesses')
                .select('id')
                .eq('stripe_customer_id', customerId)
                .single();

            if (business && !dismissedBusinessIds.includes(business.id)) {
                atRiskBusinessIds.add(business.id);
            }
        }

        return NextResponse.json({
            atRiskCount: atRiskBusinessIds.size,
            breakdown: {
                trialEnding,
                paymentFailed,
                cancelScheduled,
            }
        });

    } catch (error: any) {
        console.error('[At Risk Users KPI] Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch at-risk users', details: error.message },
            { status: 500 }
        );
    }
}
