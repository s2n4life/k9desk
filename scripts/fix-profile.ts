
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, serviceKey);

async function fixProfile() {
    const userId = '2e64c118-acfd-4f65-8255-101635869a7f';

    console.log(`Creating profile for ${userId}...`);

    // First check if it exists to avoid error
    const { data: existing } = await supabase.from('profiles').select('id').eq('id', userId).single();
    if (existing) {
        console.log('Profile already exists. Skipping creation.');
        return;
    }

    const { data, error } = await supabase
        .from('profiles')
        .insert([
            {
                id: userId,
                role: 'owner'
            }
        ])
        .select();

    if (error) {
        console.error('Error creating profile:', error);
    } else {
        console.log('Success! Profile created.');
    }
}

fixProfile();
