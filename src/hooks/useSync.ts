import { useEffect, useState } from 'react';
import { getDB } from '@/lib/db';
import { supabase } from '@/lib/supabaseClient';
import { SyncQueueItem } from '@/lib/db/schema';
import { hydrateLocalDB } from '@/lib/db/hydration';
import { captureLog } from '@/lib/admin/sentinel';

// Simple "Mutex" to prevent double-syncing
let isSyncing = false;

// TEMPORARY: Hardcoded Business ID for Phase 2 (since we don't have Auth/Business creation UI yet)
// We need this because Supabase tables require a valid UUID for business_id
const DEMO_BUSINESS_ID = '00000000-0000-0000-0000-000000000001';

// Helper to get current session info synchronously-ish (via closure state or just passed in)
// Ideally, transformForRemote should be async or receive the user object. 
// Refactoring transformForRemote to be called inside the async loop with the user object.

const transformForRemote = (entityType: string, data: any, user: any, businessId?: string) => {
    // 1. Inject Business ID (Critical for RLS/Foreign Keys)
    // Use provided businessId if available (respects impersonation), otherwise fall back to user.id
    const finalBusinessId = businessId || user?.id || DEMO_BUSINESS_ID;
    const remote: any = { ...data, business_id: finalBusinessId };

    // Inject owner email for Businesses table visibility
    if (entityType === 'SETTINGS' && user?.email) {
        remote.owner_email = user.email;
    }

    // 2. Map Common Fields
    if (remote.createdAt) {
        remote.created_at = new Date(remote.createdAt).toISOString();
        delete remote.createdAt;
    }
    if (remote.updatedAt) {
        remote.updated_at = new Date(remote.updatedAt).toISOString();
        delete remote.updatedAt;
    }

    // 3. Map Entity Specifics
    if (entityType === 'CUSTOMER') {
        // no specifc changes other than common
    }
    else if (entityType === 'PET') {
        if (remote.customerId) {
            remote.customer_id = remote.customerId;
            delete remote.customerId;
        }
    }
    else if (entityType === 'SERVICE') {
        // no specific changes
    }
    else if (entityType === 'JOB') {
        if ('customerId' in remote) {
            remote.customer_id = remote.customerId;
            delete remote.customerId;
        }
        if ('petIds' in remote) {
            remote.pet_ids = remote.petIds; // Supabase expects JSONB array, JS array is fine
            delete remote.petIds;
        }
        if ('scheduledDate' in remote) {
            remote.scheduled_date = remote.scheduledDate;
            delete remote.scheduledDate;
        }
        if ('scheduledTime' in remote) {
            remote.scheduled_time = remote.scheduledTime;
            delete remote.scheduledTime;
        }
        if ('jobNotes' in remote) {
            remote.notes = remote.jobNotes;
            delete remote.jobNotes;
        }
        if ('customerNotes' in remote) {
            remote.customer_notes = remote.customerNotes;
            delete remote.customerNotes;
        }
        if ('petNotes' in remote) {
            remote.pet_notes = remote.petNotes;
            delete remote.petNotes;
        }

        // Map services to service_ids
        if (remote.services) {
            remote.service_ids = remote.services.map((s: any) => s.id);
            delete remote.services;
        }

        // Ensure state is uppercase/consistent with simple text check
        if (remote.state) remote.state = remote.state.toUpperCase();

        if (remote.payment_logged_at) {
            remote.payment_logged_at = new Date(remote.payment_logged_at).toISOString();
        }
    }
    else if (entityType === 'SETTINGS') {
        if ('businessName' in remote) {
            remote.name = remote.businessName;
            delete remote.businessName;
        }
        if ('onboardingCompleted' in remote) {
            remote.onboarding_completed = remote.onboardingCompleted;
            delete remote.onboardingCompleted;
        }
        // Settings table is the business itself, so it doesn't need business_id fk
        delete remote.business_id;
        // Local ID is 'default', Supabase ID is UUID. Don't send 'id' in payload.
        delete remote.id;
    }
    else if (entityType === 'LEAD') {
        if ('ownerName' in remote) { remote.owner_name = remote.ownerName; delete remote.ownerName; }
        if ('ownerPhone' in remote) { remote.owner_phone = remote.ownerPhone; delete remote.ownerPhone; }
        if ('ownerEmail' in remote) { remote.owner_email = remote.ownerEmail; delete remote.ownerEmail; }
        if ('ownerAddress' in remote) { remote.owner_address = remote.ownerAddress; delete remote.ownerAddress; }
        if ('serviceAreaZip' in remote) { remote.service_area_zip = remote.serviceAreaZip; delete remote.serviceAreaZip; }
        if ('petDetails' in remote) { remote.pet_details = remote.petDetails; delete remote.petDetails; }
        if ('preferredDates' in remote) { remote.preferred_dates = remote.preferredDates; delete remote.preferredDates; }
        if ('serviceIds' in remote) { remote.service_ids = remote.serviceIds; delete remote.serviceIds; }
        if ('waiverSigned' in remote) { remote.waiver_signed = remote.waiverSigned; delete remote.waiverSigned; }
        // createdAt/updatedAt handled globally
    }

    // Remove ID if it's an update? No, we need ID for update query. 
    // Insert needs ID too if we are forcing the UUID generated locally (which we are).

    return remote;
};

