/**
 * Quick script to check if your current logged-in user has super_admin access
 * Run this with: npx tsx scripts/check-admin-status.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAdminStatus() {
    console.log('\n🔍 Checking Admin Status...\n');

    // Get all profiles with their roles
    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, created_at')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('❌ Error fetching profiles:', error.message);
        return;
    }

    if (!profiles || profiles.length === 0) {
        console.log('⚠️  No profiles found in the database.');
        return;
    }

    console.log('📋 All User Profiles:\n');
    profiles.forEach((profile, index) => {
        const roleEmoji = profile.role === 'super_admin' ? '👑' : '👤';
        console.log(`${index + 1}. ${roleEmoji} ${profile.email || 'No email'}`);
        console.log(`   Role: ${profile.role || 'owner'}`);
        console.log(`   Name: ${profile.full_name || 'Not set'}`);
        console.log(`   ID: ${profile.id}`);
        console.log('');
    });

    const superAdmins = profiles.filter(p => p.role === 'super_admin');

    if (superAdmins.length === 0) {
        console.log('⚠️  NO SUPER ADMINS FOUND!');
        console.log('\n📝 To promote yourself to super_admin:');
        console.log('   1. Go to your Supabase Dashboard');
        console.log('   2. Open the SQL Editor');
        console.log('   3. Run this command with YOUR email:\n');
        console.log(`      UPDATE public.profiles`);
        console.log(`      SET role = 'super_admin'`);
        console.log(`      WHERE email = 'your-email@example.com';\n`);
    } else {
        console.log(`✅ Found ${superAdmins.length} Super Admin(s):`);
        superAdmins.forEach(admin => {
            console.log(`   👑 ${admin.email}`);
        });
    }
}

checkAdminStatus().catch(console.error);
