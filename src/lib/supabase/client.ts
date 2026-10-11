import { createBrowserClient } from '@supabase/ssr';
import { getPublicEnv } from '@/lib/env';

export function createSupabaseBrowserClient() {
  const env = getPublicEnv();
  if (!env.isSupabaseConfigured) {
    return null;
  }
  return createBrowserClient(env.supabaseUrl, env.supabaseAnonKey);
}
