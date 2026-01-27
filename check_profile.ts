import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkDavidsProfile() {
    const davidsUserId = '2e64c118-acfd-4f65-8255-101635869a7f';
    const davidsBusinessId = '1ba93133-86fa-4c06-b0ed-2ac5cc393b0c';

    const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', davidsUserId)
        .single();

    if (error) {
        console.error('Error fetching David\'s profile:', error);
    } else {
        console.log('David\'s Profile:', profile);
    }

    // Also check if there's any other profile with that business ID
    const { data: allProfilesInBiz } = await supabase
        .from('profiles')
        .select('*')
        .eq('business_id', davidsBusinessId);

    console.log(`Profiles with business_id ${davidsBusinessId}:`, allProfilesInBiz);
}

checkDavidsProfile();
