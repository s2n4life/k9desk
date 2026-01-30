'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { ChevronRight, Dog, Search, Calendar, History, Users, Building2 } from 'lucide-react';

type Customer = {
    id: string;
    name: string;
    phone: string;
    email: string;
    address: string;
    notes: string;
    business_id: string;
    business_name?: string;
    created_at: string;
    updated_at: string;
};

type Pet = {
    id: string;
    customer_id: string;
    name: string;
    breed: string;
    notes: string;
    business_id: string;
};

type Job = {
    id: string;
    customer_id: string;
    pet_ids: string[];
    state: string;
    scheduled_date: string;
    scheduled_time: string;
    address: string;
    notes: string;
    customer_notes: string;
    pet_notes: string;
    business_id: string;
    created_at: string;
    updated_at: string;
};

export default function CustomersPage() {
    const [loading, setLoading] = useState(true);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [pets, setPets] = useState<Record<string, Pet[]>>({});
    const [jobs, setJobs] = useState<Job[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'customers' | 'jobs'>('customers');
    const [jobDisplayLimit, setJobDisplayLimit] = useState(10);
    const [jobFilter, setJobFilter] = useState<'all' | 'completed' | 'cancelled'>('all');

    const loadData = async () => {
        try {
            setLoading(true);

            // Load all customers with business info (admin view - no filtering)
            const { data: customersData, error: customersError } = await supabase
                .from('customers')
                .select(`
                    *,
                    businesses:business_id (name)
                `)
                .order('name', { ascending: true });

            if (customersError) {
                console.error('Error loading customers:', customersError);
            }

            // Load all pets
            const { data: petsData, error: petsError } = await supabase
                .from('pets')
                .select('*');

            if (petsError) {
                console.error('Error loading pets:', petsError);
            }

            // Load all jobs
            const { data: jobsData, error: jobsError } = await supabase
                .from('jobs')
                .select('*')
                .order('created_at', { ascending: false });

            if (jobsError) {
                console.error('Error loading jobs:', jobsError);
            }

            // Map customers with business name
            const mappedCustomers = (customersData || []).map((c: any) => ({
                id: c.id,
                name: c.name,
                phone: c.phone,
                email: c.email,
                address: c.address,
                notes: c.notes,
                business_id: c.business_id,
                business_name: c.businesses?.name,
                created_at: c.created_at,
                updated_at: c.updated_at
            }));

            // Build pet map
            const petMap: Record<string, Pet[]> = {};
            (petsData || []).forEach((p: any) => {
                if (!petMap[p.customer_id]) petMap[p.customer_id] = [];
                petMap[p.customer_id].push({
                    id: p.id,
                    customer_id: p.customer_id,
                    name: p.name,
                    breed: p.breed,
                    notes: p.notes,
                    business_id: p.business_id
                });
            });

            // Map jobs
            const mappedJobs = (jobsData || []).map((j: any) => ({
                id: j.id,
                customer_id: j.customer_id,
                pet_ids: j.pet_ids || [],
                state: j.state,
                scheduled_date: j.scheduled_date,
                scheduled_time: j.scheduled_time,
                address: j.address,
                notes: j.notes,
                customer_notes: j.customer_notes,
                pet_notes: j.pet_notes,
                business_id: j.business_id,
                created_at: j.created_at,
                updated_at: j.updated_at
            })).sort((a, b) => {
                const dateA = new Date(`${a.scheduled_date} ${a.scheduled_time}`);
                const dateB = new Date(`${b.scheduled_date} ${b.scheduled_time}`);
                return dateB.getTime() - dateA.getTime();
            });

            setCustomers(mappedCustomers);
            setPets(petMap);
            setJobs(mappedJobs);
        } catch (error) {
            console.error('Failed to load customers data', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
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
        // Only show finished or near-finished jobs: Completed, PaymentRequested, Paid, Closed, Cancelled, NoShow
        const finishedStates = ['completed', 'payment_requested', 'paid', 'closed', 'cancelled', 'no_show'];
        if (!finishedStates.includes(j.state)) return false;

        // Apply filter
        if (jobFilter === 'completed') {
            const completedStates = ['completed', 'payment_requested', 'paid', 'closed'];
            if (!completedStates.includes(j.state)) return false;
        } else if (jobFilter === 'cancelled') {
            const cancelledStates = ['cancelled', 'no_show'];
            if (!cancelledStates.includes(j.state)) return false;
        }
        // 'all' filter shows everything

        const term = searchTerm.toLowerCase();
        const customer = customers.find(c => c.id === j.customer_id);
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
                                <div style={{ display: 'flex', gap: 12, fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <Dog size={14} />
                                        <span>{customerPets.map(p => p.name).join(', ') || 'No pets'}</span>
                                    </div>
                                    {c.business_name && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <Building2 size={14} />
                                            <span>{c.business_name}</span>
                                        </div>
                                    )}
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
                            const customer = customers.find(c => c.id === job.customer_id);
                            const jobPets = (pets[job.customer_id] || []).filter(p => job.pet_ids.includes(p.id));

                            // Fallback if data is missing
                            if (!customer) return null;

                            return (
                                <Link key={job.id} href={`/jobs/${job.id}`} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div>
                                            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                                                <Calendar size={12} />
                                                {new Date(job.scheduled_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} • {job.scheduled_time}
                                            </div>
                                            <div style={{ fontWeight: 600, fontSize: 'var(--font-size-base)' }}>{customer.name}</div>
                                        </div>
                                        <div
                                            style={{
                                                fontSize: '10px',
                                                padding: '2px 8px',
                                                borderRadius: 10,
                                                background:
                                                    job.state === 'cancelled' ? 'var(--surface-sunken)' :
                                                        job.state === 'no_show' ? '#FFF4E5' :
                                                            ['completed', 'paid', 'closed'].includes(job.state) ? 'var(--color-success-muted)' :
                                                                'var(--surface-sunken)',
                                                color:
                                                    job.state === 'cancelled' ? 'var(--text-tertiary)' :
                                                        job.state === 'no_show' ? '#FF8C00' :
                                                            ['completed', 'paid', 'closed'].includes(job.state) ? 'var(--color-success)' :
                                                                'var(--text-secondary)',
                                                textTransform: 'uppercase',
                                                fontWeight: 700,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 4
                                            }}
                                        >
                                            {job.state === 'cancelled' && '✕ '}
                                            {job.state === 'no_show' && '⚠ '}
                                            {['completed', 'paid', 'closed'].includes(job.state) && '✓ '}
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
