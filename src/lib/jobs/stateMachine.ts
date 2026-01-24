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
    | 'SEND_REVIEW_REQUEST'
    | 'SKIP_REVIEW'
    | 'SCHEDULE_NEXT'
    | 'LOG_PAYMENT';

export const VALID_TRANSITIONS: Record<JobState, JobState[]> = {
    [JobState.Scheduled]: [JobState.ReminderSent],
    [JobState.ReminderSent]: [JobState.InProgress, JobState.Completed],
    [JobState.InProgress]: [JobState.Completed],
    [JobState.Completed]: [JobState.PaymentRequested, JobState.Paid],
    [JobState.PaymentRequested]: [JobState.Paid],
    [JobState.Paid]: [JobState.Closed],
    [JobState.Closed]: [], // Terminal state
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
            case 'SKIP_REVIEW':
                return currentState === JobState.Paid ? JobState.Closed : null;
            case 'LOG_PAYMENT':
                return (currentState === JobState.Completed || currentState === JobState.PaymentRequested) ? JobState.Paid : null;
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

        await db.put('jobs', updatedJob);
        await addToSyncQueue('UPDATE', 'JOB', jobId, updatedJob);

        // In a real implementation with sync, we would queue this change here
        // queueSync('UPDATE', 'JOB', jobId, { state: nextState });

        return updatedJob;
    }
}
