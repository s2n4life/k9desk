import { getDB } from '../db';
import { Job, RecurrenceRule, RecurrenceFrequency, RecurrenceStatus } from '../db/schema';
import { saveWithSync } from '../db/transactions';
import { v4 as uuidv4 } from 'uuid';
import { addDays, format } from 'date-fns';

/**
 * Recurrence Engine for Rolling Recurring Appointments
 * 
 * This module handles the creation and management of recurring job appointments.
 * Key principle: Only ONE future job exists at any time (rolling model).
 */

// Frequency to days mapping
const FREQUENCY_TO_DAYS: Record<RecurrenceFrequency, number> = {
    [RecurrenceFrequency.Weekly]: 7,
    [RecurrenceFrequency.Biweekly]: 14,
    [RecurrenceFrequency.Monthly]: 30,
    [RecurrenceFrequency.Every6Weeks]: 42,
    [RecurrenceFrequency.Every2Months]: 60,
};

/**
 * Calculate the next occurrence date based on frequency
 */
export function calculateNextDate(frequency: RecurrenceFrequency, fromDate: Date): string {
    const intervalDays = FREQUENCY_TO_DAYS[frequency];
    const nextDate = addDays(fromDate, intervalDays);
    return format(nextDate, 'yyyy-MM-dd');
}

/**
 * Get interval days for a frequency
 */
export function getIntervalDays(frequency: RecurrenceFrequency): number {
    return FREQUENCY_TO_DAYS[frequency];
}

/**
 * Create a new recurrence rule from an existing job
 */
export async function createRecurrenceRule(
    jobId: string,
    frequency: RecurrenceFrequency,
    businessId: string
): Promise<RecurrenceRule> {
    const db = await getDB();
    const job = await db.get('jobs', jobId);

    if (!job) {
        throw new Error(`Job ${jobId} not found`);
    }

    // Calculate next run date from the job's scheduled date
    const jobDate = new Date(job.scheduledDate);
    const nextRunDate = calculateNextDate(frequency, jobDate);

    const rule: RecurrenceRule = {
        id: uuidv4(),
        businessId,
        customerId: job.customerId,
        frequency,
        intervalDays: getIntervalDays(frequency),
        status: RecurrenceStatus.Active,
        nextRunDate,
        lastGeneratedJobId: jobId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
    };

    await saveWithSync('recurrence_rules', rule, 'CREATE', businessId);

    // Update the job to link to this recurrence rule
    const updatedJob = { ...job, recurrenceRuleId: rule.id, updatedAt: Date.now() };
    await saveWithSync('jobs', updatedJob, 'UPDATE', businessId);

    return rule;
}

/**
 * Generate the next job based on a recurrence rule
 * This is called automatically when a job is marked as completed
 */
export async function generateNextJob(ruleId: string, businessId: string): Promise<Job | null> {
    const db = await getDB();
    const rule = await db.get('recurrence_rules', ruleId);

    if (!rule) {
        console.error(`Recurrence rule ${ruleId} not found`);
        return null;
    }

    if (rule.status !== RecurrenceStatus.Active) {
        console.log(`Recurrence rule ${ruleId} is ${rule.status}, skipping job generation`);
        return null;
    }

    // Get the last generated job to copy its details
    const lastJob = rule.lastGeneratedJobId
        ? await db.get('jobs', rule.lastGeneratedJobId)
        : null;

    if (!lastJob) {
        console.error(`Last job ${rule.lastGeneratedJobId} not found for rule ${ruleId}`);
        return null;
    }

    // Calculate next date
    const nextDate = rule.nextRunDate || calculateNextDate(rule.frequency, new Date(lastJob.scheduledDate));

    // Create new job inheriting from the last job
    const newJob: Job = {
        id: uuidv4(),
        customerId: lastJob.customerId,
        petIds: [...lastJob.petIds], // Copy pet IDs
        state: 'scheduled' as any,
        scheduledDate: nextDate,
        scheduledTime: lastJob.scheduledTime, // Same time as previous
        address: lastJob.address,
        services: lastJob.services ? [...lastJob.services] : [], // Copy services
        recurrenceRuleId: ruleId, // Link to same recurrence rule
        createdAt: Date.now(),
        updatedAt: Date.now(),
    };

    await saveWithSync('jobs', newJob, 'CREATE', businessId);

    // Update recurrence rule with new last job and next run date
    const nextRunDate = calculateNextDate(rule.frequency, new Date(nextDate));
    const updatedRule: RecurrenceRule = {
        ...rule,
        lastGeneratedJobId: newJob.id,
        nextRunDate,
        updatedAt: Date.now(),
    };

    await saveWithSync('recurrence_rules', updatedRule, 'UPDATE', businessId);

    console.log(`Generated next recurring job ${newJob.id} for rule ${ruleId}, scheduled for ${nextDate}`);
    return newJob;
}

