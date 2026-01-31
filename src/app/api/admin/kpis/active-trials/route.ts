import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * GET /api/admin/kpis/active-trials
 * 
 * Returns count of businesses currently in trial period
 * and the change vs 30 days ago.
 * 
 * Excludes businesses owned by the admin user (2e64c118-acfd-4f65-8255-101635869a7f).
 * 
 * Note: This endpoint relies on the /admin layout for authentication.
 */
export async function GET() {
    try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Admin user ID to exclude
        const ADMIN_USER_ID = '2e64c118-acfd-4f65-8255-101635869a7f';

        // Get businesses owned by admin to exclude
        const { data: adminBusinesses } = await supabase
            .from('profiles')
            .select('business_id')
            .eq('id', ADMIN_USER_ID);

        const excludeBusinessIds = adminBusinesses?.map(p => p.business_id).filter(Boolean) || [];

        // Get current active trials (excluding admin's businesses)
        let query = supabase
            .from('businesses')
            .select('*', { count: 'exact', head: true })
            .eq('subscription_status', 'trialing');

        if (excludeBusinessIds.length > 0) {
            query = query.not('id', 'in', `(${excludeBusinessIds.join(',')})`);
        }

        const { count: currentCount, error: currentError } = await query;

        if (currentError) {
            throw currentError;
        }

        const activeTrials = currentCount || 0;
        const change = 0; // TODO: Implement historical tracking

        return NextResponse.json({
            activeTrials,
            change,
        });

    } catch (error: any) {
        console.error('[Active Trials KPI] Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch active trials', details: error.message },
            { status: 500 }
        );
    }
}
