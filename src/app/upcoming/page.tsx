'use client';

import { useEffect, useState } from 'react';
import { format, parseISO, isAfter } from 'date-fns';
import { JobCard } from '@/components/Jobs/JobCard';
import { getDB } from '@/lib/db';
import { Job, Customer, Pet, JobState } from '@/lib/db/schema';
import { JobStateMachine } from '@/lib/jobs/stateMachine';
import { triggerSMSAction } from '@/lib/sms';
import { useDataLoader } from '@/hooks/useDataLoader';

import { Header } from '@/components/Navigation/Header';

export default function UpcomingPage() {
    const [loading, setLoading] = useState(true);
    const [groupedJobs, setGroupedJobs] = useState<Record<string, Job[]>>({});
    const [customers, setCustomers] = useState<Record<string, Customer>>({});
    const [pets, setPets] = useState<Record<string, Pet>>({});
    const { loadJobs, loadCustomers, loadPets, isImpersonating, impersonatedBusinessId } = useDataLoader();

    const todayStr = format(new Date(), 'yyyy-MM-dd');

    const loadData = async () => {
        try {
            setLoading(true);
            const allJobs = await loadJobs();
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

        } catch (error) {
            console.error('Failed to load upcoming', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [isImpersonating, impersonatedBusinessId]);

    const handleAction = async (jobId: string, action: any) => {
        try {
            // Find job and customer from state
            let job: Job | undefined;
            // Search through groupedJobs
            for (const date in groupedJobs) {
                const found = groupedJobs[date].find(j => j.id === jobId);
                if (found) { job = found; break; }
            }

            if (job) {
                const customer = customers[job.customerId];
                if (customer) triggerSMSAction(job, customer, action);
            }

            await JobStateMachine.transition(jobId, action);
            await loadData();
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
        </div>
    );
}
