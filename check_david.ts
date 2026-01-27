import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const bid = '1ba93133-86fa-4c06-b0ed-2ac5cc393b0c';
    console.log('Searching for profiles with business_id:', bid);
    const { data: profiles, error } = await supabase.from('profiles').select('*').eq('business_id', bid);
    
    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('Profiles found:', profiles?.length || 0);
    profiles?.forEach(p => {
        console.log(`- ID: ${p.id}, Email: ${p.email}, Role: ${p.role}`);
    });
}

run();
