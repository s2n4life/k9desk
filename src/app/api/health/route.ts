import { NextRequest, NextResponse } from 'next/server';

/**
 * Public Health Check Endpoint
 * Used by uptime monitoring services (UptimeRobot, Pingdom, etc.)
 * 
 * IMPORTANT: This endpoint is PUBLIC and does NOT require authentication
 * 
 * Returns:
 * - 200 OK if app is running
 * - Simple JSON response without database checks to avoid auth issues
 */

export async function GET(req: NextRequest) {
    try {
        // Simple health check - just verify the app is running
        return NextResponse.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            service: 'k9desk',
            version: '1.0.0'
        }, {
            status: 200,
            headers: {
                'Cache-Control': 'no-store, max-age=0'
            }
        });

    } catch (error: any) {
        return NextResponse.json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: error.message
        }, { status: 500 });
    }
}

// Support HEAD requests (some monitoring services use this)
export async function HEAD(req: NextRequest) {
    return new NextResponse(null, { status: 200 });
}
