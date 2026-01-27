'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export function AuthRedirectHandler() {
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        const hash = window.location.hash;
        const code = searchParams.get('code');

        // IGNORE RECOVERY: Only /reset-password handles recovery.
        if (hash.includes('type=recovery')) {
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
