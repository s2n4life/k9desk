import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * Health Check Endpoint
 * Used by uptime monitoring services (UptimeRobot, Pingdom, etc.)
 * 
 * Returns:
 * - 200 OK if all systems operational
 * - 500 Internal Server Error if critical services are down
 * 
 * Checks:
 * - App is running (implicit - if this responds, app is up)
 * - Supabase database connection
 * - Response time
 */

export async function GET(req: NextRequest) {
    const startTime = Date.now();

    try {
        // Test 1: Database Connection
        const supabase = await createClient();
        const { data, error } = await supabase
            .from('businesses')
            .select('id')
            .limit(1)
            .single();

        if (error && error.code !== 'PGRST116') {
            // PGRST116 = no rows returned, which is fine for health check
            // Any other error means database is having issues
            throw new Error(`Database error: ${error.message}`);
        }

        // Calculate response time
        const responseTime = Date.now() - startTime;

        // Return healthy status
        return NextResponse.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            checks: {
                app: 'ok',
                database: 'ok',
                responseTime: `${responseTime}ms`
            },
            uptime: process.uptime()
        }, { status: 200 });

    } catch (error: any) {
        // Something is broken - return 500
        const responseTime = Date.now() - startTime;

        return NextResponse.json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: error.message,
            checks: {
                app: 'ok', // App is running if we got here
                database: 'error',
                responseTime: `${responseTime}ms`
            }
        }, { status: 500 });
    }
}

// Support HEAD requests (some monitoring services use this)
export async function HEAD(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { error } = await supabase
            .from('businesses')
            .select('id')
            .limit(1)
            .single();

        if (error && error.code !== 'PGRST116') {
            return new NextResponse(null, { status: 500 });
        }

        return new NextResponse(null, { status: 200 });
    } catch (error) {
        return new NextResponse(null, { status: 500 });
    }
}
