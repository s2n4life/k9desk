'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface ImpersonationContextType {
    impersonatedBusinessId: string | null;
    isImpersonating: boolean;
    isAdmin: boolean;
    getActiveBusinessId: () => Promise<string | null>;
    startImpersonation: (businessId: string) => Promise<void>;
    stopImpersonation: () => void;
}

const ImpersonationContext = createContext<ImpersonationContextType | undefined>(undefined);

export const IMPERSONATION_KEY = 'k9desk_impersonated_id';
export const USER_BUSINESS_ID_KEY = 'k9desk_user_business_id';

/**
 * Returns the currently active business ID.
 * 1. Checks for active impersonation
 * 2. Falls back to user's primary business ID from localStorage
 * Used for sync/hydration logic outside of React components.
 */
export function getActiveBusinessIdSync(): string | null {
    if (typeof window === 'undefined') return null;
    const impersonated = localStorage.getItem(IMPERSONATION_KEY);
    if (impersonated) return impersonated;

    return localStorage.getItem(USER_BUSINESS_ID_KEY);
}

export function getUserBusinessIdSync(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(USER_BUSINESS_ID_KEY);
}

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
                    if (profile.business_id) {
                        localStorage.setItem(USER_BUSINESS_ID_KEY, profile.business_id);
                    }
                }
            }
        };
        checkAdmin();
    }, []);

    const getActiveBusinessId = React.useCallback(async (): Promise<string | null> => {
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
    }, [impersonatedBusinessId, userBusinessId]);

    const startImpersonation = React.useCallback(async (businessId: string) => {
        if (!isAdmin) return;

        console.log('[IMPERSONATION] Starting impersonation for business:', businessId);

        // Clear IndexedDB to prevent data pollution from admin account
        try {
            const { getDB } = await import('@/lib/db');
            const db = await getDB();
            console.log('[IMPERSONATION] Clearing IndexedDB stores...');
            await db.clear('jobs');
            await db.clear('customers');
            await db.clear('pets');
            await db.clear('services');
            console.log('[IMPERSONATION] IndexedDB cleared successfully');
        } catch (error) {
            console.error('[IMPERSONATION] Error clearing IndexedDB:', error);
            // Continue anyway - the Supabase queries should still work
        }

        localStorage.setItem(IMPERSONATION_KEY, businessId);
        setImpersonatedBusinessId(businessId);
        window.location.href = '/dashboard';
    }, [isAdmin]);

    const stopImpersonation = React.useCallback(() => {
        console.log('[IMPERSONATION] Stopping impersonation');
        localStorage.removeItem(IMPERSONATION_KEY);
        setImpersonatedBusinessId(null);
        window.location.href = '/admin/users';
    }, []);

    const contextValue = React.useMemo(() => ({
        impersonatedBusinessId,
        isImpersonating: !!impersonatedBusinessId,
        isAdmin,
        getActiveBusinessId,
        startImpersonation,
        stopImpersonation
    }), [impersonatedBusinessId, isAdmin, getActiveBusinessId, startImpersonation, stopImpersonation]);

    return (
        <ImpersonationContext.Provider value={contextValue}>
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
        startImpersonation: async (id: string) => { },
        stopImpersonation: () => { }
    };
}

// Redirecting legacy hook to use context for consistency
export function useImpersonation() {
    return useImpersonationContextSafe();
}
