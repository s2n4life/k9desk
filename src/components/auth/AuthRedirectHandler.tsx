'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export function AuthRedirectHandler() {
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        const hash = window.location.hash;
        const code = searchParams.get('code');

        // If we have an access token directly (Implicit flow), just go to reset page
        if (hash.includes('access_token=')) {
            window.location.replace('/reset-password' + hash);
            return;
        }

        // If we have a code (PKCE flow), go to reset page
        if (code) {
            window.location.replace(`/reset-password?code=${code}`);
        }
    }, [searchParams, router]);

    return null;
}
