'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export function AuthRedirectHandler() {
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        const code = searchParams.get('code');
        if (code) {
            router.push(`/auth/callback?code=${code}&next=/reset-password`);
        }
    }, [searchParams, router]);

    return null;
}
