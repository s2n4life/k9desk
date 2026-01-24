'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { JobCard } from '@/components/Jobs/JobCard';
import { getDB } from '@/lib/db';
import { Job, Customer, Pet, JobState, Lead } from '@/lib/db/schema';
import { JobStateMachine } from '@/lib/jobs/stateMachine';
import { triggerSMSAction } from '@/lib/sms';
import { LeadCard } from '@/components/Leads/LeadCard';

import { PaymentModal } from '@/components/Jobs/PaymentModal';

import { useRouter } from 'next/navigation'; // Added

export default function NeedsActionPage() {
    const router = useRouter(); // Added
    const [loading, setLoading] = useState(true);
    const [jobs, setJobs] = useState<Job[]>([]);
    const [leads, setLeads] = useState<Lead[]>([]); // NEW
    const [customers, setCustomers] = useState<Record<string, Customer>>({});
    const [pets, setPets] = useState<Record<string, Pet>>({});

    // Payment Modal State
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

    const ACTION_STATES = [JobState.Completed, JobState.PaymentRequested, JobState.Paid];

    const loadData = async () => {
        try {
            const db = await getDB();
            const allJobs = await db.getAll('jobs');
            const allCustomers = await db.getAll('customers');
            const allPets = await db.getAll('pets');

            // Fetch Leads
            // Note: In a real app we'd sync this from Supabase. 
            // For now, assuming they are synced or we fetch directly if we want live data.
            // Let's assume they are in local indexedDB for this step, 
            // provided the sync logic captures them (which we haven't built yet). 
            // So we might need to fetch direct from Supabase if Sync isn't updated.
            // BUT, for V1 demo, let's fetch from IDB assuming sync works, or...
            // Actually, we haven't updated SyncManager yet.
            // Let's fetch from IDB 'leads' store (which handles local state).
            let allLeads: Lead[] = [];
            try {
                allLeads = await db.getAll('leads');
            } catch (e) {
                console.warn('Leads store might not exist yet', e);
            }

            const custMap: Record<string, Customer> = {};
            allCustomers.forEach(c => custMap[c.id] = c);
            setCustomers(custMap);

            const petMap: Record<string, Pet> = {};
            allPets.forEach(p => petMap[p.id] = p);
            setPets(petMap);

            const actionable = allJobs.filter(j =>
                j.state === JobState.Paid ||
                j.state === JobState.PaymentRequested
            );

            actionable.sort((a, b) => {
                if (a.scheduledDate !== b.scheduledDate) return b.scheduledDate.localeCompare(a.scheduledDate);
                return b.scheduledTime.localeCompare(a.scheduledTime);
            });
            setJobs(actionable);

            // Filter new leads
            setLeads(allLeads.filter(l => l.status === 'new'));

        } catch (error) {
            console.error('Failed to load actionable', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleAction = async (jobId: string, action: any) => {
        try {
            if (action === 'LOG_PAYMENT') {
                setSelectedJobId(jobId);
                setPaymentModalOpen(true);
                return;
            }

            const job = jobs.find(j => j.id === jobId);
            const customer = job ? customers[job.customerId] : null;

            if (job && customer) {
                triggerSMSAction(job, customer, action);
            }

            await JobStateMachine.transition(jobId, action);
            await loadData();
        } catch (e) {
            console.error(e);
            alert('Action failed');
        }
    };

    const handleLeadAction = async (leadId: string, action: 'accept' | 'reject') => {
        if (action === 'accept') {
            router.push(`/jobs/new?leadId=${leadId}`);
        } else {
            if (!confirm('Mark this lead as dead?')) return;
            // Mark as dead
            try {
                const db = await getDB();
                const lead = leads.find(l => l.id === leadId);
                if (lead) {
                    const updated = { ...lead, status: 'dead' as const }; // Fix type issue
                    await db.put('leads', updated);
                    // trigger sync if we had it
                    // Local state update
                    setLeads(prev => prev.filter(l => l.id !== leadId));
                }
            } catch (e) {
                console.error('Failed to reject lead', e);
            }
        }
    };

    if (loading) return <div className="container" style={{ paddingTop: '2rem' }}>Loading...</div>;

    return (
        <div className="container" style={{ paddingBottom: '100px', paddingTop: 'var(--space-6)' }}>
            <header style={{ marginBottom: 'var(--space-6)' }}>
                <h1 className="text-h1" style={{ color: 'var(--color-warning)' }}>Needs Action</h1>
                <p className="text-body" style={{ fontWeight: 500 }}>
                    You have {jobs.length + leads.length} items that need attention
                </p>
            </header>

            {jobs.length === 0 && leads.length === 0 ? (
                <div className="card" style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
                    <div style={{ fontSize: '48px', marginBottom: 'var(--space-4)' }}>🎉</div>
                    <h3 className="text-h2">All caught up!</h3>
                    <p className="text-body">No new leads or pending payments.</p>
                </div>
            ) : (
                <div className="job-list">
                    {/* Render Leads First */}
                    {leads.map(lead => (
                        <LeadCard
                            key={lead.id}
                            lead={lead}
                            onAccept={(id) => handleLeadAction(id, 'accept')}
                            onArchive={(id) => handleLeadAction(id, 'reject')}
                            onDelete={(id) => handleLeadAction(id, 'reject')}
                        />
                    ))}

                    {/* Render Jobs */}
                    {jobs.map(job => (
                        <JobCard
                            key={job.id}
                            job={job}
                            customerName={customers[job.customerId]?.name || 'Unknown'}
                            petNames={job.petIds.map(id => pets[id]?.name).filter(Boolean)}
                            onAction={(action) => handleAction(job.id, action)}
                        />
                    ))}
                </div>
            )}

            <PaymentModal
                isOpen={paymentModalOpen}
                onClose={() => setPaymentModalOpen(false)}
                onConfirm={async (amount, method) => {
                    if (selectedJobId) {
                        try {
                            await JobStateMachine.transition(selectedJobId, 'LOG_PAYMENT', {
                                payment_amount: amount,
                                payment_method: method as any,
                                payment_logged_at: Date.now(),
                                payment_source: 'manual'
                            });
                            setPaymentModalOpen(false);
                            setSelectedJobId(null);
                            loadData(); // Refresh list (it will likely move to Paid/Needs Action or remain if logic allows)
                        } catch (e) {
                            console.error(e);
                        }
                    }
                }}
            />
        </div>
    );
}
