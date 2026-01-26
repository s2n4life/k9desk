import { supabase } from '@/lib/supabaseClient';

export async function checkGlobalConfig(key: string): Promise<boolean> {
    const { data } = await supabase
        .from('system_configs')
        .select('value')
        .eq('key', key)
        .single();

    return data?.value === true;
}

export async function useGlobalConfigs() {
    const { data } = await supabase
        .from('system_configs')
        .select('*');

    return data;
}
