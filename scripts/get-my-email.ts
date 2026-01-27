/**
 * Get the current logged-in user's email from Supabase Auth
 * Run this with: npx tsx scripts/get-my-email.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // We need service role to see all users

if (!supabaseServiceKey) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found in .env.local');
    console.log('\n📝 You need to add your Supabase Service Role Key to .env.local:');
    console.log('   1. Go to your Supabase Dashboard');
    console.log('   2. Settings → API');
    console.log('   3. Copy the "service_role" key (NOT the anon key)');
    console.log('   4. Add to .env.local: SUPABASE_SERVICE_ROLE_KEY=your-key-here\n');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function getAllAuthUsers() {
    console.log('\n🔍 Fetching all authenticated users from Supabase Auth...\n');

    const { data, error } = await supabase.auth.admin.listUsers();

    if (error) {
        console.error('❌ Error:', error.message);
        return;
    }

    if (!data.users || data.users.length === 0) {
        console.log('⚠️  No users found.');
        return;
    }

    console.log(`📧 Found ${data.users.length} user(s):\n`);

    data.users.forEach((user, index) => {
        console.log(`${index + 1}. Email: ${user.email}`);
        console.log(`   User ID: ${user.id}`);
        console.log(`   Created: ${new Date(user.created_at).toLocaleDateString()}`);
        console.log(`   Last Sign In: ${user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : 'Never'}`);
        console.log('');
    });

    console.log('\n📝 To promote one of these users to super_admin:');
    console.log('   Run this SQL in Supabase Dashboard → SQL Editor:\n');
    console.log(`   UPDATE public.profiles`);
    console.log(`   SET role = 'super_admin', email = 'YOUR_EMAIL_HERE'`);
    console.log(`   WHERE id = 'USER_ID_FROM_ABOVE';\n`);
}

getAllAuthUsers().catch(console.error);
