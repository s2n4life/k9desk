import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * GET /api/admin/kpis/net-new-mrr
 * 
 * Returns Net New MRR over the last 30 days:
 * (New subscription MRR + Expansion MRR) - (Churned MRR)
 * 
 * Note: This endpoint relies on the /admin layout for authentication.
 */
export async function GET() {
    try {
        const thirtyDaysAgo = Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60);

        // Get new subscriptions created in last 30 days
        const newSubscriptions = await stripe.subscriptions.list({
            created: { gte: thirtyDaysAgo },
            limit: 100,
        });

        let newMrr = 0;
        for (const sub of newSubscriptions.data) {
            for (const item of sub.items.data) {
                const price = item.price;
                let monthlyAmount = 0;

                if (price.recurring?.interval === 'month') {
                    monthlyAmount = (price.unit_amount || 0) / 100;
                } else if (price.recurring?.interval === 'year') {
                    monthlyAmount = (price.unit_amount || 0) / 100 / 12;
                }

                newMrr += monthlyAmount * (item.quantity || 1);
            }
        }

        // Get canceled subscriptions in last 30 days
        const canceledSubscriptions = await stripe.subscriptions.list({
            status: 'canceled',
            limit: 100,
        });

        let churnedMrr = 0;
        for (const sub of canceledSubscriptions.data) {
            // Only count if canceled in last 30 days
            if (sub.canceled_at && sub.canceled_at >= thirtyDaysAgo) {
                for (const item of sub.items.data) {
                    const price = item.price;
                    let monthlyAmount = 0;

                    if (price.recurring?.interval === 'month') {
                        monthlyAmount = (price.unit_amount || 0) / 100;
                    } else if (price.recurring?.interval === 'year') {
                        monthlyAmount = (price.unit_amount || 0) / 100 / 12;
                    }

                    churnedMrr += monthlyAmount * (item.quantity || 1);
                }
            }
        }

        // For now, expansion MRR is 0 (would need to track subscription updates)
        const expansionMrr = 0;

        const netNewMrr = (newMrr + expansionMrr) - churnedMrr;

        return NextResponse.json({
            netNewMrr: Math.round(netNewMrr * 100) / 100,
            isPositive: netNewMrr >= 0,
            breakdown: {
                new: Math.round(newMrr * 100) / 100,
                expansion: Math.round(expansionMrr * 100) / 100,
                churned: Math.round(churnedMrr * 100) / 100,
            }
        });

    } catch (error: any) {
        console.error('[Net New MRR KPI] Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch Net New MRR', details: error.message },
            { status: 500 }
        );
    }
}
