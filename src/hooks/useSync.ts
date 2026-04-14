import { useEffect, useState } from 'react';
import { getDB } from '@/lib/db';
import { supabase } from '@/lib/supabaseClient';
import { SyncQueueItem } from '@/lib/db/schema';
import { hydrateLocalDB, syncLeadsToLocal } from '@/lib/db/hydration';
import { captureLog } from '@/lib/admin/sentinel';
import { useImpersonationContextSafe, getActiveBusinessIdSync } from '@/contexts/ImpersonationContext';

// Simple "Mutex" to prevent double-syncing (Module-level for cross-component stability)
let isSyncing = false;

// TEMPORARY: Hardcoded Business ID for Phase 2 
const DEMO_BUSINESS_ID = '00000000-0000-0000-0000-000000000001';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

/**
 * Shared transformation logic for remote Supabase payloads
 */
const transformForRemote = (entityType: string, data: any, user: any, businessId?: string) => {
    // 1. Inject Business ID (Critical for RLS/Foreign Keys)
    let finalBusinessId = businessId || data.business_id || data.businessId || user?.id;

    if (!finalBusinessId) {
        if (IS_PRODUCTION) {
            throw new Error(`CRITICAL: Sync attempted without Business ID for ${entityType} ${data.id}. Aborting for safety.`);
        }
        finalBusinessId = DEMO_BUSINESS_ID;
    }

    const remote: any = { ...data, business_id: finalBusinessId };
    delete remote.businessId; // Ensure camelCase version is NOT sent to Supabase

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
        if (!remote.name || !remote.phone) {
            throw new Error(`CUSTOMER ${remote.id} is missing name or phone and cannot be synced.`);
        }
    }
    else if (entityType === 'PET') {
        // Skip validation for DELETE actions - we only need the ID
        if (remote.customerId || remote.customer_id) {
            if (remote.customerId) {
                remote.customer_id = remote.customerId;
                delete remote.customerId;
            }
        } else if (Object.keys(remote).length > 2) {
            // Only validate if this appears to be a CREATE/UPDATE (has more than just id and business_id)
            throw new Error(`PET ${remote.id} is missing a customer relationship and cannot be synced.`);
        }
    }
    else if (entityType === 'SERVICE') {
        // no specific changes
    }
    else if (entityType === 'JOB') {
        // Skip validation for DELETE actions - we only need the ID
        // Only validate if this appears to be a CREATE/UPDATE (has meaningful data)
        if (Object.keys(data).length > 2) {
            // VALIDATION: Ensure customerId is present
            if (!data.customerId && !data.customer_id) {
                throw new Error(`JOB ${data.id} is missing a customer relationship and cannot be synced.`);
            }
            if (!data.petIds && !data.pet_ids) {
                throw new Error(`JOB ${data.id} is missing pet relationships and cannot be synced.`);
            }
        }

        // CRITICAL: Only map fields if they exist to avoid nullifying relationships
        if ('customerId' in data) {
            remote.customer_id = data.customerId || data.customer_id;
            delete remote.customerId;
        }
        if ('petIds' in data) {
            remote.pet_ids = data.petIds || data.pet_ids;
            delete remote.petIds;
        }
        if ('scheduledDate' in data) {
            remote.scheduled_date = data.scheduledDate;
            delete remote.scheduledDate;
        }
        if ('scheduledTime' in data) {
            remote.scheduled_time = data.scheduledTime;
            delete remote.scheduledTime;
        }
        if ('jobNotes' in data) {
            remote.notes = data.jobNotes;
            delete remote.jobNotes;
        }
        if ('customerNotes' in data) {
            remote.customer_notes = data.customerNotes;
            delete remote.customerNotes;
        }
        if ('petNotes' in data) {
            remote.pet_notes = data.petNotes;
            delete remote.petNotes;
        }

        // Map services to service_ids
        if (data.services && Array.isArray(data.services)) {
            remote.service_ids = data.services.map((s: any) => s.id);
            delete remote.services;
        }

        if (data.payment_logged_at) {
            remote.payment_logged_at = new Date(data.payment_logged_at).toISOString();
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

        // Sync business_hours to schedule_work_days for booking page compatibility
        if ('business_hours' in remote && remote.business_hours) {
            const dayMap: { [key: string]: number } = {
                'sunday': 0,
                'monday': 1,
                'tuesday': 2,
                'wednesday': 3,
                'thursday': 4,
                'friday': 5,
                'saturday': 6
            };

            const workDays: number[] = [];
            Object.keys(remote.business_hours).forEach(dayName => {
                const dayConfig = remote.business_hours[dayName];
                if (dayConfig && dayConfig.isOpen) {
                    const dayIndex = dayMap[dayName.toLowerCase()];
                    if (dayIndex !== undefined) {
                        workDays.push(dayIndex);
                    }
                }
            });

            // Sort the days (Sunday=0, Monday=1, etc.)
            workDays.sort((a, b) => a - b);
            remote.schedule_work_days = workDays;
        }

        // Don't set owner_id - it causes unique constraint violations
        // The businessId should already be correct from the profile
        delete remote.business_id;
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
        if ('businessId' in remote) { remote.business_id = remote.businessId; delete remote.businessId; }
    }

    return remote;
};

