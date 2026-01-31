import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getTimeframeRange, getPreviousPeriod, calculateDelta } from '@/lib/analytics/timeframe';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * GET /api/admin/analytics/avg-jobs-per-account
 * 
 * Returns average number of jobs per active account in the selected timeframe.
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

        // Get all jobs created in timeframe
        const { data: jobs } = await supabase
            .from('jobs')
            .select('business_id')
            .gte('created_at', range.start.toISOString())
            .lte('created_at', range.end.toISOString());

        // Filter out admin businesses
        const filteredJobs = jobs?.filter(j => !excludeBusinessIds.includes(j.business_id)) || [];

        // Count unique businesses
        const uniqueBusinesses = new Set(filteredJobs.map(j => j.business_id));
        const activeAccounts = uniqueBusinesses.size;

        const avgJobsPerAccount = activeAccounts > 0 ? filteredJobs.length / activeAccounts : 0;

        const result: any = {
            value: Math.round(avgJobsPerAccount * 10) / 10
        };

        if (compare) {
            const previousRange = getPreviousPeriod(range.start, range.end);

            const { data: prevJobs } = await supabase
                .from('jobs')
                .select('business_id')
                .gte('created_at', previousRange.start.toISOString())
                .lte('created_at', previousRange.end.toISOString());

            const filteredPrevJobs = prevJobs?.filter(j => !excludeBusinessIds.includes(j.business_id)) || [];
            const prevUniqueBusinesses = new Set(filteredPrevJobs.map(j => j.business_id));
            const prevActiveAccounts = prevUniqueBusinesses.size;

            const prevAvgJobsPerAccount = prevActiveAccounts > 0 ? filteredPrevJobs.length / prevActiveAccounts : 0;
            const { delta, deltaPercent } = calculateDelta(avgJobsPerAccount, prevAvgJobsPerAccount);

            result.previousValue = Math.round(prevAvgJobsPerAccount * 10) / 10;
            result.delta = delta;
            result.deltaPercent = deltaPercent;
        }

        return NextResponse.json(result);

    } catch (error: any) {
        console.error('[Analytics Avg Jobs Per Account] Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch avg jobs per account', details: error.message },
            { status: 500 }
        );
    }
}
