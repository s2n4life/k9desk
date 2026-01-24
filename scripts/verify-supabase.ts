
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load env vars manually to avoid dependencies
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

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase keys in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const DEMO_BUSINESS_ID = '00000000-0000-0000-0000-000000000001';

async function main() {
    console.log('--- Supabase Verification Script ---');
    console.log('1. Checking connection...');

    // Try to simply read from businesses to check connection
    const { count, error: connError } = await supabase.from('businesses').select('*', { count: 'exact', head: true });

    if (connError) {
        console.error('❌ Connection Failed:', connError.message);
        return;
    }
    console.log('✅ Connection OK');

    console.log('2. Checking for Demo Business...');
    const { data: business, error: getError } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', DEMO_BUSINESS_ID)
        .maybeSingle();

    if (business) {
        console.log('✅ Demo Business already exists.');
    } else {
        // Attempt creation
        const { error: insertError } = await supabase
            .from('businesses')
            .insert({
                id: DEMO_BUSINESS_ID,
                name: 'Demo Grooming',
                subscription_status: 'active'
            });

        if (insertError) {
            console.error('❌ Failed to create business:', insertError.message);
        } else {
            console.log('✅ Demo Business created successfully!');
        }
    }
    console.log('------------------------------------');
}

main();
