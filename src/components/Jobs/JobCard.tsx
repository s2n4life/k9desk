import { clsx } from 'clsx';
import { MapPin, Clock, Dog, Navigation } from 'lucide-react';
import { Job, JobState } from '../../lib/db/schema';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './JobCard.module.css';
import { ActionSheet } from '../UI/ActionSheet';
import { formatTime12Hour } from '@/lib/format';

interface JobCardProps {
    job: Job;
    customerName: string;
    petNames: string[];
    onAction: (action: string) => void;
}

const STATE_CONFIG: Record<JobState, { label: string; color: string; button?: string; action?: string; btnStyle?: React.CSSProperties }> = {
    [JobState.Scheduled]: { label: 'Scheduled', color: 'var(--text-tertiary)', button: 'Send Reminder', action: 'SEND_REMINDER', btnStyle: { background: '#3b82f6', color: 'white', border: 'none' } },
    [JobState.ReminderSent]: { label: 'Sent', color: 'var(--color-info)', button: 'Start Job', action: 'MARK_IN_PROGRESS', btnStyle: { background: '#f97316', color: 'white', border: 'none' } },
    [JobState.InProgress]: { label: 'In Progress', color: 'var(--brand-secondary)', button: 'Finish Job', action: 'MARK_COMPLETE', btnStyle: { background: '#22c55e', color: 'white', border: 'none' } },
    [JobState.Completed]: { label: 'Done', color: 'var(--color-success)' },
    [JobState.PaymentRequested]: { label: 'Waiting for Payment', color: 'var(--color-warning)' },
    [JobState.Paid]: { label: 'Paid', color: 'var(--color-success)' },
    [JobState.Closed]: { label: 'Closed', color: 'var(--text-tertiary)' },
    [JobState.Cancelled]: { label: 'Cancelled', color: 'var(--color-danger)' },
    [JobState.NoShow]: { label: 'No-Show', color: 'var(--color-danger)' },
};

