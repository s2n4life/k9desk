import { Job, JobState } from '../db/schema';
import { getDB } from '../db';
import { addToSyncQueue } from '../db/sync';
import { v4 as uuidv4 } from 'uuid';

// Simple UUID generator if we don't want to add a dep just for this
const generateId = () => uuidv4();

export type JobAction =
    | 'SEND_REMINDER'
    | 'MARK_IN_PROGRESS'
    | 'MARK_COMPLETE'
    | 'REQUEST_PAYMENT'
    | 'MARK_PAID'
    | 'SEND_REVIEW_REQUEST'
    | 'SKIP_REVIEW'
    | 'SCHEDULE_NEXT'
    | 'LOG_PAYMENT'
    | 'MARK_CANCELLED'
    | 'MARK_NO_SHOW';

export const VALID_TRANSITIONS: Record<JobState, JobState[]> = {
    [JobState.Scheduled]: [JobState.ReminderSent, JobState.Cancelled, JobState.NoShow],
    [JobState.ReminderSent]: [JobState.InProgress, JobState.Completed, JobState.Cancelled, JobState.NoShow],
    [JobState.InProgress]: [JobState.Completed, JobState.Cancelled, JobState.NoShow],
    [JobState.Completed]: [JobState.PaymentRequested, JobState.Paid, JobState.Cancelled, JobState.NoShow],
    [JobState.PaymentRequested]: [JobState.Paid, JobState.Cancelled, JobState.NoShow],
    [JobState.Paid]: [JobState.Closed, JobState.Cancelled, JobState.NoShow],
    [JobState.Closed]: [], // Terminal state
    [JobState.Cancelled]: [], // Terminal state
    [JobState.NoShow]: [], // Terminal state
};

export class JobStateMachine {
    static canTransition(currentState: JobState, newState: JobState): boolean { // Renamed from isValidOnAction to canTransition for internal logic, logic simplified
        const allowed = VALID_TRANSITIONS[currentState];
        return allowed?.includes(newState) ?? false;
    }

    static getNextState(currentState: JobState, action: JobAction): JobState | null {
        switch (action) {
            case 'SEND_REMINDER':
                return currentState === JobState.Scheduled ? JobState.ReminderSent : null;
            case 'MARK_IN_PROGRESS':
                return currentState === JobState.ReminderSent ? JobState.InProgress : null;
            case 'MARK_COMPLETE':
                return (currentState === JobState.ReminderSent || currentState === JobState.InProgress)
                    ? JobState.Completed
                    : null;
            case 'REQUEST_PAYMENT':
                return currentState === JobState.Completed ? JobState.PaymentRequested : null;
            case 'MARK_PAID':
                return currentState === JobState.PaymentRequested ? JobState.Paid : null;
            case 'SEND_REVIEW_REQUEST':
            case 'SKIP_REVIEW':
                return currentState === JobState.Paid ? JobState.Closed : null;
            case 'LOG_PAYMENT':
                return (currentState === JobState.Completed || currentState === JobState.PaymentRequested) ? JobState.Paid : null;
            case 'MARK_CANCELLED':
                // Can cancel from any active state
                return (currentState !== JobState.Closed && currentState !== JobState.Cancelled && currentState !== JobState.NoShow)
                    ? JobState.Cancelled
                    : null;
            case 'MARK_NO_SHOW':
                // Can mark no-show from any active state
                return (currentState !== JobState.Closed && currentState !== JobState.Cancelled && currentState !== JobState.NoShow)
                    ? JobState.NoShow
                    : null;
            default:
                return null;
        }
    }

    static async transition(jobId: string, action: JobAction, updates?: Partial<Job>): Promise<Job> {
        const db = await getDB();
        const job = await db.get('jobs', jobId);

        if (!job) {
            throw new Error(`Job ${jobId} not found`);
        }

        const nextState = this.getNextState(job.state, action);

        if (!nextState) {
            throw new Error(`Invalid transition from ${job.state} via ${action}`);
        }

        const updatedJob: Job = {
            ...job,
            ...updates, // Apply any updates (like payment details)
            state: nextState,
            updatedAt: Date.now(),
        };

        // Feature 6: Auto Job Time Tracking
        if (action === 'MARK_IN_PROGRESS' || nextState === JobState.InProgress) {
            updatedJob.startedAt = Date.now();
        }
        if (action === 'MARK_COMPLETE' || nextState === JobState.Completed) {
            updatedJob.completedAt = Date.now();
        }

        const { getActiveBusinessIdSync } = await import('@/contexts/ImpersonationContext');
        const { saveWithSync } = await import('@/lib/db/transactions');
        const businessId = getActiveBusinessIdSync();

        await saveWithSync('jobs', updatedJob, 'UPDATE', businessId || undefined);

        // RECURRENCE: If job is being marked as completed and has a recurrence rule, generate next job
        if (nextState === JobState.Completed && updatedJob.recurrenceRuleId) {
            try {
                const { generateNextJob } = await import('./recurrence');
                await generateNextJob(updatedJob.recurrenceRuleId, businessId || '');
                console.log(`[Recurrence] Generated next job for rule ${updatedJob.recurrenceRuleId}`);
            } catch (error) {
                // Don't block job completion if recurrence fails
                console.error('[Recurrence] Failed to generate next job:', error);
            }
        }

        // Notify UI of changes
        window.dispatchEvent(new CustomEvent('data-changed'));

        return updatedJob;
    }
}
