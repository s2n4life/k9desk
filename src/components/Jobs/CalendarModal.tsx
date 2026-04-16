import { useState } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, parseISO } from 'date-fns';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Job, Customer, Pet } from '@/lib/db/schema';
import { JobCard } from '@/components/Jobs/JobCard';

interface CalendarModalProps {
    isOpen: boolean;
    onClose: () => void;
    jobs: Job[];
    customers: Record<string, Customer>;
    pets: Record<string, Pet>;
    onJobAction: (jobId: string, action: string) => void;
}

export function CalendarModal({ isOpen, onClose, jobs, customers, pets, onJobAction }: CalendarModalProps) {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);

    if (!isOpen) return null;

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);

    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
    const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

    // Get jobs for the selected day
    const selectedDateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null;
    const selectedJobs = selectedDateStr ? jobs.filter(j => j.scheduledDate === selectedDateStr).sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime)) : [];

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'var(--surface-overlay)',
            zIndex: 1000, 
            display: 'flex', flexDirection: 'column',
            overflowY: 'auto'
        }}>
            <div style={{
                position: 'sticky', top: 0, zIndex: 10,
                backgroundColor: 'var(--bg-app)', padding: 'var(--space-4)',
                borderBottom: '1px solid var(--border-subtle)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
                <button onClick={onClose} className="btn-icon">
                    <X size={24} />
                </button>
                <h2 className="text-h2" style={{ margin: 0 }}>Calendar</h2>
                <div style={{ width: 24 }} /> {/* Empty spacer to center title */}
            </div>

            <div style={{ padding: 'var(--space-4)', flex: '1 1 auto' }}>
                {/* Month Controller */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
                    <button onClick={handlePrevMonth} className="btn btn-secondary" style={{ padding: '8px' }}>
                        <ChevronLeft size={20} />
                    </button>
                    <h3 className="text-h1" style={{ fontSize: '18px', margin: 0 }}>
                        {format(currentMonth, 'MMMM yyyy')}
                    </h3>
                    <button onClick={handleNextMonth} className="btn btn-secondary" style={{ padding: '8px' }}>
                        <ChevronRight size={20} />
                    </button>
                </div>

                {/* Day of Week Headers */}
                <div style={{ 
                    display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', 
                    gap: '4px', textAlign: 'center', marginBottom: '8px',
                    color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 600 
                }}>
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day}>{day}</div>
                    ))}
                </div>

                {/* Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: 'var(--space-6)' }}>
                    {days.map(day => {
                        const dayStr = format(day, 'yyyy-MM-dd');
                        const dayJobs = jobs.filter(j => j.scheduledDate === dayStr);
                        const isCurrentMonth = isSameMonth(day, currentMonth);
                        const isSelected = selectedDate && isSameDay(day, selectedDate);
                        
                        return (
                            <div 
                                key={day.toString()}
                                onClick={() => setSelectedDate(day)}
                                style={{
                                    aspectRatio: '1',
                                    display: 'flex', flexDirection: 'column',
                                    alignItems: 'center', justifyContent: 'center',
                                    borderRadius: '8px',
                                    backgroundColor: isSelected ? 'var(--brand-primary)' : isCurrentMonth ? 'var(--surface-sunken)' : 'transparent',
                                    color: isSelected ? '#fff' : isCurrentMonth ? 'var(--text-primary)' : 'var(--text-tertiary)',
                                    opacity: isCurrentMonth ? 1 : 0.5,
                                    position: 'relative',
                                    cursor: 'pointer',
                                    border: isSelected ? '2px solid var(--brand-primary)' : '1px solid transparent'
                                }}
                            >
                                <span style={{ fontSize: '16px', fontWeight: isSelected ? 600 : 400 }}>
                                    {format(day, 'd')}
                                </span>
                                
                                {/* Density Badge */}
                                {dayJobs.length > 0 && (
                                    <div style={{
                                        position: 'absolute', bottom: '4px',
                                        backgroundColor: isSelected ? '#fff' : 'var(--error)',
                                        color: isSelected ? 'var(--brand-primary)' : '#fff',
                                        fontSize: '10px', fontWeight: 700,
                                        height: '16px', minWidth: '16px', padding: '0 4px',
                                        borderRadius: '8px',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}>
                                        {dayJobs.length}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Selected Day View */}
                {selectedDate && (
                    <div style={{ 
                        borderTop: '2px solid var(--border-subtle)', 
                        paddingTop: 'var(--space-6)',
                        animation: 'fadeIn 0.2s ease-out'
                    }}>
                        <h3 className="text-h2" style={{ marginBottom: 'var(--space-4)' }}>
                            Jobs for {format(selectedDate, 'EEEE, MMM d')}
                        </h3>

                        {selectedJobs.length === 0 ? (
                            <p style={{ color: 'var(--text-tertiary)', textAlign: 'center', padding: 'var(--space-4)' }}>
                                No jobs scheduled.
                            </p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                                {selectedJobs.map(job => (
                                    <JobCard
                                        key={job.id}
                                        job={job}
                                        customerName={customers[job.customerId]?.name || 'Unknown'}
                                        petNames={job.petIds.map(id => pets[id]?.name).filter(Boolean)}
                                        onAction={(action) => onJobAction(job.id, action)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
            <style jsx>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}
