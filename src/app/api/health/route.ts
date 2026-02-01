import { createClient } from '@supabase/supabase-js';

/**
 * Enhanced Health Check Endpoint
 * 
 * Tests critical services and returns detailed status:
 * - App (Next.js server)
 * - Database (Supabase)
 * - Redis (Upstash rate limiting)
 * 
 * Returns 200 if all services are healthy
 * Returns 500 if any critical service is down
 * 
 * This helps diagnose issues when UptimeRobot alerts you!
 */

export async function GET() {
    const checks = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        services: {
            app: 'ok',
            database: 'unknown',
            redis: 'unknown'
        }
    };

    let hasError = false;

    // Test 1: Supabase Database Connection
    try {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Simple query to verify database is reachable
        const { error } = await supabase
            .from('businesses')
            .select('id')
            .limit(1);

        if (error) {
            checks.services.database = 'error';
            hasError = true;
        } else {
            checks.services.database = 'ok';
        }
    } catch (e) {
        checks.services.database = 'error';
        hasError = true;
    }

    // Test 2: Redis (Rate Limiting)
    try {
        const { isRateLimitingEnabled } = await import('@/lib/rate-limiter');

        if (isRateLimitingEnabled()) {
            checks.services.redis = 'ok';
        } else {
            // Redis is disabled (not an error, just not configured)
            checks.services.redis = 'disabled';
        }
    } catch (e) {
        // Redis error is not critical - app works without it
        checks.services.redis = 'error';
        // Don't set hasError - rate limiting is not critical
    }

    // Update overall status
    if (hasError) {
        checks.status = 'degraded';
    }

    return new Response(
        JSON.stringify(checks),
        {
            status: hasError ? 500 : 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-store'
            }
        }
    );
}

export async function HEAD() {
    // Quick health check without testing services
    return new Response(null, { status: 200 });
}
