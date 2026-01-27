import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixDavidsProfile() {
    const davidsUserId = '2e64c118-acfd-4f65-8255-101635869a7f';
    const davidsBusinessId = '1ba93133-86fa-4c06-b0ed-2ac5cc393b0c';

    console.log(`Updating profile ${davidsUserId} with business_id ${davidsBusinessId}...`);

    const { data, error } = await supabase
        .from('profiles')
        .update({ business_id: davidsBusinessId })
        .eq('id', davidsUserId)
        .select()
        .single();

    if (error) {
        console.error('Error updating profile:', error);
    } else {
        console.log('Profile updated successfully:', data);
    }
}

fixDavidsProfile();
