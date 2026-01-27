'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface ImpersonationContextType {
    impersonatedBusinessId: string | null;
    isImpersonating: boolean;
    isAdmin: boolean;
    getActiveBusinessId: () => Promise<string | null>;
    startImpersonation: (businessId: string) => void;
    stopImpersonation: () => void;
}

const ImpersonationContext = createContext<ImpersonationContextType | undefined>(undefined);

const IMPERSONATION_KEY = 'k9desk_impersonated_id';

export function ImpersonationProvider({ children }: { children: ReactNode }) {
    const [impersonatedBusinessId, setImpersonatedBusinessId] = useState<string | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [userBusinessId, setUserBusinessId] = useState<string | null>(null);

    useEffect(() => {
        // Check for impersonation in localStorage
        const stored = localStorage.getItem(IMPERSONATION_KEY);
        if (stored) {
            setImpersonatedBusinessId(stored);
        }

        // Check if user is admin
        const checkAdmin = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role, business_id')
                    .eq('id', user.id)
                    .single();

                if (profile) {
                    setIsAdmin(profile.role === 'super_admin' || profile.role === 'support_admin');
                    setUserBusinessId(profile.business_id);
                }
            }
        };
        checkAdmin();
    }, []);

    const getActiveBusinessId = async (): Promise<string | null> => {
        // If impersonating, return impersonated business ID
        if (impersonatedBusinessId) {
            return impersonatedBusinessId;
        }

        // Otherwise, return user's real business ID
        if (userBusinessId) {
            return userBusinessId;
        }

        // Fallback: fetch from Supabase
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('business_id')
                .eq('id', user.id)
                .single();

            return profile?.business_id || null;
        }

        return null;
    };

    const startImpersonation = (businessId: string) => {
        if (!isAdmin) return;
        localStorage.setItem(IMPERSONATION_KEY, businessId);
        setImpersonatedBusinessId(businessId);
        window.location.href = '/dashboard';
    };

    const stopImpersonation = () => {
        localStorage.removeItem(IMPERSONATION_KEY);
        setImpersonatedBusinessId(null);
        window.location.href = '/admin/users';
    };

    return (
        <ImpersonationContext.Provider
            value={{
                impersonatedBusinessId,
                isImpersonating: !!impersonatedBusinessId,
                isAdmin,
                getActiveBusinessId,
                startImpersonation,
                stopImpersonation
            }}
        >
            {children}
        </ImpersonationContext.Provider>
    );
}

export function useImpersonationContext() {
    const context = useContext(ImpersonationContext);
    if (context === undefined) {
        throw new Error('useImpersonationContext must be used within ImpersonationProvider');
    }
    return context;
}

// Optional: Safe version that doesn't throw
export function useImpersonationContextSafe() {
    const context = useContext(ImpersonationContext);
    return context || {
        impersonatedBusinessId: null,
        isImpersonating: false,
        isAdmin: false,
        getActiveBusinessId: async () => null,
        startImpersonation: () => { },
        stopImpersonation: () => { }
    };
}
