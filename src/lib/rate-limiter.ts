import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Initialize Redis client (will use UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN from env)
const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Different rate limits for different endpoint types
export const rateLimiters = {
    // Public booking form: 3 submissions per hour per phone/email
    publicBooking: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(3, '1 h'),
        analytics: true,
        prefix: 'ratelimit:booking',
    }),

    // Support tickets: 5 per hour per user
    supportTickets: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(5, '1 h'),
        analytics: true,
        prefix: 'ratelimit:tickets',
    }),

    // Availability API: 60 requests per minute per IP
    availability: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(60, '1 m'),
        analytics: true,
        prefix: 'ratelimit:availability',
    }),

    // Auth endpoints: 10 attempts per 15 minutes per IP
    auth: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(10, '15 m'),
        analytics: true,
        prefix: 'ratelimit:auth',
    }),
};

/**
 * Get client identifier from request headers
 * Uses X-Forwarded-For header (set by Vercel) to get real IP
 */
export function getClientIdentifier(request: Request): string {
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
    return ip;
}

/**
 * Check if rate limiting is configured
 * Returns false if Redis credentials are missing (allows graceful degradation in dev)
 */
export function isRateLimitingEnabled(): boolean {
    return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}
