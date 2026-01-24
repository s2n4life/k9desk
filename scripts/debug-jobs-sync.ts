
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load env vars manually
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

const DEMO_BUSINESS_ID = '00000000-0000-0000-0000-000000000001';

async function main() {
    console.log('--- Debugging Jobs Sync ---');

    // 1. Create a dummy customer first (to satisfy Foreign Keys if needed)
    const customerId = '00000000-0000-0000-0000-000000000002';

    await supabase.from('customers').upsert({
        id: customerId,
        business_id: DEMO_BUSINESS_ID,
        name: 'Debug Customer',
        phone: '555-0000'
    });

    // 2. Prepare a Job payload that matches what useSync sends
    const jobPayload = {
        id: '00000000-0000-0000-0000-000000000003',
        business_id: DEMO_BUSINESS_ID,
        customer_id: customerId,
        state: 'SCHEDULED',
        scheduled_date: '2026-01-20',
        scheduled_time: '10:00',
        // The problematic fields:
        address: '123 Debug Lane',
        payment_amount: 50.00,
        payment_method: 'cash',
        payment_source: 'manual',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    console.log('Attempting to insert Job with payload:', JSON.stringify(jobPayload, null, 2));

    const { data, error } = await supabase.from('jobs').insert(jobPayload).select();

    if (error) {
        console.error('\n❌ INSERT FAILED!');
        console.error('Error Code:', error.code);
        console.error('Message:', error.message);
        console.error('Details:', error.details);
        console.error('Hint:', error.hint);

        if (error.code === 'PGRST204' && error.message.includes('Could not find the')) {
            console.log('\n💡 DIAGNOSIS: You are missing a column in Supabase!');
            console.log('The error message explicitly tells you which one.');
        }
        if (error.code === '42501') {
            console.log('\n💡 DIAGNOSIS: RLS Permission Denied. You need to enable access in Supabase Dashboard.');
        }
    } else {
        console.log('\n✅ INSERT SUCCESS!');
        console.log('The Jobs table schema is correct. The issue must be in the React Loop or Queue.');

        // Cleanup
        await supabase.from('jobs').delete().eq('id', jobPayload.id);
    }
}

main();
