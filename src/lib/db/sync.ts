import { getDB } from './index';
import { SyncActionType, EntityType, SyncQueueItem } from './schema';
import { v4 as uuidv4 } from 'uuid';

export async function addToSyncQueue(
    action: SyncActionType,
    entityType: EntityType,
    entityId: string,
    data?: any,
    businessId?: string // Optional: Active business ID (respects impersonation)
) {
    const db = await getDB();
    const item: SyncQueueItem = {
        id: uuidv4(),
        action,
        entityType,
        entityId,
        data,
        timestamp: Date.now(),
        retryCount: 0,
        businessId, // Store the business ID for sync processing
    };
    await db.add('syncQueue', item);

    // Trigger immediate sync attempt if online
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('trigger-sync'));
    }
}
