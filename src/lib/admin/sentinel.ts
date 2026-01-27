import { supabase } from '@/lib/supabaseClient';

export type LogLevel = 'error' | 'warning' | 'info';

export type SentinelLog = {
    level: LogLevel;
    message: string;
    stack_trace?: string;
    metadata?: Record<string, any>;
    business_id?: string;
    user_id?: string;
};

// Throttle map to prevent spam (in-memory, resets on server restart)
const emailThrottle = new Map<string, number>();
const THROTTLE_MINUTES = 5;

export async function captureLog(log: SentinelLog) {
    try {
        const { data: { user } } = await supabase.auth.getUser();

        // Try to get business_id from local profiles if available, 
        // but for errors we want to be as robust as possible.
        const payload = {
            ...log,
            user_id: log.user_id || user?.id,
            metadata: {
                ...log.metadata,
                url: typeof window !== 'undefined' ? window.location.href : 'server',
                userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server',
                timestamp: new Date().toISOString()
            }
        };

        const { error } = await supabase.from('system_logs').insert(payload);
        if (error) console.error('[Sentinel] Failed to push log:', error);

        // Send email notification for errors only
        if (log.level === 'error') {
            const throttleKey = log.message.substring(0, 50); // Use first 50 chars as key
            const lastSent = emailThrottle.get(throttleKey);
            const now = Date.now();

            if (!lastSent || now - lastSent > THROTTLE_MINUTES * 60 * 1000) {
                emailThrottle.set(throttleKey, now);

                // Send email via API route (non-blocking)
                if (typeof window !== 'undefined') {
                    // Client-side
                    fetch('/api/admin/error-alert', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ error: payload })
                    }).catch(err => console.error('[Sentinel] Email alert failed:', err));
                } else {
                    // Server-side - use absolute URL
                    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3005';
                    fetch(`${baseUrl}/api/admin/error-alert`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ error: payload })
                    }).catch(err => console.error('[Sentinel] Email alert failed:', err));
                }
            }
        }
    } catch (err) {
        console.error('[Sentinel] Critical failure in logger:', err);
    }
}

/**
 * Higher-order utility to wrap functions for error catching
 */
export function withSentinel<T extends (...args: any[]) => Promise<any>>(
    name: string,
    fn: T,
    metadata?: Record<string, any>
): T {
    return (async (...args: any[]) => {
        try {
            return await fn(...args);
        } catch (error: any) {
            await captureLog({
                level: 'error',
                message: `Exception in ${name}: ${error.message}`,
                stack_trace: error.stack,
                metadata: { ...metadata, args }
            });
            throw error;
        }
    }) as T;
}
