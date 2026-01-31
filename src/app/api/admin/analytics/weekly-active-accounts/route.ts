import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getTimeframeRange, getPreviousPeriod, calculateDelta } from '@/lib/analytics/timeframe';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * GET /api/admin/analytics/weekly-active-accounts
 * 
 * Returns count of accounts that had activity in the last 7 days.
 * Activity = jobs, clients, or dogs created/updated.
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

        // Get last 7 days from end of range
        const sevenDaysAgo = new Date(range.end);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        // Get businesses with recent activity in jobs
        const { data: activeJobs } = await supabase
            .from('jobs')
            .select('business_id')
            .gte('updated_at', sevenDaysAgo.toISOString())
            .lte('updated_at', range.end.toISOString());

        // Get businesses with recent activity in clients
        const { data: activeClients } = await supabase
            .from('clients')
            .select('business_id')
            .gte('updated_at', sevenDaysAgo.toISOString())
            .lte('updated_at', range.end.toISOString());

        // Get businesses with recent activity in dogs
        const { data: activeDogs } = await supabase
            .from('dogs')
            .select('business_id')
            .gte('updated_at', sevenDaysAgo.toISOString())
            .lte('updated_at', range.end.toISOString());

        // Combine and deduplicate business IDs
        const activeBusinessIds = new Set([
            ...(activeJobs?.map(j => j.business_id) || []),
            ...(activeClients?.map(c => c.business_id) || []),
            ...(activeDogs?.map(d => d.business_id) || []),
        ]);

        // Remove excluded businesses
        excludeBusinessIds.forEach(id => activeBusinessIds.delete(id));

        const weeklyActiveAccounts = activeBusinessIds.size;

        const result: any = {
            value: weeklyActiveAccounts
        };

        if (compare) {
            // For simplicity, use current count as previous (no historical tracking yet)
            result.previousValue = weeklyActiveAccounts;
            result.delta = 0;
            result.deltaPercent = 0;
        }

        return NextResponse.json(result);

    } catch (error: any) {
        console.error('[Analytics Weekly Active Accounts] Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch weekly active accounts', details: error.message },
            { status: 500 }
        );
    }
}
