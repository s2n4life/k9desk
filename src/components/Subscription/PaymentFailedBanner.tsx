'use client';

import { useState, useEffect } from 'react';
import { getDB } from '@/lib/db';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import { AlertTriangle, CreditCard, X } from 'lucide-react';

export function PaymentFailedBanner() {
    const [isVisible, setIsVisible] = useState(false);
    const [daysSinceFailure, setDaysSinceFailure] = useState(0);
    const [daysRemaining, setDaysRemaining] = useState(0);
    const [isDismissed, setIsDismissed] = useState(false);

    useEffect(() => {
        checkPaymentStatus();

        // Check if banner was dismissed this session
        const dismissed = sessionStorage.getItem('payment_banner_dismissed');
        if (dismissed === 'true') {
            setIsDismissed(true);
        }
    }, []);

    const checkPaymentStatus = async () => {
        try {
            const db = await getDB();
            const settings = await db.get('settings', 'default');

            if (!settings) return;

            // Only show banner if past_due with payment_failed_at timestamp
            if (
                settings.subscription_status === 'past_due' &&
                settings.payment_failed_at
            ) {
                const failedAt = parseISO(settings.payment_failed_at);
                const now = new Date();
                const days = differenceInCalendarDays(now, failedAt);
                const remaining = Math.max(0, 3 - days);

                setDaysSinceFailure(days);
                setDaysRemaining(remaining);

                // Only show banner during grace period (Days 1-3)
                if (days >= 1 && days < 4) {
                    setIsVisible(true);
                }
            }
        } catch (error) {
            console.error('[PaymentFailedBanner] Error checking payment status:', error);
        }
    };

    const handleDismiss = () => {
        setIsDismissed(true);
        sessionStorage.setItem('payment_banner_dismissed', 'true');
    };

    const handleUpdatePayment = async () => {
        try {
            const res = await fetch('/api/stripe/create-portal-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ origin: window.location.origin }),
            });
            const data = await res.json();
            if (data.url) {
                window.location.href = data.url;
            } else {
                // Fallback to settings page
                window.location.href = '/settings';
            }
        } catch (error) {
            console.error('[PaymentFailedBanner] Failed to open billing portal:', error);
            window.location.href = '/settings';
        }
    };

    if (!isVisible || isDismissed) return null;

    // Determine severity based on days
    const isDay1 = daysSinceFailure === 1;
    const isDanger = daysSinceFailure >= 2;

    return (
        <div
            style={{
                position: 'sticky',
                top: 0,
                zIndex: 1000,
                background: isDanger ? 'linear-gradient(135deg, #c53030 0%, #9b2c2c 100%)' : 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
                color: 'white',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                <AlertTriangle size={20} />
                <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '2px' }}>
                        {isDay1 ? 'Payment Update Needed' : 'Account in Read-Only Mode'}
                    </div>
                    <div style={{ fontSize: '13px', opacity: 0.95 }}>
                        {isDay1
                            ? `Your payment failed. You have ${daysRemaining} days to update your payment method.`
                            : `Payment issue not resolved. ${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'} until account lockout.`}
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                    onClick={handleUpdatePayment}
                    style={{
                        background: 'white',
                        color: isDanger ? '#c53030' : '#d97706',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '6px',
                        fontWeight: 600,
                        fontSize: '13px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        whiteSpace: 'nowrap',
                    }}
                >
                    <CreditCard size={16} />
                    Update Payment
                </button>
                <button
                    onClick={handleDismiss}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'white',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        opacity: 0.8,
                    }}
                    aria-label="Dismiss"
                >
                    <X size={20} />
                </button>
            </div>
        </div>
    );
}
