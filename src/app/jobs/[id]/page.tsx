'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { getDB } from '@/lib/db';
import { Job, Customer, Pet, JobState, Settings, Service } from '@/lib/db/schema';
import { JobStateMachine, JobAction } from '@/lib/jobs/stateMachine';
import { saveWithSync } from '@/lib/db/transactions';
import { triggerSMSAction } from '@/lib/sms';
import { v4 as uuidv4 } from 'uuid';
import { formatTime12Hour } from '@/lib/format';

import { ChevronLeft, MapPin, Clock, Send, CreditCard, Star, CheckSquare, DollarSign, Edit2, Trash2, Plus, AlertTriangle, Scissors, X, Phone, MessageCircle, MoreVertical } from 'lucide-react';
import { useScheduling } from '@/hooks/useScheduling';
import Link from 'next/link';
import { PaymentModal } from '@/components/Jobs/PaymentModal';
import { RequestPaymentModal } from '@/components/Jobs/RequestPaymentModal';
import { Modal } from '@/components/UI/Modal';
import { CustomerForm } from '@/components/Customers/CustomerForm';
import { ActionSheet } from '@/components/UI/ActionSheet';

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
    const [requestPaymentModalOpen, setRequestPaymentModalOpen] = useState(false);

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

    // Cancellation & No-Show
    const [moreActionsOpen, setMoreActionsOpen] = useState(false);
    const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
    const [confirmNoShowOpen, setConfirmNoShowOpen] = useState(false);

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

    const { availableSlots, totalDuration } = useScheduling(newDate, job?.services || [], job?.id);

    // Auto-select first available slot if current time is invalid
    useEffect(() => {
        if (rescheduleModalOpen && availableSlots.length > 0) {
            if (!newTime || !availableSlots.includes(newTime)) {
                setNewTime(availableSlots[0]);
            }
        }
    }, [availableSlots, newTime, rescheduleModalOpen]);

    const saveCustomer = async (data: Partial<Customer>) => {
        if (!customer) return;
        const updated = { ...customer, ...data, updatedAt: Date.now() };

        const { getActiveBusinessIdSync } = await import('@/contexts/ImpersonationContext');
        const businessId = getActiveBusinessIdSync();

        await saveWithSync('customers', updated, 'UPDATE', businessId || undefined);
        setCustomer(updated);
        setCustomerModalOpen(false);
    };

    const saveJobNotes = async () => {
        if (!job) return;
        const updated = { ...job, jobNotes, updatedAt: Date.now() };

        const { getActiveBusinessIdSync } = await import('@/contexts/ImpersonationContext');
        const businessId = getActiveBusinessIdSync();

        await saveWithSync('jobs', updated, 'UPDATE', businessId || undefined);
        setJob(updated);
    };

    const updateJobServices = async (newServices: Service[]) => {
        if (!job) return;
        const updated = { ...job, services: newServices, updatedAt: Date.now() };

        const { getActiveBusinessIdSync } = await import('@/contexts/ImpersonationContext');
        const businessId = getActiveBusinessIdSync();

        await saveWithSync('jobs', updated, 'UPDATE', businessId || undefined);
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

                const { getActiveBusinessIdSync } = await import('@/contexts/ImpersonationContext');
                const businessId = getActiveBusinessIdSync();

                await saveWithSync('pets', updated, 'UPDATE', businessId || undefined);
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
        const updated = { ...job, scheduledDate: newDate, scheduledTime: newTime, updatedAt: Date.now() };

        const { getActiveBusinessIdSync } = await import('@/contexts/ImpersonationContext');
        const businessId = getActiveBusinessIdSync();

        await saveWithSync('jobs', updated, 'UPDATE', businessId || undefined);
        setJob(updated);
        setRescheduleModalOpen(false);
    };

    const handleAction = async (action: JobAction) => {
        if (!job) return;

        try {
            if (action === 'REQUEST_PAYMENT') {
                // Show modal to confirm/edit amount before sending SMS
                setRequestPaymentModalOpen(true);
                return;
            }
            if (action === 'LOG_PAYMENT') {
                setPaymentModalOpen(true);
                return;
            }
            if (action === 'SEND_REMINDER' || action === 'SEND_REVIEW_REQUEST') {
                const petNames = pets.map(p => p.name);
                await triggerSMSAction(job, customer!, action, { settings, petNames });
            }
            await JobStateMachine.transition(id, action, {});
            loadData();
        } catch (error) {
            console.error('Action failed:', error);
            alert('Action failed: ' + (error as Error).message);
        }
    };

    const handleCancelJob = async () => {
        if (!job) return;
        try {
            await JobStateMachine.transition(id, 'MARK_CANCELLED', {});
            setConfirmCancelOpen(false);
            router.back();
        } catch (error) {
            console.error('Failed to cancel job:', error);
            alert('Failed to cancel job: ' + (error as Error).message);
        }
    };

    const handleNoShowJob = async () => {
        if (!job) return;
        try {
            await JobStateMachine.transition(id, 'MARK_NO_SHOW', {});
            setConfirmNoShowOpen(false);
            router.back();
        } catch (error) {
            console.error('Failed to mark as no-show:', error);
            alert('Failed to mark as no-show: ' + (error as Error).message);
        }
    };

    // Helper to determine main button action
    // Helper to determine button layout - matching JobCard exactly
    const getButtonLayout = () => {
        if (!job) return null;

        // Completed state: can log payment OR request payment
        if (job.state === JobState.Completed) {
            return {
                primary: { label: 'Log Payment', action: 'LOG_PAYMENT' as JobAction, color: 'btn-primary' },
                secondary: { label: 'Ask for payment', action: 'REQUEST_PAYMENT' as JobAction, color: 'btn-secondary' }
            };
        }

        // PaymentRequested state: payment already requested, can only log it
        if (job.state === JobState.PaymentRequested) {
            return {
                primary: { label: 'Log Payment', action: 'LOG_PAYMENT' as JobAction, color: 'btn-primary' }
            };
        }

        if (job.state === JobState.Paid) {
            return {
                primary: { label: 'Ask for review', action: 'SEND_REVIEW_REQUEST' as JobAction, color: 'btn-primary' },
                secondary: { label: 'Close', action: 'SKIP_REVIEW' as JobAction, color: 'btn-secondary' }
            };
        }

        // States with 1 button
        if (job.state === JobState.Scheduled) {
            return { primary: { label: 'Send Reminder', action: 'SEND_REMINDER' as JobAction, color: 'btn-primary' } };
        }
        if (job.state === JobState.ReminderSent) {
            return { primary: { label: 'Start Job', action: 'MARK_IN_PROGRESS' as JobAction, color: 'btn-primary' } };
        }
        if (job.state === JobState.InProgress) {
            return { primary: { label: 'Finish Job', action: 'MARK_COMPLETE' as JobAction, color: 'btn-success' } };
        }

        return null;
    };
    const buttonLayout = getButtonLayout();

    if (loading || !job || !customer) return <div>Loading...</div>;

    const totalCost = job.services?.reduce((acc, s) => acc + (s.price || 0), 0) || 0;

    return (
        <div className="container" style={{ paddingBottom: 'var(--space-4)', paddingTop: 'var(--space-4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <button onClick={() => router.back()} style={{ background: 'none', border: 'none', padding: 0, marginRight: 'var(--space-2)' }}>
                        <ChevronLeft size={28} color="var(--brand-primary)" />
                    </button>
                    <h1 className="text-h2" style={{ marginBottom: 0 }}>Job Details</h1>
                </div>
                {/* Three-dot menu - only show for active jobs */}
                {job.state !== JobState.Closed && job.state !== JobState.Cancelled && job.state !== JobState.NoShow && (
                    <button
                        onClick={() => setMoreActionsOpen(true)}
                        style={{ background: 'none', border: 'none', padding: 8, cursor: 'pointer' }}
                    >
                        <MoreVertical size={24} color="var(--text-secondary)" />
                    </button>
                )}
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

            {/* Action Buttons - Matching JobCard Layout */}
            {buttonLayout && (
                <div style={{ marginTop: 'var(--space-6)', marginBottom: 'var(--space-4)' }}>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: buttonLayout.secondary ? '1fr 1fr' : '1fr',
                        gap: 'var(--space-3)'
                    }}>
                        <button
                            onClick={() => handleAction(buttonLayout.primary.action)}
                            className={`btn ${buttonLayout.primary.color}`}
                            style={{
                                width: '100%',
                                padding: '18px',
                                fontSize: 'var(--font-size-lg)',
                                fontWeight: 700,
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                gap: 8,
                                boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                                background: job.state === JobState.InProgress
                                    ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                                    : undefined,
                                border: 'none',
                                opacity: 1
                            }}
                        >
                            {buttonLayout.primary.label}
                        </button>
                        {buttonLayout.secondary && (
                            <button
                                onClick={() => handleAction(buttonLayout.secondary.action)}
                                className={`btn ${buttonLayout.secondary.color}`}
                                style={{
                                    width: '100%',
                                    padding: '18px',
                                    fontSize: 'var(--font-size-lg)',
                                    fontWeight: 700,
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    gap: 8,
                                    boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                                    opacity: 1
                                }}
                            >
                                {buttonLayout.secondary.label}
                            </button>
                        )}
                    </div>
                </div>
            )}

            <Modal
                isOpen={rescheduleModalOpen}
                onClose={() => setRescheduleModalOpen(false)}
                title="Reschedule Job"
                footer={(
                    <button onClick={saveSchedule} className="btn btn-primary" style={{ width: '100%' }} disabled={!newTime}>Save New Time</button>
                )}
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>Target Date</span>
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                            Setting: {totalDuration} min
                        </div>
                    </div>
                    <input className="card" type="date" value={newDate} onChange={e => setNewDate(e.target.value)} />

                    <span style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', marginTop: 'var(--space-2)' }}>Available Slots</span>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 8, maxHeight: '30vh', overflowY: 'auto', padding: '4px' }}>
                        {availableSlots.map(slot => (
                            <button
                                key={slot}
                                onClick={() => setNewTime(slot)}
                                style={{
                                    padding: '8px 4px',
                                    borderRadius: 'var(--radius-sm)',
                                    border: newTime === slot ? '2px solid var(--brand-primary)' : '1px solid var(--border-color)',
                                    background: newTime === slot ? 'var(--brand-primary-light)' : 'white',
                                    color: newTime === slot ? 'var(--brand-primary)' : 'var(--text-primary)',
                                    fontWeight: newTime === slot ? 700 : 400,
                                    fontSize: 'var(--font-size-sm)',
                                    cursor: 'pointer'
                                }}
                            >
                                {format(new Date(`2000-01-01T${slot}`), 'h:mm a')}
                            </button>
                        ))}
                        {availableSlots.length === 0 && (
                            <div style={{ gridColumn: '1 / -1', padding: 'var(--space-3)', textAlign: 'center', color: 'var(--color-danger)', fontSize: 'var(--font-size-sm)' }}>
                                No available slots for this date/duration.
                            </div>
                        )}
                    </div>
                </div>
            </Modal>

            <PaymentModal
                isOpen={paymentModalOpen}
                onClose={() => setPaymentModalOpen(false)}
                onConfirm={async (amount, method) => {
                    try {
                        await JobStateMachine.transition(id, 'LOG_PAYMENT', {
                            payment_amount: amount,
                            payment_method: method as any,
                            payment_logged_at: Date.now(),
                            payment_source: 'manual'
                        });
                        setPaymentModalOpen(false);
                        loadData();
                    } catch (error) {
                        console.error('Failed to log payment:', error);
                        alert('Failed to log payment: ' + (error as Error).message);
                    }
                }}
            />

            <RequestPaymentModal
                isOpen={requestPaymentModalOpen}
                onClose={() => setRequestPaymentModalOpen(false)}
                onConfirm={async (amount, selectedPaymentMethods) => {
                    try {
                        // Transition state FIRST (before opening SMS app)
                        // This prevents errors if user returns before SMS is sent
                        await JobStateMachine.transition(id, 'REQUEST_PAYMENT', {
                            payment_amount: amount
                        });

                        // Close modal immediately after state transition
                        setRequestPaymentModalOpen(false);

                        // Reload data to show updated state
                        await loadData();

                        // THEN send SMS (opens SMS app)
                        // User may leave app at this point, but state is already updated
                        await triggerSMSAction(job!, customer!, 'REQUEST_PAYMENT', {
                            settings,
                            amount,
                            selectedPaymentMethods
                        });
                    } catch (error) {
                        console.error('Failed to request payment:', error);
                        alert('Failed to request payment: ' + (error as Error).message);
                    }
                }}
                initialAmount={totalCost}
                pets={pets}
                allServices={allServices}
                jobServices={job?.services || []}
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
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                    <span>${s.price}</span>
                                </div>
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

            {/* ActionSheet for More Actions */}
            <ActionSheet
                isOpen={moreActionsOpen}
                onClose={() => setMoreActionsOpen(false)}
                title="Job Actions"
                options={[
                    {
                        label: 'Mark as Cancelled',
                        action: () => setConfirmCancelOpen(true),
                        variant: 'destructive'
                    },
                    {
                        label: 'Mark as No-Show',
                        action: () => setConfirmNoShowOpen(true),
                        variant: 'destructive'
                    }
                ]}
            />

            {/* Confirmation Modal for Cancellation */}
            <Modal
                isOpen={confirmCancelOpen}
                onClose={() => setConfirmCancelOpen(false)}
                title="Cancel Job?"
                footer={(
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                        <button onClick={() => setConfirmCancelOpen(false)} className="btn btn-secondary" style={{ width: '100%' }}>
                            Go Back
                        </button>
                        <button onClick={handleCancelJob} className="btn btn-danger" style={{ width: '100%', background: 'var(--color-danger)' }}>
                            Yes, Cancel Job
                        </button>
                    </div>
                )}
            >
                <p style={{ color: 'var(--text-secondary)', marginBottom: 0 }}>
                    This will mark the job as cancelled and remove it from your active schedule. The job will still be visible in Past Jobs.
                </p>
            </Modal>

            {/* Confirmation Modal for No-Show */}
            <Modal
                isOpen={confirmNoShowOpen}
                onClose={() => setConfirmNoShowOpen(false)}
                title="Mark as No-Show?"
                footer={(
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                        <button onClick={() => setConfirmNoShowOpen(false)} className="btn btn-secondary" style={{ width: '100%' }}>
                            Go Back
                        </button>
                        <button onClick={handleNoShowJob} className="btn btn-danger" style={{ width: '100%', background: 'var(--color-danger)' }}>
                            Yes, No-Show
                        </button>
                    </div>
                )}
            >
                <p style={{ color: 'var(--text-secondary)', marginBottom: 0 }}>
                    This will mark the job as a no-show and remove it from your active schedule. The job will still be visible in Past Jobs.
                </p>
            </Modal>

        </div>
    );
}
