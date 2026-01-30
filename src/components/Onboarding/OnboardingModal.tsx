'use client';

import { useState, useEffect } from 'react';
import { getDB } from '@/lib/db';
import { Settings } from '@/lib/db/schema';
import { Store, Check, AlertCircle, ChevronDown, ChevronRight, CreditCard } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useSync } from '@/hooks/useSync';
import { addToSyncQueue } from '@/lib/db/sync';

export function OnboardingModal() {
    const [isOpen, setIsOpen] = useState(false);
    const [businessName, setBusinessName] = useState('');
    const { isHydrating } = useSync();

    // Payment States
    const [isPaymentExpanded, setIsPaymentExpanded] = useState(false);
    const [venmo, setVenmo] = useState('');
    const [zelle, setZelle] = useState('');
    const [paypal, setPaypal] = useState('');
    const [cashapp, setCashapp] = useState('');
    const [customUrl, setCustomUrl] = useState('');

    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);

    const router = useRouter();

    useEffect(() => {
        if (!isHydrating) {
            checkOnboardingStatus();
        }
    }, [isHydrating]);

    const checkOnboardingStatus = async () => {
        try {
            const db = await getDB();
            const settings = await db.get('settings', 'default');

            // V2.9 SHIELD: Multi-Factor Onboarding Detection
            // Don't show onboarding if ANY of these conditions are true:
            // 1. onboardingCompleted flag is explicitly true
            // 2. User has an active subscription (they've already paid)
            // 3. User has a trial subscription (they've already started)
            // 4. Business name exists AND user has payment methods configured (indicates setup was done)

            const hasCompletedFlag = settings?.onboardingCompleted === true;
            const hasActiveSubscription = settings?.subscription_status === 'active';
            const hasTrialSubscription = settings?.subscription_status === 'trial';
            const hasBusinessSetup = settings?.businessName && (
                settings?.venmo || settings?.zelle || settings?.paypal ||
                settings?.cashapp || settings?.custom_url
            );

            const shouldSkipOnboarding = hasCompletedFlag || hasActiveSubscription ||
                hasTrialSubscription || hasBusinessSetup;

            if (!shouldSkipOnboarding) {
                setIsOpen(true);
                if (settings?.businessName) {
                    setBusinessName(settings.businessName);
                }
                // Pre-fill payments if they exist (unlikely for new user, but good for robustness)
                if (settings?.venmo) setVenmo(settings.venmo);
                if (settings?.zelle) setZelle(settings.zelle);
                if (settings?.paypal) setPaypal(settings.paypal);
                if (settings?.cashapp) setCashapp(settings.cashapp);
                if (settings?.custom_url) setCustomUrl(settings.custom_url);
            }
        } catch (e) {
            console.error('Failed to check onboarding status', e);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!businessName.trim()) {
            setError('Business Name is required.');
            return;
        }

        setSaving(true);
        try {
            const db = await getDB();
            const existing = await db.get('settings', 'default') || { id: 'default', updatedAt: Date.now() };

            const now = Date.now();
            const trialEnd = new Date(now + 14 * 24 * 60 * 60 * 1000).toISOString();

            const updatedSettings: Settings = {
                ...existing,
                businessName: businessName.trim(),
                venmo: venmo.trim() || undefined,
                zelle: zelle.trim() || undefined,
                paypal: paypal.trim() || undefined,
                cashapp: cashapp.trim() || undefined,
                custom_url: customUrl.trim() || undefined,
                onboardingCompleted: true,

                // Initialize Trial
                subscription_status: 'trial',
                trial_start_date: new Date(now).toISOString(),
                trial_end_date: trialEnd,

                updatedAt: now
            };

            await db.put('settings', updatedSettings);

            // Queue for Sync to Supabase
            await addToSyncQueue('UPDATE', 'SETTINGS', 'default', updatedSettings);

            setIsOpen(false);

            // Redirect to Today tab (Root)
            router.push('/');

        } catch (e) {
            console.error('Failed to save settings', e);
            setError('Failed to save. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    if (loading || !isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.9)', // Darker background for focus
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000, // High z-index
            padding: 'var(--space-4)',
            overflowY: 'auto' // Allow scrolling if content is tall
        }}>
            <div className="card" style={{
                width: '100%',
                maxWidth: '500px',
                padding: 'var(--space-8)',
                animation: 'slideUp 0.3s ease-out',
                maxHeight: '90vh',
                overflowY: 'auto'
            }}>
                <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
                    <div style={{ marginBottom: 'var(--space-6)', display: 'flex', justifyContent: 'center' }}>
                        <img
                            src="/logo_vibrant.png"
                            alt="K9desk Mark"
                            style={{
                                width: '80px',
                                height: '80px',
                                objectFit: 'contain'
                            }}
                        />
                    </div>
                    <h2 style={{
                        marginBottom: 'var(--space-4)',
                        fontSize: '28px', // Larger font
                        fontWeight: 800,
                        lineHeight: 1.2
                    }}>Welcome to K9desk!</h2>
                    <p style={{
                        color: 'var(--text-secondary)',
                        fontSize: '18px', // Larger text
                        lineHeight: 1.5
                    }}>
                        Let's get your business set up.
                    </p>
                </div>

                <div style={{ marginBottom: 'var(--space-8)' }}>
                    <label style={{
                        display: 'block',
                        marginBottom: 'var(--space-3)',
                        fontWeight: 700,
                        fontSize: '18px' // Larger label
                    }}>
                        Business Name <span style={{ color: 'var(--error)' }}>*</span>
                    </label>
                    <input
                        type="text"
                        className="input"
                        placeholder="e.g. John's Mobile Grooming"
                        value={businessName}
                        onChange={(e) => {
                            setBusinessName(e.target.value);
                            if (e.target.value.trim()) setError('');
                        }}
                        style={{
                            width: '100%',
                            padding: '16px', // Larger padding
                            fontSize: '18px', // Larger text
                            height: 'auto'
                        }}
                        autoFocus
                    />
                    <p style={{
                        marginTop: '8px',
                        fontSize: '14px',
                        color: 'var(--text-tertiary)'
                    }}>
                        This name will be used in automated text messages.
                    </p>
                    {error && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            color: 'var(--error)',
                            fontSize: '15px',
                            marginTop: '12px',
                            fontWeight: 500
                        }}>
                            <AlertCircle size={18} />
                            {error}
                        </div>
                    )}
                </div>

                {/* Optional Payment Settings */}
                <div style={{
                    marginBottom: 'var(--space-8)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-lg)',
                    overflow: 'hidden'
                }}>
                    <button
                        onClick={() => setIsPaymentExpanded(!isPaymentExpanded)}
                        style={{
                            width: '100%',
                            padding: '20px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            background: 'var(--surface-sunken)',
                            border: 'none',
                            cursor: 'pointer',
                            textAlign: 'left'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <CreditCard size={24} color="var(--text-secondary)" />
                            <span style={{ fontSize: '18px', fontWeight: 600 }}>How Customers Pay You</span>
                            <span style={{
                                fontSize: '14px',
                                color: 'var(--text-tertiary)',
                                fontWeight: 400,
                                backgroundColor: 'rgba(0,0,0,0.05)',
                                padding: '2px 8px',
                                borderRadius: '12px'
                            }}>Optional</span>
                        </div>
                        {isPaymentExpanded ? <ChevronDown size={24} /> : <ChevronRight size={24} />}
                    </button>

                    {isPaymentExpanded && (
                        <div style={{ padding: '20px', backgroundColor: 'var(--surface-default)' }}>
                            <p style={{ marginBottom: '20px', color: 'var(--text-secondary)', fontSize: '16px' }}>
                                Enter your payment handles so they can be sent to customers in payment request texts. You can change these later in Settings.
                            </p>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Venmo Handle</label>
                                    <input className="input" style={{ width: '100%', padding: '12px', fontSize: '16px' }} placeholder="@YourHandle" value={venmo} onChange={e => setVenmo(e.target.value)} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Zelle (Phone/Email)</label>
                                    <input className="input" style={{ width: '100%', padding: '12px', fontSize: '16px' }} placeholder="555-0123 or email" value={zelle} onChange={e => setZelle(e.target.value)} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>PayPal.me Link</label>
                                    <input className="input" style={{ width: '100%', padding: '12px', fontSize: '16px' }} placeholder="paypal.me/user" value={paypal} onChange={e => setPaypal(e.target.value)} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Cash App Tag</label>
                                    <input className="input" style={{ width: '100%', padding: '12px', fontSize: '16px' }} placeholder="$Cashtag" value={cashapp} onChange={e => setCashapp(e.target.value)} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Custom Payment URL</label>
                                    <input className="input" style={{ width: '100%', padding: '12px', fontSize: '16px' }} placeholder="https://..." value={customUrl} onChange={e => setCustomUrl(e.target.value)} />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <button
                    onClick={handleSave}
                    className="btn btn-primary"
                    style={{
                        width: '100%',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '16px',
                        fontSize: '18px',
                        fontWeight: 600,
                        borderRadius: 'var(--radius-lg)'
                    }}
                    disabled={saving}
                >
                    {saving ? 'Setting up...' : 'Get Started'}
                    {!saving && <Check size={24} />}
                </button>
            </div>
        </div >
    );
}
