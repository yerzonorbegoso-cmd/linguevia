import { createBrowserClient } from '@supabase/ssr';
import { getPublicEnv } from '@/lib/env';

export function createSupabaseBrowserClient() {
  const env = getPublicEnv();
  if (!env.isSupabaseConfigured) {
    return null;
  }
  return createBrowserClient(env.supabaseUrl, env.supabaseAnonKey);
}

export async function isSupabaseGoogleOAuthEnabled(): Promise<boolean> {
  const env = getPublicEnv();
  if (!env.isSupabaseConfigured) return false;
  try {
    const res = await fetch(`${env.supabaseUrl}/auth/v1/settings`, {
      headers: { apikey: env.supabaseAnonKey },
      cache: 'no-store',
    });
    if (!res.ok) return false;
    const data = await res.json();
    return Boolean(data?.external?.google);
  } catch {
    return false;
  }
}
