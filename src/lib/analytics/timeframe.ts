/**
 * Timeframe utilities for analytics
 * Provides date range calculations for different timeframe options
 */

export type Timeframe =
    | 'this_month'
    | 'last_month'
    | 'rolling_30'
    | 'rolling_60'
    | 'rolling_90'
    | 'custom';

export interface TimeframeRange {
    start: Date;
    end: Date;
}

/**
 * Get the date range for a given timeframe
 */
export function getTimeframeRange(
    timeframe: Timeframe,
    customStart?: string,
    customEnd?: string
): TimeframeRange {
    const now = new Date();

    switch (timeframe) {
        case 'this_month': {
            const start = new Date(now.getFullYear(), now.getMonth(), 1);
            const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
            return { start, end };
        }

        case 'last_month': {
            const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
            return { start, end };
        }

        case 'rolling_30': {
            const start = new Date(now);
            start.setDate(start.getDate() - 30);
            start.setHours(0, 0, 0, 0);
            return { start, end: now };
        }

        case 'rolling_60': {
            const start = new Date(now);
            start.setDate(start.getDate() - 60);
            start.setHours(0, 0, 0, 0);
            return { start, end: now };
        }

        case 'rolling_90': {
            const start = new Date(now);
            start.setDate(start.getDate() - 90);
            start.setHours(0, 0, 0, 0);
            return { start, end: now };
        }

        case 'custom': {
            if (!customStart || !customEnd) {
                throw new Error('Custom timeframe requires start and end dates');
            }
            return {
                start: new Date(customStart),
                end: new Date(customEnd)
            };
        }

        default:
            throw new Error(`Unknown timeframe: ${timeframe}`);
    }
}

/**
 * Get the previous period for comparison
 * Returns a date range of equal length to the input range
 */
export function getPreviousPeriod(start: Date, end: Date): TimeframeRange {
    const durationMs = end.getTime() - start.getTime();

    const previousEnd = new Date(start.getTime() - 1); // 1ms before start
    const previousStart = new Date(previousEnd.getTime() - durationMs);

    return {
        start: previousStart,
        end: previousEnd
    };
}

/**
 * Convert Date to Unix timestamp (seconds)
 */
export function toUnixTimestamp(date: Date): number {
    return Math.floor(date.getTime() / 1000);
}

/**
 * Calculate percentage change between two values
 */
export function calculateDelta(current: number, previous: number): {
    delta: number;
    deltaPercent: number;
} {
    const delta = current - previous;
    const deltaPercent = previous > 0 ? ((delta / previous) * 100) : 0;

    return {
        delta: Math.round(delta * 100) / 100,
        deltaPercent: Math.round(deltaPercent * 10) / 10
    };
}
