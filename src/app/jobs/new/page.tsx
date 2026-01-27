'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getDB } from '@/lib/db';
import { Customer, Pet, JobState, Service, Lead } from '@/lib/db/schema';
import { ChevronLeft, Search, Plus, User, Dog, Edit2, Check, X, Scissors, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { Modal } from '@/components/UI/Modal';
import { addToSyncQueue } from '@/lib/db/sync';
import { createClient } from '@/utils/supabase/client';
import { useImpersonationContextSafe } from '@/contexts/ImpersonationContext';
import { checkStorageQuota } from '@/lib/storage-monitor';
import { Suspense } from 'react';

const NewJobContent = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const leadId = searchParams.get('leadId');
    const { getActiveBusinessId } = useImpersonationContextSafe();

    // -- Data --
    const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
    const [allPets, setAllPets] = useState<Pet[]>([]);
    const [allServices, setAllServices] = useState<Service[]>([]); // User defined library
    const [loading, setLoading] = useState(true);

    // -- UI State --
    const [searchQuery, setSearchQuery] = useState('');
    const [showResults, setShowResults] = useState(false);

    // -- Job State --
    const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
    const [selectedPetIds, setSelectedPetIds] = useState<string[]>([]);
    const [selectedServices, setSelectedServices] = useState<(Service & { petId?: string })[]>([]);
    const [pickingServiceForPetId, setPickingServiceForPetId] = useState<string | null>(null); // For modal

    // Job Details
    const [date, setDate] = useState('');
    const [time, setTime] = useState('09:00');
    const [jobAddress, setJobAddress] = useState('');
    const [jobNotes, setJobNotes] = useState('');

    // -- Modals State --
    const [customerModalOpen, setCustomerModalOpen] = useState(false);
    const [petModalOpen, setPetModalOpen] = useState(false);
    const [serviceModalOpen, setServiceModalOpen] = useState(false);

    // -- Form Data (for Modals) --
    // Customer Form
    const [cFormId, setCFormId] = useState<string | null>(null); // If editing
    const [cName, setCName] = useState('');
    const [cPhone, setCPhone] = useState('');
    const [cAddress, setCAddress] = useState('');
    const [cNotes, setCNotes] = useState('');

    // Pet Form
    const [pFormId, setPFormId] = useState<string | null>(null); // If editing
    const [pName, setPName] = useState('');
    const [pBreed, setPBreed] = useState('');
    const [pSize, setPSize] = useState('');
    const [pAge, setPAge] = useState('');
    const [pNotes, setPNotes] = useState('');

    // Service Form
    const [createServiceMode, setCreateServiceMode] = useState(false);
    const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
    const [sName, setSName] = useState('');
    const [sPrice, setSPrice] = useState('');

    // -- Conversion State --
    const [convertingLead, setConvertingLead] = useState<Lead | null>(null);


    // -- Initialization --
    useEffect(() => {
        setDate(format(new Date(), 'yyyy-MM-dd'));
        loadData();
    }, []);

    const loadData = async () => {
        const db = await getDB();
        const customers = await db.getAll('customers');
        const pets = await db.getAll('pets');
        const services = await db.getAll('services');
        setAllCustomers(customers);
        setAllPets(pets);
        setAllServices(services || []);
        setAllServices(services || []);
        setLoading(false);

        // -- Smart Hydration for Lead --
        if (leadId) {
            await handleLeadConversion(leadId, customers, services, pets);
        }
    };

    const handleLeadConversion = async (lid: string, customers: Customer[], services: Service[], pets: Pet[]) => {
        const db = await getDB();
        // Try fetching Lead from IDB (synced)
        // If not found locally, we might need to fetch plain Supabase, but let's assume sync works for now or fallback
        let lead = await db.get('leads', lid) as Lead | undefined;

        // If not in IDB, try fetching from Supabase directly
        if (!lead) {
            console.warn('Lead not found in local DB, fetching from Supabase...');
            const supabase = createClient();
            const { data, error } = await supabase
                .from('leads')
                .select('*')
                .eq('id', lid)
                .single();

            if (data) {
                lead = {
                    id: data.id,
                    businessId: data.business_id,
                    status: data.status,
                    ownerName: data.owner_name,
                    ownerPhone: data.owner_phone,
                    ownerEmail: data.owner_email,
                    ownerAddress: data.owner_address,
                    serviceAreaZip: data.service_area_zip,
                    petDetails: data.pet_details,
                    preferredDates: data.preferred_dates,
                    serviceIds: data.service_ids,
                    waiverSigned: data.waiver_signed,
                    createdAt: data.created_at,
                    notes: data.notes
                } as Lead;

                // FIX: Save this lead to local DB so subsequent updates work!
                await db.put('leads', lead);
            }
        }

        if (lead) {
            console.log('Converting Lead:', lead);
            setConvertingLead(lead); // FIX: Set state properly

            // 1. Match Customer by Phone
            const existingCustomer = customers.find(c => c.phone === lead!.ownerPhone);

            if (existingCustomer) {
                // MATCH FOUND
                setSelectedCustomerId(existingCustomer.id);
                setJobAddress(existingCustomer.address || lead.ownerAddress || '');
                alert(`Matched existing customer: ${existingCustomer.name}`);


                // 1.1 Match Pets (Fuzzy by Name)
                if (lead.petDetails && lead.petDetails.length > 0) {
                    const myPets = allPets.filter(p => p.customerId === existingCustomer.id);
                    const matchedPetIds: string[] = [];

                    lead.petDetails.forEach(leadPet => {
                        // Simple name compare (case insensitive)
                        const match = myPets.find(p => p.name.toLowerCase() === leadPet.name.toLowerCase());
                        if (match) {
                            matchedPetIds.push(match.id);
                        } else {
                            // If pet not found for existing customer, maybe we should prompt?
                            // For now, we only auto-select if found.
                        }
                    });

                    if (matchedPetIds.length > 0) {
                        setSelectedPetIds(matchedPetIds);
                    }
                }

            } else {
                // NO MATCH - Open New Customer Modal Pre-filled
                setCFormId(null);
                setCName(lead.ownerName);
                setCPhone(lead.ownerPhone);
                setCAddress(lead.ownerAddress || ''); // Add ownerAddress to Lead schema if not there, or generic
                // Note: schema update added ownerAddress to Lead? I think I missed that in the plan but added it to submit-lead.ts
                // Let's assume it's there or handle match.

                // Pre-fill notes
                let notes = lead.notes ? `[Lead Notes]: ${lead.notes}` : '';
                if (lead.petDetails && lead.petDetails.length > 0) {
                    notes += `\n[Pet Info]: ${lead.petDetails.map(p => `${p.name} (${p.breed})`).join(', ')}`;
                }
                setCNotes(notes);

                setCustomerModalOpen(true);
            }

            // 2. Pre-select Services
            if (lead.serviceIds && lead.serviceIds.length > 0) {
                const matchedServices = services.filter(s => lead!.serviceIds?.includes(s.id));
                setSelectedServices(matchedServices);
            }

            // 3. Pre-fill Job Notes
            if (lead.notes) {
                setJobNotes(prev => prev ? `${prev}\n${lead!.notes}` : lead!.notes || '');
            }

            // 4. Pre-fill Preferred Time (simplified)
            if (lead.preferredDates && lead.preferredDates.length > 0) {
                // Parse date string "Mon, Oct 24 at 10:00 AM"
                // Very rough parsing
                const first = lead.preferredDates[0];
                // Try to extract time?
                // Just append to notes for now to be safe
                setJobNotes(prev => `${prev}\nPreferred: ${lead.preferredDates.join(', ')}`);

                // Try parse
                parsePreferredDate(lead.preferredDates[0]);
            }
        }

        // Helper defined inside to ensure scope access (though strictly it should have worked derived, being safer here)
        // actually function declarations are hoisted so we can call it above.
        function parsePreferredDate(dateStr: string) {
            try {
                if (!dateStr.includes(' at ')) return;
                const parts = dateStr.split(' at ');
                const timePart = parts[1];

                if (timePart.includes(':')) {
                    let [time, modifier] = timePart.split(' ');
                    let [hours, minutes] = time.split(':');
                    if (modifier === 'PM' && hours !== '12') hours = String(parseInt(hours) + 12);
                    if (modifier === 'AM' && hours === '12') hours = '00';
                    setTime(`${hours}:${minutes}`);
                }

                const currentYear = new Date().getFullYear();
                const datePartParts = parts[0].split(', ');
                if (datePartParts.length > 1) {
                    const datePart = datePartParts[1];
                    const parsed = new Date(`${datePart}, ${currentYear}`);
                    if (!isNaN(parsed.getTime())) {
                        setDate(format(parsed, 'yyyy-MM-dd'));
                    }
                }
            } catch (e) {
                console.warn('Failed to parse preferred date', dateStr, e);
            }
        }
    };

    // -- Search Logic --
    const filteredCustomers = useMemo(() => {
        if (!searchQuery) return [];
        const q = searchQuery.toLowerCase();

        // "One letter" check done in rendering to show all, but here we just filter normally
        return allCustomers.filter(c => {
            if (c.name.toLowerCase().startsWith(q)) return true; // Priority
            if (c.name.toLowerCase().includes(q)) return true;
            if (c.phone.includes(q)) return true;

            // Pet match
            const myPets = allPets.filter(p => p.customerId === c.id);
            if (myPets.some(p => p.name.toLowerCase().includes(q))) return true;

            return false;
        }).slice(0, 3); // Max 3 results as requested
    }, [searchQuery, allCustomers, allPets]);


    // -- Handlers -- 

    const handleSelectCustomer = (c: Customer) => {
        setSelectedCustomerId(c.id);
        setJobAddress(c.address || ''); // Pre-fill job address
        setSelectedPetIds([]); // Reset pets
        setSearchQuery('');
        setShowResults(false);
    };

    const handleClearCustomer = () => {
        setSelectedCustomerId(null);
        setSelectedPetIds([]);
        setJobAddress('');
    };

    // Customer Modal Handlers
    const openNewCustomerModal = () => {
        setCFormId(null);
        setCName(searchQuery || ''); // Pre-fill with search query if available
        setCPhone('');
        setCAddress('');
        setCNotes('');
        setCustomerModalOpen(true);
        setShowResults(false); // Close search dropdown
    };

    const openEditCustomerModal = () => {
        const c = allCustomers.find(cx => cx.id === selectedCustomerId);
        if (!c) return;
        setCFormId(c.id);
        setCName(c.name);
        setCPhone(c.phone);
        setCAddress(c.address || '');
        setCNotes(c.notes || '');
        setCustomerModalOpen(true);
    };

    const saveCustomer = async () => {
        if (!cName || !cPhone) {
            alert('Name and Phone are required');
            return;
        }

        const db = await getDB();

        if (cFormId) {
            // Edit existing
            const existing = allCustomers.find(c => c.id === cFormId);
            const updated = {
                ...existing!,
                name: cName,
                phone: cPhone,
                address: cAddress,
                notes: cNotes,
                updatedAt: Date.now()
            };
            await db.put('customers', updated);
            await addToSyncQueue('UPDATE', 'CUSTOMER', cFormId, updated);

            // Local state update
            setAllCustomers(prev => prev.map(p => p.id === cFormId ? updated : p));
            // Update job address if it matched the old one
            if (jobAddress === existing?.address) setJobAddress(cAddress);

            setCustomerModalOpen(false);
        } else {
            // Create New
            const newId = uuidv4();
            const newC: Customer = {
                id: newId,
                name: cName,
                phone: cPhone,
                address: cAddress,
                notes: cNotes,
                createdAt: Date.now(),
                updatedAt: Date.now()
            };
            await db.put('customers', newC);
            await addToSyncQueue('CREATE', 'CUSTOMER', newId, newC);

            setAllCustomers(prev => [...prev, newC]);
            setSelectedCustomerId(newId);
            setJobAddress(cAddress);
            setCustomerModalOpen(false);

            // AUTO-OPEN PET MODAL FOR NEW CUSTOMER
            // Check if we have converting lead data to pre-fill
            if (convertingLead && convertingLead.petDetails?.length > 0) {
                // Pre-fill from first pet
                const firstPet = convertingLead.petDetails[0];
                setPFormId(null);
                setPName(firstPet.name);
                setPBreed(firstPet.breed || '');
                // Add logic for age/weight into notes?
                let pNote = '';
                if (firstPet.age) pNote += `Age: ${firstPet.age} `;
                if (firstPet.weight) pNote += `Weight: ${firstPet.weight} `;
                setPNotes(pNote.trim());
                setPetModalOpen(true);
            } else {
                openNewPetModal();
            }
        }
    };

    // Pet Modal Handlers
    const openNewPetModal = () => {
        setPFormId(null);
        setPName('');
        setPBreed('');
        setPSize('');
        setPAge('');
        setPNotes('');
        setPetModalOpen(true);
    };

    const openEditPetModal = (petId: string) => {
        const p = allPets.find(pt => pt.id === petId);
        if (!p) return;
        setPFormId(petId);
        setPName(p.name);
        setPBreed(p.breed || '');
        setPSize(p.size || '');
        setPAge(p.age || '');
        setPNotes(p.notes || '');
        setPetModalOpen(true);
    };

    const savePet = async () => {
        if (!pName) {
            alert('Pet Name is required');
            return;
        }
        if (!selectedCustomerId) return;

        const db = await getDB();

        if (pFormId) {
            // Edit
            const existing = allPets.find(p => p.id === pFormId);
            const updated: Pet = {
                ...existing!,
                name: pName,
                breed: pBreed,
                size: pSize,
                age: pAge,
                notes: pNotes,
                updatedAt: Date.now()
            };
            await db.put('pets', updated);
            await addToSyncQueue('UPDATE', 'PET', pFormId, updated);

            setAllPets(prev => prev.map(p => p.id === pFormId ? updated : p));
            setPetModalOpen(false);
        } else {
            // Create New
            const newId = uuidv4();
            const newP: Pet = {
                id: newId,
                customerId: selectedCustomerId,
                name: pName,
                breed: pBreed,
                size: pSize,
                age: pAge,
                notes: pNotes,
                createdAt: Date.now(),
                updatedAt: Date.now()
            };
            await db.put('pets', newP);
            await addToSyncQueue('CREATE', 'PET', newId, newP);

            setAllPets(prev => [...prev, newP]);
            setSelectedPetIds(prev => [...prev, newId]); // Auto-select new pet
            setPetModalOpen(false);
        }
    };

    // Service Handlers
    const toggleServiceForPet = (s: Service, petId: string) => {
        const exists = selectedServices.find(x => x.id === s.id && x.petId === petId);
        if (exists) {
            setSelectedServices(prev => prev.filter(x => !(x.id === s.id && x.petId === petId)));
        } else {
            setSelectedServices(prev => [...prev, { ...s, petId }]);
        }
    };

    const openManageServicesModal = () => {
        setCreateServiceMode(false);
        setEditingServiceId(null);
        setSName('');
        setSPrice('');
        setServiceModalOpen(true);
    };

    const startEditService = (s: Service) => {
        setEditingServiceId(s.id);
        setSName(s.name);
        setSPrice(s.price.toString());
        setCreateServiceMode(true);
    };

    const deleteService = async (id: string) => {
        if (!confirm('Delete this service?')) return;
        const db = await getDB();
        await db.delete('services', id);
        await addToSyncQueue('DELETE', 'SERVICE', id);
        setAllServices(prev => prev.filter(s => s.id !== id));
        setSelectedServices(prev => prev.filter(s => s.id !== id)); // This might remove from all pets, which is correct
    };

    const saveService = async () => {
        if (!sName) {
            alert('Name is required');
            return;
        }

        const db = await getDB();
        const priceNum = parseFloat(sPrice) || 0;

        if (editingServiceId) {
            // Update Existing
            const updatedS: Service = {
                id: editingServiceId,
                name: sName,
                price: priceNum,
                createdAt: Date.now() // technically preserve old date but this is fine
            };
            await db.put('services', updatedS);
            await addToSyncQueue('UPDATE', 'SERVICE', editingServiceId, updatedS);
            setAllServices(prev => prev.map(s => s.id === editingServiceId ? updatedS : s));
            setSelectedServices(prev => prev.map(s => s.id === editingServiceId ? updatedS : s));
            setCreateServiceMode(false);
            setEditingServiceId(null);
        } else {
            // Create New
            const newId = uuidv4();
            const newS: Service = {
                id: newId,
                name: sName,
                price: priceNum,
                createdAt: Date.now()
            };
            await db.put('services', newS);
            await addToSyncQueue('CREATE', 'SERVICE', newId, newS);
            setAllServices(prev => [...prev, newS]);
            setSelectedServices(prev => [...prev, newS]);
            setCreateServiceMode(false);
        }
    };


    const handleCreateJob = async () => {
        if (!selectedCustomerId) {
            alert('Please select a customer');
            return;
        }
        if (selectedPetIds.length === 0) {
            alert('Please select at least one pet');
            return;
        }

        // 0. Check Storage Quota
        const { hasRisk, remaining } = await checkStorageQuota();
        if (hasRisk && remaining < 1024 * 1024) { // Only block if < 1MB
            alert('Your browser storage is extremely full. Please clear space to ensure data is saved.');
            return;
        }

        const db = await getDB();
        const jobId = uuidv4();

        // Get active business ID for impersonation support
        const activeBusinessId = await getActiveBusinessId();

        // Snapshot notes
        const customer = allCustomers.find(c => c.id === selectedCustomerId);
        const myPets = allPets.filter(p => selectedPetIds.includes(p.id));

        await db.put('jobs', {
            id: jobId,
            customerId: selectedCustomerId,
            petIds: selectedPetIds,
            state: JobState.Scheduled,
            scheduledDate: date,
            scheduledTime: time,
            address: jobAddress,
            jobNotes, // Visit specific
            services: selectedServices,
            customerNotes: customer?.notes, // Snapshot
            petNotes: myPets.map(p => `${p.name}: ${p.notes}`).join('\n'), // Snapshot
            createdAt: Date.now(),
            updatedAt: Date.now()
        });

        // Pass businessId if available (from context)
        await addToSyncQueue('CREATE', 'JOB', jobId, {
            id: jobId,
            customerId: selectedCustomerId,
            petIds: selectedPetIds,
            state: JobState.Scheduled,
            scheduledDate: date,
            scheduledTime: time,
            address: jobAddress,
            jobNotes,
            services: selectedServices,
            customerNotes: customer?.notes,
            petNotes: myPets.map(p => `${p.name}: ${p.notes}`).join('\n'),
            updatedAt: Date.now()
        }, activeBusinessId || undefined);

        // -- AUTO-UPDATE LEAD STATUS --
        if (leadId) {
            const leadUpdate: Partial<Lead> = {
                status: 'scheduled',
                // @ts-ignore - Lead interface might use string for dates? schema says createdAt string. 
                // We don't have an updatedAt on Lead schema yet? 
                // Let's just update the status field.
            };

            // We need to update local DB and Sync.
            // First fetch the lead to be safe or just patch it? 
            // IDB 'leads' store.
            let leadToUpdate = await db.get('leads', leadId);

            // Fallback: If not found in DB (race condition?), use our state which we know we have
            if (!leadToUpdate && convertingLead && convertingLead.id === leadId) {
                leadToUpdate = convertingLead;
            }

            if (leadToUpdate) {
                const updatedLead = { ...leadToUpdate, status: 'scheduled' };
                await db.put('leads', updatedLead);
                await addToSyncQueue('UPDATE', 'LEAD', leadId, updatedLead);
            }
        }

        router.push('/');
    };

    // Helper: Get current customer object
    const selectedCustomer = allCustomers.find(c => c.id === selectedCustomerId);
    const selectedCustomerPets = allPets.filter(p => p.customerId === selectedCustomerId);


    if (loading) return <div>Loading...</div>;

    return (
        <div className="container" style={{ paddingBottom: '120px', paddingTop: 'var(--space-4)' }}>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
                <button onClick={() => router.back()} style={{ background: 'none', border: 'none', padding: 0, marginRight: 'var(--space-2)' }}>
                    <ChevronLeft size={28} color="var(--brand-primary)" />
                </button>
                <h1 className="text-h2" style={{ marginBottom: 0 }}>New Job</h1>
            </div>

            {/* 1. Customer Selection Field (Smart Search) */}
            <div className="card" style={{ marginBottom: 'var(--space-4)', overflow: 'visible', padding: 0 }}>
                {!selectedCustomerId ? (
                    <div style={{ position: 'relative' }}>
                        <div style={{ display: 'flex', alignItems: 'center', padding: 'var(--space-3)' }}>
                            <Search size={20} color="var(--text-tertiary)" style={{ marginRight: 'var(--space-2)' }} />
                            <input
                                placeholder="Search Customer..."
                                style={{ border: 'none', outline: 'none', width: '100%', fontSize: 'var(--font-size-lg)' }}
                                value={searchQuery}
                                onChange={e => {
                                    setSearchQuery(e.target.value);
                                    setShowResults(true);
                                }}
                                onFocus={() => setShowResults(true)}
                                autoFocus
                            />
                        </div>

                        {/* Dropdown */}
                        {showResults && searchQuery && (
                            <div style={{ borderTop: '1px solid var(--border-color)' }}>
                                {filteredCustomers.map(c => {
                                    const cPets = allPets.filter(p => p.customerId === c.id);
                                    return (
                                        <div
                                            key={c.id}
                                            onClick={() => handleSelectCustomer(c)}
                                            style={{ padding: 'var(--space-3)', borderBottom: '1px solid var(--border-color)', cursor: 'pointer', background: 'white' }}
                                        >
                                            <div style={{ fontWeight: 600 }}>{c.name}</div>
                                            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                                                {cPets.map(p => p.name).join(', ')} • {c.phone}
                                            </div>
                                        </div>
                                    );
                                })}
                                <div
                                    onClick={openNewCustomerModal}
                                    style={{ padding: 'var(--space-3)', color: 'var(--brand-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}
                                >
                                    <Plus size={18} /> Add New Customer
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    // Selected State
                    <div style={{ padding: 'var(--space-3)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-2)' }}>
                            <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
                                <div style={{ background: 'var(--brand-primary-light)', padding: 10, borderRadius: '50%' }}>
                                    <User size={24} color="var(--brand-primary)" />
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: 'var(--font-size-lg)' }}>{selectedCustomer?.name}</h3>
                                    <div style={{ color: 'var(--text-secondary)' }}>{selectedCustomer?.phone}</div>
                                    <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-tertiary)' }}>{selectedCustomer?.address}</div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button onClick={openEditCustomerModal} style={{ background: 'none', border: 'none', padding: 4 }}><Edit2 size={20} color="var(--text-secondary)" /></button>
                                <button onClick={handleClearCustomer} style={{ background: 'none', border: 'none', padding: 4 }}><X size={20} color="var(--color-danger)" /></button>
                            </div>
                        </div>
                        {selectedCustomer?.notes && (
                            <div style={{ background: '#FFF4E5', padding: 'var(--space-2)', borderRadius: 'var(--radius-sm)', fontSize: 'var(--font-size-sm)', color: '#663C00', display: 'flex', gap: 6 }}>
                                <span>📝</span> <span>{selectedCustomer.notes}</span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* 2. Pets Section (Only if customer selected) */}
            {/* 2. Pets Section (Always visible, placeholder if no customer) */}
            <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                    <h3 className="text-h2" style={{ fontSize: 'var(--font-size-base)', margin: 0 }}>Pets & Services</h3>
                    <button
                        onClick={openNewPetModal}
                        disabled={!selectedCustomerId}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: selectedCustomerId ? 'var(--brand-primary)' : 'var(--text-tertiary)',
                            fontWeight: 600,
                            display: 'flex', alignItems: 'center', gap: 4,
                            cursor: selectedCustomerId ? 'pointer' : 'not-allowed',
                            opacity: selectedCustomerId ? 1 : 0.5
                        }}
                    >
                        <Plus size={16} /> Add Pet
                    </button>
                </div>

                {!selectedCustomerId ? (
                    <div style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--text-tertiary)', background: 'var(--surface-background)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-color)' }}>
                        <div style={{ marginBottom: 4 }}>Select a customer above to view their pets and select services.</div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                        {selectedCustomerPets.map(p => (
                            <div key={p.id} style={{
                                display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)',
                                padding: 'var(--space-2)',
                                border: selectedPetIds.includes(p.id) ? '2px solid var(--brand-primary)' : '1px solid var(--border-color)',
                                borderRadius: 'var(--radius-md)',
                                background: selectedPetIds.includes(p.id) ? 'var(--brand-primary-light)' : 'transparent',
                                transition: 'all 0.2s',
                                flexDirection: 'column'
                            }}>
                                <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                                    <div
                                        onClick={() => {
                                            if (selectedPetIds.includes(p.id)) setSelectedPetIds(prev => prev.filter(id => id !== p.id));
                                            else setSelectedPetIds(prev => [...prev, p.id]);
                                        }}
                                        style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 'var(--space-3)', cursor: 'pointer' }}
                                    >
                                        <div style={{ background: 'white', padding: 6, borderRadius: '50%', border: '1px solid var(--border-color)' }}>
                                            <Dog size={16} />
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 600 }}>{p.name}</div>
                                            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>{p.breed}</div>
                                            {p.notes && <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-danger)', marginTop: 2 }}>⚠️ {p.notes}</div>}
                                        </div>
                                    </div>
                                    <button onClick={() => openEditPetModal(p.id)} style={{ background: 'none', border: 'none', padding: 8 }}>
                                        <Edit2 size={16} color="var(--text-tertiary)" />
                                    </button>
                                </div>

                                {selectedPetIds.includes(p.id) && (
                                    <div style={{ paddingLeft: 48, marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                        {selectedServices.filter(s => s.petId === p.id).map((s, idx) => (
                                            <div key={`${s.id}-${idx}`} onClick={(e) => { e.stopPropagation(); toggleServiceForPet(s, p.id); }} style={{
                                                background: 'var(--brand-primary)', color: 'white', padding: '4px 10px', borderRadius: 12, fontSize: 'var(--font-size-xs)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer'
                                            }}>
                                                {s.name} <X size={12} />
                                            </div>
                                        ))}
                                        <button onClick={(e) => { e.stopPropagation(); setPickingServiceForPetId(p.id); }} style={{
                                            background: 'none', border: '1px dashed var(--brand-primary)', color: 'var(--brand-primary)', padding: '4px 10px', borderRadius: 12, fontSize: 'var(--font-size-xs)', fontWeight: 600
                                        }}>
                                            + Service
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                        {selectedCustomerPets.length === 0 && (
                            <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: 'var(--space-4)' }}>No pets yet. Add one!</div>
                        )}
                    </div>
                )}
            </div>



            {/* 4. Schedule & Details */}
            <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
                <h3 className="text-h2" style={{ fontSize: 'var(--font-size-base)' }}>Schedule</h3>
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                    <input type="date" className="card" value={date} onChange={e => setDate(e.target.value)} style={{ flex: 1 }} required />
                    <input type="time" className="card" value={time} onChange={e => setTime(e.target.value)} style={{ flex: 1 }} required />
                </div>
            </div>

            <div className="card" style={{ marginBottom: 'var(--space-6)' }}>

                <textarea className="card" placeholder="Job Visit Notes..." value={jobNotes} onChange={e => setJobNotes(e.target.value)} style={{ width: '100%', minHeight: 80 }} />
            </div>

            <button onClick={handleCreateJob} className="btn btn-primary" style={{ marginBottom: 'var(--space-8)' }}>Create Scheduled Job</button>


            {/* --- Modals --- */}

            <Modal
                isOpen={customerModalOpen}
                onClose={() => setCustomerModalOpen(false)}
                title={cFormId ? "Edit Customer" : "New Customer"}
                footer={(
                    <button onClick={saveCustomer} className="btn btn-primary" style={{ width: '100%' }}>Save Customer</button>
                )}
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                    <input className="card" placeholder="Full Name" value={cName} onChange={e => setCName(e.target.value)} autoFocus />
                    <input
                        className="card"
                        placeholder="Phone Number"
                        type="tel"
                        value={cPhone}
                        onChange={e => {
                            const input = e.target.value.replace(/\D/g, ''); // Strip non-digits
                            let formatted = input;
                            if (input.length > 0) {
                                if (input.length <= 3) formatted = `(${input}`;
                                else if (input.length <= 6) formatted = `(${input.slice(0, 3)}) ${input.slice(3)}`;
                                else formatted = `(${input.slice(0, 3)}) ${input.slice(3, 6)}-${input.slice(6, 10)}`;
                            }
                            setCPhone(formatted);
                        }}
                    />
                    <input className="card" placeholder="Address" value={cAddress} onChange={e => setCAddress(e.target.value)} />
                    <label>
                        <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>Customer Notes (Permanent)</span>
                        <textarea className="card" placeholder="Gate codes, parking info..." value={cNotes} onChange={e => setCNotes(e.target.value)} style={{ width: '100%', minHeight: 80, marginTop: 4 }} />
                    </label>
                </div>
            </Modal>

            <Modal
                isOpen={petModalOpen}
                onClose={() => setPetModalOpen(false)}
                title={pFormId ? "Edit Pet" : "New Pet"}
                footer={(
                    <button onClick={savePet} className="btn btn-primary" style={{ width: '100%' }}>Save Pet</button>
                )}
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                    <input className="card" placeholder="Pet Name" value={pName} onChange={e => setPName(e.target.value)} autoFocus />
                    <input className="card" placeholder="Breed" value={pBreed} onChange={e => setPBreed(e.target.value)} />
                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                        <input className="card" placeholder="Size (e.g. Small, 20lbs)" value={pSize} onChange={e => setPSize(e.target.value)} style={{ flex: 1 }} />
                        <input className="card" placeholder="Age" value={pAge} onChange={e => setPAge(e.target.value)} style={{ flex: 1 }} />
                    </div>
                    <label>
                        <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>Pet Notes (Permanent)</span>
                        <textarea className="card" placeholder="Allergies, behavior..." value={pNotes} onChange={e => setPNotes(e.target.value)} style={{ width: '100%', minHeight: 80, marginTop: 4 }} />
                    </label>
                </div>
            </Modal>

            <Modal
                isOpen={serviceModalOpen}
                onClose={() => setServiceModalOpen(false)}
                title="Manage Services"
            >
                <div>
                    {!createServiceMode ? (
                        <>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', maxHeight: '40vh', overflowY: 'auto', marginBottom: 'var(--space-3)' }}>
                                {allServices.map(s => {
                                    const isSelected = selectedServices.some(x => x.id === s.id);
                                    return (
                                        <div
                                            key={s.id}
                                            style={{
                                                padding: 'var(--space-3)',
                                                border: isSelected ? '2px solid var(--brand-primary)' : '1px solid var(--border-color)',
                                                borderRadius: 'var(--radius-md)',
                                                background: isSelected ? 'var(--brand-primary-light)' : 'white',
                                                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                            }}
                                        >
                                            <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', marginRight: 8 }}>
                                                <span style={{ fontWeight: 600, fontSize: 'var(--font-size-base)' }}>{s.name}</span>
                                                <span style={{ fontSize: 'var(--font-size-base)' }}>${s.price}</span>
                                            </div>
                                            <div style={{ display: 'flex', gap: 8 }}>
                                                <button onClick={() => startEditService(s)} style={{ background: 'none', border: 'none', padding: 4 }}>
                                                    <Edit2 size={18} color="var(--text-tertiary)" />
                                                </button>
                                                <button onClick={() => deleteService(s.id)} style={{ background: 'none', border: 'none', padding: 4 }}>
                                                    <Trash2 size={18} color="var(--color-danger)" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                                {allServices.length === 0 && <div style={{ textAlign: 'center', color: 'var(--text-tertiary)' }}>No existing services.</div>}
                            </div>
                            <button
                                onClick={() => {
                                    setEditingServiceId(null);
                                    setSName('');
                                    setSPrice('');
                                    setCreateServiceMode(true);
                                }}
                                className="btn btn-secondary"
                                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                            >
                                <Plus size={18} /> Create New Service
                            </button>
                        </>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                            <h4 style={{ margin: 0 }}>{editingServiceId ? 'Edit Service' : 'New Service'}</h4>
                            <input className="card" placeholder="Service Name" value={sName} onChange={e => setSName(e.target.value)} autoFocus />
                            <div style={{ position: 'relative' }}>
                                <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', fontSize: 'var(--font-size-lg)' }}>$</span>
                                <input className="card input-with-icon" type="decimal" placeholder="Price" value={sPrice} onChange={e => {
                                    const val = e.target.value.replace(/[^0-9.]/g, '');
                                    setSPrice(val);
                                }} />
                            </div>
                            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                                <button onClick={() => setCreateServiceMode(false)} className="btn btn-secondary" style={{ flex: 1 }}>Cancel</button>
                                <button onClick={saveService} className="btn btn-primary" style={{ flex: 1 }}>{editingServiceId ? 'Save Changes' : 'Create & Select'}</button>
                            </div>
                        </div>
                    )}
                </div>
            </Modal>

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
                        // Check if already selected for this pet
                        const isSelected = selectedServices.some(x => x.id === s.id && x.petId === pickingServiceForPetId);
                        return (
                            <div
                                key={s.id}
                                onClick={() => {
                                    if (pickingServiceForPetId) {
                                        toggleServiceForPet(s, pickingServiceForPetId);
                                        // Don't close immediately
                                    }
                                }}
                                style={{
                                    padding: 'var(--space-3)',
                                    border: isSelected ? '2px solid var(--brand-primary)' : '1px solid var(--border-color)',
                                    borderRadius: 'var(--radius-md)',
                                    background: isSelected ? 'var(--brand-primary-light)' : 'white',
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    cursor: 'pointer'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    {isSelected && <Check size={16} color="var(--brand-primary)" />}
                                    <span style={{ fontWeight: 600 }}>{s.name}</span>
                                </div>
                                <span>${s.price}</span>
                            </div>
                        );
                    })}
                    <button
                        onClick={() => {
                            setPickingServiceForPetId(null);
                            openManageServicesModal();
                        }}
                        style={{ marginTop: 8, padding: 12, background: 'var(--surface-background)', border: 'none', borderRadius: 8, color: 'var(--brand-primary)', fontWeight: 600 }}
                    >
                        Manage / Create Services
                    </button>
                </div>
            </Modal>

        </div>
    );
}

export default function NewJobPage() {
    return (
        <Suspense fallback={<div>Loading Wizard...</div>}>
            <NewJobContent />
        </Suspense>
    );
}
