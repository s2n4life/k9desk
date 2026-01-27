'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export function AuthRedirectHandler() {
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        const hash = window.location.hash;
        const code = searchParams.get('code');

        // 1. RECOVERY HANDOFF: If we see a recovery token, steer it to the reset page
        if (hash.includes('type=recovery')) {
            window.location.replace('/reset-password' + hash);
            return;
        }

        // 2. SIGNUP HANDOFF: Similarly for signups
        if (hash.includes('type=signup')) {
            window.location.replace('/dashboard' + hash);
            return;
        }

        // 3. STANDARD LOGIN (Hash-based)
        if (hash.includes('access_token=') && !hash.includes('type=recovery')) {
            window.location.replace('/dashboard' + hash);
            return;
        }

        // 4. PKCE FLOW
        if (code) {
            router.push(`/auth/callback?code=${code}`);
        }
    }, [searchParams, router]);

    return null;
}
