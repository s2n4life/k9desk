'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export function AuthRedirectHandler() {
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        const hash = window.location.hash;
        const code = searchParams.get('code');
        const type = searchParams.get('type');

        // ABSOLUTE INTERCEPTOR: If a recovery link lands here, KILL IT.
        // This stops home page flashes AND dashboard bounces.
        if (hash.includes('type=recovery') || type === 'recovery') {
            console.warn('Recovery link detected on Home Page. Clearing for safety.');
            window.history.replaceState(null, '', window.location.pathname);
            return;
        }

        // 1. STANDARD LOGIN (Hash-based)
        if (hash.includes('access_token=') && !hash.includes('type=recovery')) {
            window.location.replace('/dashboard' + hash);
            return;
        }

        // 2. PKCE FLOW
        if (code) {
            router.push(`/auth/callback?code=${code}`);
        }
    }, [searchParams, router]);

    return null;
}
