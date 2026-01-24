
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
    console.log('--- Debugging Remaining Tables ---');

    // 1. Test SERVICE Insert
    console.log('\nTesting SERVICE Insert...');
    const servicePayload = {
        id: '00000000-0000-0000-0000-000000000004',
        business_id: DEMO_BUSINESS_ID,
        name: 'Debug Service',
        price: 99.99,
        // Add any other potential fields
        created_at: new Date().toISOString()
    };

    const { error: serviceError } = await supabase.from('services').insert(servicePayload).select();

    if (serviceError) {
        console.error('❌ SERVICE Insert Failed:', serviceError.message);
    } else {
        console.log('✅ SERVICE Insert Success!');
        // Clean up
        await supabase.from('services').delete().eq('id', servicePayload.id);
    }

    // 2. Test PROFILE Insert (if applicable)
    // Note: Profiles usually linked to auth.users, but let's see if we can insert a dummy
    console.log('\nTesting PROFILE Insert...');
    const profilePayload = {
        id: '00000000-0000-0000-0000-000000000005', // Random UUID
        // business_id: DEMO_BUSINESS_ID, // Profiles might not have business_id if they are global users? Or maybe they do.
        // Let's assume they are "K9desk Profiles"
        full_name: 'Debug Groomer',
        email: 'debug@test.com',
        updated_at: new Date().toISOString()
    };

    const { error: profileError } = await supabase.from('profiles').insert(profilePayload).select();

    if (profileError) {
        console.error('❌ PROFILE Insert Failed:', profileError.message);
    } else {
        console.log('✅ PROFILE Insert Success!');
        await supabase.from('profiles').delete().eq('id', profilePayload.id);
    }
}

main();
