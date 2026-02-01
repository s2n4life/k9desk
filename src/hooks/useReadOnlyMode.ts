'use client';

import { useState, useEffect } from 'react';
import { getDB } from '@/lib/db';
import { differenceInCalendarDays, parseISO } from 'date-fns';

interface ReadOnlyModeState {
    isReadOnly: boolean;
    reason: string;
    daysSinceFailure: number;
}

/**
 * Hook to determine if the account is in read-only mode
 * Returns true for Days 2-3 of grace period (past_due status)
 */
export function useReadOnlyMode(): ReadOnlyModeState {
    const [state, setState] = useState<ReadOnlyModeState>({
        isReadOnly: false,
        reason: '',
        daysSinceFailure: 0,
    });

    useEffect(() => {
        checkReadOnlyMode();
    }, []);

    const checkReadOnlyMode = async () => {
        try {
            const db = await getDB();
            const settings = await db.get('settings', 'default');

            if (!settings) {
                setState({ isReadOnly: false, reason: '', daysSinceFailure: 0 });
                return;
            }

            // Check if account is past_due with payment_failed_at timestamp
            if (
                settings.subscription_status === 'past_due' &&
                settings.payment_failed_at
            ) {
                const failedAt = parseISO(settings.payment_failed_at);
                const now = new Date();
                const daysSinceFailure = differenceInCalendarDays(now, failedAt);

                // Read-only mode: Days 2-3 (Day 1 = full access, Day 4+ = locked)
                if (daysSinceFailure >= 2 && daysSinceFailure < 4) {
                    setState({
                        isReadOnly: true,
                        reason: 'Account is in read-only mode due to payment failure. Update payment method to restore full access.',
                        daysSinceFailure,
                    });
                    return;
                }
            }

            setState({ isReadOnly: false, reason: '', daysSinceFailure: 0 });
        } catch (error) {
            console.error('[useReadOnlyMode] Error checking read-only mode:', error);
            setState({ isReadOnly: false, reason: '', daysSinceFailure: 0 });
        }
    };

    return state;
}
