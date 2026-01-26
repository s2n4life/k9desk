import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    const { data: { user } } = await supabase.auth.getUser()
    const path = request.nextUrl.pathname

    // 1. PUBLIC vs PROTECTED
    const isPublicPath = path === '/' || path === '/login' || path === '/signup' || path === '/reset-password' || path.startsWith('/auth') || path.startsWith('/book/')
    const isStaticAsset = path.startsWith('/_next') || path.startsWith('/static') || path.includes('.')

    // 2. GLOBAL MAINTENANCE MODE (Phase 1)
    if (!isStaticAsset && !path.startsWith('/admin')) {
        const { data: config } = await supabase
            .from('system_configs')
            .select('value')
            .eq('key', 'maintenance_mode')
            .single();

        if (config?.value === true) {
            // Check if user is admin (Admins can bypass maintenance)
            let isAdmin = false;
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single();
                isAdmin = profile?.role === 'super_admin' || profile?.role === 'support_admin';
            }

            if (!isAdmin && path !== '/maintenance') {
                return NextResponse.redirect(new URL('/maintenance', request.url))
            }
        }
    }

    if (!user && !isPublicPath && !isStaticAsset) {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    // 2. ADMIN LOCKDOWN
    if (path.startsWith('/admin')) {
        if (!user) return NextResponse.redirect(new URL('/login', request.url))

        // Fetch user role
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        const isAuthorized = profile?.role === 'super_admin' || profile?.role === 'support_admin'

        if (!isAuthorized) {
            return NextResponse.redirect(new URL('/dashboard', request.url))
        }
    }

    // 3. LOGGED IN REDIRECTS
    const hasAuthCode = request.nextUrl.searchParams.has('code') ||
        request.nextUrl.searchParams.has('error') ||
        request.nextUrl.hash.includes('access_token') ||
        request.nextUrl.hash.includes('recovery');

    if (user && !hasAuthCode && (path === '/login' || path === '/signup' || path === '/')) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    return response
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
