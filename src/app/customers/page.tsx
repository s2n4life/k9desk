'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Dog, Search, Calendar, History, Users } from 'lucide-react';
import { useDataLoader } from '@/hooks/useDataLoader';
import { Customer, Pet, Job, JobState } from '@/lib/db/schema';

export default function CustomersPage() {
    const [loading, setLoading] = useState(true);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [pets, setPets] = useState<Record<string, Pet[]>>({});
    const [jobs, setJobs] = useState<Job[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'customers' | 'jobs'>('customers');
    const [jobDisplayLimit, setJobDisplayLimit] = useState(10);
    const [jobFilter, setJobFilter] = useState<'all' | 'completed' | 'cancelled'>('all');

    const { loadCustomers, loadPets, loadJobs, isImpersonating, impersonatedBusinessId } = useDataLoader();

    const loadData = async () => {
        try {
            setLoading(true);

            const [allCustomers, allPets, allJobs] = await Promise.all([
                loadCustomers(),
                loadPets(),
                loadJobs()
            ]);

            // Sort customers alphabetically
            allCustomers.sort((a, b) => a.name.localeCompare(b.name));
            setCustomers(allCustomers);

            // Build pet map by customer
            const petMap: Record<string, Pet[]> = {};
            allPets.forEach(p => {
                if (!petMap[p.customerId]) petMap[p.customerId] = [];
                petMap[p.customerId].push(p);
            });
            setPets(petMap);

            // Sort jobs newest first
            allJobs.sort((a, b) => {
                if (a.scheduledDate !== b.scheduledDate) return b.scheduledDate.localeCompare(a.scheduledDate);
                return b.scheduledTime.localeCompare(a.scheduledTime);
            });
            setJobs(allJobs);
        } catch (error) {
            console.error('Failed to load customers data', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [isImpersonating, impersonatedBusinessId]);

    // Filter Customers
    const filteredCustomers = customers.filter(c => {
        const term = searchTerm.toLowerCase();
        if (c.name.toLowerCase().includes(term) || c.phone.includes(term)) return true;
        const customerPets = pets[c.id] || [];
        return customerPets.some(p => p.name.toLowerCase().includes(term));
    });

    // Terminal/finished states for Past Jobs tab
    const FINISHED_STATES: JobState[] = [
        JobState.Completed, JobState.PaymentRequested, JobState.Paid,
        JobState.Closed, JobState.Cancelled, JobState.NoShow
    ];

    // Filter Jobs
    const filteredJobs = jobs.filter(j => {
        if (!FINISHED_STATES.includes(j.state)) return false;

        if (jobFilter === 'completed') {
            const completedStates = [JobState.Completed, JobState.PaymentRequested, JobState.Paid, JobState.Closed];
            if (!completedStates.includes(j.state)) return false;
        } else if (jobFilter === 'cancelled') {
            const cancelledStates = [JobState.Cancelled, JobState.NoShow];
            if (!cancelledStates.includes(j.state)) return false;
        }

        if (!searchTerm) return true;

        const term = searchTerm.toLowerCase();
        const customer = customers.find(c => c.id === j.customerId);
        const customerPets = customer ? (pets[customer.id] || []) : [];

        if (customer?.name.toLowerCase().includes(term)) return true;
        if (customerPets.some(p => p.name.toLowerCase().includes(term))) return true;

        return false;
    });

    const displayedJobs = filteredJobs.slice(0, jobDisplayLimit);

    if (loading) return <div className="container" style={{ paddingTop: '2rem' }}>Loading...</div>;

    return (
        <div className="container" style={{ paddingBottom: '100px', paddingTop: 'var(--space-6)' }}>
            <header style={{ marginBottom: 'var(--space-6)' }}>
                <h1 className="text-h1">Customers & Jobs</h1>

                {/* Search Bar */}
                <div style={{ position: 'relative', marginTop: 'var(--space-4)' }}>
                    <Search size={20} style={{ position: 'absolute', left: 16, top: 14, color: 'var(--text-tertiary)' }} />
                    <input
                        className="card input-with-icon"
                        style={{ width: '100%', height: 48, border: 'none' }}
                        placeholder={activeTab === 'customers' ? "Search by customer, phone, or dog..." : "Search past jobs..."}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', marginTop: 'var(--space-4)', background: 'var(--surface-sunken)', padding: 4, borderRadius: 'var(--radius-lg)' }}>
                    <button
                        onClick={() => setActiveTab('customers')}
                        style={{
                            flex: 1,
                            padding: '8px',
                            borderRadius: 'var(--radius-md)',
                            border: 'none',
                            background: activeTab === 'customers' ? 'var(--surface-elevated)' : 'transparent',
                            color: activeTab === 'customers' ? 'var(--text-primary)' : 'var(--text-secondary)',
                            fontWeight: activeTab === 'customers' ? 600 : 400,
                            boxShadow: activeTab === 'customers' ? 'var(--shadow-sm)' : 'none',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6
                        }}
                    >
                        <Users size={16} />
                        Customers
                    </button>
                    <button
                        onClick={() => setActiveTab('jobs')}
                        style={{
                            flex: 1,
                            padding: '8px',
                            borderRadius: 'var(--radius-md)',
                            border: 'none',
                            background: activeTab === 'jobs' ? 'var(--surface-elevated)' : 'transparent',
                            color: activeTab === 'jobs' ? 'var(--text-primary)' : 'var(--text-secondary)',
                            fontWeight: activeTab === 'jobs' ? 600 : 400,
                            boxShadow: activeTab === 'jobs' ? 'var(--shadow-sm)' : 'none',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6
                        }}
                    >
                        <History size={16} />
                        Past Jobs
                    </button>
                </div>
            </header>

            {/* Content */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>

                {/* CUSTOMERS TAB */}
                {activeTab === 'customers' && filteredCustomers.map(c => {
                    const customerPets = pets[c.id] || [];
                    return (
                        <Link key={c.id} href={`/customers/${c.id}`} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h3 className="text-h2" style={{ fontSize: 'var(--font-size-base)', marginBottom: 4 }}>{c.name}</h3>
                                <div style={{ display: 'flex', gap: 12, fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <Dog size={14} />
                                        <span>{customerPets.map(p => p.name).join(', ') || 'No pets'}</span>
                                    </div>
                                </div>
                            </div>
                            <ChevronRight size={20} color="var(--text-tertiary)" />
                        </Link>
                    );
                })}
                {activeTab === 'customers' && filteredCustomers.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-tertiary)' }}>No customers found</div>
                )}


                {/* JOBS TAB */}
                {activeTab === 'jobs' && (
                    <>
                        {/* Filter Buttons */}
                        <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
                            <button
                                onClick={() => setJobFilter('all')}
                                style={{
                                    flex: 1,
                                    padding: '8px 12px',
                                    borderRadius: 'var(--radius-md)',
                                    border: jobFilter === 'all' ? '2px solid var(--brand-primary)' : '1px solid var(--border-color)',
                                    background: jobFilter === 'all' ? 'var(--brand-primary-light)' : 'var(--bg-card)',
                                    color: jobFilter === 'all' ? 'var(--brand-primary)' : 'var(--text-secondary)',
                                    fontWeight: jobFilter === 'all' ? 600 : 400,
                                    fontSize: 'var(--font-size-sm)',
                                    cursor: 'pointer'
                                }}
                            >
                                All
                            </button>
                            <button
                                onClick={() => setJobFilter('completed')}
                                style={{
                                    flex: 1,
                                    padding: '8px 12px',
                                    borderRadius: 'var(--radius-md)',
                                    border: jobFilter === 'completed' ? '2px solid var(--brand-primary)' : '1px solid var(--border-color)',
                                    background: jobFilter === 'completed' ? 'var(--brand-primary-light)' : 'var(--bg-card)',
                                    color: jobFilter === 'completed' ? 'var(--brand-primary)' : 'var(--text-secondary)',
                                    fontWeight: jobFilter === 'completed' ? 600 : 400,
                                    fontSize: 'var(--font-size-sm)',
                                    cursor: 'pointer'
                                }}
                            >
                                Completed
                            </button>
                            <button
                                onClick={() => setJobFilter('cancelled')}
                                style={{
                                    flex: 1,
                                    padding: '8px 12px',
                                    borderRadius: 'var(--radius-md)',
                                    border: jobFilter === 'cancelled' ? '2px solid var(--brand-primary)' : '1px solid var(--border-color)',
                                    background: jobFilter === 'cancelled' ? 'var(--brand-primary-light)' : 'var(--bg-card)',
                                    color: jobFilter === 'cancelled' ? 'var(--brand-primary)' : 'var(--text-secondary)',
                                    fontWeight: jobFilter === 'cancelled' ? 600 : 400,
                                    fontSize: 'var(--font-size-sm)',
                                    cursor: 'pointer'
                                }}
                            >
                                Cancelled & No-Shows
                            </button>
                        </div>

                        {displayedJobs.map(job => {
                            const customer = customers.find(c => c.id === job.customerId);
                            const jobPets = (pets[job.customerId] || []).filter(p => job.petIds.includes(p.id));

                            if (!customer) return null;

                            const stateLabel = job.state.replace('_', ' ');
                            const isSuccess = [JobState.Completed, JobState.Paid, JobState.Closed].includes(job.state);
                            const isCancelled = job.state === JobState.Cancelled;
                            const isNoShow = job.state === JobState.NoShow;

                            return (
                                <Link key={job.id} href={`/jobs/${job.id}`} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div>
                                            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                                                <Calendar size={12} />
                                                {new Date(job.scheduledDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} • {job.scheduledTime}
                                            </div>
                                            <div style={{ fontWeight: 600, fontSize: 'var(--font-size-base)' }}>{customer.name}</div>
                                        </div>
                                        <div
                                            style={{
                                                fontSize: '10px',
                                                padding: '2px 8px',
                                                borderRadius: 10,
                                                background:
                                                    isCancelled ? 'var(--surface-sunken)' :
                                                        isNoShow ? 'var(--color-warning-muted, #FFF4E5)' :
                                                            isSuccess ? 'var(--color-success-muted)' :
                                                                'var(--surface-sunken)',
                                                color:
                                                    isCancelled ? 'var(--text-tertiary)' :
                                                        isNoShow ? 'var(--color-warning, #FF8C00)' :
                                                            isSuccess ? 'var(--color-success)' :
                                                                'var(--text-secondary)',
                                                textTransform: 'uppercase',
                                                fontWeight: 700,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 4
                                            }}
                                        >
                                            {isCancelled && '✕ '}
                                            {isNoShow && '⚠ '}
                                            {isSuccess && '✓ '}
                                            {stateLabel}
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: 6, fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                                        <Dog size={14} />
                                        <span>{jobPets.map(p => p.name).join(', ') || 'Unknown Pet'}</span>
                                    </div>
                                </Link>
                            );
                        })}

                        {displayedJobs.length < filteredJobs.length && (
                            <button
                                onClick={() => setJobDisplayLimit(prev => prev + 10)}
                                className="button-secondary"
                                style={{ width: '100%', marginTop: 'var(--space-2)' }}
                            >
                                Load More
                            </button>
                        )}

                        {filteredJobs.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-tertiary)' }}>No jobs found</div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
