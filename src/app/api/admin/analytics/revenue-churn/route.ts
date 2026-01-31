import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getTimeframeRange, getPreviousPeriod, calculateDelta, toUnixTimestamp } from '@/lib/analytics/timeframe';

/**
 * GET /api/admin/analytics/revenue-churn
 * 
 * Returns Revenue Churn % for the selected timeframe.
 * Revenue Churn % = (Churned MRR / Starting MRR) * 100
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const timeframe = searchParams.get('timeframe') || 'rolling_30';
        const customStart = searchParams.get('customStart') || undefined;
        const customEnd = searchParams.get('customEnd') || undefined;
        const compare = searchParams.get('compare') === 'true';

        const range = getTimeframeRange(timeframe as any, customStart, customEnd);
        const startTimestamp = toUnixTimestamp(range.start);
        const endTimestamp = toUnixTimestamp(range.end);

        // Get MRR at start of period
        const startSubscriptions = await stripe.subscriptions.list({
            status: 'active',
            created: { lte: startTimestamp },
            limit: 100,
        });

        let startMrr = 0;
        for (const sub of startSubscriptions.data) {
            for (const item of sub.items.data) {
                const price = item.price;
                let monthlyAmount = 0;

                if (price.recurring?.interval === 'month') {
                    monthlyAmount = (price.unit_amount || 0) / 100;
                } else if (price.recurring?.interval === 'year') {
                    monthlyAmount = (price.unit_amount || 0) / 100 / 12;
                }

                startMrr += monthlyAmount * (item.quantity || 1);
            }
        }

        // Get canceled subscriptions in period
        const canceledSubscriptions = await stripe.subscriptions.list({
            status: 'canceled',
            limit: 100,
        });

        let churnedMrr = 0;
        for (const sub of canceledSubscriptions.data) {
            if (sub.canceled_at && sub.canceled_at >= startTimestamp && sub.canceled_at <= endTimestamp) {
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

        const revenueChurnPercent = startMrr > 0 ? (churnedMrr / startMrr) * 100 : 0;

        const result: any = {
            value: Math.round(revenueChurnPercent * 10) / 10
        };

        if (compare) {
            const previousRange = getPreviousPeriod(range.start, range.end);
            const prevStartTimestamp = toUnixTimestamp(previousRange.start);
            const prevEndTimestamp = toUnixTimestamp(previousRange.end);

            const prevStartSubs = await stripe.subscriptions.list({
                status: 'active',
                created: { lte: prevStartTimestamp },
                limit: 100,
            });

            let prevStartMrr = 0;
            for (const sub of prevStartSubs.data) {
                for (const item of sub.items.data) {
                    const price = item.price;
                    let monthlyAmount = 0;

                    if (price.recurring?.interval === 'month') {
                        monthlyAmount = (price.unit_amount || 0) / 100;
                    } else if (price.recurring?.interval === 'year') {
                        monthlyAmount = (price.unit_amount || 0) / 100 / 12;
                    }

                    prevStartMrr += monthlyAmount * (item.quantity || 1);
                }
            }

            let prevChurnedMrr = 0;
            for (const sub of canceledSubscriptions.data) {
                if (sub.canceled_at && sub.canceled_at >= prevStartTimestamp && sub.canceled_at <= prevEndTimestamp) {
                    for (const item of sub.items.data) {
                        const price = item.price;
                        let monthlyAmount = 0;

                        if (price.recurring?.interval === 'month') {
                            monthlyAmount = (price.unit_amount || 0) / 100;
                        } else if (price.recurring?.interval === 'year') {
                            monthlyAmount = (price.unit_amount || 0) / 100 / 12;
                        }

                        prevChurnedMrr += monthlyAmount * (item.quantity || 1);
                    }
                }
            }

            const prevRevenueChurnPercent = prevStartMrr > 0 ? (prevChurnedMrr / prevStartMrr) * 100 : 0;
            const { delta, deltaPercent } = calculateDelta(revenueChurnPercent, prevRevenueChurnPercent);

            result.previousValue = Math.round(prevRevenueChurnPercent * 10) / 10;
            result.delta = delta;
            result.deltaPercent = deltaPercent;
        }

        return NextResponse.json(result);

    } catch (error: any) {
        console.error('[Analytics Revenue Churn] Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch revenue churn', details: error.message },
            { status: 500 }
        );
    }
}
