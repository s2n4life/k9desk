import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
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

    // 1. If user is NOT logged in, and tries to visit a protected route
    // Protected routes: Everything EXCEPT public paths (/, /login, /signup, /auth/*) and static assets
    const isPublicPath = path === '/' || path === '/login' || path === '/signup' || path === '/reset-password' || path.startsWith('/auth')
    const isStaticAsset = path.startsWith('/_next') || path.startsWith('/static') || path.includes('.')

    if (!user && !isPublicPath && !isStaticAsset) {
        // Redirect to Login
        return NextResponse.redirect(new URL('/login', request.url))
    }

    // 2. If user IS logged in, and tries to visit Login/Signup or landing page
    // We redirect them to the Dashboard, UNLESS there is an auth code/recovery in the URL
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