export function useSync() {
    const [status, setStatus] = useState<'idle' | 'syncing' | 'offline' | 'error'>('idle');
    const [queueLength, setQueueLength] = useState<number>(0);
    const [lastError, setLastError] = useState<string | null>(null);
    const [isHydrating, setIsHydrating] = useState<boolean>(true); // Start true to block UI initially

    const { isImpersonating, impersonatedBusinessId } = useImpersonationContextSafe();

    // -- EXPORTED VERSION FOR HYDRATION --
    // We define it inside a ref or helper to avoid staleness, but for hydration we just need a fresh run.
    const processQueueSync = async () => {
        if (isSyncing) return;
        isSyncing = true;
        try {
            const { data: { user } } = await supabase.auth.getUser();
            // Note: Hydration processQueueSync won't have the React Context for impersonation easily
            // but that's okay because hydration happens ONCE at startup.
            await runSyncLoop(user, isImpersonating, impersonatedBusinessId);
        } finally {
            isSyncing = false;
        }
    };

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

    // Session & Context Management: Wipe DB if user/business changes
    useEffect(() => {
        const checkSession = async () => {
            if (typeof window === 'undefined') return;

            try {
                // Add a timeout to getUser to prevent hangs on sessions
                const sessionPromise = supabase.auth.getUser();
                const timeoutPromise = new Promise<{ data: { user: null } }>(resolve =>
                    setTimeout(() => resolve({ data: { user: null } }), 8000)
                );

                const { data: { user } } = await Promise.race([sessionPromise, timeoutPromise]);
                const currentUserId = user?.id;
                const lastUserId = localStorage.getItem('crm_last_user_id');

                // Also track active business ID to detect context changes (Impersonation)
                // CRITICAL: Use getActiveBusinessIdSync() instead of React context to avoid stale values
                const currentBusinessId = getActiveBusinessIdSync() || currentUserId;
                const lastBusinessId = localStorage.getItem('crm_last_business_id');

                // 1. User changed -> Wipe everything
                if (currentUserId && lastUserId && currentUserId !== lastUserId) {
                    await clearLocalData();
                }

                // 2. Business context changed -> Clear local stores (not sync queue) and re-hydrate
                if (currentBusinessId && lastBusinessId && currentBusinessId !== lastBusinessId) {
                    console.log(`[useSync] Business context changed from ${lastBusinessId} to ${currentBusinessId}. Re-hydrating...`);
                    localStorage.removeItem('crm_has_hydrated');
                    const db = await getDB();
                    const stores = ['jobs', 'customers', 'pets', 'services', 'settings', 'leads'];
                    for (const s of stores) await db.clear(s as any);
                }

                if (currentUserId) {
                    localStorage.setItem('crm_last_user_id', currentUserId);
                    if (currentBusinessId) localStorage.setItem('crm_last_business_id', currentBusinessId);

                    const hasHydrated = localStorage.getItem('crm_has_hydrated');

                    // OFFLINE RESILIENCE: 
                    if (!navigator.onLine && hasHydrated) {
                        console.log('[useSync] Offline but already hydrated. Allowing access.');
                        setIsHydrating(false);
                        return;
                    }

                    const businessIdChanged = currentBusinessId !== lastBusinessId;

                    if (!hasHydrated || currentUserId !== lastUserId || businessIdChanged) {
                        console.log('[useSync] Triggering hydration');
                        setIsHydrating(true);
                        const success = await hydrateLocalDB(currentBusinessId || currentUserId);
                        console.log('[useSync] Hydration result:', success);
                        setIsHydrating(false);
                    } else {
                        setIsHydrating(false);
                    }
                } else {
                    // No user found or timed out - if we have hydrated before, we might be offline
                    const hasHydrated = localStorage.getItem('crm_has_hydrated') === 'true';
                    if (!hasHydrated) {
                        console.warn('[useSync] No user and no previous hydration.');
                    }
                    setIsHydrating(false);
                }
            } catch (err) {
                console.error('[useSync] Session check failed:', err);
                setIsHydrating(false);
            }
        };

        checkSession();
    }, [impersonatedBusinessId]);

    const processQueue = async () => {
        if (isSyncing) return;

        // Use flag immediately to prevent concurrent triggers
        isSyncing = true;

        if (!navigator.onLine) {
            setStatus('offline');
            isSyncing = false;
            return;
        }

        try {
            const { data: { user } } = await supabase.auth.getUser();

            await runSyncLoop(user, isImpersonating, impersonatedBusinessId);
        } catch (err) {
            console.error('Process Queue Exception:', err);
        } finally {
            isSyncing = false;
        }
    };

    /**
     * The actual core sync loop. 
     * Separated so it can be called from both the hook and the standalone hydration function.
     */
    const runSyncLoop = async (user: any, impersonatingActive?: boolean, impersonatedId?: string | null) => {
        const db = await getDB();
        try {
            // Get all items sorted by timestamp
            const queue = await db.getAllFromIndex('syncQueue', 'by-timestamp');

            if (queue.length === 0) {
                setStatus('idle');
                setQueueLength(0);
                return;
            }

            // --- QUEUE COMPACTION (v2.3) ---
            // 1. Identify items for immediate deletion (redundant updates or child updates for deleted parents)
            const compactedItems = new Map<string, SyncQueueItem>();
            const itemsToDelete: string[] = [];

            // Track deleted entity IDs to strip their children's updates
            const deletedEntities = new Set<string>();
            for (const item of queue) {
                if (item.action === 'DELETE') {
                    deletedEntities.add(`${item.entityType}:${item.entityId}`);
                }
            }

            for (const item of queue) {
                const key = `${item.entityType}:${item.entityId}`;

                // Rule A: If entity is deleted in this queue, skip any UPDATE/CREATE for it
                if (item.action !== 'DELETE' && deletedEntities.has(key)) {
                    itemsToDelete.push(item.id);
                    continue;
                }

                // Rule B: Redundant update merging
                if (item.action === 'UPDATE') {
                    if (compactedItems.has(key)) {
                        const previousItem = compactedItems.get(key)!;

                        // v2.2: DEEP-MERGE COMPACTION for arrays (petIds, service_ids)
                        const mergedData = { ...previousItem.data, ...item.data };

                        // Merge petIds array instead of clobbering
                        if (Array.isArray(previousItem.data?.petIds) && Array.isArray(item.data?.petIds)) {
                            mergedData.petIds = Array.from(new Set([...previousItem.data.petIds, ...item.data.petIds]));
                        }

                        previousItem.data = mergedData;
                        previousItem.timestamp = item.timestamp; // Keep latest timestamp
                        itemsToDelete.push(item.id);
                    } else {
                        compactedItems.set(key, item);
                    }
                }
            }

            if (itemsToDelete.length > 0) {
                console.log(`[Sync] Compacting queue: eliminating ${itemsToDelete.length} redundant updates.`);
                for (const id of itemsToDelete) {
                    await db.delete('syncQueue', id);
                }
            }
            // Refresh queue after compaction
            const finalQueue = await db.getAllFromIndex('syncQueue', 'by-timestamp');
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
                JOB: 4,
                RECURRENCE_RULE: 5
            };

            queue.sort((a, b) => {
                const pA = priorityMap[a.entityType] ?? 99;
                const pB = priorityMap[b.entityType] ?? 99;
                return pA - pB;
            });

            setQueueLength(finalQueue.length);

            for (const item of finalQueue) {
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
                    RECURRENCE_RULE: 'recurrence_rules',
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

                console.log('[Sync Debug] Current User:', user?.id, user?.email); // DEBUG LINE

                // RECOVERY LOGIC:
                // If the item is missing a businessId (legacy), we use the currently active business context.
                // This handles cases where items were created before we added strict businessId tracking,
                // or if the user is currently impersonating.
                let businessId = item.businessId;
                if (!businessId) {
                    const activeId = getActiveBusinessIdSync();
                    if (activeId) {
                        console.warn(`[Sync] Recovering missing businessId for legacy ${item.entityType} item using active context: ${activeId}`);
                        businessId = activeId;
                    }
                }

                // Final fallback sequence: Item's ID -> Active ID -> Auth UID -> Global Demo ID
                businessId = businessId || user?.id || DEMO_BUSINESS_ID;

                const targetId = item.entityType === 'SETTINGS' ? businessId : item.entityId;

                try {
                    const payload = transformForRemote(item.entityType, item.data || {}, user, businessId);
                    console.log(`[Sync] Processing ${item.entityType} ${item.action}`, { payload });

                    const syncAction = async () => {
                        if (item.action === 'CREATE' || item.action === 'UPDATE') {
                            if (item.entityType === 'SETTINGS') {
                                payload.id = businessId;
                            }

                            // --- OPTIMISTIC CONFLICT GUARD (v2.1) ---
                            // Check if remote data is newer before overwriting
                            if (item.action === 'UPDATE' && item.entityType !== 'SETTINGS' && item.data?.updatedAt) {
                                const { data: remoteRecord } = await supabase
                                    .from(tableName)
                                    .select('updated_at')
                                    .eq('id', targetId)
                                    .single();

                                if (remoteRecord?.updated_at) {
                                    const remoteTime = new Date(remoteRecord.updated_at).getTime();
                                    const localTime = new Date(item.data.updatedAt).getTime();

                                    if (remoteTime > localTime + 2000) { // 2s buffer for clock drift
                                        console.warn(`[Sync] Conflict detected for ${item.entityType} ${item.entityId}. Remote is newer by ${remoteTime - localTime}ms.`);
                                        // In a real app, we might trigger a merge UI. For now, we log it and proceed.
                                    }
                                }
                            }



                            // SETTINGS: Use UPDATE instead of UPSERT
                            // The unique_business_per_owner constraint (likely on owner_email) prevents
                            // upsert from working when the businessId doesn't exist (it tries to INSERT)
                            if (item.entityType === 'SETTINGS') {
                                payload.id = businessId;
                                console.log('[SETTINGS SYNC] businessId:', businessId);
                                console.log('[SETTINGS SYNC] Using UPDATE instead of UPSERT');
                                // Use update with eq to force UPDATE operation only
                                const { error } = await supabase
                                    .from(tableName)
                                    .update(payload)
                                    .eq('id', businessId);

                                if (error) {
                                    console.error('[SETTINGS SYNC] Update failed:', error);
                                    if (error.code === 'PGRST116') {
                                        // No rows updated - businessId doesn't exist
                                        console.error('[SETTINGS SYNC] businessId does not exist in database:', businessId);
                                        console.error('[SETTINGS SYNC] You need to fix the profile.business_id to match an actual business');
                                    }
                                }
                                return { error };
                            }

                            return await supabase.from(tableName).upsert(payload);
                        } else if (item.action === 'DELETE') {
                            return await supabase.from(tableName).delete().eq('id', targetId);
                        }
                        return { error: null };
                    };

                    const timeout = new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Request Timeout')), 12000)
                    );

                    const { error } = await Promise.race([syncAction(), timeout]) as any;

                    if (!error) success = true;
                    else {
                        console.error('Sync Error:', JSON.stringify(error, null, 2), error);
                        setLastError(error.message || JSON.stringify(error));

                        // Treat Supabase errors as exceptions for self-healing
                        throw error;
                    }
                } catch (err: any) {
                    console.error('Sync Exception:', err);

                    // --- SELF-HEALING (New in V2) ---
                    // Handle PostgREST/Supabase Error 23503 (Foreign Key Violation)
                    // If a Job fails because its parent Customer is missing, we synthesize a CREATE for the customer.
                    if (err.code === '23503' || (err.message && err.message.includes('violates foreign key constraint'))) {
                        console.warn(`[Sync] FK Violation detected for ${item.entityType} ${item.entityId}. Attempting recovery...`);

                        let parentType: string | null = null;
                        let parentId: string | null = null;

                        // Heuristic detection based on constraint names or data
                        if (item.entityType === 'JOB') {
                            // Check for missing customer
                            parentId = item.data.customerId || item.data.customer_id;
                            parentType = 'CUSTOMER';

                            // Check for missing services (very complex as it's an array)
                            // If the error message mentions 'services', we might need to heal all services
                            if (err.message && err.message.includes('services')) {
                                parentType = 'SERVICE';
                                // We'll heal the FIRST service in the array for now; the loop will retry for others
                                parentId = Array.isArray(item.data.services) ? item.data.services[0]?.id : null;
                            }
                        } else if (item.entityType === 'PET') {
                            parentType = 'CUSTOMER';
                            parentId = item.data.customerId || item.data.customer_id;
                        }

                        if (parentType && parentId) {
                            // First, try to find in main entity store
                            let parentData = await db.get(parentType.toLowerCase() as any, parentId);

                            // IF MISSING: Check Dead Letter Queue (v2.3 Enhanced Healing)
                            if (!parentData) {
                                console.warn(`[Sync] Parent ${parentType} ${parentId} missing from local DB. Checking Dead Letter Queue...`);
                                const dlqItem = await db.get('dead_letter', parentId);
                                if (dlqItem) {
                                    console.log(`[Sync] Found missing parent ${parentType} in DLQ. Moving back to active queue.`);
                                    // Move back to syncQueue
                                    const v4 = (await import('uuid')).v4;
                                    await db.add('syncQueue', {
                                        ...dlqItem,
                                        id: v4(),
                                        retryCount: 0,
                                        timestamp: item.timestamp - 1 // Prioritize
                                    });
                                    // Restore parent data for the synthesis log if needed
                                    parentData = dlqItem.data;
                                    // Remove from DLQ
                                    await db.delete('dead_letter', parentId);
                                }
                            }

                            if (parentData) {
                                console.log(`[Sync] Synthesizing missing ${parentType} ${parentId} to resolve FK violation.`);
                                const v4 = (await import('uuid')).v4;
                                await db.add('syncQueue', {
                                    id: v4(),
                                    action: 'CREATE',
                                    entityType: parentType as any,
                                    entityId: parentId,
                                    data: parentData,
                                    timestamp: item.timestamp - 1, // Ensure it's sorted BEFORE the child
                                    retryCount: 0,
                                    businessId: businessId || undefined
                                });
                                // We stop the loop and let it retry with the new parent at the head
                                setStatus('error');
                                setLastError(`Missing parent ${parentType} synthesized. Retrying...`);
                                break;
                            } else {
                                console.error(`[Sync] Critical: Parent ${parentType} ${parentId} could not be recovered from local DB or DLQ.`);
                            }
                        }
                    }

                    await captureLog({
                        level: 'error',
                        message: `Sync Exception: ${err.message}`,
                        stack_trace: err.stack,
                        metadata: { entityType: item.entityType, action: item.action, entityId: item.entityId, errorCode: err.code },
                        business_id: businessId
                    });
                }


                if (success) {
                    console.log(`Sync Success: ${item.action} ${tableName}`);
                    await db.delete('syncQueue', item.id);
                    setQueueLength(prev => Math.max(0, prev - 1));
                } else {
                    // BREAK the loop on failure to prevent cascading foreign key violations
                    // This is critical because children (Jobs) will fail if parents (Customers) haven't synced.
                    console.error(`[Sync] Stopping loop due to failure in ${item.entityType} ${item.action}`);

                    // Increment retry count
                    const MAX_RETRIES = 5;
                    const updatedItem = { ...item, retryCount: (item.retryCount || 0) + 1 };

                    if (updatedItem.retryCount >= MAX_RETRIES) {
                        // Max retries exceeded - move to Dead Letter Queue (v2.1)
                        console.error(`[Sync] Max retries exceeded for ${item.entityType} ${item.entityId}. Moving to DLQ.`);
                        await db.put('dead_letter', {
                            ...updatedItem,
                            failureReason: lastError || 'Max retries reached',
                            failedAt: Date.now()
                        });

                        await captureLog({
                            level: 'error',
                            message: `Sync permanently failed after ${MAX_RETRIES} attempts - Moved to DLQ`,
                            metadata: {
                                entityType: item.entityType,
                                action: item.action,
                                entityId: item.entityId,
                                lastError: lastError
                            },
                            business_id: businessId
                        });
                        // Remove from queue so it doesn't block the next sync
                        await db.delete('syncQueue', item.id);
                        setQueueLength(prev => Math.max(0, prev - 1));
                    } else {
                        // Update retry count for next attempt
                        await db.put('syncQueue', updatedItem);
                        console.warn(`[Sync] Retry ${updatedItem.retryCount}/${MAX_RETRIES} for ${item.entityType} ${item.entityId}`);
                    }

                    break; // STOP processing the rest of the queue in this tick
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

        // 2. Run when online status changes or manual trigger
        const handleSyncTrigger = () => processQueue();
        window.addEventListener('online', handleSyncTrigger);
        window.addEventListener('trigger-sync', handleSyncTrigger);

        // 3. Poll every 30 seconds
        const interval = setInterval(processQueue, 30000);

        return () => {
            window.removeEventListener('online', handleSyncTrigger);
            window.removeEventListener('trigger-sync', handleSyncTrigger);
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
            JOB: 4,
            RECURRENCE_RULE: 5
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
            RECURRENCE_RULE: 'recurrence_rules',
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
