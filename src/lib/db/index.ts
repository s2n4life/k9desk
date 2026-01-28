import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Customer, Pet, Job, SyncQueueItem, Service } from './schema';

interface GroomerDB extends DBSchema {
    customers: {
        key: string;
        value: Customer;
        indexes: { 'by-phone': string };
    };
    pets: {
        key: string;
        value: Pet;
        indexes: { 'by-customer': string };
    };
    jobs: {
        key: string;
        value: Job;
        indexes: {
            'by-customer': string;
            'by-date': string;
            'by-state': string;
        };
    };
    syncQueue: {
        key: string;
        value: SyncQueueItem;
        indexes: { 'by-timestamp': number };
    };
    settings: {
        key: string;
        value: any;
    };
    services: {
        key: string;
        value: Service;
    };
    profiles: {
        key: string;
        value: any; // Using any for now to avoid strict schema friction
    };
    leads: {
        key: string;
        value: any; // Using any to match Lease schema or strict Lead type
        indexes: { 'by-status': string };
    };
    dead_letter: {
        key: string;
        value: SyncQueueItem & { failureReason?: string; failedAt: number };
        indexes: { 'by-timestamp': number };
    };
}

const DB_NAME = 'groomer-crm-db';
const DB_VERSION = 6;

let dbPromise: Promise<IDBPDatabase<GroomerDB>>;

export const getDB = () => {
    if (!dbPromise) {
        dbPromise = openDB<GroomerDB>(DB_NAME, DB_VERSION, {
            upgrade(db, oldVersion, newVersion, transaction) {
                // Customers
                if (!db.objectStoreNames.contains('customers')) {
                    const store = db.createObjectStore('customers', { keyPath: 'id' });
                    store.createIndex('by-phone', 'phone', { unique: true });
                }

                // Pets
                if (!db.objectStoreNames.contains('pets')) {
                    const store = db.createObjectStore('pets', { keyPath: 'id' });
                    store.createIndex('by-customer', 'customerId');
                }

                // Jobs
                if (!db.objectStoreNames.contains('jobs')) {
                    const store = db.createObjectStore('jobs', { keyPath: 'id' });
                    store.createIndex('by-customer', 'customerId');
                    store.createIndex('by-date', 'scheduledDate');
                    store.createIndex('by-state', 'state');
                }

                // Sync Queue
                if (!db.objectStoreNames.contains('syncQueue')) {
                    const store = db.createObjectStore('syncQueue', { keyPath: 'id' });
                    store.createIndex('by-timestamp', 'timestamp');
                }

                // Settings - Recreate with correct keyPath 'id' if upgrading
                if (oldVersion < 3 && db.objectStoreNames.contains('settings')) {
                    db.deleteObjectStore('settings');
                }

                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'id' });
                }

                // Services
                if (!db.objectStoreNames.contains('services')) {
                    db.createObjectStore('services', { keyPath: 'id' });
                }

                // Profiles
                if (!db.objectStoreNames.contains('profiles')) {
                    db.createObjectStore('profiles', { keyPath: 'id' });
                }

                // Leads
                if (!db.objectStoreNames.contains('leads')) {
                    const store = db.createObjectStore('leads', { keyPath: 'id' });
                    store.createIndex('by-status', 'status');
                }

                // Dead Letter Queue (v6)
                if (!db.objectStoreNames.contains('dead_letter')) {
                    const store = db.createObjectStore('dead_letter', { keyPath: 'id' });
                    store.createIndex('by-timestamp', 'timestamp');
                }
            },
        });
    }
    return dbPromise;
};
