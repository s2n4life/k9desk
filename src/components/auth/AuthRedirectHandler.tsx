'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export function AuthRedirectHandler() {
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        const hash = window.location.hash;
        const code = searchParams.get('code');

        // IF THIS IS A RECOVERY ATTEMPT, DO NOTHING. 
        // Let the /reset-password page or the /auth/callback route handle it.
        if (hash.includes('type=recovery') || hash.includes('type=signup')) {
            return;
        }

        // Only handle standard redirects if we are on the home page
        // and we have a valid code or token that isn't recovery related.
        if (hash.includes('access_token=') && !hash.includes('type=recovery')) {
            window.location.replace('/dashboard' + hash);
            return;
        }

        if (code) {
            router.push(`/auth/callback?code=${code}`);
        }
    }, [searchParams, router]);

    return null;
}
