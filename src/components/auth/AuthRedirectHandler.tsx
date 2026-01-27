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

        // 1. RECOVERY HANDOFF: If we see a recovery token (hash or query), steer it to the reset page
        // DO NOT return here, actually redirect them.
        if (hash.includes('type=recovery') || type === 'recovery') {
            const target = '/reset-password' + window.location.search + hash;
            window.location.replace(target);
            return;
        }

        // 2. STANDARD LOGIN (Hash-based)
        // Only redirect to dashboard if it's a normal login (no recovery token)
        if (hash.includes('access_token=') && !hash.includes('type=recovery')) {
            window.location.replace('/dashboard' + hash);
            return;
        }

        // 3. PKCE FLOW (Standard)
        if (code) {
            router.push(`/auth/callback?code=${code}`);
        }
    }, [searchParams, router]);

    return null;
}
