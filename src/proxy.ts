import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next.js Middleware
 * 
 * This middleware explicitly allows public access to certain API routes
 * that should NOT require authentication:
 * - /api/health - Health check for uptime monitoring
 * - /api/availability/* - Public booking availability
 * - /api/stripe/webhook - Stripe payment webhooks
 * - /api/cron/* - Vercel Cron jobs
 */

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    console.log('[MIDDLEWARE] Processing request:', pathname);

    // List of public API paths that should NEVER redirect to login
    const publicPaths = [
        '/api/health',
        '/api/ping',
        '/api/availability',
        '/api/stripe/webhook',
        '/api/cron',
    ];

    // Check if the current path starts with any public path
    const isPublicPath = publicPaths.some(path => pathname.startsWith(path));

    if (isPublicPath) {
        console.log('[MIDDLEWARE] Public path detected, allowing access:', pathname);
        // Allow the request to proceed without any authentication checks
        return NextResponse.next();
    }

    console.log('[MIDDLEWARE] Not a public path, continuing:', pathname);
    // For all other routes, continue with normal processing
    return NextResponse.next();
}


// Configure which routes this middleware runs on
export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
};
