'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { getDB } from '@/lib/db';
import { Customer, Pet, Job } from '@/lib/db/schema';
import { saveWithSync, deleteWithSync } from '@/lib/db/transactions';
import { ChevronLeft, Plus, Calendar, Edit2, Trash2, MapPin, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { v4 as uuidv4 } from 'uuid';
import { Modal } from '@/components/UI/Modal';
import { CustomerForm } from '@/components/Customers/CustomerForm';
import { PetForm } from '@/components/Pets/PetForm';

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { id } = use(params);

    const [loading, setLoading] = useState(true);
    const [customer, setCustomer] = useState<Customer | null>(null);
    const [pets, setPets] = useState<Pet[]>([]);
    const [history, setHistory] = useState<Job[]>([]);

    // Modals
    const [customerModalOpen, setCustomerModalOpen] = useState(false);
    const [petModalOpen, setPetModalOpen] = useState(false);
    const [editingPetId, setEditingPetId] = useState<string | null>(null);
    const [deletingPetId, setDeletingPetId] = useState<string | null>(null);

    const loadData = async () => {
        const db = await getDB();
        const c = await db.get('customers', id);
        if (!c) {
            setLoading(false);
            return;
        }
        setCustomer(c);

        const allPets = await db.getAllFromIndex('pets', 'by-customer', id);
        setPets(allPets);

        const allJobs = await db.getAllFromIndex('jobs', 'by-customer', id);
        // Sort history descending
        setHistory(allJobs.sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate)));
        setLoading(false);
    };

    useEffect(() => {
        loadData();
    }, [id]);


    // -- Handlers --

    const saveCustomer = async (data: Partial<Customer>) => {
        if (!customer) return;
        const updated = { ...customer, ...data, updatedAt: Date.now() };

        const { getActiveBusinessIdSync } = await import('@/contexts/ImpersonationContext');
        const businessId = getActiveBusinessIdSync();

        await saveWithSync('customers', updated, 'UPDATE', businessId || undefined);
        setCustomer(updated);
        setCustomerModalOpen(false);
    };

    const savePet = async (data: Partial<Pet>) => {
        const db = await getDB();

        const { getActiveBusinessIdSync } = await import('@/contexts/ImpersonationContext');
        const businessId = getActiveBusinessIdSync();

        if (editingPetId) {
            // Edit
            const p = await db.get('pets', editingPetId);
            if (p) {
                const updated = { ...p, ...data, updatedAt: Date.now() };
                await saveWithSync('pets', updated, 'UPDATE', businessId || undefined);
                setPets(prev => prev.map(pt => pt.id === editingPetId ? updated : pt));
            }
        } else {
            // New
            if (!customer) return;
            const newId = uuidv4();
            const newPet: Pet = {
                id: newId,
                customerId: customer.id,
                name: data.name!,
                breed: data.breed,
                notes: data.notes,
                createdAt: Date.now(),
                updatedAt: Date.now()
            };
            await saveWithSync('pets', newPet, 'CREATE', businessId || undefined);
            setPets(prev => [...prev, newPet]);
        }
        setPetModalOpen(false);
    };

    const confirmDeletePet = async () => {
        if (!deletingPetId) return;
        const { getActiveBusinessIdSync } = await import('@/contexts/ImpersonationContext');
        const businessId = getActiveBusinessIdSync();
        await deleteWithSync('pets', deletingPetId, businessId || undefined);
        setPets(prev => prev.filter(p => p.id !== deletingPetId));
        setDeletingPetId(null);
    };

    const deleteCustomer = async () => {
        if (!customer) return;
        if (!confirm('Are you sure you want to delete this customer and all their pets/jobs? This cannot be undone.')) return;

        const db = await getDB();
        const { getActiveBusinessIdSync } = await import('@/contexts/ImpersonationContext');
        const businessId = getActiveBusinessIdSync();
        const v4 = (await import('uuid')).v4;

        // Atomic multi-store transaction for batch deletion
        const tx = db.transaction(['customers', 'pets', 'jobs', 'syncQueue'], 'readwrite');

        // 1. Queue Pet deletions
        const customerPets = await tx.objectStore('pets').index('by-customer').getAll(customer.id);
        for (const p of customerPets) {
            await tx.objectStore('pets').delete(p.id);
            await tx.objectStore('syncQueue').add({
                id: v4(),
                action: 'DELETE',
                entityType: 'PET',
                entityId: p.id,
                timestamp: Date.now(),
                retryCount: 0,
                businessId: businessId || undefined
            });
        }

        // 2. Queue Job deletions
        const customerJobs = await tx.objectStore('jobs').index('by-customer').getAll(customer.id);
        for (const j of customerJobs) {
            await tx.objectStore('jobs').delete(j.id);
            await tx.objectStore('syncQueue').add({
                id: v4(),
                action: 'DELETE',
                entityType: 'JOB',
                entityId: j.id,
                timestamp: Date.now(),
                retryCount: 0,
                businessId: businessId || undefined
            });
        }

        // 3. Delete customer
        await tx.objectStore('customers').delete(customer.id);
        await tx.objectStore('syncQueue').add({
            id: v4(),
            action: 'DELETE',
            entityType: 'CUSTOMER',
            entityId: customer.id,
            timestamp: Date.now(),
            retryCount: 0,
            businessId: businessId || undefined
        });

        await tx.done;

        // Trigger sync
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('trigger-sync'));
        }

        router.push('/customers');
    };


    if (loading || !customer) return <div className="container" style={{ paddingTop: '2rem' }}>Loading...</div>;

    return (
        <div className="container" style={{ paddingBottom: '100px', paddingTop: 'var(--space-4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
                <button onClick={() => router.back()} style={{ background: 'none', border: 'none', padding: 0, marginRight: 'var(--space-2)' }}>
                    <ChevronLeft size={28} color="var(--brand-primary)" />
                </button>
                <h1 className="text-h2" style={{ marginBottom: 0 }}>Customer Details</h1>
            </div>

            {/* Customer Details (Clickable) */}
            <div
                className="card"
                style={{ marginBottom: 'var(--space-6)', cursor: 'pointer', position: 'relative' }}
                onClick={() => setCustomerModalOpen(true)}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h2 className="text-h2" style={{ color: 'var(--brand-primary)', marginBottom: 4 }}>{customer.name}</h2>
                        <div style={{ color: 'var(--text-secondary)', fontWeight: 500, fontSize: 'var(--font-size-lg)' }}>{customer.phone}</div>
                        <div style={{ display: 'flex', gap: 'var(--space-2)', color: 'var(--text-secondary)', marginTop: 'var(--space-2)' }}>
                            <MapPin size={18} /> <span>{customer.address}</span>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 12 }}>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setCustomerModalOpen(true);
                            }}
                            style={{ background: 'none', border: 'none', padding: 8 }}
                        >
                            <Edit2 size={18} color="var(--text-tertiary)" />
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                deleteCustomer();
                            }}
                            style={{ background: 'none', border: 'none', padding: 8 }}
                        >
                            <Trash2 size={18} color="var(--color-danger)" />
                        </button>
                    </div>
                </div>
                {customer.notes && (
                    <div style={{ marginTop: 'var(--space-3)', background: '#FFF4E5', padding: 'var(--space-2)', borderRadius: 'var(--radius-sm)', fontSize: 'var(--font-size-sm)', color: '#663C00', display: 'flex', gap: 6 }}>
                        <AlertTriangle size={14} style={{ marginTop: 2 }} />
                        <span>{customer.notes}</span>
                    </div>
                )}
            </div>

            {/* Pets Section */}
            <div style={{ marginBottom: 'var(--space-6)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                    <h3 className="text-h2" style={{ fontSize: 'var(--font-size-lg)', marginBottom: 0 }}>Pets</h3>
                    <button
                        onClick={() => { setEditingPetId(null); setPetModalOpen(true); }}
                        style={{ background: 'none', border: 'none', color: 'var(--brand-primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                        <Plus size={18} /> Add Pet
                    </button>
                </div>

                {pets.map(p => (
                    <div key={p.id} className="card" style={{ padding: 'var(--space-3)', marginBottom: 'var(--space-2)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => { setEditingPetId(p.id); setPetModalOpen(true); }}>
                                <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600 }}>{p.name}</div>
                                {p.breed && <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>{p.breed}</div>}
                                {p.notes && <div style={{ fontSize: 'var(--font-size-sm)', marginTop: 4, color: 'var(--color-danger)' }}>⚠️ {p.notes}</div>}
                            </div>
                            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                                <button onClick={() => { setEditingPetId(p.id); setPetModalOpen(true); }} style={{ background: 'none', border: 'none', padding: 4 }}>
                                    <Edit2 size={18} color="var(--text-tertiary)" />
                                </button>
                                <button onClick={() => setDeletingPetId(p.id)} style={{ background: 'none', border: 'none', padding: 4 }}>
                                    <Trash2 size={18} color="var(--text-tertiary)" />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Job History (unchanged) */}
            <div style={{ marginBottom: 'var(--space-6)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                    <h3 className="text-h2" style={{ fontSize: 'var(--font-size-lg)', marginBottom: 0 }}>Job History</h3>
                    <Link href={`/jobs/new?customerId=${customer.id}`} className="btn btn-primary" style={{ width: 'auto', height: 40, padding: '0 16px', fontSize: '14px' }}>
                        <Plus size={16} style={{ marginRight: 4 }} /> New Job
                    </Link>
                </div>
                {history.map(job => (
                    <Link key={job.id} href={`/jobs/${job.id}`} className="card" style={{ marginBottom: 'var(--space-2)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                        <Calendar size={18} color="var(--text-tertiary)" />
                        <div>
                            <div style={{ fontWeight: 600 }}>{job.scheduledDate}</div>
                            <div className="text-sm" style={{ textTransform: 'capitalize' }}>{job.state.replace('_', ' ')}</div>
                        </div>
                    </Link>
                ))}
                {history.length === 0 && <p className="text-sm">No job history</p>}
            </div>

            {/* Modals */}
            <Modal
                isOpen={customerModalOpen}
                onClose={() => setCustomerModalOpen(false)}
                title="Edit Customer"
            >
                <CustomerForm
                    initialData={customer}
                    onSave={saveCustomer}
                    onCancel={() => setCustomerModalOpen(false)}
                />
            </Modal>

            <Modal
                isOpen={petModalOpen}
                onClose={() => setPetModalOpen(false)}
                title={editingPetId ? "Edit Pet" : "New Pet"}
            >
                <PetForm
                    initialData={editingPetId ? pets.find(p => p.id === editingPetId) : {}}
                    onSave={savePet}
                    onCancel={() => setPetModalOpen(false)}
                />
            </Modal>

            <Modal
                isOpen={!!deletingPetId}
                onClose={() => setDeletingPetId(null)}
                title="Delete Pet"
                footer={
                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                        <button onClick={() => setDeletingPetId(null)} className="btn btn-secondary" style={{ flex: 1 }}>
                            Cancel
                        </button>
                        <button
                            onClick={confirmDeletePet}
                            className="btn btn-primary"
                            style={{ flex: 1, backgroundColor: 'var(--color-danger)', borderColor: 'var(--color-danger)', color: 'white' }}
                        >
                            Delete Pet
                        </button>
                    </div>
                }
            >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-4)', textAlign: 'center' }}>
                    <div style={{ color: 'var(--color-danger)', backgroundColor: '#fee2e2', padding: '12px', borderRadius: '50%' }}>
                        <AlertTriangle size={32} />
                    </div>
                    <div>
                        <p style={{ fontWeight: 600, fontSize: 'var(--font-size-lg)', marginBottom: '8px' }}>Are you sure?</p>
                        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', lineHeight: 1.5 }}>
                            This will permanently delete {deletingPetId ? pets.find(p => p.id === deletingPetId)?.name : 'this pet'}. This action cannot be undone.
                        </p>
                    </div>
                </div>
            </Modal>

        </div>
    );
}
