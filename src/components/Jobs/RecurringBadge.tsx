'use client';

import { RecurrenceFrequency, RecurrenceStatus } from '@/lib/db/schema';
import { getFrequencyLabel } from '@/lib/jobs/recurrence';
import { Repeat } from 'lucide-react';

interface RecurringBadgeProps {
    frequency: RecurrenceFrequency;
    status: RecurrenceStatus;
    size?: 'sm' | 'md';
}

export function RecurringBadge({ frequency, status, size = 'sm' }: RecurringBadgeProps) {
    const isPaused = status === RecurrenceStatus.Paused;
    const isCanceled = status === RecurrenceStatus.Canceled;

    const sizeStyles = size === 'sm' ? {
        padding: '2px 8px',
        fontSize: 'var(--font-size-xs)',
        iconSize: 12,
    } : {
        padding: '4px 10px',
        fontSize: 'var(--font-size-sm)',
        iconSize: 14,
    };

    return (
        <div
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: sizeStyles.padding,
                borderRadius: 12,
                background: isPaused
                    ? 'var(--color-warning-light)'
                    : isCanceled
                        ? 'var(--surface-background)'
                        : 'var(--brand-primary-light)',
                color: isPaused
                    ? 'var(--color-warning)'
                    : isCanceled
                        ? 'var(--text-tertiary)'
                        : 'var(--brand-primary)',
                fontSize: sizeStyles.fontSize,
                fontWeight: 600,
                border: `1px solid ${isPaused ? 'var(--color-warning)' : isCanceled ? 'var(--border-color)' : 'var(--brand-primary)'}`,
            }}
        >
            <Repeat size={sizeStyles.iconSize} />
            <span>{getFrequencyLabel(frequency)}</span>
            {isPaused && <span style={{ opacity: 0.7 }}>• Paused</span>}
            {isCanceled && <span style={{ opacity: 0.7 }}>• Canceled</span>}
        </div>
    );
}