export function useSync() {
    const [status, setStatus] = useState<'idle' | 'syncing' | 'offline' | 'error'>('idle');
    const [queueLength, setQueueLength] = useState<number>(0);
    const [lastError, setLastError] = useState<string | null>(null);
    const [isHydrating, setIsHydrating] = useState<boolean>(true); // Start true to block UI initially

    const clearLocalData = async () => {
        console.warn('[useSync] Preparing to clear local database...');

        // CRITICAL: Check for pending sync items before clearing
        const db = await getDB();
        const syncQueueCount = await db.count('syncQueue');

        if (syncQueueCount > 0) {
            console.warn(`[useSync] Found ${syncQueueCount} pending sync items. Processing before clearing...`);

            if (navigator.onLine) {
                // Process sync queue before clearing
                await processQueueSync();
                console.log('[useSync] Sync complete. Safe to clear local data.');
            } else {
                console.error('[useSync] OFFLINE with pending sync items - CANNOT clear data safely!');
                throw new Error('Cannot logout while offline with unsaved changes. Please connect to internet and try again.');
            }
        }

        console.warn('[useSync] Wiping local database for security/logout.');
        const stores = ['jobs', 'customers', 'pets', 'services', 'syncQueue', 'profiles', 'settings', 'leads'];
        for (const storeName of stores) {
            await db.clear(storeName as any);
        }
        localStorage.removeItem('crm_has_hydrated');
        localStorage.removeItem('crm_last_user_id');
    };

    // Session Management: Wipe DB if user changes
    useEffect(() => {
        const checkSession = async () => {
            if (typeof window === 'undefined') return;

            const { data: { user } } = await supabase.auth.getUser();
            const currentUserId = user?.id;
            const lastUserId = localStorage.getItem('crm_last_user_id');

            if (currentUserId && lastUserId && currentUserId !== lastUserId) {
                await clearLocalData();
            }

            if (currentUserId) {
                localStorage.setItem('crm_last_user_id', currentUserId);

                const hasHydrated = localStorage.getItem('crm_has_hydrated');

                // OFFLINE RESILIENCE: 
                // If we are offline but have hydrated before, stop blocking the UI.
                if (!navigator.onLine && hasHydrated) {
                    console.log('[useSync] Offline but already hydrated. Allowing access.');
                    setIsHydrating(false);
                    return;
                }

                if (!hasHydrated || currentUserId !== lastUserId) {
                    setIsHydrating(true);
                    await hydrateLocalDB(currentUserId);
                    setIsHydrating(false);
                } else {
                    setIsHydrating(false);
                }
            } else {
                setIsHydrating(false);
            }
        };

        checkSession();
    }, []);

    const processQueue = async () => {
        if (isSyncing) return;
        if (!navigator.onLine) {
            setStatus('offline');
            return;
        }

        isSyncing = true;
        setStatus('syncing');


        try {
            const db = await getDB();
            // Get all items sorted by timestamp
            const queue = await db.getAllFromIndex('syncQueue', 'by-timestamp');

            // PRIORITY SORT: Prevent Foreign Key race conditions
            // 1. Settings (Business) must exist first.
            // 2. Customers & Services depend on Business.
            // 3. Pets depend on Customers.
            // 4. Jobs depend on Customers, Pets, and Services.
            const priorityMap: Record<string, number> = {
                SETTINGS: 0,
                PROFILE: 1,
                SERVICE: 2,
                CUSTOMER: 2,
                LEAD: 2,
                PET: 3,
                JOB: 4
            };

            queue.sort((a, b) => {
                const pA = priorityMap[a.entityType] ?? 99;
                const pB = priorityMap[b.entityType] ?? 99;
                return pA - pB;
            });

            setQueueLength(queue.length);

            for (const item of queue) {
                let success = false;

                // Push to Supabase based on Action Type
                // We assume the user is logged in and Supabase client handles auth headers

                // MAPPING: entityType -> Supabase Table Name
                // CUSTOMER -> clients
                // PET -> dogs
                // JOB -> jobs
                const tableMap: Record<string, string> = {
                    CUSTOMER: 'customers',
                    PET: 'pets',
                    JOB: 'jobs',
                    SERVICE: 'services',
                    SETTINGS: 'businesses',
                    PROFILE: 'profiles',
                    LEAD: 'leads',
                };

                const tableName = tableMap[item.entityType];

                if (!tableName) {
                    console.error(`Unknown entity type: ${item.entityType}`);
                    // Mark as done so we don't retry forever? Or move to 'dead letter'?
                    // For now, delete.
                    await db.delete('syncQueue', item.id);
                    continue;
                }

                // Special handling for singleton Settings row
                // For SETTINGS, the ID in Supabase IS the User ID (Business ID)
                // For other entities, it is the entityId

                // We need the user for the transform
                const { data: { user }, error: authError } = await supabase.auth.getUser();
                if (authError) console.error('Sync Auth Error:', authError);
                console.log('[Sync Debug] Current User:', user?.id, user?.email); // DEBUG LINE

                // Use businessId from queue item if available (respects impersonation)
                // Otherwise fall back to user.id
                const businessId = item.businessId || user?.id || DEMO_BUSINESS_ID;

                const targetId = item.entityType === 'SETTINGS' ? businessId : item.entityId;

                try {
                    const payload = transformForRemote(item.entityType, item.data || {}, user, businessId);
                    console.log(`[Sync] Processing ${item.entityType} ${item.action}`, { payload });

                    if (item.action === 'CREATE' || item.action === 'UPDATE') {
                        // Settings should probably always be UPSERT or UPDATE, but if CREATE comes in:
                        // We must ensure ID is the UUID, not 'default'.
                        if (item.entityType === 'SETTINGS') {
                            payload.id = businessId;
                            // Ensure we don't accidentally send 'default' as id
                        }

                        // UPSERT is safer for Sync (handles retries, race conditions, and 'resync' of missing rows)
                        const { error } = await supabase.from(tableName).upsert(payload);
                        if (!error) success = true;
                        else {
                            console.error('Sync Error Upsert:', JSON.stringify(error, null, 2), error);
                            setLastError(error.message || JSON.stringify(error));
                        }
                    } else if (item.action === 'DELETE') {
                        const { error } = await supabase.from(tableName).delete().eq('id', targetId);
                        if (!error) success = true;
                        else console.error('Sync Error Delete:', JSON.stringify(error, null, 2), error);
                    }
                } catch (err: any) {
                    console.error('Sync Exception:', err);
                    await captureLog({
                        level: 'error',
                        message: `Sync Exception: ${err.message}`,
                        stack_trace: err.stack,
                        metadata: { entityType: item.entityType, action: item.action, entityId: item.entityId },
                        business_id: businessId
                    });
                }


                if (success) {
                    console.log(`Sync Success: ${item.action} ${tableName}`);
                    await db.delete('syncQueue', item.id);
                } else {
                    // Increment retry count
                    const MAX_RETRIES = 5;
                    const updatedItem = { ...item, retryCount: (item.retryCount || 0) + 1 };

                    if (updatedItem.retryCount >= MAX_RETRIES) {
                        // Max retries exceeded - log to admin and remove from queue
                        console.error(`[Sync] Max retries exceeded for ${item.entityType} ${item.entityId}`);
                        await captureLog({
                            level: 'error',
                            message: `Sync permanently failed after ${MAX_RETRIES} attempts`,
                            metadata: {
                                entityType: item.entityType,
                                action: item.action,
                                entityId: item.entityId,
                                data: item.data
                            },
                            business_id: businessId
                        });
                        // Remove from queue to prevent infinite retries
                        await db.delete('syncQueue', item.id);
                    } else {
                        // Update retry count for next attempt
                        await db.put('syncQueue', updatedItem);
                        console.warn(`[Sync] Retry ${updatedItem.retryCount}/${MAX_RETRIES} for ${item.entityType} ${item.entityId}`);
                    }
                }
            }
            if (queue.length > 0) {
                // If we processed items, clear the error
                setLastError(null);
            }
            setStatus('idle');

        } catch (e: any) {
            console.error('Sync process failed:', e);
            setStatus('error');
            await captureLog({
                level: 'error',
                message: `Sync Process Failed: ${e.message}`,
                stack_trace: e.stack,
                metadata: { queueLength: queueLength }
            });
        } finally {
            isSyncing = false;
        }
    };

    useEffect(() => {
        // 1. Run on mount
        processQueue();

        // 2. Run when online status changes
        const handleOnline = () => processQueue();
        window.addEventListener('online', handleOnline);

        // 3. Poll every 30 seconds
        const interval = setInterval(processQueue, 5000);

        return () => {
            window.removeEventListener('online', handleOnline);
            clearInterval(interval);
        };
    }, []);

    const resyncAll = async () => {
        if (typeof window === 'undefined') return;
        const db = await getDB();

        // 1. Services
        const services = await db.getAll('services');
        for (const s of services) {
            await db.add('syncQueue', {
                id: crypto.randomUUID(),
                action: 'UPDATE', // UPDATE acts as Upsert usually
                entityType: 'SERVICE',
                entityId: s.id,
                data: s,
                timestamp: Date.now(),
                retryCount: 0
            });
        }

        // 2. Profiles
        const profiles = await db.getAll('profiles');
        for (const p of profiles) {
            await db.add('syncQueue', {
                id: crypto.randomUUID(),
                action: 'UPDATE',
                entityType: 'PROFILE',
                entityId: p.id,
                data: p,
                timestamp: Date.now(),
                retryCount: 0
            });
        }

        // Trigger sync
        processQueue();
    };

    return { status, forceSync: processQueue, queueLength, lastError, resyncAll, isHydrating, clearLocalData };
}

