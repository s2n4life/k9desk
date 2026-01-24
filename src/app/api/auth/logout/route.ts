import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function POST() {
    const supabase = await createClient();

    // 1. Sign out from Supabase (clears server-side cookies)
    await supabase.auth.signOut();

    // 2. Return success
    return NextResponse.json({ success: true });
}
