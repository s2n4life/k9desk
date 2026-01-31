import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const supabase = await createClient();

        // Get authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get request body
        const settings = await request.json();

        // Get user's business ID from profile
        const { data: profile } = await supabase
            .from('profiles')
            .select('business_id')
            .eq('id', user.id)
            .single();

        const businessId = profile?.business_id || user.id;

        // Update businesses table directly
        const { data, error } = await supabase
            .from('businesses')
            .update({
                name: settings.businessName || settings.name,
                business_hours: settings.business_hours,
                service_area_mode: settings.service_area_mode,
                service_area_zips: settings.service_area_zips,
                schedule_start_hour: settings.schedule_start_hour,
                schedule_end_hour: settings.schedule_end_hour,
                schedule_work_days: settings.schedule_work_days,
                updated_at: new Date().toISOString()
            })
            .eq('id', businessId)
            .select()
            .single();

        if (error) {
            console.error('[Settings API] Update error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, data });

    } catch (error: any) {
        console.error('[Settings API] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
