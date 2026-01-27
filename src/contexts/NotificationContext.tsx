'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Toast } from '@/components/UI/Toast';
import { JobState } from '@/lib/db/schema';
import { useImpersonationContextSafe, getActiveBusinessIdSync } from './ImpersonationContext';
import { syncLeadsToLocal } from '@/lib/db/hydration';

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

    const fetchCounts = async () => {
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

            // 2. Fetch New Leads Count
            const { count: newLeadsCount } = await supabase
                .from('leads')
                .select('*', { count: 'exact', head: true })
                .eq('business_id', businessId)
                .eq('status', 'new');

            setLeadsCount(newLeadsCount || 0);

            // 3. Fetch Needs Action Jobs Count
            const { count: actionableJobsCount } = await supabase
                .from('jobs')
                .select('*', { count: 'exact', head: true })
                .eq('business_id', businessId)
                .in('state', [JobState.Completed, JobState.PaymentRequested, JobState.Paid]);

            setNeedsActionCount(actionableJobsCount || 0);

        } catch (error) {
            console.error('Error fetching notification counts:', error);
        }
    };

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
                    // Update counts if job belongs to active business
                    // Note: Always refresh counts as full payload filtering might be complex for jobs
                    fetchCounts();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [isImpersonating, impersonatedBusinessId]);

    return (
        <NotificationContext.Provider value={{ leadsCount, needsActionCount, refreshCounts: fetchCounts }}>
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
