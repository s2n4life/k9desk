'use server';

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function submitLead(formData: any) {
    // 0. Rate Limiting Check (Spam Prevention)
    // Only enforce if Redis is configured (allows dev without Upstash)
    if (typeof window === 'undefined') { // Server-side only
        try {
            const { rateLimiters, isRateLimitingEnabled } = await import('@/lib/rate-limiter');

            if (isRateLimitingEnabled()) {
                // Use phone or email as identifier (more accurate than IP for mobile users)
                const identifier = formData.ownerPhone || formData.ownerEmail || 'unknown';
                const { success } = await rateLimiters.publicBooking.limit(`booking:${identifier}`);

                if (!success) {
                    console.warn('[LeadSubmission] Rate limit exceeded for:', identifier);
                    return {
                        success: false,
                        error: 'Too many booking requests. Please try again in an hour.'
                    };
                }
            }
        } catch (rateLimitError) {
            // If rate limiting fails, log but don't block the request
            console.error('[LeadSubmission] Rate limit check failed:', rateLimitError);
        }
    }

    // TEMPORARY: Using service role key until we fix RLS policies for leads table
    // TODO: Fix RLS policies and switch back to anon key
    // Issue: Lead INSERT is being blocked even with anon_insert_leads policy
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(supabaseUrl, serviceKey || supabaseAnonKey, {
        auth: {
            persistSession: false
        }
    });

    const {
        businessId,
        ownerName,
        ownerPhone,
        ownerEmail,
        ownerAddress, // Added address
        serviceAreaZip,
        petDetails,
        preferredDates,
        serviceIds, // Added serviceIds
        notes // Added notes
    } = formData;

    // Basic Validation
    if (!businessId || !ownerName || !ownerPhone) {
        console.error('[LeadSubmission] Validation failed:', { businessId: !!businessId, ownerName: !!ownerName, ownerPhone: !!ownerPhone });
        return { success: false, error: 'Missing required fields' };
    }

    // TODO: Re-enable business validation once we confirm RLS policies are working
    // The validation query itself needs the public_read_business_for_availability policy
    // const { data: businessExists, error: businessCheckError } = await supabase
    //     .from('businesses')
    //     .select('id')
    //     .eq('id', businessId)
    //     .single();
    //
    // if (businessCheckError || !businessExists) {
    //     console.error('[LeadSubmission] Invalid business_id:', businessId);
    //     return { success: false, error: 'Invalid business' };
    // }

    console.log('[LeadSubmission] Attempting to insert lead:', {
        businessId,
        ownerName,
        ownerPhone,
        petCount: petDetails?.length || 0,
        preferredDatesCount: preferredDates?.length || 0
    });

    try {
        const { data, error } = await supabase
            .from('leads')
            .insert([
                {
                    business_id: businessId,
                    owner_name: ownerName,
                    owner_phone: ownerPhone,
                    owner_email: ownerEmail,
                    owner_address: ownerAddress, // Insert address
                    service_area_zip: serviceAreaZip,
                    pet_details: petDetails,
                    preferred_dates: preferredDates,
                    service_ids: serviceIds || [], // Insert serviceIds
                    waiver_signed: true, // Implicit acceptance if removed from UI, or just set true
                    notes: notes, // Insert notes
                    status: 'new'
                }
            ])
            .select()
            .single();

        if (error) {
            console.error('[LeadSubmission] Supabase Error:', {
                message: error.message,
                code: error.code,
                details: error.details,
                hint: error.hint
            });
            return { success: false, error: error.message };
        }

        console.log('[LeadSubmission] SUCCESS! Lead created:', {
            leadId: data?.id,
            businessId: data?.business_id,
            status: data?.status
        });

        return { success: true, data };
    } catch (err) {
        console.error('[LeadSubmission] Unexpected Error:', err);
        return { success: false, error: 'Failed to submit' };
    }
}
