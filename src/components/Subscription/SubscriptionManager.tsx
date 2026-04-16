'use client';

import { useState, useEffect } from 'react';
import { getDB } from '@/lib/db';
import { Settings } from '@/lib/db/schema';
import { Lock, AlertTriangle, CreditCard, ExternalLink } from 'lucide-react';
import { differenceInCalendarDays, parseISO } from 'date-fns';

export function SubscriptionManager() {
    const [status, setStatus] = useState<'active' | 'warning' | 'locked' | 'loading'>('loading');
    const [daysLeft, setDaysLeft] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
    const [isLoading, setIsLoading] = useState(false);
    const [settings, setSettings] = useState<Settings | null>(null);

    const handleUpgrade = async () => {
        setIsLoading(true);
        try {
            const priceId = billingCycle === 'monthly'
                ? process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_MONTHLY
                : process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_YEARLY;

            const origin = window.location.origin;
            const res = await fetch('/api/stripe/create-checkout-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ priceId, origin }),
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                console.error('Checkout error:', errData);
                throw new Error('Failed to create checkout session');
            }

            const { url } = await res.json();
            window.location.href = url;
        } catch (error) {
            console.error(error);
            alert('Something went wrong initiating checkout.');
            setIsLoading(false);
        }
    };

    const handlePortal = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/stripe/create-portal-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ origin: window.location.origin }),
            });
            const data = await res.json();
            if (data.url) {
                window.location.href = data.url;
            } else if (data.error === 'no_customer') {
                alert(data.message);
            } else {
                throw new Error('Failed to open billing portal');
            }
        } catch (error) {
            console.error(error);
            alert('Something went wrong opening the customer portal.');
            setIsLoading(false);
        }
    };

    useEffect(() => {
        checkSubscription();
        window.addEventListener('focus', checkSubscription);
        return () => window.removeEventListener('focus', checkSubscription);
    }, []);

    const checkSubscription = async () => {
        try {
            const db = await getDB();
            const settingsData = await db.get('settings', 'default');

            setSettings(settingsData || null);

            if (!settingsData || !settingsData.subscription_status) {
                setStatus('active');
                return;
            }

            if (settingsData.subscription_status === 'active') {
                setStatus('active');
                return;
            }

            if (settingsData.subscription_status === 'trialing') {
                const end = parseISO(settingsData.trial_end_date!);
                const now = new Date();
                const diff = differenceInCalendarDays(end, now);
                setDaysLeft(diff);

                if (diff < 0) {
                    setStatus('locked');
                    setIsOpen(true);
                } else if (diff <= 2) {
                    const warned = sessionStorage.getItem('trial_warned');
                    if (!warned) {
                        setStatus('warning');
                        setIsOpen(true);
                        sessionStorage.setItem('trial_warned', 'true');
                    } else {
                        setStatus('active');
                    }
                } else {
                    setStatus('active');
                }
            } else if (settingsData.subscription_status === 'past_due') {
                // Payment failure - check grace period
                if (settingsData.payment_failed_at) {
                    const failedAt = parseISO(settingsData.payment_failed_at);
                    const now = new Date();
                    const daysSinceFailure = differenceInCalendarDays(now, failedAt);
                    const daysRemaining = Math.max(0, 3 - daysSinceFailure);

                    setDaysLeft(daysRemaining);

                    if (daysSinceFailure >= 4) {
                        // Grace period expired - lock account
                        setStatus('locked');
                        setIsOpen(true);
                    } else {
                        // Still in grace period - allow access
                        setStatus('active');
                    }
                } else {
                    // No timestamp - lock immediately
                    setStatus('locked');
                    setIsOpen(true);
                }
            } else if (settingsData.subscription_status === 'canceled') {
                setStatus('locked');
                setIsOpen(true);
            }

        } catch (e) {
            console.error(e);
        }
    };

    if (status === 'active' || !isOpen) return null;

    const isLocked = status === 'locked';

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.95)',
            zIndex: 99998,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px'
        }}>
            <div className="card" style={{ maxWidth: '400px', width: '100%', padding: '32px', textAlign: 'center' }}>
                <div style={{
                    width: '64px',
                    height: '64px',
                    background: isLocked ? 'var(--color-danger-muted)' : 'var(--color-warning-muted)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 24px',
                    color: isLocked ? '#ef4444' : '#d97706'
                }}>
                    {isLocked ? <Lock size={32} /> : <AlertTriangle size={32} />}
                </div>

                <h2 className="text-h2" style={{ marginBottom: '16px' }}>
                    {isLocked ? (settings?.subscription_status === 'past_due' ? 'Action Required' : 'Your Trial Has Expired') : `Trial Ends in ${daysLeft} ${daysLeft === 1 ? 'Day' : 'Days'}`}
                </h2>

                <div style={{ color: 'var(--text-secondary)', marginBottom: '32px', lineHeight: 1.5, textAlign: 'left' }}>
                    <p style={{ textAlign: 'center', marginBottom: '16px' }}>
                    {isLocked
                        ? (
                            settings?.subscription_status === 'past_due'
                                ? <>Your payment method needs to be updated.<br />Instantly restore your account by updating your billing info below.</>
                                : <>Don't lose your schedule and client history.<br />Choose a plan to instantly unlock your account and keep growing:</>
                        )
                        : "Your free trial is ending soon. Upgrade now to secure your account and client history:"}
                    </p>

                    {(!isLocked || settings?.subscription_status !== 'past_due') && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px', color: 'var(--text-primary)', background: 'var(--surface-sunken)', padding: '16px', borderRadius: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>✔️ <b>Unlimited Jobs & Client CRM</b></div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>✔️ <b>Public Booking Lead Intake</b></div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>✔️ <b>Daily Route Mapping & Earnings</b></div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>✔️ <b>1-Click Call & SMS Integration</b></div>
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
                    <button
                        onClick={() => setBillingCycle('monthly')}
                        style={{
                            padding: '12px 16px',
                            borderRadius: '12px',
                            border: '1px solid',
                            borderColor: billingCycle === 'monthly' ? 'var(--brand-primary)' : 'var(--border-color)',
                            background: billingCycle === 'monthly' ? 'var(--brand-primary-light)' : 'transparent',
                            color: billingCycle === 'monthly' ? 'var(--brand-primary)' : 'var(--text-secondary)',
                            fontWeight: 600,
                            fontSize: '16px',
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}
                    >
                        <span>Monthly — $49</span>
                        {billingCycle === 'monthly' && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--brand-primary)' }} />}
                    </button>
                    <button
                        onClick={() => setBillingCycle('yearly')}
                        style={{
                            padding: '12px 16px',
                            borderRadius: '12px',
                            border: '1px solid',
                            borderColor: billingCycle === 'yearly' ? 'var(--brand-primary)' : 'var(--border-color)',
                            background: billingCycle === 'yearly' ? 'var(--brand-primary-light)' : 'transparent',
                            color: billingCycle === 'yearly' ? 'var(--brand-primary)' : 'var(--text-secondary)',
                            fontWeight: 600,
                            fontSize: '16px',
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}
                    >
                        <span>Yearly — $490 <span style={{ fontSize: '12px', color: 'var(--success)', marginLeft: '4px' }}>(Save $98)</span></span>
                        {billingCycle === 'yearly' && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--brand-primary)' }} />}
                    </button>
                </div>

                <button
                    className="btn btn-primary"
                    style={{ width: '100%', marginBottom: '12px', padding: '16px', fontSize: '18px', display: 'flex', justifyContent: 'center', gap: '8px' }}
                    onClick={settings?.subscription_status === 'past_due' ? handlePortal : handleUpgrade}
                    disabled={isLoading}
                >
                    {isLoading ? <span className="animate-spin">...</span> : (
                        settings?.subscription_status === 'past_due' ? <ExternalLink size={22} /> : <CreditCard size={22} />
                    )}
                    {settings?.subscription_status === 'past_due' ? 'Update Payment Method' : 'Secure Account & Upgrade'}
                </button>

                <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '16px' }}>
                    Cancel anytime. No contracts. No hidden fees.
                </div>

                <div style={{ fontSize: '14px', color: 'var(--brand-primary)', fontWeight: 500, marginBottom: '8px', fontStyle: 'italic' }}>
                    "Most businesses upgrade to keep their day running smoothly."
                </div>

                {!isLocked && (
                    <button
                        onClick={() => setIsOpen(false)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', fontSize: '14px', cursor: 'pointer' }}
                    >
                        Remind me later
                    </button>
                )}
            </div>
        </div>
    );
}