export function JobCard({ job, customerName, petNames, onAction }: JobCardProps) {
    const router = useRouter();
    const config = STATE_CONFIG[job.state];
    const petsDisplay = petNames.slice(0, 2).join(', ') + (petNames.length > 2 ? ` + ${petNames.length - 2}` : '');

    // Special logic for ReminderSent which has two paths? 
    // Requirement: "Mark Job Complete: Reminder Sent / In Progress → Completed"
    // But also Reminder Sent -> In Progress if desired?
    // Let's stick to the prompt's primary flow or make the button smart.
    // Prompt says: "Send Reminder: Scheduled -> Reminder Sent"
    // "Mark Job Complete: Reminder Sent / In Progress -> Completed"

    // Design decision: Main button advances the workflow.
    // Scheduled -> Send Reminder
    // Reminder Sent -> Mark In Progress (to track work) OR Mark Complete directly?
    // Prompt lists "Mark Job Complete" from "Reminder Sent / In Progress".
    // It implies skipping "In Progress" is possible.
    // But for the Card, let's offer "Start Job" if Reminder Sent, then "Finish Job" if In Progress.

    const [showNavSheet, setShowNavSheet] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleNavigation = () => {
        setShowNavSheet(true);
    };

    const handleCardClick = (e: React.MouseEvent) => {
        // Only navigate if clicking on the card itself, not on buttons
        const target = e.target as HTMLElement;
        if (target.tagName === 'BUTTON' || target.closest('button')) {
            return;
        }
        router.push(`/jobs/${job.id}`);
    };

    const navOptions = [
        {
            label: 'Open Apple Maps',
            action: () => {
                window.open(`http://maps.apple.com/?q=${encodeURIComponent(job.address)}`, '_blank');
            }
        },
        {
            label: 'Open Google Maps',
            action: () => {
                window.open(`https://maps.google.com/?q=${encodeURIComponent(job.address)}`, '_blank');
            }
        },
        {
            label: 'Copy to Clipboard',
            action: () => {
                navigator.clipboard.writeText(job.address);
            }
        }
    ];

    return (
        <div className={clsx('card', styles.jobCard)} onClick={handleCardClick}>
            <div className={styles.statusWrapper}>
                <div className={styles.stateBadge} style={{ color: config.color, background: `${config.color}15` }}>
                    Status: {config.label}
                </div>
            </div>

            <div className={styles.header}>
                <h3 className={styles.customerName}>{customerName}</h3>
                <div className={styles.timeBadge}>
                    <Clock size={14} className={styles.timeIcon} />
                    <span>{formatTime12Hour(job.scheduledTime)}</span>
                </div>
            </div>

            <div className={styles.touchArea}>
                <div className={styles.petsContainer}>
                    <div className={styles.metaRow}>
                        <Dog size={16} className={styles.icon} />
                        <span className={styles.petNames}>{petsDisplay}</span>
                    </div>
                    <button
                        type="button"
                        className={styles.navigateLink}
                        onClick={(e) => {
                            e.stopPropagation();
                            handleNavigation();
                        }}
                    >
                        Navigate
                        <Navigation size={12} />
                    </button>
                </div>

                <div className={styles.addressContainer}>
                    <div className={styles.metaRow}>
                        <MapPin size={16} className={styles.icon} />
                        <span className={styles.address}>{job.address}</span>
                    </div>
                </div>
            </div>



            {job.state === JobState.Completed ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
                    <button
                        className={clsx('btn', 'btn-primary')}
                        style={{ width: '100%', background: '#10b981', color: 'white', border: 'none' }}
                        disabled={isProcessing}
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsProcessing(true);
                            onAction('REQUEST_PAYMENT');
                        }}
                    >
                        Ask for payment
                    </button>
                    <button
                        className={clsx('btn', 'btn-primary')}
                        disabled={isProcessing}
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsProcessing(true);
                            onAction('LOG_PAYMENT');
                        }}
                    >
                        Log Payment
                    </button>
                </div>
            ) : job.state === JobState.PaymentRequested ? (
                <div style={{ marginTop: 'var(--space-4)' }}>
                    <button
                        className={clsx('btn', 'btn-primary')}
                        style={{ width: '100%', background: '#10b981', color: 'white', border: 'none' }}
                        disabled={isProcessing}
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsProcessing(true);
                            onAction('LOG_PAYMENT');
                        }}
                    >
                        Log Payment
                    </button>
                </div>
            ) : job.state === JobState.Paid ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
                    <button
                        className={clsx('btn', 'btn-primary')}
                        style={{ background: '#a855f7', color: 'white', border: 'none' }}
                        disabled={isProcessing}
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsProcessing(true);
                            onAction('SEND_REVIEW_REQUEST');
                        }}
                    >
                        Ask for review
                    </button>
                    <button
                        className={clsx('btn', 'btn-secondary')}
                        disabled={isProcessing}
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsProcessing(true);
                            onAction('SKIP_REVIEW');
                        }}
                    >
                        Close
                    </button>
                </div>
            ) : config.button ? (
                <div style={job.state === JobState.Scheduled || job.state === JobState.ReminderSent ? { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' } : {}}>
                    {job.state === JobState.Scheduled && (
                        <button
                            className={clsx('btn', 'btn-secondary', styles.actionBtn)}
                            disabled={isProcessing}
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsProcessing(true);
                                onAction('MARK_IN_PROGRESS');
                            }}
                        >
                            Start Job
                        </button>
                    )}
                    {job.state === JobState.ReminderSent && (
                         <button
                            className={clsx('btn', 'btn-secondary', styles.actionBtn)}
                            disabled={isProcessing}
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsProcessing(true);
                                onAction('MARK_COMPLETE');
                            }}
                         >
                             Finish Job
                         </button>
                     )}
                    <button
                        className={clsx('btn', 'btn-primary', styles.actionBtn)}
                        style={{ ...(config.btnStyle || {}), width: '100%' }}
                        disabled={isProcessing}
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsProcessing(true);
                            if (config.action) onAction(config.action);
                        }}
                    >
                        {config.button}
                    </button>
                </div>
            ) : null}

            <ActionSheet
                isOpen={showNavSheet}
                onClose={() => setShowNavSheet(false)}
                options={navOptions}
                title={`Navigate to ${job.address}`}
            />
        </div>
    );
}
