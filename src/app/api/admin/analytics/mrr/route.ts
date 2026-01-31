import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getTimeframeRange, getPreviousPeriod, toUnixTimestamp, calculateDelta } from '@/lib/analytics/timeframe';

/**
 * GET /api/admin/analytics/mrr
 * 
 * Returns Monthly Recurring Revenue for the selected timeframe
 * with optional comparison to previous period.
 * 
 * Query params:
 * - timeframe: 'this_month' | 'last_month' | 'rolling_30' | 'rolling_60' | 'rolling_90' | 'custom'
 * - customStart: ISO date (required if timeframe=custom)
 * - customEnd: ISO date (required if timeframe=custom)
 * - compare: 'true' | 'false'
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const timeframe = searchParams.get('timeframe') || 'rolling_30';
        const customStart = searchParams.get('customStart') || undefined;
        const customEnd = searchParams.get('customEnd') || undefined;
        const compare = searchParams.get('compare') === 'true';

        // Get date range for selected timeframe
        const range = getTimeframeRange(timeframe as any, customStart, customEnd);
        const endTimestamp = toUnixTimestamp(range.end);

        // Get all active subscriptions at end of period
        const subscriptions = await stripe.subscriptions.list({
            status: 'active',
            created: { lte: endTimestamp },
            limit: 100,
        });

        // Calculate MRR
        let mrr = 0;
        for (const sub of subscriptions.data) {
            for (const item of sub.items.data) {
                const price = item.price;
                let monthlyAmount = 0;

                if (price.recurring?.interval === 'month') {
                    monthlyAmount = (price.unit_amount || 0) / 100;
                } else if (price.recurring?.interval === 'year') {
                    monthlyAmount = (price.unit_amount || 0) / 100 / 12;
                }

                mrr += monthlyAmount * (item.quantity || 1);
            }
        }

        const result: any = {
            value: Math.round(mrr * 100) / 100
        };

        // Calculate comparison if requested
        if (compare) {
            const previousRange = getPreviousPeriod(range.start, range.end);
            const previousEndTimestamp = toUnixTimestamp(previousRange.end);

            const previousSubscriptions = await stripe.subscriptions.list({
                status: 'active',
                created: { lte: previousEndTimestamp },
                limit: 100,
            });

            let previousMrr = 0;
            for (const sub of previousSubscriptions.data) {
                // Only count if it was active during the previous period
                if (sub.canceled_at && sub.canceled_at < previousEndTimestamp) {
                    continue;
                }

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

            const { delta, deltaPercent } = calculateDelta(mrr, previousMrr);
            result.previousValue = Math.round(previousMrr * 100) / 100;
            result.delta = delta;
            result.deltaPercent = deltaPercent;
        }

        return NextResponse.json(result);

    } catch (error: any) {
        console.error('[Analytics MRR] Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch MRR', details: error.message },
            { status: 500 }
        );
    }
}
