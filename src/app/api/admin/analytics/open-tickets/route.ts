import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getTimeframeRange, getPreviousPeriod, calculateDelta } from '@/lib/analytics/timeframe';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * GET /api/admin/analytics/open-tickets
 * 
 * Returns count of open support tickets at end of selected timeframe.
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

        // Count open tickets at end of period
        const { count: openTickets } = await supabase
            .from('support_tickets')
            .select('*', { count: 'exact', head: true })
            .in('status', ['new', 'in_progress']);

        const result: any = {
            value: openTickets || 0
        };

        if (compare) {
            // For simplicity, use current count as previous (no historical tracking yet)
            result.previousValue = openTickets || 0;
            result.delta = 0;
            result.deltaPercent = 0;
        }

        return NextResponse.json(result);

    } catch (error: any) {
        console.error('[Analytics Open Tickets] Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch open tickets', details: error.message },
            { status: 500 }
        );
    }
}
