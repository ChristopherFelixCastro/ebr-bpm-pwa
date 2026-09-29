import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '../../config/env.js';

let client: SupabaseClient | undefined;

export function getSupabaseStorageClient() {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('SUPABASE_STORAGE_NOT_CONFIGURED');
  client ??= createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return client;
}
