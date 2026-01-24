
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// 1. Setup Supabase Client
const envPath = path.resolve(process.cwd(), '.env.local');
let supabaseUrl = '';
let supabaseKey = '';

if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            if (key.trim() === 'NEXT_PUBLIC_SUPABASE_URL') supabaseUrl = value.trim();
            if (key.trim() === 'NEXT_PUBLIC_SUPABASE_ANON_KEY') supabaseKey = value.trim();
        }
    });
}

const supabase = createClient(supabaseUrl, supabaseKey);

// 2. Data Generators
const DEMO_BUSINESS_ID = '00000000-0000-0000-0000-000000000001';
const TEST_TIMESTAMP = new Date().toISOString();

async function main() {
    console.log('🧪 Starting Full Schema Verification Injection...');
    console.log('------------------------------------------------');

    try {
        // A. CUSTOMER
        const customerId = crypto.randomUUID();
        const customer = {
            id: customerId,
            business_id: DEMO_BUSINESS_ID,
            name: 'Verity Fication', // Fixed: 'full_name' -> 'name'
            email: 'verify@schema.test',
            phone: '555-999-0000', // Fixed: 'phone_number' -> 'phone'
            address: '123 Schema Check Lane, Database City, DB 10101',
            notes: 'This customer has every field populated to test the schema.'
        };
        console.log('👤 Inserting Customer...');
        const { error: custError } = await supabase.from('customers').upsert(customer);
        if (custError) throw new Error(`Customer Failed: ${JSON.stringify(custError)}`);
        console.log('   ✅ Customer Inserted');

        // B. PET
        const petId = crypto.randomUUID();
        const pet = {
            id: petId,
            customer_id: customerId, // Link to above
            business_id: DEMO_BUSINESS_ID,
            name: 'SchemaDog',
            breed: 'Database Retriever',
            notes: 'Allergic to NULL values.'
        };
        console.log('wmj Inserting Pet...');
        const { error: petError } = await supabase.from('pets').upsert(pet);
        if (petError) throw new Error(`Pet Failed: ${JSON.stringify(petError)}`);
        console.log('   ✅ Pet Inserted');

        // C. SERVICE
        const serviceId = crypto.randomUUID();
        const service = {
            id: serviceId,
            business_id: DEMO_BUSINESS_ID,
            name: 'Full Verification Groom',
            price: 150.00,
            duration_minutes: 120 // Fixed: 'duration' -> 'duration_minutes'
        };
        console.log('✂️ Inserting Service...');
        const { error: servError } = await supabase.from('services').upsert(service);
        if (servError) throw new Error(`Service Failed: ${JSON.stringify(servError)}`);
        console.log('   ✅ Service Inserted');

        // D. JOB
        const jobId = crypto.randomUUID();
        const job = {
            id: jobId,
            business_id: DEMO_BUSINESS_ID,
            customer_id: customerId,
            pet_ids: [petId], // Array of UUIDs
            service_ids: [serviceId], // Array of UUIDs
            state: 'COMPLETED',
            scheduled_date: '2026-12-31',
            scheduled_time: '10:00',
            payment_status: 'PAID',
            payment_method: 'VENMO',
            payment_amount: 165.00, // Includes tip?
            payment_logged_at: TEST_TIMESTAMP, // Fixed: payment_date -> payment_logged_at
            notes: 'Job specific notes column.',
            customer_notes: 'Copied snapshot of customer notes.',
            pet_notes: 'Copied snapshot of pet notes.'
        };
        // Note: We need to verify if 'payment_date' or 'payment_logged_at' is the column name
        // Based on previous chats, it was 'payment_logged_at'. Let's check or try.
        // Actually, let's use what we think is right, and if it fails, we know the column is missing/wrong.
        // Replacing `payment_date` with `payment_logged_at` as per common convention if `payment_date` fails.
        // Wait, let's try to match the `useSync` logic. 
        // `useSync` doesn't explicitly map `paymentDate`. Local might be `paymentLoggedAt`.
        // Let's assume standard snake_case.

        console.log('📅 Inserting Job...');
        const { error: jobError } = await supabase.from('jobs').upsert(job);
        if (jobError) {
            // If error is about column missing, we catch it here
            throw new Error(`Job Failed: ${JSON.stringify(jobError)}`);
        }
        console.log('   ✅ Job Inserted');

        // E. PROFILE
        const profileId = crypto.randomUUID();
        const profile = {
            id: profileId, // Needs to be unique if we dropped constraint
            email: 'admin@verification.test',
            full_name: 'Admin Verifier',
            role: 'owner',
            created_at: TEST_TIMESTAMP
        }
        console.log('👮 Inserting Profile...');
        const { error: profError } = await supabase.from('profiles').upsert(profile);
        if (profError) throw new Error(`Profile Failed: ${JSON.stringify(profError)}`);
        console.log('   ✅ Profile Inserted');


    } catch (err: any) {
        console.error('\n❌ VERIFICATION FAILED');
        console.error(err.message);
        process.exit(1);
    }

    console.log('\n✨ ALL SYSTEMS GO. All entities inserted successfully.');
    console.log('👉 Go to Supabase Dashboard > Table Editor to see these records.');
}

main();
