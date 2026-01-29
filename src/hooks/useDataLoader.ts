'use client';

import { useImpersonationContextSafe } from '@/contexts/ImpersonationContext';
import { supabase } from '@/lib/supabaseClient';
import { getDB } from '@/lib/db';
import { Job, Customer, Pet, Lead } from '@/lib/db/schema';
import { useState, useEffect } from 'react'; // Added useEffect and useState imports

/**
 * Hook to load data that's aware of impersonation mode
 * - When impersonating: loads from Supabase for the impersonated business
 * - When NOT impersonating: loads from IndexedDB (existing behavior)
 */
export function useDataLoader() {
    const { isImpersonating, impersonatedBusinessId, getActiveBusinessId } = useImpersonationContextSafe();

    const loadJobs = async (): Promise<Job[]> => {
        if (isImpersonating && impersonatedBusinessId) {
            // Load from Supabase
            const { data, error } = await supabase
                .from('jobs')
                .select('*')
                .eq('business_id', impersonatedBusinessId)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error loading jobs from Supabase:', error);
                return [];
            }

            // Map Supabase data to local schema format
            return (data || []).map((j: any) => ({
                id: j.id,
                customerId: j.customer_id,
                petIds: j.pet_ids || [],
                state: j.state,
                scheduledDate: j.scheduled_date,
                scheduledTime: j.scheduled_time,
                address: j.address,
                jobNotes: j.notes,
                customerNotes: j.customer_notes,
                petNotes: j.pet_notes,
                createdAt: new Date(j.created_at).getTime(),
                updatedAt: new Date(j.updated_at).getTime()
            }));
        } else {
            // Load from IndexedDB (existing behavior)
            const db = await getDB();
            return await db.getAll('jobs');
        }
    };

    const loadCustomers = async (): Promise<Customer[]> => {
        if (isImpersonating && impersonatedBusinessId) {
            // Load from Supabase
            const { data, error } = await supabase
                .from('customers')
                .select('*')
                .eq('business_id', impersonatedBusinessId)
                .order('name', { ascending: true });

            if (error) {
                console.error('Error loading customers from Supabase:', error);
                return [];
            }

            return (data || []).map((c: any) => ({
                id: c.id,
                name: c.name,
                phone: c.phone,
                email: c.email,
                address: c.address,
                notes: c.notes,
                createdAt: new Date(c.created_at).getTime(),
                updatedAt: new Date(c.updated_at).getTime()
            }));
        } else {
            // Load from IndexedDB
            const db = await getDB();
            return await db.getAll('customers');
        }
    };

    const loadPets = async (): Promise<Pet[]> => {
        if (isImpersonating && impersonatedBusinessId) {
            // Load from Supabase
            const { data, error } = await supabase
                .from('pets')
                .select('*')
                .eq('business_id', impersonatedBusinessId);

            if (error) {
                console.error('Error loading pets from Supabase:', error);
                return [];
            }

            return (data || []).map((p: any) => ({
                id: p.id,
                customerId: p.customer_id,
                name: p.name,
                breed: p.breed,
                notes: p.notes,
                createdAt: new Date(p.created_at).getTime(),
                updatedAt: new Date(p.updated_at).getTime()
            }));
        } else {
            // Load from IndexedDB
            const db = await getDB();
            return await db.getAll('pets');
        }
    };

    const loadLeads = async (): Promise<Lead[]> => {
        // ALWAYS load leads from Supabase (not IndexedDB)
        // Leads are external data from public booking form and need real-time visibility
        const businessId = await getActiveBusinessId();

        if (!businessId) {
            console.error('Error loading leads: No business ID found');
            return [];
        }

        const { data, error } = await supabase
            .from('leads')
            .select('*')
            .eq('business_id', businessId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error loading leads from Supabase:', error);
            return [];
        }

        return (data || []).map((l: any) => ({
            id: l.id,
            businessId: l.business_id,
            status: l.status,
            ownerName: l.owner_name,
            ownerPhone: l.owner_phone,
            ownerEmail: l.owner_email,
            ownerAddress: l.owner_address,
            serviceAreaZip: l.service_area_zip,
            petDetails: l.pet_details || [],
            preferredDates: l.preferred_dates || [],
            serviceIds: l.service_ids,
            waiverSigned: l.waiver_signed || false,
            createdAt: l.created_at,
            notes: l.notes
        }));
    };

    return {
        loadJobs,
        loadCustomers,
        loadPets,
        loadLeads,
        isImpersonating,
        impersonatedBusinessId,
        getActiveBusinessId
    };
}
