import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * GET /api/admin/kpis/mrr
 * 
 * Returns Monthly Recurring Revenue from active Stripe subscriptions
 * and the percentage change vs the previous 30-day period.
 * 
 * Note: This endpoint relies on the /admin layout for authentication.
 */
export async function GET() {
    try {
        // Get all active subscriptions from Stripe
        const subscriptions = await stripe.subscriptions.list({
            status: 'active',
            limit: 100,
        });

        // Calculate current MRR
        let currentMrr = 0;
        for (const sub of subscriptions.data) {
            // Get the monthly value
            for (const item of sub.items.data) {
                const price = item.price;
                let monthlyAmount = 0;

                if (price.recurring?.interval === 'month') {
                    monthlyAmount = (price.unit_amount || 0) / 100;
                } else if (price.recurring?.interval === 'year') {
                    monthlyAmount = (price.unit_amount || 0) / 100 / 12;
                }

                currentMrr += monthlyAmount * (item.quantity || 1);
            }
        }

        // Get subscriptions from 30 days ago for comparison
        const thirtyDaysAgo = Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60);

        // Get all subscriptions that were active 30 days ago
        const previousSubscriptions = await stripe.subscriptions.list({
            status: 'all',
            created: { lte: thirtyDaysAgo },
            limit: 100,
        });

        let previousMrr = 0;
        for (const sub of previousSubscriptions.data) {
            // Only count if it was active 30 days ago
            const wasActive = sub.status === 'active' ||
                (sub.status === 'canceled' && sub.canceled_at && sub.canceled_at > thirtyDaysAgo);

            if (wasActive) {
                for (const item of sub.items.data) {
                    const price = item.price;
                    let monthlyAmount = 0;

                    if (price.recurring?.interval === 'month') {
                        monthlyAmount = (price.unit_amount || 0) / 100;
                    } else if (price.recurring?.interval === 'year') {
                        monthlyAmount = (price.unit_amount || 0) / 100 / 12;
                    }

                    previousMrr += monthlyAmount * (item.quantity || 1);
                }
            }
        }

        // Calculate change
        const change = currentMrr - previousMrr;
        const changePercent = previousMrr > 0 ? ((change / previousMrr) * 100) : 0;

        return NextResponse.json({
            mrr: Math.round(currentMrr * 100) / 100,
            change: Math.round(change * 100) / 100,
            changePercent: Math.round(changePercent * 10) / 10,
        });

    } catch (error: any) {
        console.error('[MRR KPI] Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch MRR', details: error.message },
            { status: 500 }
        );
    }
}
