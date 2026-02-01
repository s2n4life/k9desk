import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const token_hash = searchParams.get('token_hash');
    const type = searchParams.get('type');
    const next = searchParams.get('next') ?? '/dashboard';

    if (token_hash && type) {
        const supabase = await createClient();

        const { error } = await supabase.auth.verifyOtp({
            type: type as any,
            token_hash,
        });

        if (!error) {
            // Email verified successfully - redirect to dashboard
            return NextResponse.redirect(new URL(next, request.url));
        }

        // If verification failed, redirect to error page
        console.error('Email verification error:', error);
        return NextResponse.redirect(
            new URL('/auth/error?message=verification_failed', request.url)
        );
    }

    // Missing token or type
    return NextResponse.redirect(
        new URL('/auth/error?message=invalid_token', request.url)
    );
}
