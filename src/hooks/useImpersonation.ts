'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

const IMPERSONATION_KEY = 'k9desk_impersonated_id';

export function useImpersonation() {
    const [impersonatedId, setImpersonatedId] = useState<string | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        const stored = localStorage.getItem(IMPERSONATION_KEY);
        if (stored) setImpersonatedId(stored);

        const checkAdmin = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single();

                setIsAdmin(profile?.role === 'super_admin' || profile?.role === 'support_admin');
            }
        };
        checkAdmin();
    }, []);

    const startImpersonation = (businessId: string) => {
        if (!isAdmin) return;
        localStorage.setItem(IMPERSONATION_KEY, businessId);
        setImpersonatedId(businessId);
        // Redirect to dashboard to see the impersonated state
        window.location.href = '/dashboard';
    };

    const stopImpersonation = () => {
        localStorage.removeItem(IMPERSONATION_KEY);
        setImpersonatedId(null);
        window.location.href = '/admin/users';
    };

    return {
        impersonatedId,
        isAdmin,
        startImpersonation,
        stopImpersonation
    };
}
