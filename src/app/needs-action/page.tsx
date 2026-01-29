'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { JobCard } from '@/components/Jobs/JobCard';
import { getDB } from '@/lib/db';
import { Job, Customer, Pet, JobState, Lead, Settings, Service } from '@/lib/db/schema';
import { JobStateMachine } from '@/lib/jobs/stateMachine';
import { triggerSMSAction } from '@/lib/sms';
import { LeadCard } from '@/components/Leads/LeadCard';
import { useDataLoader } from '@/hooks/useDataLoader';

import { PaymentModal } from '@/components/Jobs/PaymentModal';
import { RequestPaymentModal } from '@/components/Jobs/RequestPaymentModal';

import { useRouter } from 'next/navigation'; // Added

export default function NeedsActionPage() {
    const router = useRouter(); // Added
    const [loading, setLoading] = useState(true);
    const [jobs, setJobs] = useState<Job[]>([]);
    const [leads, setLeads] = useState<Lead[]>([]); // NEW
    const [customers, setCustomers] = useState<Record<string, Customer>>({});
    const [pets, setPets] = useState<Record<string, Pet>>({});
    const [allServices, setAllServices] = useState<Service[]>([]);
    const [settings, setSettings] = useState<Settings | null>(null);
    const { loadJobs, loadCustomers, loadPets, loadLeads, isImpersonating, impersonatedBusinessId, getActiveBusinessId } = useDataLoader();

    // Payment Modal State
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [requestPaymentModalOpen, setRequestPaymentModalOpen] = useState(false);
    const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

    const ACTION_STATES = [JobState.Completed, JobState.PaymentRequested, JobState.Paid];

    const loadData = async () => {
        try {
            const allJobs = await loadJobs();
            const allCustomers = await loadCustomers();
            const allPets = await loadPets();
            const allLeads = await loadLeads();

            const db = await getDB();
            const custMap: Record<string, Customer> = {};
            allCustomers.forEach(c => custMap[c.id] = c);
            setCustomers(custMap);

            const petMap: Record<string, Pet> = {};
            allPets.forEach(p => petMap[p.id] = p);
            setPets(petMap);

            const actionable = allJobs.filter(j =>
                ACTION_STATES.includes(j.state)
            );

            actionable.sort((a, b) => {
                if (a.scheduledDate !== b.scheduledDate) return a.scheduledDate.localeCompare(b.scheduledDate);
                return a.scheduledTime.localeCompare(b.scheduledTime);
            });
            setJobs(actionable);

            // Filter new leads
            setLeads(allLeads.filter(l => l.status === 'new'));

            const s = await db.get('settings', 'default');
            setSettings(s || null);

            // Load all services
            const services = await db.getAll('services');
            setAllServices(services || []);

        } catch (error) {
            console.error('Failed to load actionable', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [isImpersonating, impersonatedBusinessId]);

    const handleAction = async (jobId: string, action: any) => {
        try {
            if (action === 'REQUEST_PAYMENT') {
                setSelectedJobId(jobId);
                setRequestPaymentModalOpen(true);
                return;
            }

            if (action === 'LOG_PAYMENT') {
                setSelectedJobId(jobId);
                setPaymentModalOpen(true);
                return;
            }

            const job = jobs.find(j => j.id === jobId);
            const customer = job ? customers[job.customerId] : null;

            if (job && customer) {
                const petNames = job.petIds.map(pid => pets[pid]?.name).filter(Boolean);
                triggerSMSAction(job, customer, action, { settings, petNames });
            }

            await JobStateMachine.transition(jobId, action);
            await loadData();
        } catch (e) {
            console.error(e);
            alert('Action failed: ' + (e as Error).message);
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
                    window.dispatchEvent(new CustomEvent('data-changed'));
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
                initialAmount={
                    selectedJobId
                        ? (() => {
                            const job = jobs.find(j => j.id === selectedJobId);
                            return job ? (job.payment_amount || job.services?.reduce((acc, s) => acc + (s.price || 0), 0) || 0) : 0;
                        })()
                        : 0
                }
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

            <RequestPaymentModal
                isOpen={requestPaymentModalOpen}
                onClose={() => setRequestPaymentModalOpen(false)}
                onConfirm={async (amount, selectedPaymentMethods) => {
                    if (!selectedJobId) return;
                    try {
                        const job = jobs.find(j => j.id === selectedJobId);
                        const customer = job ? customers[job.customerId] : null;

                        // Transition state FIRST (before opening SMS app)
                        // This prevents errors if user returns before SMS is sent
                        await JobStateMachine.transition(selectedJobId, 'REQUEST_PAYMENT', {
                            payment_amount: amount
                        });

                        // Close modal immediately after state transition
                        setRequestPaymentModalOpen(false);
                        setSelectedJobId(null);

                        // Reload data to show updated state
                        await loadData();

                        // THEN send SMS (opens SMS app)
                        // User may leave app at this point, but state is already updated
                        if (job && customer) {
                            triggerSMSAction(job, customer, 'REQUEST_PAYMENT', {
                                settings,
                                amount,
                                selectedPaymentMethods
                            });
                        }
                    } catch (err: any) {
                        console.error('Failed to request payment:', err);
                        alert('Failed to request payment: ' + err.message);
                    }
                }}
                initialAmount={
                    selectedJobId
                        ? (jobs.find(j => j.id === selectedJobId)?.services?.reduce((sum, s) => sum + s.price, 0) || 0)
                        : 0
                }
                pets={
                    selectedJobId
                        ? (jobs.find(j => j.id === selectedJobId)?.petIds.map(pid => pets[pid]).filter(Boolean) as Pet[] || [])
                        : []
                }
                allServices={allServices}
                jobServices={
                    selectedJobId
                        ? (jobs.find(j => j.id === selectedJobId)?.services || [])
                        : []
                }
            />
        </div>
    );
}
