import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getTimeframeRange, getPreviousPeriod, calculateDelta } from '@/lib/analytics/timeframe';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * GET /api/admin/analytics/trial-conversion
 * 
 * Returns Trial → Paid Conversion % for the selected timeframe.
 * Conversion % = (Trials Converted / Trials Started) * 100
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

        // Count trials that started in this period
        let trialsStartedQuery = supabase
            .from('businesses')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', range.start.toISOString())
            .lte('created_at', range.end.toISOString())
            .eq('subscription_status', 'trialing');

        if (excludeBusinessIds.length > 0) {
            trialsStartedQuery = trialsStartedQuery.not('id', 'in', `(${excludeBusinessIds.join(',')})`);
        }

        const { count: trialsStarted } = await trialsStartedQuery;

        // Count trials that converted to paid in this period
        // (businesses that were created as trials and now have active status)
        let trialsConvertedQuery = supabase
            .from('businesses')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', range.start.toISOString())
            .lte('created_at', range.end.toISOString())
            .eq('subscription_status', 'active');

        if (excludeBusinessIds.length > 0) {
            trialsConvertedQuery = trialsConvertedQuery.not('id', 'in', `(${excludeBusinessIds.join(',')})`);
        }

        const { count: trialsConverted } = await trialsConvertedQuery;

        const conversionPercent = (trialsStarted || 0) > 0 ? ((trialsConverted || 0) / (trialsStarted || 0)) * 100 : 0;

        const result: any = {
            value: Math.round(conversionPercent * 10) / 10
        };

        if (compare) {
            const previousRange = getPreviousPeriod(range.start, range.end);

            let prevTrialsStartedQuery = supabase
                .from('businesses')
                .select('*', { count: 'exact', head: true })
                .gte('created_at', previousRange.start.toISOString())
                .lte('created_at', previousRange.end.toISOString())
                .eq('subscription_status', 'trialing');

            if (excludeBusinessIds.length > 0) {
                prevTrialsStartedQuery = prevTrialsStartedQuery.not('id', 'in', `(${excludeBusinessIds.join(',')})`);
            }

            const { count: prevTrialsStarted } = await prevTrialsStartedQuery;

            let prevTrialsConvertedQuery = supabase
                .from('businesses')
                .select('*', { count: 'exact', head: true })
                .gte('created_at', previousRange.start.toISOString())
                .lte('created_at', previousRange.end.toISOString())
                .eq('subscription_status', 'active');

            if (excludeBusinessIds.length > 0) {
                prevTrialsConvertedQuery = prevTrialsConvertedQuery.not('id', 'in', `(${excludeBusinessIds.join(',')})`);
            }

            const { count: prevTrialsConverted } = await prevTrialsConvertedQuery;

            const prevConversionPercent = (prevTrialsStarted || 0) > 0 ? ((prevTrialsConverted || 0) / (prevTrialsStarted || 0)) * 100 : 0;
            const { delta, deltaPercent } = calculateDelta(conversionPercent, prevConversionPercent);

            result.previousValue = Math.round(prevConversionPercent * 10) / 10;
            result.delta = delta;
            result.deltaPercent = deltaPercent;
        }

        return NextResponse.json(result);

    } catch (error: any) {
        console.error('[Analytics Trial Conversion] Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch trial conversion', details: error.message },
            { status: 500 }
        );
    }
}
