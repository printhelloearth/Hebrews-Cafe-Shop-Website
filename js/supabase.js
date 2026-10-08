import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './config.js';

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
export const supabase = isSupabaseConfigured
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;
