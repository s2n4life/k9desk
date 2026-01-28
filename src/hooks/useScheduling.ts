import { useState, useEffect, useMemo } from 'react';
import { getDB } from '@/lib/db';
import { Job, Settings, Service } from '@/lib/db/schema';
import { format } from 'date-fns';

export function useScheduling(date: string, selectedServices: (Service & { petId?: string })[], excludeJobId?: string) {
    const [settings, setSettings] = useState<Settings | null>(null);
    const [existingJobs, setExistingJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadInitial = async () => {
            const db = await getDB();
            const s = await db.get('settings', 'default');
            setSettings(s || null);
            setLoading(false);
        };
        loadInitial();
    }, []);

    useEffect(() => {
        if (date) {
            loadJobsForDate(date);
        }
    }, [date]);

    const loadJobsForDate = async (d: string) => {
        const db = await getDB();
        const jobs = await db.getAllFromIndex('jobs', 'by-date', d);

        // Include sync queue items
        const syncItems = await db.getAll('syncQueue');
        const pendingJobs = syncItems
            .filter(item => item.entityType === 'JOB' && (item.action === 'CREATE' || item.action === 'UPDATE'))
            .map(item => item.data as Job)
            .filter(job => job.scheduledDate === d);

        setExistingJobs([...jobs, ...pendingJobs]);
    };

    const availableSlots = useMemo(() => {
        if (!date) return [];

        const startHour = settings?.schedule_start_hour || 8;
        const endHour = settings?.schedule_end_hour || 20;
        const driveBuffer = settings?.drive_buffer_minutes || 30;

        // 1. Calculate Total Duration (Global Setting)
        const totalDuration = settings?.appointment_duration_minutes || 60;

        // 2. Generate slots
        const slots: string[] = [];
        const now = new Date();
        const isToday = date === format(now, 'yyyy-MM-dd');
        const currentTotalMinutes = now.getHours() * 60 + now.getMinutes();

        for (let h = startHour; h < endHour; h++) {
            for (const m of ['00', '30']) {
                const slotTime = `${String(h).padStart(2, '0')}:${m}`;
                const slotStart = h * 60 + parseInt(m);
                const slotEnd = slotStart + totalDuration;

                if (isToday && slotStart < currentTotalMinutes + 15) continue;
                if (slotEnd > endHour * 60) continue;

                slots.push(slotTime);
            }
        }

        // 3. Filter conflicts
        return slots.filter(slotTime => {
            const [sh, sm] = slotTime.split(':').map(Number);
            const slotStart = sh * 60 + sm;
            const slotEnd = slotStart + totalDuration;

            for (const job of existingJobs) {
                if (excludeJobId && job.id === excludeJobId) continue;
                if (!job.scheduledTime) continue;

                const [jh, jm] = job.scheduledTime.split(':').map(Number);
                const jobStart = jh * 60 + jm;
                const jobDuration = settings?.appointment_duration_minutes || 60;

                const effectiveJobStart = jobStart - driveBuffer;
                const effectiveJobEnd = jobStart + jobDuration + driveBuffer;

                if (slotStart < effectiveJobEnd && slotEnd > effectiveJobStart) {
                    return false;
                }
            }
            return true;
        });
    }, [date, existingJobs, settings, excludeJobId]);

    return { availableSlots, loading, settings, totalDuration: settings?.appointment_duration_minutes || 60 };
}
