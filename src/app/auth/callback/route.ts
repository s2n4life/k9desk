import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const next = searchParams.get('next') ?? '/reset-password'

    if (code) {
        const supabase = await createClient()
        console.log('Exchanging auth code...');
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)

        if (!error) {
            console.log('Success:', data.user?.email);
            return NextResponse.redirect(`${origin}${next}`)
        }
        console.error('Error:', error?.message);
    }

    return NextResponse.redirect(`${origin}/login?error=Could not authenticate user`)
}
