import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    // 1. Find profile for David's email (I'll guess it or search for 'David')
    console.log('Searching for David...');
    const { data: profiles, error: pError } = await supabase
        .from('profiles')
        .select('*')
        .ilike('email', '%david%');

    if (pError) {
        console.error('Error fetching profiles:', pError);
        return;
    }

    console.log('Found Profiles:', JSON.stringify(profiles, null, 2));

    if (profiles && profiles.length > 0) {
        const busIds = profiles.map(p => p.business_id).filter(id => !!id);
        if (busIds.length > 0) {
            const { data: businesses, error: bError } = await supabase
                .from('businesses')
                .select('*')
                .in('id', busIds);
            
            console.log('Associated Businesses:', JSON.stringify(businesses, null, 2));

            const { data: leads, error: lError } = await supabase
                .from('leads')
                .select('*')
                .in('business_id', busIds)
                .order('created_at', { ascending: false })
                .limit(5);

            console.log('Recent Leads for David:', JSON.stringify(leads, null, 2));
        }
    }
}

run();
