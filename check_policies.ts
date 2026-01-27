import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log('Fetching policies for table: leads');
    const { data, error } = await supabase.rpc('get_policies', { table_name: 'leads' });
    
    if (error) {
        // Fallback: query pg_policies
        console.log('RPC failed, querying pg_policies...');
        const { data: policies, error: pError } = await supabase.rpc('check_sql', { 
            sql_query: "SELECT * FROM pg_policies WHERE tablename = 'leads'" 
        });
        console.log('Policies:', JSON.stringify(policies, null, 2));
    } else {
        console.log('Policies:', JSON.stringify(data, null, 2));
    }
}

run();
