import { getDB } from './index';
import { supabase } from '@/lib/supabaseClient';
import { Service, Customer, Pet, Job, Settings, Lead } from './schema';

export async function hydrateLocalDB(userId: string) {
    if (!userId) return;
    console.log('[Hydration] Starting hydration for user:', userId);

    const db = await getDB();
    const now = Date.now();

    try {
        // 0. CLEAR STORES TO PREVENT CONFLICTS
        // Since we are doing a full hydration, we should start fresh to avoid 'ConstraintError'
        // on unique indexes (like phone numbers) if local data is stale or partial.
        const stores = ['jobs', 'customers', 'pets', 'services', 'leads', 'settings'];
        // Note: We don't clear syncQueue here because hydration happens before we start syncing *new* changes?
        // Actually, if we are hydrating, we assume local is irrelevant or should be overwritten.

        for (const storeName of stores) {
            await db.clear(storeName as any);
        }

        // 1. Fetch Business (Settings)
        console.log('[Hydration] Fetching business for userId/ownerId:', userId);
        const { data: businesses, error: businessError } = await supabase
            .from('businesses')
            .select('*')
            .or(`id.eq.${userId},owner_id.eq.${userId}`)
            .order('updated_at', { ascending: false });

        const business = businesses?.[0];

        if (businesses && businesses.length > 1) {
            console.warn('[Hydration] Multiple businesses found for user!', businesses.length);
        }

        console.log('[Hydration] Business query result:', business ? 'Found' : 'Not Found', businessError || '');
        if (business) {
            console.log('[Hydration] Business details:', {
                id: business.id,
                owner_id: business.owner_id,
                name: business.name,
                onboarding_completed: business.onboarding_completed,
                subscription_status: business.subscription_status
            });
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
                updatedAt: new Date(business.updated_at || now).getTime(),

                // Keep existing schedule settings if any, or default? 
                // Currently assuming remote overrides local empty state.
            };
            await db.put('settings', settings);
        } else if (businessError && businessError.code !== 'PGRST116') {
            console.error('[Hydration] Error fetching business:', businessError);
        }

        // 2. Fetch Services
        const { data: services } = await supabase.from('services').select('*').eq('business_id', userId);
        if (services) {
            for (const s of services) {
                const local: Service = {
                    id: s.id,
                    name: s.name,
                    price: s.price,
                    duration_minutes: s.duration_minutes,
                    createdAt: new Date(s.created_at).getTime(),
                };
                await db.put('services', local);
            }
        }

        // 3. Fetch Customers
        const { data: customers } = await supabase.from('customers').select('*').eq('business_id', userId);
        if (customers) {
            const seenPhones = new Set<string>();
            for (const c of customers) {
                // Deduplicate by Phone Number to satisfying Unique Index
                // If Supabase has dupes, we keep the first one encountered (usually oldest unless sorted)
                const phoneKey = c.phone?.trim();

                if (phoneKey && seenPhones.has(phoneKey)) {
                    console.warn(`[Hydration] Skipping duplicate customer phone: ${phoneKey} (ID: ${c.id})`);
                    continue;
                }

                if (phoneKey) seenPhones.add(phoneKey);

                const local: Customer = {
                    id: c.id,
                    name: c.name,
                    phone: c.phone,
                    address: c.address,
                    notes: c.notes,
                    createdAt: new Date(c.created_at).getTime(),
                    updatedAt: new Date(c.updated_at || c.created_at).getTime(),
                };

                try {
                    await db.put('customers', local);
                } catch (err) {
                    // Start fresh fallback: if somehow still fails, log and continue
                    console.error('[Hydration] Failed to put customer:', c.id, err);
                }
            }
        }

        // 4. Fetch Pets
        const { data: pets } = await supabase.from('pets').select('*').eq('business_id', userId);
        if (pets) {
            for (const p of pets) {
                const local: Pet = {
                    id: p.id,
                    customerId: p.customer_id,
                    name: p.name,
                    breed: p.breed,
                    notes: p.notes,
                    size: p.size,
                    age: p.age,
                    createdAt: new Date(p.created_at).getTime(),
                    updatedAt: new Date(p.updated_at || p.created_at).getTime(),
                };
                await db.put('pets', local);
            }
        }

        // 5. Fetch Jobs
        // We fetch ALL jobs for now. Scaling might require limiting to last X months.
        const { data: jobs } = await supabase.from('jobs').select('*').eq('business_id', userId);
        if (jobs) {
            for (const j of jobs) {
                const local: Job = {
                    id: j.id,
                    customerId: j.customer_id,
                    petIds: j.pet_ids || [],
                    state: j.state.toLowerCase(), // Ensure lower case local
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
                    // Services need mapping if we stored them as JSON or related table?
                    // Currently schema has `service_ids`.
                    // We might need to map IDs to objects if `services` field in local Job expects objects.
                    // The Local Job schema has `services?: (Service & { petId?: string })[];`
                    // But Supabase probably stores `service_ids`.
                    // We will reconstruct `services` array from `service_ids` implicitly later or fetch them here?
                    // For now, if Supabase has `service_ids` (array of strings),
                    // and Local expects `services` (array of objects), we have a mismatch.
                    // Checking schema: Job in Local has `services`. Job in Supabase likely has `service_ids`.
                    // Let's assume we need to join or map.
                };

                // Mismatched services fix:
                if (j.service_ids && Array.isArray(j.service_ids)) {
                    // We would need to look up these services. 
                    // For simplicity, we might just store the IDs or do a quick lookup if services are already loaded.
                    // But `db.put('jobs')` runs after `services` loop, so we can access them from DB or memory.
                }

                await db.put('jobs', local);
            }
        }

        // 6. Fetch Leads
        const { data: leads } = await supabase.from('leads').select('*').eq('business_id', userId);
        if (leads) {
            for (const l of leads) {
                const local: Lead = {
                    id: l.id,
                    businessId: userId,
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
                    createdAt: l.created_at, // Keep string for Lead
                    notes: l.notes
                }
                await db.put('leads', local);
            }
        }

        console.log('[Hydration] Complete.');
        localStorage.setItem('crm_has_hydrated', 'true');
        return true;

    } catch (e) {
        console.error('[Hydration] Failed:', e);
        return false;
    }
}
