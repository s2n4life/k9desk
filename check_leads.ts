import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log('Searching for lead owner David Schardt...');
    const { data: leads, error } = await supabase
        .from('leads')
        .select('id, business_id, status, owner_name, owner_email')
        .ilike('owner_name', '%David Schardt%');

    if (error) {
        console.error('Error:', error);
        return;
    }

    if (!leads || leads.length === 0) {
        console.log('No leads found for David Schardt');
        return;
    }

    console.log('Found leads:', leads.length);
    leads.forEach(l => {
        console.log(`Lead ID: ${l.id}, Business ID: ${l.business_id}, Status: ${l.status}, Name: ${l.owner_name}`);
    });

    const busId = leads[0].business_id;
    console.log('\nChecking all leads for Business ID:', busId);
    const { data: allLeads } = await supabase
        .from('leads')
        .select('status')
        .eq('business_id', busId);
    
    const stats: Record<string, number> = {};
    allLeads?.forEach(l => {
        const s = l.status || 'NULL';
        stats[s] = (stats[s] || 0) + 1;
    });
    console.log('Status Stats:', stats);
}

run();
