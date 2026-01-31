import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getTimeframeRange, getPreviousPeriod, calculateDelta } from '@/lib/analytics/timeframe';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * GET /api/admin/analytics/payments-collected
 * 
 * Returns total payments collected in the selected timeframe.
 * Based on jobs with payment_status = 'paid'.
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const timeframe = searchParams.get('timeframe') || 'rolling_30';
        const customStart = searchParams.get('customStart') || undefined;
        const customEnd = searchParams.get('customEnd') || undefined;
        const compare = searchParams.get('compare') === 'true';

        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const range = getTimeframeRange(timeframe as any, customStart, customEnd);

        // Exclude admin's businesses
        const ADMIN_USER_ID = '2e64c118-acfd-4f65-8255-101635869a7f';
        const { data: adminBusinesses } = await supabase
            .from('profiles')
            .select('business_id')
            .eq('id', ADMIN_USER_ID);

        const excludeBusinessIds = adminBusinesses?.map(p => p.business_id).filter(Boolean) || [];

        // Get all paid jobs in timeframe
        let query = supabase
            .from('jobs')
            .select('total_price, business_id')
            .gte('created_at', range.start.toISOString())
            .lte('created_at', range.end.toISOString())
            .eq('payment_status', 'paid');

        const { data: paidJobs } = await query;

        // Filter out admin businesses and sum payments
        const filteredJobs = paidJobs?.filter(j => !excludeBusinessIds.includes(j.business_id)) || [];
        const totalPayments = filteredJobs.reduce((sum, job) => sum + (job.total_price || 0), 0);

        const result: any = {
            value: Math.round(totalPayments * 100) / 100
        };

        if (compare) {
            const previousRange = getPreviousPeriod(range.start, range.end);

            const { data: prevPaidJobs } = await supabase
                .from('jobs')
                .select('total_price, business_id')
                .gte('created_at', previousRange.start.toISOString())
                .lte('created_at', previousRange.end.toISOString())
                .eq('payment_status', 'paid');

            const filteredPrevJobs = prevPaidJobs?.filter(j => !excludeBusinessIds.includes(j.business_id)) || [];
            const prevTotalPayments = filteredPrevJobs.reduce((sum, job) => sum + (job.total_price || 0), 0);

            const { delta, deltaPercent } = calculateDelta(totalPayments, prevTotalPayments);

            result.previousValue = Math.round(prevTotalPayments * 100) / 100;
            result.delta = delta;
            result.deltaPercent = deltaPercent;
        }

        return NextResponse.json(result);

    } catch (error: any) {
        console.error('[Analytics Payments Collected] Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch payments collected', details: error.message },
            { status: 500 }
        );
    }
}
