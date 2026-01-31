import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getTimeframeRange, getPreviousPeriod, calculateDelta } from '@/lib/analytics/timeframe';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * GET /api/admin/analytics/trials-expired
 * 
 * Returns count of trials that expired without converting in the selected timeframe.
 * This counts businesses that were created as trials and are now canceled/expired.
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

        // Count businesses that were created as trials and are now canceled
        // (created before end of period, status is now canceled/past_due)
        let query = supabase
            .from('businesses')
            .select('*', { count: 'exact', head: true })
            .lte('created_at', range.end.toISOString())
            .in('subscription_status', ['canceled', 'past_due', 'incomplete_expired']);

        if (excludeBusinessIds.length > 0) {
            query = query.not('id', 'in', `(${excludeBusinessIds.join(',')})`);
        }

        const { count: expiredTrials } = await query;

        const result: any = {
            value: expiredTrials || 0
        };

        if (compare) {
            const previousRange = getPreviousPeriod(range.start, range.end);

            let prevQuery = supabase
                .from('businesses')
                .select('*', { count: 'exact', head: true })
                .lte('created_at', previousRange.end.toISOString())
                .in('subscription_status', ['canceled', 'past_due', 'incomplete_expired']);

            if (excludeBusinessIds.length > 0) {
                prevQuery = prevQuery.not('id', 'in', `(${excludeBusinessIds.join(',')})`);
            }

            const { count: prevExpiredTrials } = await prevQuery;
            const { delta, deltaPercent } = calculateDelta(expiredTrials || 0, prevExpiredTrials || 0);

            result.previousValue = prevExpiredTrials || 0;
            result.delta = delta;
            result.deltaPercent = deltaPercent;
        }

        return NextResponse.json(result);

    } catch (error: any) {
        console.error('[Analytics Trials Expired] Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch trials expired', details: error.message },
            { status: 500 }
        );
    }
}
