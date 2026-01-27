
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

console.log('Using URL:', supabaseUrl);
console.log('Using Service Key (first 10 chars):', serviceKey?.substring(0, 10));

const supabase = createClient(supabaseUrl, serviceKey);

async function testInsert() {
    const testLead = {
        business_id: '1ba93133-86fa-4c06-b0ed-2ac5cc393b0c', // David's Grooming
        owner_name: 'Diagnostic Test',
        owner_phone: '555-555-5555',
        status: 'new',
        pet_details: [],
        preferred_dates: [],
        waiver_signed: true
    };

    console.log('Attempting insert with SERVICE_ROLE...');
    const { data, error } = await supabase.from('leads').insert([testLead]).select();

    if (error) {
        console.error('❌ Insert FAILED:', error.message);
    } else {
        console.log('✅ Insert SUCCESS:', data);
        // Clean up
        await supabase.from('leads').delete().eq('id', data[0].id);
        console.log('✅ Cleanup SUCCESS');
    }
}

testInsert();
