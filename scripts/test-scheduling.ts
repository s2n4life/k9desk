// Mock calculation function (simplified from page.tsx)
function calculateAvailableSlots(
    date: string,
    existingJobs: any[],
    selectedServices: any[],
    settings: any
) {
    const startHour = settings?.schedule_start_hour || 8;
    const endHour = settings?.schedule_end_hour || 20;
    const driveBuffer = settings?.drive_buffer_minutes || 30;

    let totalDuration = 0;
    if (selectedServices.length > 0) {
        totalDuration = selectedServices.reduce((sum, s) => sum + (s.duration_minutes || 60), 0);
    } else {
        totalDuration = 60;
    }

    const slots: string[] = [];
    for (let h = startHour; h < endHour; h++) {
        slots.push(`${String(h).padStart(2, '0')}:00`);
        slots.push(`${String(h).padStart(2, '0')}:30`);
    }

    return slots.filter(slotTime => {
        const [sh, sm] = slotTime.split(':').map(Number);
        const slotStart = sh * 60 + sm;
        const slotEnd = slotStart + totalDuration;

        for (const job of existingJobs) {
            if (!job.scheduledTime) continue;
            const [jh, jm] = job.scheduledTime.split(':').map(Number);
            const jobStart = jh * 60 + jm;

            const jobDuration = job.services?.reduce((sum: number, s: any) => sum + (s.duration_minutes || 60), 0) || 60;

            const bufferBefore = driveBuffer;
            const effectiveJobStart = jobStart - bufferBefore;
            const effectiveJobEnd = jobStart + jobDuration + driveBuffer;

            if (slotStart < effectiveJobEnd && slotEnd > effectiveJobStart) {
                return false;
            }
        }
        return true;
    });
}

// TEST CASES
const mockSettings = { schedule_start_hour: 8, schedule_end_hour: 12, drive_buffer_minutes: 30 };
const mockExistingJobs = [
    {
        id: '1',
        scheduledTime: '09:00',
        services: [{ id: 's1', name: 'Bath', price: 50, duration_minutes: 60, createdAt: 0 }],
    }
];

console.log('--- Test 1: 1-hour job at 9 AM, 30-min buffer ---');
console.log('Existing job: 9:00 - 10:00. Buffer: 8:30 - 10:30');
console.log('Available slots for 60-min job:');
const slots1 = calculateAvailableSlots('2026-02-02', mockExistingJobs, [], mockSettings);
console.log(slots1);
// Expected: 
// 8:00? Starts 8:00, Ends 9:00. Conflict with 8:30-10:30? YES (Start 8:00 < End 10:30 AND End 9:00 > Start 8:30).
// 10:30? Starts 10:30, Ends 11:30. Conflict with 8:30-10:30? NO (Start 10:30 < End 10:30 is FALSE).
// 11:00? Starts 11:00, Ends 12:00. OK.

console.log('\n--- Test 2: Long job (2 hours) ---');
console.log('Available slots for 120-min job:');
const slots2 = calculateAvailableSlots('2026-02-02', mockExistingJobs, [{ id: 's2', duration_minutes: 120 }], mockSettings);
console.log(slots2);
// Expected:
// 8:00? Ends 10:00. Conflict.
// 10:30? Ends 12:30. Conflicts with endHour 12? No, slot calculation only generates up to 12. 
// But wait, slotEnd is 12:30, which is > endHour 12:00. 
// Actually our slot generator stops at H < endHour. So 11:30 is the last slot generated. 
// 11:30 + 120m = 13:30. 
// We should probably filter out slots that exceed endHour.
