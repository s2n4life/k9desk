'use client';

import { useState, useEffect } from 'react';
import { getDB } from '@/lib/db';
import { Settings, Service } from '@/lib/db/schema';
import { saveWithSync, deleteWithSync } from '@/lib/db/transactions';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { ChevronLeft, Save, Plus, Trash2, Edit2, ChevronDown, ChevronRight, CreditCard, Store, List, Star, MapPin, X, Check, LogOut, Clock, AlertTriangle } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { useSync } from '@/hooks/useSync';
import { useRouter } from 'next/navigation';
import { InstallPwaPrompt } from '@/components/pwa/InstallPwaPrompt';
import { isStandalone, shouldShowPrompt } from '@/lib/pwa-utils';
import { PlusSquare, Smartphone, CreditCard as BillingIcon, ExternalLink, ShieldCheck, RefreshCw, Database } from 'lucide-react';
import { hydrateLocalDB } from '@/lib/db/hydration';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { Modal } from '@/components/UI/Modal';

export default function SettingsPage() {
    const { clearLocalData } = useSync();
    const router = useRouter();
    const { isImpersonating, impersonatedBusinessId, getActiveBusinessId } = useImpersonation();

    const handleLogout = () => {
        setShowLogoutConfirm(true);
    };

    const confirmLogout = async () => {
        setShowLogoutConfirm(false);
        try {
            // 1. Wipe local database
            await clearLocalData();

            // 2. Call server-side logout
            await fetch('/api/auth/logout', { method: 'POST' });

            // 3. Redirect to landing page and force reload
            window.location.href = '/';
        } catch (err) {
            console.error('Logout failed:', err);
            alert('Logout failed. Please try again.');
        }
    };

    const [settings, setSettings] = useState<Settings>({
        id: 'default',
        updatedAt: Date.now()
    });
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState('');

    // UI State for collapsibles
    const [isBusinessInfoExpanded, setIsBusinessInfoExpanded] = useState(false);
    const [isSchedulingExpanded, setIsSchedulingExpanded] = useState(false);
    const [isServicesExpanded, setIsServicesExpanded] = useState(false);
    const [isPaymentExpanded, setIsPaymentExpanded] = useState(false);
    const [isReviewExpanded, setIsReviewExpanded] = useState(false);
    const [isServiceAreaExpanded, setIsServiceAreaExpanded] = useState(false);

    // UI State for Service Editing
    const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [editPrice, setEditPrice] = useState('');

    // UI State for Business Name Editing
    const [isEditingBusinessName, setIsEditingBusinessName] = useState(false);

    // UI State for Service Adding
    const [isAddingService, setIsAddingService] = useState(false);
    const [newName, setNewName] = useState('');
    const [newPrice, setNewPrice] = useState('');

    const [bookingBaseUrl, setBookingBaseUrl] = useState('');
    const [slug, setSlug] = useState('');
    const [businessId, setBusinessId] = useState('');
    const [zipText, setZipText] = useState('');
    const [showInstallPrompt, setShowInstallPrompt] = useState(false);
    const [isBillingLoading, setIsBillingLoading] = useState(false);
    const [isResetting, setIsResetting] = useState(false);
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [cancelConfirmText, setCancelConfirmText] = useState('');
    const [isCanceling, setIsCanceling] = useState(false);
    const [phone, setPhone] = useState('');

    const handleForceReset = () => {
        setShowResetConfirm(true);
    };

    const handleCancelAccount = async () => {
        if (cancelConfirmText !== 'CANCEL') {
            alert('Please type CANCEL to confirm');
            return;
        }

        setIsCanceling(true);
        try {
            // 1. Update Supabase business status
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await supabase
                    .from('businesses')
                    .update({ subscription_status: 'canceled' })
                    .eq('owner_id', user.id);
            }

            // 2. Clear local IndexedDB data
            await clearLocalData();

            // 3. Log out
            await supabase.auth.signOut();
            window.location.href = '/';
        } catch (error) {
            console.error('Error canceling account:', error);
            alert('Failed to cancel account. Please try again.');
            setIsCanceling(false);
        }
    };

    const confirmForceReset = async () => {
        setShowResetConfirm(false);
        setIsResetting(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not logged in');

            await clearLocalData(); // Clear all local data
            await hydrateLocalDB(user.id); // Re-hydrate from cloud

            setMsg('Data reset complete! Refreshing...');
            setTimeout(() => {
                setMsg('');
                window.location.reload();
            }, 1000);
        } catch (error) {
            console.error('Failed to force reset and re-sync:', error);
            setMsg('Failed to reset data. Please try again.');
        } finally {
            setIsResetting(false);
        }
    };


    useEffect(() => {
        setBookingBaseUrl(`${window.location.origin}/book/`);

        const load = async () => {
            // Use consolidated context logic to find active business ID
            const activeId = await getActiveBusinessId();

            if (isImpersonating && impersonatedBusinessId) {
                // IMPERSONATION MODE: Load data from Supabase for the impersonated business
                const { data: business, error: bizError } = await supabase
                    .from('businesses')
                    .select('*')
                    .eq('id', impersonatedBusinessId)
                    .single();

                if (business) {
                    // Map business data to settings format
                    setSettings({
                        id: 'default',
                        businessName: business.name,
                        subscription_status: business.subscription_status,
                        trial_end_date: business.trial_end_date,
                        showAppointmentConfirmation: business.show_appointment_confirmation,
                        updatedAt: Date.now(),
                        // Add other fields as needed
                    });
                    setBusinessId(business.id);
                    setSlug(business.slug || business.id);
                }

                // Load services from Supabase
                const { data: remoteServices } = await supabase
                    .from('services')
                    .select('*')
                    .eq('business_id', impersonatedBusinessId);

                if (remoteServices) {
                    setServices(remoteServices.map((s: any) => ({
                        id: s.id,
                        name: s.name,
                        price: s.price,
                        createdAt: new Date(s.created_at).getTime()
                    })));
                }
            } else {
                // NORMAL MODE: Load from IndexedDB
                const db = await getDB();
                const existingSettings = await db.get('settings', 'default');
                if (existingSettings) {
                    setSettings(existingSettings);
                    if (existingSettings.service_area_zips) {
                        setZipText(existingSettings.service_area_zips.join(', '));
                    }
                }

                const allServices = await db.getAll('services');
                setServices(allServices);

                // Attempt to get profile to generate booking link
                let profiles = await db.getAll('profiles');

                // SELF-HEALING: If no profile exists (e.g. skipped auth or local dev), create one
                if (profiles.length === 0) {
                    const newProfile = {
                        id: uuidv4(),
                        business_id: uuidv4(),
                        email: 'demo@example.com',
                        role: 'owner',
                        createdAt: Date.now()
                    };
                    await saveWithSync('profiles', newProfile, 'CREATE');
                    profiles = [newProfile];
                }

                if (profiles.length > 0) {
                    const profile = profiles[0];
                    if (profile.business_id) {
                        setBusinessId(profile.business_id);
                        // Use slug if available, otherwise ID
                        setSlug(profile.slug || profile.business_id);
                    }
                }
            }

            // Load phone from Supabase profiles
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('phone')
                    .eq('id', user.id)
                    .single();

                if (profile?.phone) {
                    setPhone(profile.phone);
                }
            }

            setLoading(false);
        };
        load();
    }, []);

    const handleChange = (field: keyof Settings, value: any) => {
        setSettings(prev => ({ ...prev, [field]: value }));
    };



    const handleSaveSettings = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setSaving(true);
        try {
            // Compute work days array from business_hours
            const dayMap: Record<string, number> = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
            const derivedWorkDays: number[] = [];

            if (settings.business_hours) {
                Object.entries(settings.business_hours).forEach(([day, config]) => {
                    if (config.isOpen && dayMap[day] !== undefined) {
                        derivedWorkDays.push(dayMap[day]);
                    }
                });
            } else {
                // Fallback if no hours set yet, default to Mon-Fri
                derivedWorkDays.push(1, 2, 3, 4, 5);
            }

            const updatedSettings = {
                ...settings,
                schedule_work_days: derivedWorkDays,
                updatedAt: Date.now()
            };

            // Call API directly instead of using broken sync
            const response = await fetch('/api/settings/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedSettings)
            });

            if (!response.ok) {
                throw new Error('Failed to save settings');
            }

            // Update local state
            setSettings(updatedSettings);

            setMsg('Saved successfully!');
            setTimeout(() => setMsg(''), 3000);
        } catch (err) {
            console.error(err);
            setMsg('Failed to save.');
        } finally {
            setSaving(false);
        }
    };

    // Service Handlers functions
    const confirmAddService = async () => {
        if (!newName) return;
        const price = parseFloat(newPrice || '0');

        const newService: Service = {
            id: uuidv4(),
            name: newName,
            price,
            createdAt: Date.now()
        };

        await saveWithSync('services', newService, 'CREATE', businessId || undefined);
        setServices(prev => [...prev, newService]);

        setIsAddingService(false);
        setNewName('');
        setNewPrice('');
    };

    const handleDeleteService = async (id: string) => {
        if (!confirm('Are you sure you want to delete this service?')) return;
        await deleteWithSync('services', id, businessId || undefined);
        setServices(prev => prev.filter(s => s.id !== id));
    };

    const startEditService = (service: Service) => {
        setEditingServiceId(service.id);
        setEditName(service.name);
        setEditPrice(service.price.toString());
    };

    const saveEditService = async () => {
        if (!editingServiceId) return;
        const updatedService: Service = {
            id: editingServiceId,
            name: editName,
            price: parseFloat(editPrice || '0'),
            createdAt: Date.now()
        };
        const original = services.find(s => s.id === editingServiceId);
        if (original) updatedService.createdAt = original.createdAt;

        await saveWithSync('services', updatedService, 'UPDATE', businessId || undefined);
        setServices(prev => prev.map(s => s.id === editingServiceId ? updatedService : s));
        setEditingServiceId(null);
    };

    if (loading) return <div className="container" style={{ paddingTop: '2rem' }}>Loading...</div>;

    return (
        <div className="container" style={{ paddingBottom: '100px' }}>
            <header style={{ marginBottom: 'var(--space-6)', paddingTop: 'var(--space-6)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', color: 'var(--text-secondary)' }}>
                    <ChevronLeft size={24} />
                    Back
                </Link>
                <h1 className="text-h2" style={{ marginBottom: 0 }}>Settings</h1>
            </header>

            {/* Billing & Subscription Section */}
            <section className="card" style={{
                padding: 'var(--space-6)',
                marginBottom: 'var(--space-4)',
                background: 'linear-gradient(135deg, var(--surface) 0%, var(--surface-sunken) 100%)',
                border: '1px solid var(--border-subtle)',
                position: 'relative',
                overflow: 'hidden'
            }}>
                <div style={{
                    position: 'absolute',
                    top: '-20px',
                    right: '-20px',
                    opacity: 0.05,
                    transform: 'rotate(-15deg)'
                }}>
                    <BillingIcon size={120} />
                </div>

                <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-4)' }}>
                        <div>
                            <h3 className="text-h3" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                <ShieldCheck size={20} className="text-brand-primary" />
                                Subscription Status
                            </h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                <span style={{
                                    padding: '2px 8px',
                                    borderRadius: '12px',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    backgroundColor: settings.subscription_status === 'active' ? 'var(--success-light)' : 'var(--surface-sunken)',
                                    color: settings.subscription_status === 'active' ? 'var(--success)' : 'var(--text-tertiary)',
                                    textTransform: 'capitalize'
                                }}>
                                    {settings.subscription_status === 'active' && !settings.stripe_subscription_id ? 'Comped Account' : (settings.subscription_status || 'Trial')}
                                </span>

                                {settings.subscription_status === 'trialing' && settings.trial_end_date && (
                                    <span style={{
                                        padding: '2px 8px',
                                        borderRadius: '12px',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        backgroundColor: 'var(--brand-primary-light)',
                                        color: 'var(--brand-primary)'
                                    }}>
                                        {Math.max(0, Math.ceil((new Date(settings.trial_end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))} days left
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                        {settings.subscription_status === 'active' && !settings.stripe_subscription_id ? (
                            <div style={{
                                padding: 'var(--space-3)',
                                backgroundColor: 'var(--brand-primary-light)',
                                borderRadius: 'var(--radius-md)',
                                border: '1px dashed var(--brand-primary)'
                            }}>
                                <p style={{ fontSize: '14px', color: 'var(--brand-primary)', fontWeight: 500 }}>
                                    Full access provided via Support/Comp status.
                                </p>
                                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                    No billing management is necessary as you are not being charged.
                                </p>
                            </div>
                        ) : settings.subscription_status === 'trialing' ? (
                            <div style={{
                                padding: 'var(--space-3)',
                                backgroundColor: 'var(--surface-sunken)',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--border-subtle)'
                            }}>
                                <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                                    You are currently in your 14-day free trial.
                                </p>
                                <p style={{ fontSize: '12px', color: 'var(--success)', fontWeight: 600, marginTop: '4px' }}>
                                    ✓ No credit card required. You will NOT be auto-charged.
                                </p>
                            </div>
                        ) : (
                            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', maxWidth: '90%' }}>
                                Manage your plan, update payment methods, or download invoices through our secure billing portal.
                            </p>
                        )}

                        {(settings.stripe_customer_id || settings.stripe_subscription_id) && (
                            <button
                                onClick={async () => {
                                    setIsBillingLoading(true);
                                    try {
                                        const res = await fetch('/api/stripe/create-portal-session', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ origin: window.location.origin })
                                        });
                                        const data = await res.json();
                                        if (data.url) {
                                            window.location.href = data.url;
                                        } else if (data.error === 'no_customer') {
                                            alert(data.message);
                                        } else {
                                            throw new Error('Failed to open portal');
                                        }
                                    } catch (err) {
                                        console.error(err);
                                        alert('Could not open billing portal. Please try again or contact support.');
                                    } finally {
                                        setIsBillingLoading(false);
                                    }
                                }}
                                className="btn btn-secondary"
                                disabled={isBillingLoading}
                                style={{
                                    width: '100%',
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    gap: '8px',
                                    background: 'var(--bg-card)',
                                    border: '1px solid var(--border-subtle)',
                                    boxShadow: 'var(--shadow-sm)',
                                    color: 'var(--text-primary)'
                                }}
                            >
                                {isBillingLoading ? (
                                    <span className="animate-spin">...</span>
                                ) : (
                                    <>
                                        <ExternalLink size={18} />
                                        Manage Billing
                                    </>
                                )}
                            </button>
                        )}

                        {!settings.stripe_subscription_id && settings.subscription_status === 'trialing' && (
                            <>
                                <Link
                                    href="/pricing"
                                    className="btn btn-primary"
                                    style={{
                                        width: '100%',
                                        display: 'flex',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        gap: '8px',
                                        textDecoration: 'none'
                                    }}
                                >
                                    Upgrade to Pro
                                </Link>

                                <button
                                    onClick={() => setShowCancelModal(true)}
                                    className="btn btn-danger"
                                    style={{
                                        width: '100%',
                                        display: 'flex',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        gap: '8px',
                                        marginTop: '8px',
                                        backgroundColor: 'var(--color-danger-muted)',
                                        color: 'var(--color-danger)',
                                        border: '1px solid var(--color-danger)'
                                    }}
                                >
                                    <AlertTriangle size={18} />
                                    Cancel My Account
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </section>

            {shouldShowPrompt() && (
                <section
                    className="card"
                    style={{
                        padding: 'var(--space-6)',
                        marginBottom: 'var(--space-4)',
                        border: '2px solid var(--brand-primary)',
                        background: 'var(--brand-primary-light)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 'var(--space-3)',
                        textAlign: 'center'
                    }}
                >
                    <div style={{ color: 'var(--brand-primary)' }}>
                        <Smartphone size={40} />
                    </div>
                    <div>
                        <h3 className="text-h3" style={{ marginBottom: '4px', color: 'var(--brand-primary)' }}>Save to Home Screen</h3>
                        <p className="text-p" style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Get full access and the best experience by adding K9desk to your home screen.</p>
                    </div>
                    <button
                        onClick={() => setShowInstallPrompt(true)}
                        className="btn btn-primary"
                        style={{ width: '100%', marginTop: 'var(--space-2)' }}
                    >
                        Learn How
                    </button>
                </section>
            )}

            {/* Business Info Section */}
            <section className="card" style={{ marginBottom: 'var(--space-4)', overflow: 'hidden' }}>
                <button
                    onClick={() => setIsBusinessInfoExpanded(!isBusinessInfoExpanded)}
                    style={{
                        width: '100%',
                        padding: 'var(--space-6)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        textAlign: 'left'
                    }}
                >
                    <h3 className="text-h3" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 0 }}>
                        <Store size={20} />
                        Business Info
                    </h3>
                    {isBusinessInfoExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                </button>

                {isBusinessInfoExpanded && (
                    <div style={{ padding: '0 var(--space-6) var(--space-6) var(--space-6)' }}>
                        <div style={{ marginBottom: 'var(--space-4)' }}>
                            <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontWeight: 500 }}>Business Name</label>
                            {!isEditingBusinessName && settings.businessName ? (
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div className="card" style={{ flex: 1, padding: 'var(--space-4)', fontSize: 'var(--font-size-lg)', fontWeight: 600, background: 'var(--surface-sunken)', border: 'none' }}>
                                        {settings.businessName}
                                    </div>
                                    <button
                                        onClick={() => setIsEditingBusinessName(true)}
                                        style={{ marginLeft: 'var(--space-3)', color: 'var(--brand-primary)', background: 'none', border: 'none', padding: 'var(--space-2)' }}
                                    >
                                        <Edit2 size={20} />
                                    </button>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                                    <input
                                        type="text"
                                        className="input"
                                        placeholder="e.g. John's Grooming"
                                        value={settings.businessName || ''}
                                        onChange={e => handleChange('businessName', e.target.value)}
                                        autoFocus={isEditingBusinessName}
                                        onBlur={() => {
                                            handleSaveSettings();
                                            if (settings.businessName) setIsEditingBusinessName(false);
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.currentTarget.blur();
                                            }
                                        }}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Phone Number Field */}
                        <div style={{ marginBottom: 'var(--space-4)' }}>
                            <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontWeight: 500 }}>Phone Number</label>
                            <input
                                type="tel"
                                className="input"
                                placeholder="(555) 123-4567"
                                value={phone}
                                onChange={e => setPhone(e.target.value)}
                            />
                            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginTop: 'var(--space-2)' }}>
                                Used for account contact and support.
                            </p>
                        </div>

                        {/* Save Button */}
                        <div style={{ marginTop: 'var(--space-4)' }}>
                            <button
                                onClick={async () => {
                                    setSaving(true);
                                    try {
                                        // Save business name to settings
                                        await handleSaveSettings();

                                        // Save phone to Supabase profiles
                                        const { data: { user } } = await supabase.auth.getUser();
                                        if (user) {
                                            await supabase
                                                .from('profiles')
                                                .update({ phone: phone.trim() })
                                                .eq('id', user.id);
                                        }

                                        setMsg('Business info saved successfully!');
                                        setTimeout(() => setMsg(''), 3000);
                                    } catch (err) {
                                        console.error('Failed to save business info:', err);
                                        setMsg('Failed to save business info.');
                                    } finally {
                                        setSaving(false);
                                    }
                                }}
                                className="btn btn-primary"
                                style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                                disabled={saving}
                            >
                                <Save size={18} />
                                {saving ? 'Saving...' : 'Save Business Info'}
                            </button>
                        </div>
                    </div>
                )}
            </section>

            {/* Scheduling Defaults Section */}
            <section className="card" style={{ marginBottom: 'var(--space-4)', overflow: 'hidden' }}>
                <button
                    onClick={() => setIsSchedulingExpanded(!isSchedulingExpanded)}
                    style={{
                        width: '100%',
                        padding: 'var(--space-6)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        textAlign: 'left'
                    }}
                >
                    <h3 className="text-h3" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 0 }}>
                        <Clock size={20} />
                        Scheduling Defaults
                    </h3>
                    {isSchedulingExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                </button>

                {isSchedulingExpanded && (
                    <div style={{ padding: '0 var(--space-6) var(--space-6) var(--space-6)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontWeight: 500 }}>Time per Appointment</label>
                                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginBottom: 'var(--space-2)' }}>How long each appointment takes (15-480 min)</p>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type="number"
                                        className="input"
                                        placeholder="60"
                                        min="15"
                                        max="480"
                                        value={settings.appointment_duration_minutes || ''}
                                        onChange={e => {
                                            const val = parseInt(e.target.value || '0');
                                            if (val >= 15 && val <= 480) {
                                                handleChange('appointment_duration_minutes', val);
                                            } else if (e.target.value === '') {
                                                handleChange('appointment_duration_minutes', undefined);
                                            }
                                        }}
                                        onBlur={() => {
                                            if (!settings.appointment_duration_minutes) {
                                                handleChange('appointment_duration_minutes', 60);
                                            }
                                        }}
                                    />
                                    <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', fontSize: '14px' }}>min</span>
                                </div>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontWeight: 500 }}>Average Drive Time</label>
                                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginBottom: 'var(--space-2)' }}>Buffer time between appointments for travel (0-120 min)</p>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type="number"
                                        className="input"
                                        placeholder="30"
                                        min="0"
                                        max="120"
                                        value={settings.drive_buffer_minutes || ''}
                                        onChange={e => {
                                            const val = parseInt(e.target.value || '0');
                                            if (val >= 0 && val <= 120) {
                                                handleChange('drive_buffer_minutes', val);
                                            } else if (e.target.value === '') {
                                                handleChange('drive_buffer_minutes', undefined);
                                            }
                                        }}
                                        onBlur={() => {
                                            if (settings.drive_buffer_minutes === undefined) {
                                                handleChange('drive_buffer_minutes', 30);
                                            }
                                        }}
                                    />
                                    <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', fontSize: '14px' }}>min</span>
                                </div>
                            </div>
                        </div>

                        {/* Save Button */}
                        <div style={{ marginTop: 'var(--space-4)' }}>
                            <button
                                onClick={() => handleSaveSettings()}
                                className="btn btn-primary"
                                style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                                disabled={saving}
                            >
                                <Save size={18} />
                                {saving ? 'Saving...' : 'Save Scheduling Defaults'}
                            </button>
                        </div>
                    </div>
                )}
            </section>

            {/* Appointment Confirmation Section */}
            <section className="card" style={{ marginBottom: 'var(--space-4)', padding: 'var(--space-6)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-3)' }}>
                    <div style={{ flex: 1 }}>
                        <h3 className="text-h3" style={{ marginBottom: '4px' }}>Show Appointment Confirmation Prompt</h3>
                        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginBottom: 0 }}>
                            Reminds you to confirm appointments with customers after scheduling
                        </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={settings.showAppointmentConfirmation !== false}
                            onChange={e => {
                                handleChange('showAppointmentConfirmation', e.target.checked);
                                handleSaveSettings();
                            }}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                </div>
            </section>

            {/* Services Section */}
            <section className="card" style={{ marginBottom: 'var(--space-4)', overflow: 'hidden' }}>
                <div style={{
                    width: '100%',
                    padding: 'var(--space-6)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <button
                        onClick={() => setIsServicesExpanded(!isServicesExpanded)}
                        style={{
                            flex: 1,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            textAlign: 'left',
                            padding: 0
                        }}
                    >
                        <h3 className="text-h3" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 0 }}>
                            <List size={20} />
                            Services
                        </h3>
                        {isServicesExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                    </button>
                    {isServicesExpanded && (
                        <button
                            onClick={() => setIsAddingService(true)}
                            className="btn btn-secondary"
                            style={{
                                padding: '0 var(--space-3)',
                                fontSize: 'var(--font-size-sm)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                height: '40px',
                                width: 'auto',
                                marginLeft: 'var(--space-3)'
                            }}
                        >
                            <Plus size={16} /> Add
                        </button>
                    )}
                </div>

                {isServicesExpanded && (
                    <div style={{ padding: '0 var(--space-6) var(--space-6) var(--space-6)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                            {isAddingService && (
                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 'var(--space-3)',
                                    padding: 'var(--space-4)',
                                    backgroundColor: 'var(--surface-sunken)',
                                    borderRadius: 'var(--radius-md)',
                                    animation: 'fadeIn 0.2s ease-in-out',
                                    border: '1px solid var(--brand-primary)'
                                }}>
                                    {/* Line 1: Name */}
                                    <input
                                        className="input"
                                        placeholder="Service Name"
                                        value={newName}
                                        onChange={e => setNewName(e.target.value)}
                                        style={{ width: '100%', fontSize: '18px', fontWeight: 600 }}
                                        autoFocus
                                    />

                                    <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                                        <div style={{ position: 'relative', flex: 1 }}>
                                            <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', fontSize: '18px' }}>$</span>
                                            <input
                                                className="input"
                                                type="text"
                                                inputMode="decimal"
                                                placeholder="Price"
                                                value={newPrice}
                                                onChange={e => {
                                                    const val = e.target.value.replace(/[^0-9.]/g, '');
                                                    setNewPrice(val);
                                                }}
                                                style={{ width: '100%', paddingLeft: '32px', height: '54px', fontSize: '18px' }}
                                            />
                                        </div>
                                    </div>

                                    {/* Line 3: Actions */}
                                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                                        <button onClick={confirmAddService} className="btn btn-primary" style={{ flex: 1, height: '54px' }}>Save Service</button>
                                        <button onClick={() => setIsAddingService(false)} className="btn btn-secondary" style={{ width: '54px', height: '54px', padding: 0, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                            <X size={24} />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {services.length === 0 && !isAddingService && <p style={{ color: 'var(--text-tertiary)', fontStyle: 'italic' }}>No services added yet.</p>}

                            {services.map(service => (
                                <div key={service.id} style={{
                                    padding: 'var(--space-3)',
                                    backgroundColor: 'var(--surface-sunken)',
                                    borderRadius: 'var(--radius-md)'
                                }}>
                                    {editingServiceId === service.id ? (
                                        <div style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: 'var(--space-3)',
                                            padding: 'var(--space-4)',
                                            backgroundColor: 'var(--surface-sunken)',
                                            borderRadius: 'var(--radius-md)',
                                            border: '1px solid var(--brand-primary)'
                                        }}>
                                            {/* Line 1: Name */}
                                            <input
                                                className="input"
                                                value={editName}
                                                onChange={e => setEditName(e.target.value)}
                                                style={{ width: '100%', fontSize: '18px', fontWeight: 600 }}
                                                placeholder="Service Name"
                                            />

                                            {/* Line 2: Price */}
                                            <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                                                <div style={{ position: 'relative', flex: 1 }}>
                                                    <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', fontSize: '18px' }}>$</span>
                                                    <input
                                                        className="input"
                                                        type="text"
                                                        inputMode="decimal"
                                                        value={editPrice}
                                                        onChange={e => {
                                                            const val = e.target.value.replace(/[^0-9.]/g, '');
                                                            setEditPrice(val);
                                                        }}
                                                        style={{ width: '100%', paddingLeft: '32px', height: '54px', fontSize: '18px' }}
                                                        placeholder="0"
                                                    />
                                                </div>
                                            </div>

                                            {/* Line 3: Actions */}
                                            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                                                <button onClick={saveEditService} className="btn btn-primary" style={{ flex: 1, height: '54px' }}>Save Changes</button>
                                                <button onClick={() => setEditingServiceId(null)} className="btn btn-secondary" style={{ width: '54px', height: '54px', padding: 0, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                                    <X size={24} />
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <div style={{ overflow: 'hidden', marginRight: '8px' }}>
                                                <div style={{ fontWeight: 600, fontSize: 'var(--font-size-lg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{service.name}</div>
                                                <div style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-base)' }}>${service.price}</div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                                                <button onClick={() => startEditService(service)} style={{ color: 'var(--text-secondary)' }}>
                                                    <Edit2 size={16} />
                                                </button>
                                                <button onClick={() => handleDeleteService(service.id)} style={{ color: 'var(--error)' }}>
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </section>

            {/* Payment Settings Section (Collapsible) */}
            <section className="card" style={{ marginBottom: 'var(--space-4)', overflow: 'hidden' }}>
                <button
                    onClick={() => setIsPaymentExpanded(!isPaymentExpanded)}
                    style={{
                        width: '100%',
                        padding: 'var(--space-6)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        textAlign: 'left'
                    }}
                >
                    <h3 className="text-h3" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 0 }}>
                        <CreditCard size={20} />
                        Payment Settings
                    </h3>
                    {isPaymentExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                </button>

                {isPaymentExpanded && (
                    <div style={{ padding: '0 var(--space-6) var(--space-6) var(--space-6)' }}>
                        <p style={{ marginBottom: 'var(--space-4)', color: 'var(--text-secondary)', fontSize: '14px' }}>
                            These details will be sent to customers when you request payment.
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontWeight: 500 }}>Venmo Handle</label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="@YourHandle"
                                    value={settings.venmo || ''}
                                    onChange={e => handleChange('venmo', e.target.value)}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontWeight: 500 }}>Zelle (Phone/Email)</label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="555-0123 or email@example.com"
                                    value={settings.zelle || ''}
                                    onChange={e => handleChange('zelle', e.target.value)}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontWeight: 500 }}>PayPal.me Link</label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="paypal.me/user"
                                    value={settings.paypal || ''}
                                    onChange={e => handleChange('paypal', e.target.value)}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontWeight: 500 }}>Cash App Tag</label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="$Cashtag"
                                    value={settings.cashapp || ''}
                                    onChange={e => handleChange('cashapp', e.target.value)}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontWeight: 500 }}>Custom Payment URL</label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="https://my-website.com/pay"
                                    value={settings.custom_url || ''}
                                    onChange={e => handleChange('custom_url', e.target.value)}
                                />
                            </div>

                            <button
                                onClick={() => handleSaveSettings()}
                                className="btn btn-primary"
                                style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                                disabled={saving}
                            >
                                <Save size={18} />
                                {saving ? 'Saving...' : 'Save Payment Settings'}
                            </button>
                        </div>
                    </div>
                )}
            </section>

            {/* Review Settings Section */}
            <section className="card" style={{ marginBottom: 'var(--space-4)', overflow: 'hidden' }}>
                <button
                    onClick={() => setIsReviewExpanded(!isReviewExpanded)}
                    style={{
                        width: '100%',
                        padding: 'var(--space-6)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        textAlign: 'left'
                    }}
                >
                    <h3 className="text-h3" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 0 }}>
                        <Star size={20} />
                        Review Settings
                    </h3>
                    {isReviewExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                </button>

                {isReviewExpanded && (
                    <div style={{ padding: '0 var(--space-6) var(--space-6) var(--space-6)' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontWeight: 500 }}>Review Link (Google, Yelp, etc)</label>
                            <input
                                type="text"
                                className="input"
                                placeholder="https://g.page/r/..."
                                value={settings.review_url || ''}
                                onChange={e => handleChange('review_url', e.target.value)}
                            />
                            <div style={{ marginTop: 'var(--space-4)' }}>
                                <button
                                    onClick={() => handleSaveSettings()}
                                    className="btn btn-primary"
                                    style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                                    disabled={saving}
                                >
                                    <Save size={18} />
                                    {saving ? 'Saving...' : 'Save Review Settings'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </section>

            {/* Service Area & Logic (NEW) */}
            <section className="card" style={{ marginBottom: 'var(--space-4)', overflow: 'hidden' }}>
                <button
                    onClick={() => setIsServiceAreaExpanded(!isServiceAreaExpanded)}
                    style={{
                        width: '100%',
                        padding: 'var(--space-6)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        textAlign: 'left'
                    }}
                >
                    <h3 className="text-h3" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 0 }}>
                        <MapPin size={20} />
                        Service Area & Schedule
                    </h3>
                    {isServiceAreaExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                </button>

                {isServiceAreaExpanded && (
                    <div style={{ padding: '0 var(--space-6) var(--space-6) var(--space-6)' }}>
                        <div style={{ marginBottom: 'var(--space-6)' }}>
                            <label className="text-sm font-medium mb-3 block">Weekly Schedule</label>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => {
                                    const dayConfig = settings.business_hours?.[day] || { start: '09:00', end: '17:00', isOpen: false };
                                    return (
                                        <div key={day} style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '12px',
                                            padding: '12px',
                                            backgroundColor: dayConfig.isOpen ? 'var(--bg-card)' : 'var(--surface-sunken)',
                                            border: '1px solid var(--border-subtle)',
                                            borderRadius: '12px',
                                            opacity: dayConfig.isOpen ? 1 : 0.7
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div style={{ fontWeight: 600, textTransform: 'capitalize', fontSize: '16px' }}>
                                                    {day}
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    {!dayConfig.isOpen && <span className="text-sm text-slate-400 italic">Closed</span>}
                                                    <label className="relative inline-flex items-center cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            className="sr-only peer"
                                                            checked={dayConfig.isOpen}
                                                            onChange={e => {
                                                                const newHours = { ...settings.business_hours };
                                                                // Initialize if undefined
                                                                if (!newHours[day]) newHours[day] = { start: '09:00', end: '17:00', isOpen: false };

                                                                newHours[day] = { ...newHours[day], isOpen: e.target.checked };
                                                                handleChange('business_hours', newHours);
                                                            }}
                                                        />
                                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                                    </label>
                                                </div>
                                            </div>

                                            {dayConfig.isOpen && (
                                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                    <select
                                                        className="input"
                                                        style={{ flex: 1 }}
                                                        value={dayConfig.start}
                                                        onChange={e => {
                                                            const newHours = { ...settings.business_hours };
                                                            newHours[day] = { ...dayConfig, start: e.target.value };
                                                            handleChange('business_hours', newHours);
                                                        }}
                                                    >
                                                        {[6, 7, 8, 9, 10, 11, 12].map(h => <option key={h} value={`${h < 10 ? '0' + h : h}:00`}>{h}:00 AM</option>)}
                                                    </select>
                                                    <span className="text-slate-400 font-bold">-</span>
                                                    <select
                                                        className="input"
                                                        style={{ flex: 1 }}
                                                        value={dayConfig.end}
                                                        onChange={e => {
                                                            const newHours = { ...settings.business_hours };
                                                            newHours[day] = { ...dayConfig, end: e.target.value };
                                                            handleChange('business_hours', newHours);
                                                        }}
                                                    >
                                                        {[12, 13, 14, 15, 16, 17, 18, 19, 20].map(h => <option key={h} value={`${h}:00`}>{h - 12}:00 PM</option>)}
                                                    </select>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div style={{ marginBottom: 'var(--space-4)' }}>
                            <label className="text-sm font-medium mb-1 block">Service Area Zip Codes (Bulk Paste)</label>
                            <p className="text-xs text-slate-500 mb-2">Paste a list of zip codes separated by commas, spaces, or new lines.</p>
                            <textarea
                                className="input w-full h-32 font-mono text-sm"
                                placeholder="78701, 78702, 78704..."
                                value={zipText}
                                onChange={e => setZipText(e.target.value)}
                                onBlur={(e) => {
                                    const val = e.target.value;
                                    const zips = val.match(/\d{5}/g) || [];
                                    const unique = Array.from(new Set(zips));
                                    // Update settings
                                    handleChange('service_area_zips', unique);
                                }}
                            />
                            <p className="text-xs text-right text-slate-400 mt-1">
                                {settings.service_area_zips?.length || 0} valid zips found.
                            </p>
                        </div>

                        <button
                            onClick={() => handleSaveSettings()}
                            className="btn btn-primary w-full flex justify-center items-center gap-2"
                            disabled={saving}
                        >
                            <Save size={18} />
                            {saving ? 'Saving...' : 'Save Schedule & Area'}
                        </button>
                    </div>
                )}
            </section>



            {/* Debug Section for Trial Testing */}
            {process.env.NODE_ENV !== 'production' && (
                <section className="card" style={{ padding: 'var(--space-6)', marginBottom: 'var(--space-4)', border: '2px dashed #f59e0b', backgroundColor: '#fffbeb' }}>
                    <h3 className="text-h3" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 'var(--space-4)', color: '#b45309' }}>
                        Debug: Trial Time Machine
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                        <button
                            onClick={async () => {
                                await fetch('/api/debug/time-machine', {
                                    method: 'POST',
                                    body: JSON.stringify({ action: 'warn_now' }),
                                    headers: { 'Content-Type': 'application/json' }
                                });
                                localStorage.removeItem('crm_has_hydrated');
                                sessionStorage.removeItem('trial_warned');
                                window.location.reload();
                            }}
                            className="bg-yellow-500 text-white font-bold py-2 px-4 rounded text-sm hover:bg-yellow-600"
                        >
                            Warn (Day 12)
                        </button>
                        <button
                            onClick={async () => {
                                await fetch('/api/debug/time-machine', {
                                    method: 'POST',
                                    body: JSON.stringify({ action: 'expire_now' }),
                                    headers: { 'Content-Type': 'application/json' }
                                });
                                localStorage.removeItem('crm_has_hydrated');
                                sessionStorage.removeItem('trial_warned');
                                window.location.reload();
                            }}
                            className="bg-red-500 text-white font-bold py-2 px-4 rounded text-sm hover:bg-red-600"
                        >
                            Expire Now
                        </button>
                        <button
                            onClick={async () => {
                                await fetch('/api/debug/time-machine', {
                                    method: 'POST',
                                    body: JSON.stringify({ action: 'reset' }),
                                    headers: { 'Content-Type': 'application/json' }
                                });
                                localStorage.removeItem('crm_has_hydrated');
                                sessionStorage.removeItem('trial_warned');
                                window.location.reload();
                            }}
                            className="bg-green-500 text-white font-bold py-2 px-4 rounded text-sm hover:bg-green-600"
                        >
                            Reset
                        </button>
                    </div>
                </section>
            )}

            {msg && (
                <div style={{
                    position: 'fixed',
                    bottom: '20px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: 'var(--surface-overlay)',
                    padding: '8px 16px',
                    borderRadius: '20px',
                    boxShadow: 'var(--shadow-lg)',
                    color: msg.includes('Failed') ? 'var(--error)' : 'var(--success)'
                }}>
                    {msg}
                </div>
            )}

            {/* Advanced / Data Management */}
            <section className="card" style={{ padding: 'var(--space-6)', marginBottom: 'var(--space-4)', border: '1px solid var(--border-subtle)' }}>
                <h3 className="text-h3" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 'var(--space-2)' }}>
                    <Database size={20} className="text-brand-primary" />
                    Data Management
                </h3>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>
                    <strong>⚠️ Advanced troubleshooting only.</strong> This will completely clear your device's local cache and re-download all data from the cloud. Use this if you're experiencing serious sync issues or seeing corrupted data.
                </p>
                <button
                    onClick={handleForceReset}
                    disabled={isResetting}
                    className="btn btn-secondary"
                    style={{
                        width: '100%',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: '8px',
                        color: 'var(--color-danger)',
                        borderColor: 'rgba(255, 0, 0, 0.1)'
                    }}
                >
                    <RefreshCw size={18} className={isResetting ? 'animate-spin' : ''} />
                    {isResetting ? 'Clearing Cache...' : 'Clear Cache & Re-download All Data'}
                </button>
            </section>

            {/* Logout Button */}
            <section style={{ marginTop: 'var(--space-8)', paddingTop: 'var(--space-8)', borderTop: '1px solid var(--border-subtle)' }}>
                <button
                    onClick={handleLogout}
                    className="btn"
                    style={{
                        width: '100%',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: '8px',
                        backgroundColor: '#fee2e2',
                        color: '#dc2626',
                        border: '1px solid #fca5a5',
                        fontWeight: 600,
                        padding: '16px',
                        borderRadius: 'var(--radius-lg)'
                    }}
                >
                    <LogOut size={20} />
                    Log Out
                </button>
                <p style={{ textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '12px', marginTop: '12px' }}>
                    Logged in as {settings.id === 'default' ? 'Owner' : settings.id}
                </p>
            </section>

            <InstallPwaPrompt
                isOpen={showInstallPrompt}
                onClose={() => setShowInstallPrompt(false)}
            />

            <Modal
                isOpen={showResetConfirm}
                onClose={() => setShowResetConfirm(false)}
                title="Force Reset & Re-sync"
                footer={
                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                        <button
                            onClick={() => setShowResetConfirm(false)}
                            className="btn btn-secondary"
                            style={{ flex: 1 }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={confirmForceReset}
                            className="btn btn-primary"
                            style={{ flex: 1, backgroundColor: 'var(--color-danger)', borderColor: 'var(--color-danger)', color: 'white' }}
                        >
                            Confirm Reset
                        </button>
                    </div>
                }
            >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-4)', textAlign: 'center', padding: 'var(--space-2) 0' }}>
                    <div style={{ color: 'var(--color-danger)', backgroundColor: '#fee2e2', padding: '12px', borderRadius: '50%' }}>
                        <AlertTriangle size={32} />
                    </div>
                    <div>
                        <p style={{ fontWeight: 600, fontSize: 'var(--font-size-lg)', marginBottom: '8px' }}>Are you sure?</p>
                        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', lineHeight: 1.5 }}>
                            This will clear all local data and re-download everything from the cloud. This is usually only needed if your device shows incorrect or old data.
                        </p>
                    </div>
                </div>
            </Modal>

            <Modal
                isOpen={showLogoutConfirm}
                onClose={() => setShowLogoutConfirm(false)}
                title="Log Out"
                footer={
                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                        <button
                            onClick={() => setShowLogoutConfirm(false)}
                            className="btn btn-secondary"
                            style={{ flex: 1 }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={confirmLogout}
                            className="btn btn-primary"
                            style={{ flex: 1, backgroundColor: 'var(--color-danger)', borderColor: 'var(--color-danger)', color: 'white' }}
                        >
                            Log Out
                        </button>
                    </div>
                }
            >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-4)', textAlign: 'center', padding: 'var(--space-2) 0' }}>
                    <div style={{ color: 'var(--color-danger)', backgroundColor: '#fee2e2', padding: '12px', borderRadius: '50%' }}>
                        <LogOut size={32} />
                    </div>
                    <div>
                        <p style={{ fontWeight: 600, fontSize: 'var(--font-size-lg)', marginBottom: '8px' }}>Are you sure you want to log out?</p>
                        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', lineHeight: 1.5 }}>
                            You'll need to sign in again to access your account.
                        </p>
                    </div>
                </div>
            </Modal>

            <Modal
                isOpen={showCancelModal}
                onClose={() => {
                    setShowCancelModal(false);
                    setCancelConfirmText('');
                }}
                title="Cancel My Account"
                footer={
                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                        <button
                            onClick={() => {
                                setShowCancelModal(false);
                                setCancelConfirmText('');
                            }}
                            className="btn btn-secondary"
                            style={{ flex: 1 }}
                        >
                            Keep My Account
                        </button>
                        <button
                            onClick={handleCancelAccount}
                            className="btn btn-primary"
                            disabled={cancelConfirmText !== 'CANCEL' || isCanceling}
                            style={{
                                flex: 1,
                                backgroundColor: 'var(--color-danger)',
                                borderColor: 'var(--color-danger)',
                                color: 'white',
                                opacity: cancelConfirmText !== 'CANCEL' ? 0.5 : 1
                            }}
                        >
                            {isCanceling ? 'Canceling...' : 'Yes, Cancel Account'}
                        </button>
                    </div>
                }
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', padding: 'var(--space-2) 0' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)', padding: 'var(--space-3)', backgroundColor: '#fee2e2', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-danger)' }}>
                        <AlertTriangle size={24} style={{ color: 'var(--color-danger)', flexShrink: 0, marginTop: '2px' }} />
                        <div>
                            <p style={{ fontWeight: 600, fontSize: 'var(--font-size-base)', marginBottom: '4px', color: 'var(--color-danger)' }}>
                                This action cannot be undone
                            </p>
                            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', lineHeight: 1.5 }}>
                                Canceling your account will:
                            </p>
                            <ul style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', lineHeight: 1.5, marginTop: '8px', paddingLeft: '20px' }}>
                                <li>Delete all your local data (jobs, customers, pets, etc.)</li>
                                <li>Mark your subscription as canceled</li>
                                <li>Log you out immediately</li>
                            </ul>
                            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', lineHeight: 1.5, marginTop: '8px', fontStyle: 'italic' }}>
                                Your account profile will be preserved so you can reactivate in the future.
                            </p>
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', fontSize: 'var(--font-size-sm)' }}>
                            Type <span style={{ color: 'var(--color-danger)', fontFamily: 'monospace' }}>CANCEL</span> to confirm:
                        </label>
                        <input
                            type="text"
                            value={cancelConfirmText}
                            onChange={(e) => setCancelConfirmText(e.target.value)}
                            placeholder="Type CANCEL here"
                            style={{
                                width: '100%',
                                padding: 'var(--space-2)',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--border-color)',
                                fontSize: 'var(--font-size-base)',
                                fontFamily: 'monospace'
                            }}
                        />
                    </div>
                </div>
            </Modal>
        </div>
    );
}
