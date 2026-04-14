import { getDB } from './index';
import { SyncActionType, EntityType, SyncQueueItem } from './schema';
import { v4 as uuidv4 } from 'uuid';

/**
 * Perform an atomic mutation: Save to the entity store AND add to the Sync Queue
 * within a single IndexedDB transaction.
 */
export async function saveWithSync<T extends { id: string }>(
    storeName: any,
    data: T,
    action: 'CREATE' | 'UPDATE',
    businessId?: string
) {
    const db = await getDB();
    const tx = db.transaction([storeName, 'syncQueue'], 'readwrite');

    // 1. Save the entity
    await tx.objectStore(storeName).put(data);

    // 2. Add to Sync Queue
    const syncItem: SyncQueueItem = {
        id: uuidv4(),
        action,
        entityType: mapStoreToEntity(storeName),
        entityId: data.id,
        data,
        timestamp: Date.now(),
        retryCount: 0,
        businessId
    };
    await tx.objectStore('syncQueue').add(syncItem);

    await tx.done;

    // Trigger sync attempt
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('trigger-sync'));
    }
}

/**
 * Perform an atomic deletion
 */
export async function deleteWithSync(
    storeName: any,
    id: string,
    businessId?: string
) {
    const db = await getDB();
    const tx = db.transaction([storeName, 'syncQueue'], 'readwrite');

    // 1. Delete the entity
    await tx.objectStore(storeName).delete(id);

    // 2. Add to Sync Queue
    const syncItem: SyncQueueItem = {
        id: uuidv4(),
        action: 'DELETE',
        entityType: mapStoreToEntity(storeName),
        entityId: id,
        timestamp: Date.now(),
        retryCount: 0,
        businessId
    };
    await tx.objectStore('syncQueue').add(syncItem);

    await tx.done;

    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('trigger-sync'));
    }
}

function mapStoreToEntity(storeName: string): EntityType {
    const map: Record<string, EntityType> = {
        customers: 'CUSTOMER',
        pets: 'PET',
        jobs: 'JOB',
        services: 'SERVICE',
        settings: 'SETTINGS',
        leads: 'LEAD',
        profiles: 'PROFILE',
        recurrence_rules: 'RECURRENCE_RULE'
    };
    return map[storeName] || 'CUSTOMER';
}
