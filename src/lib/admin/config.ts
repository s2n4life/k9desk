import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export type SystemConfigKey = 'maintenance_mode' | 'signups_enabled' | 'payments_enabled' | 'ai_enabled';

export async function getSystemConfig(key: SystemConfigKey): Promise<any> {
    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        )
                    } catch {
                        // The `setAll` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing
                        // user sessions.
                    }
                },
            },
        }
    );

    const { data, error } = await supabase
        .from('system_configs')
        .select('value')
        .eq('key', key)
        .single();

    if (error || !data) {
        // Return defaults if DB fetch fails
        const defaults: Record<SystemConfigKey, any> = {
            maintenance_mode: false,
            signups_enabled: true,
            payments_enabled: true,
            ai_enabled: true
        };
        return defaults[key];
    }

    return data.value;
}

export async function getAllSystemConfigs(): Promise<Record<string, any>> {
    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll() { }, // Read-only helper
            },
        }
    );

    const { data } = await supabase.from('system_configs').select('key, value');
    const configs: Record<string, any> = {};
    data?.forEach(row => {
        configs[row.key] = row.value;
    });
    return configs;
}
