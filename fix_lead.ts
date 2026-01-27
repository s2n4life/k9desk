import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const leadId = '0f29dba0-d67a-4e56-97d1-e4b1df4ff2d1';
    console.log('Updating Lead Status to scheduled for ID:', leadId);
    const { data, error } = await supabase
        .from('leads')
        .update({ status: 'scheduled' })
        .eq('id', leadId)
        .select();

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('Update result:', JSON.stringify(data, null, 2));
}

run();
