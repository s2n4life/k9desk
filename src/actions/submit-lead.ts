'use server';

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function submitLead(formData: any) {
    // 1. Get Service Role Key (Server Side Only)
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // 2. Determine which key to use (Prefer Service Role to bypass RLS)
    const adminKey = serviceKey || supabaseAnonKey;

    console.log(`[LeadSubmission] Using ${serviceKey ? 'SERVICE_ROLE' : 'ANON'} key. KeyLength: ${adminKey?.length || 0}`);

    if (!serviceKey) {
        console.warn('[LeadSubmission] WARNING: SUPABASE_SERVICE_ROLE_KEY is missing from process.env!');
    }

    // 3. Initialize Client inside the action to ensure fresh env variables
    const supabase = createClient(supabaseUrl, adminKey, {
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
