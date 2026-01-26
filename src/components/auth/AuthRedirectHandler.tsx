'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export function AuthRedirectHandler() {
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        // Look for code in query params OR hash (Supabase recovery sometimes uses hash)
        const code = searchParams.get('code') ||
            window.location.hash.match(/access_token=([^&]*)/)?.[1] ||
            window.location.hash.match(/code=([^&]*)/)?.[1];

        if (code) {
            router.push(`/auth/callback?code=${code}&next=/reset-password`);
        }
    }, [searchParams, router]);

    return null;
}
