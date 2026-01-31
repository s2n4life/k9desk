import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getTimeframeRange, getPreviousPeriod, calculateDelta } from '@/lib/analytics/timeframe';

/**
 * GET /api/admin/analytics/arpu
 * 
 * Returns Average Revenue Per User (ARPU) for the selected timeframe.
 * ARPU = MRR / Active Customers
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const timeframe = searchParams.get('timeframe') || 'rolling_30';
        const customStart = searchParams.get('customStart') || undefined;
        const customEnd = searchParams.get('customEnd') || undefined;
        const compare = searchParams.get('compare') === 'true';

        const range = getTimeframeRange(timeframe as any, customStart, customEnd);
        const endTimestamp = Math.floor(range.end.getTime() / 1000);

        // Get active subscriptions at end of period
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

        const activeCustomers = subscriptions.data.length;
        const arpu = activeCustomers > 0 ? mrr / activeCustomers : 0;

        const result: any = {
            value: Math.round(arpu * 100) / 100
        };

        if (compare) {
            const previousRange = getPreviousPeriod(range.start, range.end);
            const previousEndTimestamp = Math.floor(previousRange.end.getTime() / 1000);

            const previousSubscriptions = await stripe.subscriptions.list({
                status: 'active',
                created: { lte: previousEndTimestamp },
                limit: 100,
            });

            let previousMrr = 0;
            for (const sub of previousSubscriptions.data) {
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

            const previousActiveCustomers = previousSubscriptions.data.length;
            const previousArpu = previousActiveCustomers > 0 ? previousMrr / previousActiveCustomers : 0;

            const { delta, deltaPercent } = calculateDelta(arpu, previousArpu);
            result.previousValue = Math.round(previousArpu * 100) / 100;
            result.delta = delta;
            result.deltaPercent = deltaPercent;
        }

        return NextResponse.json(result);

    } catch (error: any) {
        console.error('[Analytics ARPU] Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch ARPU', details: error.message },
            { status: 500 }
        );
    }
}
