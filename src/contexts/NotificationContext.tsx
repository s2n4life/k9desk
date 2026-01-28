'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Toast } from '@/components/UI/Toast';
import { JobState } from '@/lib/db/schema';
import { useImpersonationContextSafe, getActiveBusinessIdSync } from './ImpersonationContext';
import { syncLeadsToLocal } from '@/lib/db/hydration';
import { getDB } from '@/lib/db';

interface NotificationContextType {
    leadsCount: number;
    needsActionCount: number;
    refreshCounts: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType>({
    leadsCount: 0,
    needsActionCount: 0,
    refreshCounts: async () => { },
});

export const useNotification = () => useContext(NotificationContext);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const [leadsCount, setLeadsCount] = useState(0);
    const [needsActionCount, setNeedsActionCount] = useState(0);
    const [toast, setToast] = useState<{ message: string, subMessage?: string, isVisible: boolean }>({
        message: '',
        isVisible: false
    });

    const { isImpersonating, impersonatedBusinessId } = useImpersonationContextSafe();
    const supabase = createClient();

    const fetchCounts = React.useCallback(async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const userId = user.id;
            // Get active business ID (respects impersonation)
            let businessId = getActiveBusinessIdSync();

            if (!businessId) {
                // Fetch from profile if not in localStorage yet
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('business_id')
                    .eq('id', userId)
                    .single();
                businessId = profile?.business_id || userId;
            }

            // 2. Fetch counts from local IndexedDB
            const db = await getDB();

            // New Leads
            const allLeads = await db.getAll('leads');
            const newLeadsCount = allLeads.filter(l => l.status === 'new').length;
            setLeadsCount(newLeadsCount);

            // Needs Action (Jobs that are Completed, PaymentRequested, or Paid)
            const allJobs = await db.getAll('jobs');
            const actionableJobsCount = allJobs.filter(j =>
                j.state === JobState.Completed ||
                j.state === JobState.PaymentRequested ||
                j.state === JobState.Paid
            ).length;

            // Total Needs Action = Actionable Jobs + New Leads
            setNeedsActionCount(actionableJobsCount + newLeadsCount);

        } catch (error) {
            console.error('Error fetching notification counts:', error);
        }
    }, [supabase]);

    useEffect(() => {
        fetchCounts();

        // Subscribe to Realtime Changes
        const channel = supabase
            .channel('notification_changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'leads'
                },
                async (payload) => {
                    const activeId = getActiveBusinessIdSync();
                    let currentBusinessId = activeId;

                    if (!currentBusinessId) {
                        const { data: { user } } = await supabase.auth.getUser();
                        if (user) {
                            // Try to get from profile if not in localStorage yet
                            const { data: profile } = await supabase
                                .from('profiles')
                                .select('business_id')
                                .eq('id', user.id)
                                .single();
                            currentBusinessId = profile?.business_id || user.id;
                        }
                    }

                    // Only show toast if it belongs to the active business
                    if (payload.eventType === 'INSERT') {
                        const newLead = payload.new as any;
                        if (newLead.business_id === activeId || (!activeId && newLead.business_id === currentBusinessId)) {
                            setToast({
                                message: 'New Lead Received!',
                                subMessage: `${newLead.owner_name} - ${newLead.service_area_zip}`,
                                isVisible: true
                            });
                            // Sync new leads to local DB
                            syncLeadsToLocal(newLead.business_id);
                        }
                    }
                    fetchCounts();
                }
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'jobs'
                },
                (payload) => {
                    fetchCounts();
                }
            )
            .subscribe();

        // Also refresh counts when leads are synced locally
        const handleSync = () => {
            fetchCounts();
        };
        window.addEventListener('leads-synced', handleSync);
        window.addEventListener('data-changed', handleSync);

        return () => {
            supabase.removeChannel(channel);
            window.removeEventListener('leads-synced', handleSync);
            window.removeEventListener('data-changed', handleSync);
        };
    }, [isImpersonating, impersonatedBusinessId, fetchCounts, supabase]);

    const value = React.useMemo(() => ({
        leadsCount,
        needsActionCount,
        refreshCounts: fetchCounts
    }), [leadsCount, needsActionCount, fetchCounts]);

    return (
        <NotificationContext.Provider value={value}>
            {children}
            <Toast
                message={toast.message}
                subMessage={toast.subMessage}
                isVisible={toast.isVisible}
                onClose={() => setToast(prev => ({ ...prev, isVisible: false }))}
            />
        </NotificationContext.Provider>
    );
}
