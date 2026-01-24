import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { addDays, subDays } from 'date-fns';

export async function POST(req: Request) {
    // Only allow in development or if a secret header is present if we were stricter
    if (process.env.NODE_ENV === 'production') {
        // return new NextResponse('Not available in production', { status: 403 });
    }

    const { action } = await req.json(); // action: 'expire_now' | 'warn_now' | 'reset'

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return new NextResponse('Unauthorized', { status: 401 });

    let trialEndDate = new Date(); // Default to now

    if (action === 'expire_now') {
        // Set end date to yesterday
        trialEndDate = subDays(new Date(), 1);
    } else if (action === 'warn_now') {
        // Set end date to 2 days from now
        trialEndDate = addDays(new Date(), 2);
    } else if (action === 'reset') {
        // Set end date to 14 days from now
        trialEndDate = addDays(new Date(), 14);
    }

    const { error } = await supabase
        .from('businesses')
        .update({
            // Ensure status is trial
            subscription_status: 'trial',
            trial_end_date: trialEndDate.toISOString(),
            updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

    // Note: We are assuming 'default' works for the single user model or RLS is set up.

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: `Trial updated to ${action}`, date: trialEndDate });
}
