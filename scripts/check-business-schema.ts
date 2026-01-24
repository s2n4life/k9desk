
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
    console.log('--- Checking Settings/Businesses Schema ---');

    // Payload with ALL possible Settings fields
    const payload = {
        id: DEMO_BUSINESS_ID,
        name: 'Schema Test Business',
        // Common fields
        onboarding_completed: true,
        updated_at: new Date().toISOString()
    };

    console.log('Testing Insert with comprehensive payload...');

    // We rely on the error message to tell us what's wrong
    const { error } = await supabase.from('businesses').upsert(payload).select();

    if (error) {
        console.error('❌ Schema Mismatch Detected:', error.message);
        if (error.code === 'PGRST204') {
            console.log('Analysis: Column missing.');
        }
    } else {
        console.log('✅ ALL FIELDS ACCEPTED! Schema is perfect.');
    }
}

main();
