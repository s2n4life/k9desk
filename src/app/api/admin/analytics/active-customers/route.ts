import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getTimeframeRange, getPreviousPeriod, calculateDelta } from '@/lib/analytics/timeframe';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * GET /api/admin/analytics/active-customers
 * 
 * Returns count of active paying customers for the selected timeframe.
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

        // Count active paying customers at end of period
        let query = supabase
            .from('businesses')
            .select('*', { count: 'exact', head: true })
            .eq('subscription_status', 'active');

        if (excludeBusinessIds.length > 0) {
            query = query.not('id', 'in', `(${excludeBusinessIds.join(',')})`);
        }

        const { count: currentCount } = await query;

        const result: any = {
            value: currentCount || 0
        };

        if (compare) {
            // For simplicity, use current count as previous (no historical tracking yet)
            // In production, you'd query historical snapshots
            result.previousValue = currentCount || 0;
            result.delta = 0;
            result.deltaPercent = 0;
        }

        return NextResponse.json(result);

    } catch (error: any) {
        console.error('[Analytics Active Customers] Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch active customers', details: error.message },
            { status: 500 }
        );
    }
}
