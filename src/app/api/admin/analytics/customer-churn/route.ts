import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getTimeframeRange, getPreviousPeriod, toUnixTimestamp, calculateDelta } from '@/lib/analytics/timeframe';

/**
 * GET /api/admin/analytics/customer-churn
 * 
 * Returns Customer Churn % for the selected timeframe.
 * Customer Churn % = (Canceled Customers / Starting Customers) * 100
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

        // Get active customers at start of period
        const startSubscriptions = await stripe.subscriptions.list({
            status: 'active',
            created: { lte: startTimestamp },
            limit: 100,
        });

        const startingCustomers = startSubscriptions.data.length;

        // Get canceled subscriptions in period
        const canceledSubscriptions = await stripe.subscriptions.list({
            status: 'canceled',
            limit: 100,
        });

        let churnedCustomers = 0;
        for (const sub of canceledSubscriptions.data) {
            if (sub.canceled_at && sub.canceled_at >= startTimestamp && sub.canceled_at <= endTimestamp) {
                churnedCustomers++;
            }
        }

        const customerChurnPercent = startingCustomers > 0 ? (churnedCustomers / startingCustomers) * 100 : 0;

        const result: any = {
            value: Math.round(customerChurnPercent * 10) / 10
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

            const prevStartingCustomers = prevStartSubs.data.length;

            let prevChurnedCustomers = 0;
            for (const sub of canceledSubscriptions.data) {
                if (sub.canceled_at && sub.canceled_at >= prevStartTimestamp && sub.canceled_at <= prevEndTimestamp) {
                    prevChurnedCustomers++;
                }
            }

            const prevCustomerChurnPercent = prevStartingCustomers > 0 ? (prevChurnedCustomers / prevStartingCustomers) * 100 : 0;
            const { delta, deltaPercent } = calculateDelta(customerChurnPercent, prevCustomerChurnPercent);

            result.previousValue = Math.round(prevCustomerChurnPercent * 10) / 10;
            result.delta = delta;
            result.deltaPercent = deltaPercent;
        }

        return NextResponse.json(result);

    } catch (error: any) {
        console.error('[Analytics Customer Churn] Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch customer churn', details: error.message },
            { status: 500 }
        );
    }
}