/**
 * Pause a recurrence rule (temporarily stop generating jobs)
 */
export async function pauseRecurrence(ruleId: string, businessId: string): Promise<void> {
    const db = await getDB();
    const rule = await db.get('recurrence_rules', ruleId);

    if (!rule) {
        throw new Error(`Recurrence rule ${ruleId} not found`);
    }

    const updatedRule: RecurrenceRule = {
        ...rule,
        status: RecurrenceStatus.Paused,
        updatedAt: Date.now(),
    };

    await saveWithSync('recurrence_rules', updatedRule, 'UPDATE', businessId);
}

/**
 * Resume a paused recurrence rule
 */
export async function resumeRecurrence(ruleId: string, businessId: string): Promise<void> {
    const db = await getDB();
    const rule = await db.get('recurrence_rules', ruleId);

    if (!rule) {
        throw new Error(`Recurrence rule ${ruleId} not found`);
    }

    const updatedRule: RecurrenceRule = {
        ...rule,
        status: RecurrenceStatus.Active,
        updatedAt: Date.now(),
    };

    await saveWithSync('recurrence_rules', updatedRule, 'UPDATE', businessId);
}

/**
 * Cancel a recurrence rule (permanently stop generating jobs)
 */
export async function cancelRecurrence(ruleId: string, businessId: string): Promise<void> {
    const db = await getDB();
    const rule = await db.get('recurrence_rules', ruleId);

    if (!rule) {
        throw new Error(`Recurrence rule ${ruleId} not found`);
    }

    const updatedRule: RecurrenceRule = {
        ...rule,
        status: RecurrenceStatus.Canceled,
        updatedAt: Date.now(),
    };

    await saveWithSync('recurrence_rules', updatedRule, 'UPDATE', businessId);
}

/**
 * Update the frequency of a recurrence rule
 * This affects the NEXT job to be generated, not existing jobs
 */
export async function updateRecurrenceFrequency(
    ruleId: string,
    newFrequency: RecurrenceFrequency,
    businessId: string
): Promise<void> {
    const db = await getDB();
    const rule = await db.get('recurrence_rules', ruleId);

    if (!rule) {
        throw new Error(`Recurrence rule ${ruleId} not found`);
    }

    // Recalculate next run date based on new frequency
    const lastJob = rule.lastGeneratedJobId
        ? await db.get('jobs', rule.lastGeneratedJobId)
        : null;

    let nextRunDate = rule.nextRunDate;
    if (lastJob) {
        nextRunDate = calculateNextDate(newFrequency, new Date(lastJob.scheduledDate));
    }

    const updatedRule: RecurrenceRule = {
        ...rule,
        frequency: newFrequency,
        intervalDays: getIntervalDays(newFrequency),
        nextRunDate,
        updatedAt: Date.now(),
    };

    await saveWithSync('recurrence_rules', updatedRule, 'UPDATE', businessId);
}

/**
 * Get recurrence rule by ID
 */
export async function getRecurrenceRule(ruleId: string): Promise<RecurrenceRule | null> {
    const db = await getDB();
    const rule = await db.get('recurrence_rules', ruleId);
    return rule || null;
}

/**
 * Get human-readable frequency label
 */
export function getFrequencyLabel(frequency: RecurrenceFrequency): string {
    const labels: Record<RecurrenceFrequency, string> = {
        [RecurrenceFrequency.Weekly]: 'Weekly',
        [RecurrenceFrequency.Biweekly]: 'Every 2 weeks',
        [RecurrenceFrequency.Monthly]: 'Monthly',
        [RecurrenceFrequency.Every6Weeks]: 'Every 6 weeks',
        [RecurrenceFrequency.Every2Months]: 'Every 2 months',
    };
    return labels[frequency];
}
