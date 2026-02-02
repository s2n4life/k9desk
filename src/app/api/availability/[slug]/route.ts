import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { format } from 'date-fns';

// Use anon key with RLS policies for public availability queries
// RLS policies defined in: supabase/migrations/20260201_public_availability_rls.sql
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Mark this route as public (no auth required)
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    // Add CORS headers for public access
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json',
    };

    try {
        // 0. Rate Limiting Check (API Abuse Prevention)
        try {
            const { rateLimiters, isRateLimitingEnabled, getClientIdentifier } = await import('@/lib/rate-limiter');

            if (isRateLimitingEnabled()) {
                const identifier = getClientIdentifier(request);
                const { success } = await rateLimiters.availability.limit(`availability:${identifier}`);

                if (!success) {
                    console.warn('[Availability API] Rate limit exceeded for IP:', identifier);
                    return NextResponse.json(
                        { error: 'Too many requests. Please slow down.' },
                        { status: 429, headers }
                    );
                }
            }
        } catch (rateLimitError) {
            // If rate limiting fails, log but don't block the request
            console.error('[Availability API] Rate limit check failed:', rateLimitError);
        }

        const { slug } = await params;
        const { searchParams } = new URL(request.url);
        const date = searchParams.get('date');

        // Validate inputs
        if (!date) {
            return NextResponse.json({ error: 'Date parameter is required' }, { status: 400, headers });
        }

        // Validate date format (YYYY-MM-DD)
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(date)) {
            return NextResponse.json({ error: 'Invalid date format. Use YYYY-MM-DD' }, { status: 400, headers });
        }

        // Don't allow past dates
        const requestedDate = new Date(date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (requestedDate < today) {
            return NextResponse.json({ slots: [] }, { status: 200, headers });
        }

        // 1. Find business by slug OR UUID
        console.log('[Availability API] Looking up business with identifier:', slug);

        // Check if it's a UUID
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
        console.log('[Availability API] Is UUID?', isUuid);

        let query = supabase
            .from('businesses')
            .select('id');

        if (isUuid) {
            query = query.eq('id', slug);
        } else {
            query = query.eq('slug', slug);
        }

        const { data: businesses, error: businessError } = await query.limit(1);

        console.log('[Availability API] Business lookup result:', { businesses, businessError });

        if (businessError) {
            console.error('[Availability API] Business lookup error:', businessError);
            return NextResponse.json({
                error: 'Database error',
                details: businessError.message
            }, { status: 500 });
        }

        if (!businesses || businesses.length === 0) {
            console.log('[Availability API] No business found for identifier:', slug);
            return NextResponse.json({ error: 'Business not found' }, { status: 404, headers });
        }

        const businessId = businesses[0].id;
        console.log('[Availability API] Found business ID:', businessId);

        // Security: Log all availability requests for monitoring
        console.log('[Availability API] Public request:', {
            slug,
            businessId,
            date,
            timestamp: new Date().toISOString()
        });

        // 2. Get business schedule settings (stored in businesses table)
        console.log('[Availability API] Fetching schedule settings for business:', businessId);
        const { data: business, error: businessSettingsError } = await supabase
            .from('businesses')
            .select('schedule_start_hour, schedule_end_hour, drive_buffer_minutes, appointment_duration_minutes')
            .eq('id', businessId)
            .single();

        console.log('[Availability API] Business settings result:', { business, businessSettingsError });

        if (businessSettingsError) {
            console.error('Business settings error:', businessSettingsError);
            // Use defaults if settings not found, but log it
            console.log('[Availability API] Using default settings');
        }

        const startHour = business?.schedule_start_hour || 8;
        const endHour = business?.schedule_end_hour || 20;
        const driveBuffer = business?.drive_buffer_minutes || 30;
        const appointmentDuration = business?.appointment_duration_minutes || 60;

        // 3. Get existing jobs for this date
        const { data: jobs, error: jobsError } = await supabase
            .from('jobs')
            .select('id, scheduled_time')
            .eq('business_id', businessId)
            .eq('scheduled_date', date)
            .not('state', 'in', '(cancelled,no_show)'); // Exclude cancelled and no-show jobs

        if (jobsError) {
            console.error('Jobs error:', jobsError);
            return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500, headers });
        }

        // 4. Generate all possible slots
        const slots: string[] = [];
        const now = new Date();
        const isToday = date === format(now, 'yyyy-MM-dd');
        const currentTotalMinutes = now.getHours() * 60 + now.getMinutes();

        for (let h = startHour; h < endHour; h++) {
            for (const m of ['00', '30']) {
                const slotTime = `${String(h).padStart(2, '0')}:${m}`;
                const slotStart = h * 60 + parseInt(m);
                const slotEnd = slotStart + appointmentDuration;

                // Skip past slots if today
                if (isToday && slotStart < currentTotalMinutes + 15) continue;

                // Skip if slot would extend past business hours
                if (slotEnd > endHour * 60) continue;

                slots.push(slotTime);
            }
        }

        // 5. Filter out conflicting slots
        const availableSlots = slots.filter(slotTime => {
            const [sh, sm] = slotTime.split(':').map(Number);
            const slotStart = sh * 60 + sm;
            const slotEnd = slotStart + appointmentDuration;

            for (const job of jobs || []) {
                if (!job.scheduled_time) continue;

                const [jh, jm] = job.scheduled_time.split(':').map(Number);
                const jobStart = jh * 60 + jm;

                // Include drive buffer before and after job
                const effectiveJobStart = jobStart - driveBuffer;
                const effectiveJobEnd = jobStart + appointmentDuration + driveBuffer;

                // Check for overlap
                if (slotStart < effectiveJobEnd && slotEnd > effectiveJobStart) {
                    return false; // Conflict found
                }
            }

            return true; // No conflicts
        });

        return NextResponse.json({
            slots: availableSlots,
            businessHours: {
                start: startHour,
                end: endHour
            },
            appointmentDuration
        }, { headers });

    } catch (error) {
        console.error('Availability API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers });
    }
}
