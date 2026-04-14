import { getDB } from './index';
import { supabase } from '@/lib/supabaseClient';
import { Service, Customer, Pet, Job, Settings, Lead } from './schema';
import { getActiveBusinessIdSync } from '@/contexts/ImpersonationContext';

export async function hydrateLocalDB(userId: string) {
    if (!userId) return;

    // Get active business ID (respects impersonation)
    let businessId = getActiveBusinessIdSync();

    if (!businessId) {
        // Fetch from profile if not in localStorage yet
        const { data: profile } = await supabase
            .from('profiles')
            .select('business_id')
            .eq('id', userId)
            .single();
        businessId = profile?.business_id || userId;
    }

    console.log('[Hydration] Starting hydration for:', businessId, userId !== businessId ? '(Using Profile/Impersonation)' : '');

    const db = await getDB();
    const now = Date.now();
    const TIMEOUT_MS = 15000; // 15s timeout for the whole process

    // Timeout helper
    const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Hydration timed out')), TIMEOUT_MS)
    );

    const runHydration = async () => {
        try {
            // 0. CHECK FOR PENDING SYNC QUEUE ITEMS
            const syncQueueCount = await db.count('syncQueue');
            if (syncQueueCount > 0) {
                if (!navigator.onLine) {
                    console.error('[Hydration] OFFLINE with pending sync items - skipping hydration');
                    localStorage.setItem('crm_has_hydrated', 'true');
                    return true;
                }

                console.log('[Hydration] Processing sync queue before clearing...');
                const { processQueueSync } = await import('@/hooks/useSync');
                if (processQueueSync) {
                    await processQueueSync();
                }

                // V2.1: ROBUST HYDRATION LOCK
                // Verify sync queue is EMPTY before proceeding with db.clear.
                // If items remain, it means sync failed, and clearing local stores would cause data loss.
                const remainingCount = await db.count('syncQueue');
                if (remainingCount > 0) {
                    console.error(`[Hydration] CRITICAL: ${remainingCount} items failed to sync. ABORTING hydration to preserve local edits.`);
                    localStorage.setItem('crm_has_hydrated', 'true');
                    return true; // Use existing local data instead of regressing
                }
            }

            // 0b. CLEAR STORES
            const stores = ['jobs', 'customers', 'pets', 'services', 'leads', 'settings'];
            for (const storeName of stores) {
                await db.clear(storeName as any);
            }

            // 1. Parallel Fetching
            console.log('[Hydration] Fetching all data in parallel...');
            const [
                businessRes,
                servicesRes,
                customersRes,
                petsRes,
                jobsRes,
                leadsRes
            ] = await Promise.allSettled([
                supabase.from('businesses').select('*').eq('id', businessId).order('updated_at', { ascending: false }),
                supabase.from('services').select('*').eq('business_id', businessId),
                supabase.from('customers').select('*').eq('business_id', businessId),
                supabase.from('pets').select('*').eq('business_id', businessId),
                supabase.from('jobs').select('*').eq('business_id', businessId),
                supabase.from('leads').select('*').eq('business_id', businessId)
            ]);

            // 2. Process Business (Critical)
            if (businessRes.status === 'fulfilled') {
                const { data: businesses, error: businessError } = businessRes.value;
                const business = businesses?.[0];
                if (business) {
                    const settings: Settings = {
                        id: 'default',
                        businessName: business.name,
                        venmo: business.venmo,
                        zelle: business.zelle,
                        paypal: business.paypal,
                        cashapp: business.cashapp,
                        custom_url: business.custom_url,
                        review_url: business.review_url,
                        onboardingCompleted: business.onboarding_completed,
                        subscription_status: business.subscription_status,
                        trial_start_date: business.trial_start_date,
                        trial_end_date: business.trial_end_date,
                        stripe_customer_id: business.stripe_customer_id,
                        stripe_subscription_id: business.stripe_subscription_id,
                        subscription_plan_id: business.subscription_plan_id,
                        payment_failed_at: business.payment_failed_at,
                        grace_period_day2_notified: business.grace_period_day2_notified,
                        grace_period_final_notified: business.grace_period_final_notified,
                        // Scheduling & Service Area
                        schedule_start_hour: business.schedule_start_hour,
                        schedule_end_hour: business.schedule_end_hour,
                        schedule_work_days: business.schedule_work_days,
                        appointment_duration_minutes: business.appointment_duration_minutes,
                        drive_buffer_minutes: business.drive_buffer_minutes,
                        service_area_mode: business.service_area_mode,
                        service_area_zips: business.service_area_zips,
                        business_hours: business.business_hours,
                        // Appointment Confirmation
                        showAppointmentConfirmation: business.show_appointment_confirmation ?? true,
                        updatedAt: new Date(business.updated_at || now).getTime(),
                    };
                    await db.put('settings', settings);
                } else if (businessError) {
                    console.error('[Hydration] Business fetch error:', businessError);
                }
            }

            // 3. Process Services
            if (servicesRes.status === 'fulfilled') {
                const { data: services } = servicesRes.value;
                if (services) {
                    for (const s of services) {
                        await db.put('services', {
                            id: s.id,
                            name: s.name,
                            price: s.price,
                            duration_minutes: s.duration_minutes,
                            createdAt: new Date(s.created_at).getTime(),
                        });
                    }
                }
            }

            // 4. Process Customers
            if (customersRes.status === 'fulfilled') {
                const { data: customers } = customersRes.value;
                if (customers) {
                    const seenPhones = new Set<string>();
                    for (const c of customers) {
                        const phoneKey = c.phone?.trim();
                        if (phoneKey && seenPhones.has(phoneKey)) continue;
                        if (phoneKey) seenPhones.add(phoneKey);

                        await db.put('customers', {
                            id: c.id,
                            name: c.name,
                            phone: c.phone,
                            address: c.address,
                            notes: c.notes,
                            createdAt: new Date(c.created_at).getTime(),
                            updatedAt: new Date(c.updated_at || c.created_at).getTime(),
                        });
                    }
                }
            }

            // 5. Process Pets
            if (petsRes.status === 'fulfilled') {
                const { data: pets } = petsRes.value;
                if (pets) {
                    for (const p of pets) {
                        await db.put('pets', {
                            id: p.id,
                            customerId: p.customer_id,
                            name: p.name,
                            breed: p.breed,
                            notes: p.notes,
                            size: p.size,
                            age: p.age,
                            createdAt: new Date(p.created_at).getTime(),
                            updatedAt: new Date(p.updated_at || p.created_at).getTime(),
                        });
                    }
                }
            }

            // 6. Process Jobs
            if (jobsRes.status === 'fulfilled') {
                const { data: jobs } = jobsRes.value;
                if (jobs) {
                    for (const j of jobs) {
                        await db.put('jobs', {
                            id: j.id,
                            customerId: j.customer_id,
                            petIds: j.pet_ids || [],
                            state: j.state.toLowerCase(),
                            scheduledDate: j.scheduled_date,
                            scheduledTime: j.scheduled_time,
                            address: j.address,
                            jobNotes: j.notes,
                            customerNotes: j.customer_notes,
                            petNotes: j.pet_notes,
                            payment_amount: j.payment_amount,
                            payment_method: j.payment_method,
                            payment_logged_at: j.payment_logged_at ? new Date(j.payment_logged_at).getTime() : undefined,
                            createdAt: new Date(j.created_at).getTime(),
                            updatedAt: new Date(j.updated_at || j.created_at).getTime(),
                        });
                    }
                }
            }

            // 7. Process Leads
            if (leadsRes.status === 'fulfilled') {
                const { data: leads } = leadsRes.value;
                if (leads) {
                    for (const l of leads) {
                        await db.put('leads', {
                            id: l.id,
                            businessId: businessId,
                            status: l.status,
                            ownerName: l.owner_name,
                            ownerPhone: l.owner_phone,
                            ownerEmail: l.owner_email,
                            ownerAddress: l.owner_address,
                            serviceAreaZip: l.service_area_zip,
                            petDetails: l.pet_details,
                            preferredDates: l.preferred_dates,
                            serviceIds: l.service_ids,
                            waiverSigned: l.waiver_signed,
                            createdAt: l.created_at,
                            notes: l.notes
                        });
                    }
                }
            }

            console.log('[Hydration] Complete.');
            localStorage.setItem('crm_has_hydrated', 'true');
            return true;
        } catch (error) {
            console.error('[Hydration] Internal failure:', error);
            throw error;
        }
    };

    try {
        // Race hydration against timeout
        return await Promise.race([runHydration(), timeout]);
    } catch (e) {
        console.error('[Hydration] Failed or Timed out:', e);
        // Fallback: If we fail but have some data (or even if we don't), 
        // we might want to let the user in anyway if they've hydrated before.
        const hasHydratedBefore = localStorage.getItem('crm_has_hydrated') === 'true';
        if (hasHydratedBefore) {
            console.warn('[Hydration] Using stale local data due to failure/timeout');
            return true;
        }
        return false;
    }
}

export async function syncLeadsToLocal(businessId: string) {
    if (!businessId) return;
    const db = await getDB();
    const { data: leads, error } = await supabase
        .from('leads')
        .select('*')
        .eq('business_id', businessId);

    if (error) {
        console.error('[SyncLeads] Fetch error:', error);
        return;
    }

    if (leads) {
        // Clear local leads for this business to handle deletions/archiving correctly
        await db.clear('leads');
        for (const l of leads) {
            await db.put('leads', {
                id: l.id,
                businessId: businessId,
                status: l.status,
                ownerName: l.owner_name,
                ownerPhone: l.owner_phone,
                ownerEmail: l.owner_email,
                ownerAddress: l.owner_address,
                serviceAreaZip: l.service_area_zip,
                petDetails: l.pet_details,
                preferredDates: l.preferred_dates,
                serviceIds: l.service_ids,
                waiverSigned: l.waiver_signed,
                createdAt: l.created_at,
                notes: l.notes
            });
        }
        console.log(`[SyncLeads] Synced ${leads.length} leads to local DB`);
        window.dispatchEvent(new CustomEvent('leads-synced'));
    }
}
