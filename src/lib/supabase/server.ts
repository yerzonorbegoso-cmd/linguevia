import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { getPublicEnv, getServerSecrets } from '@/lib/env';

export async function createSupabaseServerClient() {
  const env = getPublicEnv();
  if (!env.isSupabaseConfigured) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Ignored when called from a Server Component
        }
      },
    },
  });
}

/**
 * Strictly server-only Admin client using SUPABASE_SERVICE_ROLE_KEY.
 * Used exclusively for audited administrative actions or full account deletion.
 */
export function createSupabaseServiceAdminClient() {
  const env = getPublicEnv();
  const secrets = getServerSecrets();
  if (!env.isSupabaseConfigured || !secrets.supabaseServiceRoleKey) {
    return null;
  }

  return createClient(env.supabaseUrl, secrets.supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
