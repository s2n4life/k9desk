import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getTimeframeRange, getPreviousPeriod, toUnixTimestamp, calculateDelta } from '@/lib/analytics/timeframe';

/**
 * GET /api/admin/analytics/net-new-mrr
 * 
 * Returns Net New MRR (New + Expansion - Churned) for the selected timeframe.
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

        // Get new subscriptions in period
        const newSubscriptions = await stripe.subscriptions.list({
            created: { gte: startTimestamp, lte: endTimestamp },
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

        // Expansion MRR = 0 for v1
        const expansionMrr = 0;

        const netNewMrr = newMrr + expansionMrr - churnedMrr;

        const result: any = {
            value: Math.round(netNewMrr * 100) / 100
        };

        if (compare) {
            const previousRange = getPreviousPeriod(range.start, range.end);
            const prevStartTimestamp = toUnixTimestamp(previousRange.start);
            const prevEndTimestamp = toUnixTimestamp(previousRange.end);

            // Calculate previous period net new MRR
            const prevNewSubs = await stripe.subscriptions.list({
                created: { gte: prevStartTimestamp, lte: prevEndTimestamp },
                limit: 100,
            });

            let prevNewMrr = 0;
            for (const sub of prevNewSubs.data) {
                for (const item of sub.items.data) {
                    const price = item.price;
                    let monthlyAmount = 0;

                    if (price.recurring?.interval === 'month') {
                        monthlyAmount = (price.unit_amount || 0) / 100;
                    } else if (price.recurring?.interval === 'year') {
                        monthlyAmount = (price.unit_amount || 0) / 100 / 12;
                    }

                    prevNewMrr += monthlyAmount * (item.quantity || 1);
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

            const prevNetNewMrr = prevNewMrr - prevChurnedMrr;
            const { delta, deltaPercent } = calculateDelta(netNewMrr, prevNetNewMrr);

            result.previousValue = Math.round(prevNetNewMrr * 100) / 100;
            result.delta = delta;
            result.deltaPercent = deltaPercent;
        }

        return NextResponse.json(result);

    } catch (error: any) {
        console.error('[Analytics Net New MRR] Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch Net New MRR', details: error.message },
            { status: 500 }
        );
    }
}
