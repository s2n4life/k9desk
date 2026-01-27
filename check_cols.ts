import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data, error } = await supabase.rpc('check_sql', { 
        sql_query: "SELECT column_name FROM information_schema.columns WHERE table_name = 'leads'" 
    });
    console.log('Columns in leads:', JSON.stringify(data, null, 2));
}

run();
