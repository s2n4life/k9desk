import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getTimeframeRange, getPreviousPeriod, toUnixTimestamp, calculateDelta } from '@/lib/analytics/timeframe';

/**
 * GET /api/admin/analytics/new-customers
 * 
 * Returns count of new customers (subscriptions created) in the selected timeframe.
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

        // Get new subscriptions created in period
        const newSubscriptions = await stripe.subscriptions.list({
            created: { gte: startTimestamp, lte: endTimestamp },
            limit: 100,
        });

        const newCustomerCount = newSubscriptions.data.length;

        const result: any = {
            value: newCustomerCount
        };

        if (compare) {
            const previousRange = getPreviousPeriod(range.start, range.end);
            const prevStartTimestamp = toUnixTimestamp(previousRange.start);
            const prevEndTimestamp = toUnixTimestamp(previousRange.end);

            const prevNewSubscriptions = await stripe.subscriptions.list({
                created: { gte: prevStartTimestamp, lte: prevEndTimestamp },
                limit: 100,
            });

            const prevNewCustomerCount = prevNewSubscriptions.data.length;
            const { delta, deltaPercent } = calculateDelta(newCustomerCount, prevNewCustomerCount);

            result.previousValue = prevNewCustomerCount;
            result.delta = delta;
            result.deltaPercent = deltaPercent;
        }

        return NextResponse.json(result);

    } catch (error: any) {
        console.error('[Analytics New Customers] Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch new customers', details: error.message },
            { status: 500 }
        );
    }
}
