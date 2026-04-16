'use client';

import { useEffect, useState } from 'react';
import { format, parseISO, isAfter } from 'date-fns';
import { JobCard } from '@/components/Jobs/JobCard';
import { getDB } from '@/lib/db';
import { Job, Customer, Pet, JobState, Settings } from '@/lib/db/schema';
import { JobStateMachine } from '@/lib/jobs/stateMachine';
import { triggerSMSAction } from '@/lib/sms';
import { useDataLoader } from '@/hooks/useDataLoader';

import { Header } from '@/components/Navigation/Header';
import { CalendarModal } from '@/components/Jobs/CalendarModal';
import { Calendar as CalendarIcon } from 'lucide-react';

export default function UpcomingPage() {
    const [loading, setLoading] = useState(true);
    const [rawJobs, setRawJobs] = useState<Job[]>([]);
    const [groupedJobs, setGroupedJobs] = useState<Record<string, Job[]>>({});
    const [isCalendarOpen, setCalendarOpen] = useState(false);
    const [customers, setCustomers] = useState<Record<string, Customer>>({});
    const [pets, setPets] = useState<Record<string, Pet>>({});
    const [settings, setSettings] = useState<Settings | null>(null);
    const { loadJobs, loadCustomers, loadPets, isImpersonating, impersonatedBusinessId } = useDataLoader();

    const todayStr = format(new Date(), 'yyyy-MM-dd');

    const loadData = async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            const allJobs = await loadJobs();
            setRawJobs(allJobs);
            const allCustomers = await loadCustomers();
            const allPets = await loadPets();

            // Index customers and pets for easy lookup
            const custMap: Record<string, Customer> = {};
            allCustomers.forEach(c => custMap[c.id] = c);
            setCustomers(custMap);

            const petMap: Record<string, Pet> = {};
            allPets.forEach(p => petMap[p.id] = p);
            setPets(petMap);

            // Filter: scheduledDate > todayStr AND state is Scheduled or ReminderSent
            const upcoming = allJobs.filter(j =>
                j.scheduledDate > todayStr &&
                [JobState.Scheduled, JobState.ReminderSent].includes(j.state)
            );
            // Sort by date then time
            upcoming.sort((a, b) => {
                if (a.scheduledDate !== b.scheduledDate) return a.scheduledDate.localeCompare(b.scheduledDate);
                return a.scheduledTime.localeCompare(b.scheduledTime);
            });

            // Group by date
            const grouped: Record<string, Job[]> = {};
            upcoming.forEach(j => {
                if (!grouped[j.scheduledDate]) grouped[j.scheduledDate] = [];
                grouped[j.scheduledDate].push(j);
            });
            setGroupedJobs(grouped);

            const db = await getDB();
            const s = await db.get('settings', 'default');
            setSettings(s || null);

        } catch (error) {
            console.error('Failed to load upcoming', error);
        } finally {
            if (!silent) setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [isImpersonating, impersonatedBusinessId]);

    const handleAction = async (jobId: string, action: any) => {
        try {
            // Find job and customer from rawJobs instead of just grouped upcoming
            let job = rawJobs.find(j => j.id === jobId);

            if (job) {
                const customer = customers[job.customerId];
                if (customer) triggerSMSAction(job, customer, action, { settings });
            }

            await JobStateMachine.transition(jobId, action);
            await loadData(true);
        } catch (e) {
            console.error(e);
            alert('Action failed');
        }
    };

    if (loading) return <div className="container" style={{ paddingTop: '2rem' }}>Loading...</div>;

    return (
        <div className="container" style={{ paddingBottom: '100px' }}>
            <Header
                title="Upcoming"
                subtitle="Your schedule for the next few days"
                actionNode={
                    <button 
                        onClick={() => setCalendarOpen(true)}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px', borderRadius: '50%', backgroundColor: 'var(--surface-sunken)', border: 'none', cursor: 'pointer' }}
                        aria-label="Open Calendar"
                    >
                        <CalendarIcon size={22} color="var(--brand-primary)" />
                    </button>
                }
            />

            {Object.keys(groupedJobs).length === 0 ? (
                <div className="card" style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                    <p>No upcoming jobs scheduled.</p>
                </div>
            ) : (
                Object.entries(groupedJobs).map(([dateStr, jobs]) => (
                    <div key={dateStr} style={{ marginBottom: 'var(--space-6)' }}>
                        <h3 className="text-h2" style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-lg)', marginBottom: 'var(--space-4)' }}>
                            {format(parseISO(dateStr), 'EEEE, MMM d')}
                        </h3>
                        {jobs.map(job => (
                            <JobCard
                                key={job.id}
                                job={job}
                                customerName={customers[job.customerId]?.name || 'Unknown'}
                                petNames={job.petIds.map(id => pets[id]?.name).filter(Boolean)}
                                onAction={(action) => handleAction(job.id, action)}
                            />
                        ))}
                    </div>
                ))
            )}

            <CalendarModal
                isOpen={isCalendarOpen}
                onClose={() => setCalendarOpen(false)}
                jobs={rawJobs}
                customers={customers}
                pets={pets}
                onJobAction={handleAction}
            />
        </div>
    );
}
