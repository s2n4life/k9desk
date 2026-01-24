'use client';

import { useEffect, useState } from 'react';
import { getDB } from '@/lib/db';
import { Customer, Pet, Job } from '@/lib/db/schema';
import Link from 'next/link';
import { ChevronRight, Dog, Search, Calendar, History, Users } from 'lucide-react';

export default function CustomersPage() {
    const [loading, setLoading] = useState(true);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [pets, setPets] = useState<Record<string, Pet[]>>({});
    const [jobs, setJobs] = useState<Job[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'customers' | 'jobs'>('customers');
    const [jobDisplayLimit, setJobDisplayLimit] = useState(10);

    useEffect(() => {
        const loadData = async () => {
            const db = await getDB();
            const allCustomers = await db.getAll('customers');
            const allPets = await db.getAll('pets');
            const allJobs = await db.getAll('jobs');

            const petMap: Record<string, Pet[]> = {};
            allPets.forEach(p => {
                if (!petMap[p.customerId]) petMap[p.customerId] = [];
                petMap[p.customerId].push(p);
            });

            setCustomers(allCustomers.sort((a, b) => a.name.localeCompare(b.name)));
            setPets(petMap);
            // Sort jobs by date descending (newest first)
            setJobs(allJobs.sort((a, b) => {
                const dateA = new Date(`${a.scheduledDate} ${a.scheduledTime}`);
                const dateB = new Date(`${b.scheduledDate} ${b.scheduledTime}`);
                return dateB.getTime() - dateA.getTime();
            }));
            setLoading(false);
        };
        loadData();
    }, []);

    // Filter Customers
    const filteredCustomers = customers.filter(c => {
        const term = searchTerm.toLowerCase();
        // Check name or phone
        if (c.name.toLowerCase().includes(term) || c.phone.includes(term)) return true;
        // Check pets
        const customerPets = pets[c.id] || [];
        return customerPets.some(p => p.name.toLowerCase().includes(term));
    });

    // Filter Jobs
    const filteredJobs = jobs.filter(j => {
        // Only show closed (Past) jobs: Paid or Closed
        if (j.state !== 'paid' && j.state !== 'closed') return false;

        const term = searchTerm.toLowerCase();
        const customer = customers.find(c => c.id === j.customerId);
        const customerPets = customer ? (pets[customer.id] || []) : [];

        // Match Customer Name
        if (customer?.name.toLowerCase().includes(term)) return true;
        // Match Pet Name
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
                                <div style={{ display: 'flex', gap: 6, fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                                    <Dog size={14} />
                                    <span>{customerPets.map(p => p.name).join(', ') || 'No pets'}</span>
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
                        {displayedJobs.map(job => {
                            const customer = customers.find(c => c.id === job.customerId);
                            const jobPets = (pets[job.customerId] || []).filter(p => job.petIds.includes(p.id));

                            // Fallback if data is missing
                            if (!customer) return null;

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
                                                background: ['completed', 'paid', 'closed'].includes(job.state) ? 'var(--color-success-muted)' : 'var(--surface-sunken)',
                                                color: ['completed', 'paid', 'closed'].includes(job.state) ? 'var(--color-success)' : 'var(--text-secondary)',
                                                textTransform: 'uppercase',
                                                fontWeight: 700
                                            }}
                                        >
                                            {job.state.replace('_', ' ')}
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