// Standalone sync processor that can be called from hydration
// This prevents data loss by ensuring pending syncs complete before wiping local data
export async function processQueueSync() {
    if (isSyncing) {
        console.warn('[Sync] Already syncing, skipping duplicate call');
        return;
    }
    if (!navigator.onLine) {
        console.warn('[Sync] Offline, cannot process queue');
        return;
    }

    isSyncing = true;

    try {
        const db = await getDB();
        const queue = await db.getAllFromIndex('syncQueue', 'by-timestamp');

        if (queue.length === 0) {
            return;
        }

        console.log(`[Sync] Processing ${queue.length} pending items...`);

        // PRIORITY SORT
        const priorityMap: Record<string, number> = {
            SETTINGS: 0,
            PROFILE: 1,
            SERVICE: 2,
            CUSTOMER: 2,
            LEAD: 2,
            PET: 3,
            JOB: 4
        };

        queue.sort((a, b) => {
            const pA = priorityMap[a.entityType] ?? 99;
            const pB = priorityMap[b.entityType] ?? 99;
            return pA - pB;
        });

        const tableMap: Record<string, string> = {
            CUSTOMER: 'customers',
            PET: 'pets',
            JOB: 'jobs',
            SERVICE: 'services',
            SETTINGS: 'businesses',
            PROFILE: 'profiles',
            LEAD: 'leads',
        };

        for (const item of queue) {
            const tableName = tableMap[item.entityType];
            if (!tableName) {
                await db.delete('syncQueue', item.id);
                continue;
            }

            const { data: { user } } = await supabase.auth.getUser();
            const businessId = item.businessId || user?.id || DEMO_BUSINESS_ID;
            const targetId = item.entityType === 'SETTINGS' ? businessId : item.entityId;

            try {
                const payload = transformForRemote(item.entityType, item.data || {}, user, businessId);

                if (item.action === 'CREATE' || item.action === 'UPDATE') {
                    if (item.entityType === 'SETTINGS') {
                        payload.id = businessId;
                    }
                    const { error } = await supabase.from(tableName).upsert(payload);
                    if (!error) {
                        await db.delete('syncQueue', item.id);
                    } else {
                        console.error('Sync Error:', error);
                    }
                } else if (item.action === 'DELETE') {
                    const { error } = await supabase.from(tableName).delete().eq('id', targetId);
                    if (!error) {
                        await db.delete('syncQueue', item.id);
                    }
                }
            } catch (err) {
                console.error('Sync Exception:', err);
            }
        }

        console.log('[Sync] Queue processing complete');
    } catch (e) {
        console.error('[Sync] Failed to process queue:', e);
    } finally {
        isSyncing = false;
    }
}
