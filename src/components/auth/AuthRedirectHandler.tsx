'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export function AuthRedirectHandler() {
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        const hash = window.location.hash;
        const code = searchParams.get('code');

        // 1. IGNORE RECOVERY: Per ChatGPT spec, home page must NOT handle recovery
        if (hash.includes('type=recovery')) {
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
