'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Toast } from '@/components/UI/Toast';
import { JobState } from '@/lib/db/schema';

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

    const supabase = createClient();

    const fetchCounts = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Fetch Business ID (needed for leads count mostly)
            const { data: business } = await supabase
                .from('businesses')
                .select('id')
                .eq('owner_id', user.id)
                .single();

            if (!business) return;

            // 2. Fetch New Leads Count
            const { count: newLeadsCount } = await supabase
                .from('leads')
                .select('*', { count: 'exact', head: true })
                .eq('business_id', business.id)
                .eq('status', 'new');

            setLeadsCount(newLeadsCount || 0);

            // 3. Fetch Needs Action Jobs Count
            // Note: Jobs table depends on policy. Assuming user can see their business's jobs.
            // Jobs might not have business_id directly if it uses RLS via join, but usually simpler if it has business_id.
            // Checking existing schema... Jobs usually just have business_id.
            // If not, we query by customer -> business.
            // Let's assume jobs have business_id for performance/RLS.

            const { count: actionableJobsCount } = await supabase
                .from('jobs')
                .select('*', { count: 'exact', head: true })
                .eq('business_id', business.id)
                .in('state', [JobState.Completed, JobState.PaymentRequested, JobState.Paid]);
            // Note: 'Paid' is actionable? User said "PaymentRequested or Paid" in NeedsAction page?
            // Checking NeedsAction page logic: 
            // const actionable = allJobs.filter(j => j.state === JobState.Paid || j.state === JobState.PaymentRequested);
            // Yes.

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
                (payload) => {
                    // Logic: If INSERT, show toast + increment.
                    // If UPDATE/DELETE, refresh count.
                    if (payload.eventType === 'INSERT') {
                        const newLead = payload.new as any;
                        setToast({
                            message: 'New Lead Received!',
                            subMessage: `${newLead.owner_name} - ${newLead.service_area_zip}`,
                            isVisible: true
                        });
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
                () => {
                    // Refresh jobs count on any job change
                    fetchCounts();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

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
