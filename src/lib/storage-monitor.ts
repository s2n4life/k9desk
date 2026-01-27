
// Check available storage quota
export async function checkStorageQuota(): Promise<{
    usage: number;
    quota: number;
    percentage: number;
    remaining: number;
    hasRisk: boolean;
}> {
    if (!navigator.storage || !navigator.storage.estimate) {
        return { usage: 0, quota: 0, percentage: 0, remaining: 0, hasRisk: false };
    }

    try {
        const estimate = await navigator.storage.estimate();
        const usage = estimate.usage || 0;
        const quota = estimate.quota || 1024 * 1024 * 1024; // Default 1GB fallthrough

        const percentage = (usage / quota) * 100;
        const remaining = quota - usage;

        // Risk if >80% used or <100MB remaining
        const hasRisk = percentage > 80 || remaining < 100 * 1024 * 1024;

        if (hasRisk) {
            console.warn(`[Storage] Storage quota at risk! Used: ${percentage.toFixed(1)}%, Remaining: ${(remaining / 1024 / 1024).toFixed(0)}MB`);
        }

        return { usage, quota, percentage, remaining, hasRisk };
    } catch (e) {
        console.error('[Storage] Failed to check quota:', e);
        return { usage: 0, quota: 0, percentage: 0, remaining: 0, hasRisk: false };
    }
}

// Estimate how many average entities can fit in remaining space
// Avg entity size ~ 2KB (generous)
export async function getEstimatedCapacity() {
    const { remaining } = await checkStorageQuota();
    const AVG_ENTITY_SIZE = 2048; // 2KB
    return Math.floor(remaining / AVG_ENTITY_SIZE);
}
