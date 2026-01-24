'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { getDB } from '@/lib/db';
import { Job, Customer, Pet, JobState, Settings, Service } from '@/lib/db/schema';
import { JobStateMachine, JobAction } from '@/lib/jobs/stateMachine';
import { addToSyncQueue } from '@/lib/db/sync';
import { triggerSMSAction } from '@/lib/sms';
import { v4 as uuidv4 } from 'uuid';
import { formatTime12Hour } from '@/lib/format';

import { ChevronLeft, MapPin, Clock, Send, CreditCard, Star, CheckSquare, DollarSign, Edit2, Trash2, Plus, AlertTriangle, Scissors, X, Phone, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { PaymentModal } from '@/components/Jobs/PaymentModal';
import { Modal } from '@/components/UI/Modal';
import { CustomerForm } from '@/components/Customers/CustomerForm';

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { id } = use(params);

    const [loading, setLoading] = useState(true);
    const [job, setJob] = useState<Job | null>(null);
    const [customer, setCustomer] = useState<Customer | null>(null);
    const [pets, setPets] = useState<Pet[]>([]);
    const [settings, setSettings] = useState<Settings | null>(null);
    const [otherCustomerPets, setOtherCustomerPets] = useState<Pet[]>([]);
    const [jobNotes, setJobNotes] = useState('');
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);

    // Reschedule
    const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
    const [newDate, setNewDate] = useState('');
    const [newTime, setNewTime] = useState('');

    // Services State
    const [allServices, setAllServices] = useState<Service[]>([]);
    const [manageServicesModalOpen, setManageServicesModalOpen] = useState(false);
    const [createServiceMode, setCreateServiceMode] = useState(false);
    const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
    const [sName, setSName] = useState('');
    const [sPrice, setSPrice] = useState('');

    // Picking Service for Pet
    const [pickingServiceForPetId, setPickingServiceForPetId] = useState<string | null>(null);

    // Modals
    const [customerModalOpen, setCustomerModalOpen] = useState(false);
    const [petModalOpen, setPetModalOpen] = useState(false);
    const [editingPetId, setEditingPetId] = useState<string | null>(null);
    const [addExistingPetModalOpen, setAddExistingPetModalOpen] = useState(false);

    // Pet Form
    const [pName, setPName] = useState('');
    const [pBreed, setPBreed] = useState('');
    const [pSize, setPSize] = useState('');
    const [pAge, setPAge] = useState('');
    const [pNotes, setPNotes] = useState('');

    const loadData = async () => {
        const db = await getDB();
        const j = await db.get('jobs', id);
        if (!j) {
            alert('Job not found');
            router.push('/');
            return;
        }
        setJob(j);
        setJobNotes(j.jobNotes || '');
        setNewDate(j.scheduledDate);
        setNewTime(j.scheduledTime);

        const c = await db.get('customers', j.customerId);
        setCustomer(c || null);

        const jobPets = await Promise.all(j.petIds.map(pid => db.get('pets', pid)));
        const validJobPets = jobPets.filter(Boolean) as Pet[];
        setPets(validJobPets);

        if (c) {
            const allPets = await db.getAll('pets');
            const cPets = allPets.filter(p => p.customerId === c.id);
            const jobPetIds = validJobPets.map(p => p.id);
            setOtherCustomerPets(cPets.filter(p => !jobPetIds.includes(p.id)));
        }

        const services = await db.getAll('services');
        setAllServices(services || []);

        const s = await db.get('settings', 'default');
        setSettings(s || null);

        setLoading(false);
    };

    useEffect(() => {
        loadData();
    }, [id]);

    const saveCustomer = async (data: Partial<Customer>) => {
        if (!customer) return;
        const db = await getDB();
        const updated = { ...customer, ...data, updatedAt: Date.now() };
        await db.put('customers', updated);
        await addToSyncQueue('UPDATE', 'CUSTOMER', customer.id, updated);
        setCustomer(updated);
        setCustomerModalOpen(false);
    };

    const saveJobNotes = async () => {
        if (!job) return;
        const db = await getDB();
        const updated = { ...job, jobNotes, updatedAt: Date.now() };
        await db.put('jobs', updated);
        await addToSyncQueue('UPDATE', 'JOB', id, updated);
        setJob(updated);
    };

    const updateJobServices = async (newServices: Service[]) => {
        if (!job) return;
        const db = await getDB();
        const updated = { ...job, services: newServices, updatedAt: Date.now() };
        await db.put('jobs', updated);
        await addToSyncQueue('UPDATE', 'JOB', id, updated);
        setJob(updated);
    };

    const toggleServiceForPet = (s: Service, petId: string) => {
        if (!job) return;
        const currentServices = job.services || [];
        const exists = currentServices.find(x => x.id === s.id && x.petId === petId);
        let newServices;
        if (exists) {
            newServices = currentServices.filter(x => !(x.id === s.id && x.petId === petId));
        } else {
            newServices = [...currentServices, { ...s, petId }];
        }
        updateJobServices(newServices);
    };

    const savePet = async () => {
        if (!pName) return;
        if (editingPetId) {
            const db = await getDB();
            const existing = await db.get('pets', editingPetId);
            if (existing) {
                const updated = { ...existing, name: pName, breed: pBreed, size: pSize, age: pAge, notes: pNotes, updatedAt: Date.now() };
                await db.put('pets', updated);
                await addToSyncQueue('UPDATE', 'PET', editingPetId, updated);
                setPets(prev => prev.map(p => p.id === editingPetId ? updated : p));
            }
        }
        setPetModalOpen(false);
    };

    const openEditPetModal = (pet: Pet) => {
        setEditingPetId(pet.id);
        setPName(pet.name);
        setPBreed(pet.breed || '');
        setPSize(pet.size || '');
        setPAge(pet.age || '');
        setPNotes(pet.notes || '');
        setPetModalOpen(true);
    };

    const saveSchedule = async () => {
        if (!job) return;
        const db = await getDB();
        const updated = { ...job, scheduledDate: newDate, scheduledTime: newTime, updatedAt: Date.now() };
        await db.put('jobs', updated);
        await addToSyncQueue('UPDATE', 'JOB', id, updated);
        setJob(updated);
        setRescheduleModalOpen(false);
    };

    const handleAction = async (action: JobAction) => {
        if (!job) return;
        if (action === 'REQUEST_PAYMENT') {
            await triggerSMSAction(job, customer!, 'REQUEST_PAYMENT');
            await JobStateMachine.transition(id, 'REQUEST_PAYMENT', {});
            loadData();
            return;
        }
        if (action === 'LOG_PAYMENT') {
            setPaymentModalOpen(true);
            return;
        }
        if (action === 'SEND_REMINDER') {
            await triggerSMSAction(job, customer!, 'SEND_REMINDER');
        }
        await JobStateMachine.transition(id, action, {});
        loadData();
    };

    // Helper to determine main button action
    const getActionState = () => {
        if (!job) return null;
        if (job.state === JobState.Scheduled) return { label: 'Send Reminder Text', action: 'SEND_REMINDER' as JobAction, color: 'btn-primary' };
        if (job.state === JobState.ReminderSent) return { label: 'Start Job', action: 'START_JOB' as JobAction, color: 'btn-primary' };
        if (job.state === JobState.InProgress) return { label: 'Complete Job', action: 'COMPLETE_JOB' as JobAction, color: 'btn-success' };
        if (job.state === JobState.Completed) return { label: 'Request Payment', action: 'REQUEST_PAYMENT' as JobAction, color: 'btn-primary' };
        if (job.state === JobState.PaymentRequested) return { label: 'Log Payment', action: 'LOG_PAYMENT' as JobAction, color: 'btn-secondary' };
        return null;
    };
    const mainAction = getActionState();

    if (loading || !job || !customer) return <div>Loading...</div>;

    const totalCost = job.services?.reduce((acc, s) => acc + (s.price || 0), 0) || 0;

    return (
        <div className="container" style={{ paddingBottom: '160px', paddingTop: 'var(--space-4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
                <button onClick={() => router.back()} style={{ background: 'none', border: 'none', padding: 0, marginRight: 'var(--space-2)' }}>
                    <ChevronLeft size={28} color="var(--brand-primary)" />
                </button>
                <h1 className="text-h2" style={{ marginBottom: 0 }}>Job Details</h1>
            </div>

            {/* Customer Section */}
            <div
                className="card"
                style={{ marginBottom: 'var(--space-4)', cursor: 'pointer', position: 'relative' }}
                onClick={() => setCustomerModalOpen(true)}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h2 className="text-h2" style={{ color: 'var(--brand-primary)', marginBottom: 4 }}>{customer.name}</h2>
                        <div style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{customer.phone}</div>
                        <div style={{ display: 'flex', gap: 'var(--space-2)', color: 'var(--text-secondary)', marginTop: 'var(--space-1)' }}>
                            <MapPin size={16} /> <span>{customer.address}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
                            <a
                                href={`tel:${customer.phone}`}
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    padding: '6px 12px',
                                    borderRadius: 20,
                                    background: 'var(--surface-background)',
                                    border: '1px solid var(--border-color)',
                                    color: 'var(--text-primary)',
                                    fontSize: 'var(--font-size-sm)',
                                    fontWeight: 600,
                                    textDecoration: 'none'
                                }}
                            >
                                <Phone size={14} /> Call
                            </a>
                            <a
                                href={`sms:${customer.phone}`}
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    padding: '6px 12px',
                                    borderRadius: 20,
                                    background: 'var(--surface-background)',
                                    border: '1px solid var(--border-color)',
                                    color: 'var(--text-primary)',
                                    fontSize: 'var(--font-size-sm)',
                                    fontWeight: 600,
                                    textDecoration: 'none'
                                }}
                            >
                                <MessageCircle size={14} /> Text
                            </a>
                        </div>
                    </div>
                    <Edit2 size={18} color="var(--text-tertiary)" />
                </div>
                {customer.notes && (
                    <div style={{ marginTop: 'var(--space-2)', background: '#FFF4E5', padding: 'var(--space-2)', borderRadius: 'var(--radius-sm)', fontSize: 'var(--font-size-sm)', color: '#663C00', display: 'flex', gap: 6 }}>
                        <AlertTriangle size={14} style={{ marginTop: 2 }} />
                        <span>{customer.notes}</span>
                    </div>
                )}
            </div>

            {/* Schedule Section */}
            <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                    <label className="text-sm" style={{ fontWeight: 600 }}>Schedule</label>
                    <button onClick={() => setRescheduleModalOpen(true)} style={{ background: 'none', border: 'none', padding: 4 }}>
                        <Edit2 size={18} color="var(--text-tertiary)" />
                    </button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', background: 'var(--surface-background)', padding: 'var(--space-2)', borderRadius: 'var(--radius-md)' }}>
                        <Clock size={20} color="var(--brand-primary)" />
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: 700, fontSize: 'var(--font-size-lg)' }}>{formatTime12Hour(job.scheduledTime)}</span>
                            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                                {job.scheduledDate ? format(new Date(job.scheduledDate), 'EEE, MMM d') : ''}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Pets & Services Section */}
            <div style={{ marginBottom: 'var(--space-4)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                    <label className="text-sm" style={{ fontWeight: 600 }}>Pets & Services</label>
                </div>
                {pets.map(p => (
                    <div key={p.id} className="card" style={{ marginBottom: 'var(--space-3)', padding: 'var(--space-3)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 'var(--font-size-base)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    {p.name}
                                    <button onClick={() => openEditPetModal(p)} style={{ background: 'none', border: 'none', padding: 4 }}>
                                        <Edit2 size={14} color="var(--text-tertiary)" />
                                    </button>
                                </div>
                                <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                                    {p.breed} {p.size ? `• ${p.size}` : ''} {p.age ? `• ${p.age}` : ''}
                                </div>
                                {p.notes && <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-danger)', marginTop: 4 }}>⚠️ {p.notes}</div>}
                            </div>
                        </div>

                        {/* Services for this Pet */}
                        <div style={{ marginTop: 'var(--space-3)', borderTop: '1px solid var(--border-color)', paddingTop: 'var(--space-2)' }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                {job.services?.filter(s => s.petId === p.id).map((s, idx) => (
                                    <div key={`${s.id}-${idx}`} onClick={() => toggleServiceForPet(s, p.id)} style={{
                                        background: 'var(--brand-primary)', color: 'white', padding: '4px 10px', borderRadius: 12, fontSize: 'var(--font-size-xs)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer'
                                    }}>
                                        {s.name} (${s.price}) <X size={12} />
                                    </div>
                                ))}
                                <button
                                    onClick={() => setPickingServiceForPetId(p.id)}
                                    style={{
                                        background: 'none', border: '1px dashed var(--brand-primary)', color: 'var(--brand-primary)', padding: '4px 10px', borderRadius: 12, fontSize: 'var(--font-size-xs)', fontWeight: 600
                                    }}>
                                    + Manage Services
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Total Cost */}
            <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 700, fontSize: 'var(--font-size-lg)', marginBottom: 'var(--space-4)' }}>
                <span>Total</span>
                <span>${totalCost}</span>
            </div>

            {/* Job Visit Notes */}
            <div style={{ marginBottom: 'var(--space-6)' }}>
                <label style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--space-2)', display: 'block', color: 'var(--text-secondary)' }}>Job Visit Notes</label>
                <textarea
                    className="card"
                    placeholder="Add notes about this visit..."
                    value={jobNotes}
                    onChange={e => setJobNotes(e.target.value)}
                    onBlur={saveJobNotes}
                    style={{ width: '100%', minHeight: 100, fontSize: 'var(--font-size-base)' }}
                />
            </div>

            {/* Main Action Button */}
            {mainAction && (
                <div style={{ position: 'fixed', bottom: 90, left: 20, right: 20, zIndex: 10 }}>
                    <button
                        onClick={() => handleAction(mainAction.action)}
                        className={`btn ${mainAction.color}`}
                        style={{ width: '100%', padding: '16px', fontSize: 'var(--font-size-lg)', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    >
                        <Send size={20} />
                        {mainAction.label}
                    </button>
                </div>
            )}

            {/* Reschedule Modal */}
            <Modal
                isOpen={rescheduleModalOpen}
                onClose={() => setRescheduleModalOpen(false)}
                title="Reschedule Job"
                footer={(
                    <button onClick={saveSchedule} className="btn btn-primary" style={{ width: '100%' }}>Save New Time</button>
                )}
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                    <label>
                        <span style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>Date</span>
                        <input className="card" type="date" value={newDate} onChange={e => setNewDate(e.target.value)} />
                    </label>
                    <label>
                        <span style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>Time</span>
                        <input className="card" type="time" value={newTime} onChange={e => setNewTime(e.target.value)} />
                    </label>
                </div>
            </Modal>

            <PaymentModal
                isOpen={paymentModalOpen}
                onClose={() => setPaymentModalOpen(false)}
                onConfirm={async (amount, method) => {
                    await JobStateMachine.transition(id, 'LOG_PAYMENT', {
                        payment_amount: amount,
                        payment_method: method as any,
                        payment_logged_at: Date.now(),
                        payment_source: 'manual'
                    });
                    setPaymentModalOpen(false);
                    loadData();
                }}
            />

            <Modal
                isOpen={customerModalOpen}
                onClose={() => setCustomerModalOpen(false)}
                title="Edit Customer"
            >
                {customer && (
                    <CustomerForm
                        initialData={customer}
                        onSave={saveCustomer}
                        onCancel={() => setCustomerModalOpen(false)}
                    />
                )}
            </Modal>

            {/* Add Service Modal */}
            <Modal
                isOpen={!!pickingServiceForPetId}
                onClose={() => setPickingServiceForPetId(null)}
                title="Add Service"
                footer={(
                    <button onClick={() => setPickingServiceForPetId(null)} className="btn btn-primary" style={{ width: '100%' }}>Done</button>
                )}
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                    {allServices.map(s => {
                        const isSelected = job.services?.some(x => x.id === s.id && x.petId === pickingServiceForPetId);
                        return (
                            <div
                                key={s.id}
                                onClick={() => pickingServiceForPetId && toggleServiceForPet(s, pickingServiceForPetId)}
                                style={{
                                    padding: 'var(--space-3)',
                                    border: isSelected ? '2px solid var(--brand-primary)' : '1px solid var(--border-color)',
                                    borderRadius: 'var(--radius-md)',
                                    background: isSelected ? 'var(--brand-primary-light)' : 'white',
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    cursor: 'pointer'
                                }}
                            >
                                <span style={{ fontWeight: 600 }}>{s.name}</span>
                                <span>${s.price}</span>
                            </div>
                        );
                    })}
                </div>
            </Modal>

            {/* Edit Pet Modal */}
            <Modal
                isOpen={petModalOpen}
                onClose={() => setPetModalOpen(false)}
                title="Edit Pet"
                footer={(
                    <button onClick={savePet} className="btn btn-primary" style={{ width: '100%' }}>Save Pet</button>
                )}
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                    <input className="card" placeholder="Pet Name" value={pName} onChange={e => setPName(e.target.value)} />
                    <input className="card" placeholder="Breed" value={pBreed} onChange={e => setPBreed(e.target.value)} />
                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                        <input className="card" placeholder="Size" value={pSize} onChange={e => setPSize(e.target.value)} style={{ flex: 1 }} />
                        <input className="card" placeholder="Age" value={pAge} onChange={e => setPAge(e.target.value)} style={{ flex: 1 }} />
                    </div>
                    <label>
                        <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>Notes</span>
                        <textarea className="card" placeholder="Notes..." value={pNotes} onChange={e => setPNotes(e.target.value)} style={{ width: '100%', minHeight: 80 }} />
                    </label>
                </div>
            </Modal>

        </div>
    );
}
