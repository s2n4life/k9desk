import { clsx } from 'clsx';
import { Calendar, Dog, MapPin, User, CheckCircle, XCircle, Trash2, Phone, Mail, MessageCircle } from 'lucide-react';
import { useState } from 'react';
import styles from '../Jobs/JobCard.module.css'; // Reusing job card styles for consistency
import { Lead } from '@/lib/db/schema';
import Link from 'next/link';

interface LeadCardProps {
    lead: Lead;
    onAccept: (leadId: string) => void;
    onArchive: (leadId: string) => void;
    onDelete: (leadId: string) => void;
    isArchived?: boolean;
    businessName?: string;
}

export function LeadCard({ lead, onAccept, onArchive, onDelete, isArchived, businessName }: LeadCardProps) {
    const [isOpen, setIsOpen] = useState(false);

    // Format pets display
    const petsDisplay = lead.petDetails.map(p => p.name).join(', ');

    // SMS Pre-fill logic
    const firstName = lead.ownerName.split(' ')[0];
    const bizName = businessName || 'our business';
    const smsBody = `Hi ${firstName}, this is ${bizName}. `;
    const smsHref = `sms:${lead.ownerPhone}?body=${encodeURIComponent(smsBody)}`;

    // COLLAPSED VIEW
    if (!isOpen) {
        return (
            <div
                onClick={() => setIsOpen(true)}
                className={clsx('card', styles.jobCard)}
                style={{ borderLeft: isArchived ? '4px solid #94a3b8' : '4px solid var(--color-info)', cursor: 'pointer' }}
            >
                <div className="flex justify-between items-center">
                    <div>
                        <h3 className={styles.customerName} style={{ marginBottom: 2 }}>{lead.ownerName}</h3>
                        <div className="text-xs text-slate-400 font-medium mb-1">{lead.ownerAddress || lead.serviceAreaZip}</div>
                        <div className="flex gap-2 text-sm text-slate-500">
                            <span>{petsDisplay || 'No pets listed'}</span>
                        </div>
                    </div>
                    <div className="text-slate-400">
                        {/* Chevron Down */}
                        <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>
                </div>
                {/* Mini badge for Date */}
                <div className="mt-2 text-xs font-semibold text-slate-500 bg-slate-100 w-fit px-2 py-1 rounded">
                    {lead.preferredDates[0] ? `Pref: ${lead.preferredDates[0]}` : 'No date pref'}
                </div>
            </div>
        );
    }

    // EXPANDED VIEW
    return (
        <div className={clsx('card', styles.jobCard)} style={{ borderLeft: isArchived ? '4px solid #94a3b8' : '4px solid var(--color-info)' }}>
            <div className="flex justify-between items-start mb-4">
                <div
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-1 text-slate-400 text-sm font-medium cursor-pointer mb-2 hover:text-slate-600"
                >
                    {/* Chevron Up */}
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                    Collapse
                </div>
            </div>

            <div className={styles.header}>
                <div className={styles.timeBadge} style={{ background: 'var(--color-info)', color: 'white' }}>
                    <span className="font-bold">NEW REQUEST</span>
                </div>
                <div className={styles.stateBadge}>
                    {lead.serviceAreaZip}
                </div>
            </div>

            {/* --- FULL DETAILS (Expanded) --- */}

            {/* Customer Info */}
            <div className="flex justify-between items-start mb-4">
                <div className="flex-1 min-w-0">
                    <h3 className={styles.customerName}>{lead.ownerName}</h3>
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                            <Phone size={14} />
                            <span>{lead.ownerPhone}</span>
                        </div>
                        {lead.ownerEmail && (
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                <Mail size={14} />
                                <span className="truncate pr-2">{lead.ownerEmail}</span>
                            </div>
                        )}
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                            <MapPin size={14} />
                            <span className="truncate pr-2 text-xs">{lead.ownerAddress || lead.serviceAreaZip}</span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-2 shrink-0">
                    <a
                        href={`tel:${lead.ownerPhone}`}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-slate-100 p-2 rounded-lg text-slate-700 hover:bg-slate-200 transition-colors flex items-center justify-center gap-2 text-[10px] font-bold w-20 shadow-sm border border-slate-200"
                    >
                        <Phone size={12} className="text-blue-600" />
                        CALL
                    </a>
                    <a
                        href={smsHref}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-slate-100 p-2 rounded-lg text-slate-700 hover:bg-slate-200 transition-colors flex items-center justify-center gap-2 text-[10px] font-bold w-20 shadow-sm border border-slate-200"
                    >
                        <MessageCircle size={12} className="text-green-600" />
                        TEXT
                    </a>
                </div>
            </div>

            {/* Pets */}
            <div className="bg-slate-50 p-3 rounded-lg mb-4 border border-slate-100">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Dog size={12} /> Pets
                </h4>
                <div className="space-y-3">
                    {lead.petDetails.map((pet, idx) => (
                        <div key={idx} className="text-sm">
                            <div className="font-bold text-slate-700">{pet.name} <span className="font-normal text-slate-500">({pet.breed})</span></div>
                            <div className="text-xs text-slate-500">{pet.age} years • {pet.weight} lbs</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Notes */}
            {lead.notes && (
                <div className="bg-yellow-50 p-3 rounded-lg mb-4 border border-yellow-100">
                    <h4 className="text-xs font-bold text-yellow-600 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <MessageCircle size={12} /> Notes
                    </h4>
                    <p className="text-sm text-slate-700 italic">"{lead.notes}"</p>
                </div>
            )}

            {/* Date Pref */}
            <div className="flex items-center gap-2 mb-4 text-sm font-medium text-indigo-600 bg-indigo-50 p-2 rounded w-fit">
                <Calendar size={16} />
                <span>Pref: {lead.preferredDates[0]}</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
                {!isArchived ? (
                    <>
                        <button
                            className={clsx('btn', 'btn-primary')}
                            onClick={(e) => {
                                e.preventDefault();
                                onAccept(lead.id);
                            }}
                        >
                            <CheckCircle size={16} style={{ marginRight: '6px' }} />
                            Book
                        </button>
                        <button
                            className={clsx('btn', 'btn-secondary')}
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onArchive(lead.id);
                            }}
                        >
                            <XCircle size={16} style={{ marginRight: '6px' }} />
                            Archive
                        </button>
                    </>
                ) : (
                    <>
                        <button
                            className={clsx('btn', 'btn-secondary')}
                            style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onDelete(lead.id);
                            }}
                        >
                            <Trash2 size={16} style={{ marginRight: '6px' }} />
                            Delete Forever
                        </button>
                        <button
                            className="btn btn-secondary"
                            onClick={(e) => {
                                e.preventDefault();
                                onAccept(lead.id); // Can still book archived? Yes.
                            }}
                        >
                            Recover & Book
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
