'use server';

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
// OR use Anon key if RLS allows public insert (which we set to true)
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Check if Service Role Key is available to bypass RLS
const envKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
console.log('Server Action Debug: Checking Service Role Key...');
console.log('Has SUPABASE_SERVICE_ROLE_KEY:', !!envKey);
if (!envKey) console.warn('WARNING: SUPABASE_SERVICE_ROLE_KEY is missing. Falling back to ANON key (restricted by RLS).');

const adminKey = envKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Initialize with Admin Key (Service Role) if available to bypass RLS completely
const supabase = createClient(supabaseUrl, adminKey, {
    auth: {
        persistSession: false // Important for server-side admin clients
    }
});

export async function submitLead(formData: any) {
    const {
        businessId,
        ownerName,
        ownerPhone,
        ownerEmail,
        ownerAddress, // Added address
        service_area_zip,
        petDetails,
        preferredDates,
        serviceIds, // Added serviceIds
        notes // Added notes
    } = formData;

    // Basic Validation
    if (!businessId || !ownerName || !ownerPhone) {
        return { success: false, error: 'Missing required fields' };
    }

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
                    service_area_zip: service_area_zip,
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
            console.error('Supabase Error:', error);
            return { success: false, error: error.message };
        }

        return { success: true, data };
    } catch (err) {
        console.error('Submission Error:', err);
        return { success: false, error: 'Failed to submit' };
    }
}
