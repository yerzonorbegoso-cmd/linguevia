/**
 * Environment configuration and capability discovery.
 * Never exposes server-only secrets to client components.
 */

export interface PublicEnvConfig {
  appName: string;
  appUrl: string;
  demoMode: boolean;
  supabaseUrl: string;
  supabaseAnonKey: string;
  isSupabaseConfigured: boolean;
  livekitUrl: string;
  adsenseClientId: string;
  adsenseSlotDashboard: string;
  adsenseSlotExplore: string;
  isAdSenseConfigured: boolean;
}

export function getPublicEnv(): PublicEnvConfig {
  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim();
  const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').trim();
  const livekitUrl = (process.env.NEXT_PUBLIC_LIVEKIT_URL ?? '').trim();
  const adsenseClientId = (process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID ?? '').trim();

  // Validate publisher ID format strictly: never render fake ads if not a valid ca-pub-XXXX
  const isValidAdSenseId = /^ca-pub-\d{10,20}$/.test(adsenseClientId);

  return {
    appName: process.env.NEXT_PUBLIC_APP_NAME?.trim() || 'Linguevia',
    appUrl: process.env.NEXT_PUBLIC_APP_URL?.trim() || 'https://linguevia.com',
    demoMode: process.env.NEXT_PUBLIC_DEMO_MODE !== 'false',
    supabaseUrl,
    supabaseAnonKey,
    isSupabaseConfigured: Boolean(supabaseUrl && supabaseAnonKey),
    livekitUrl,
    adsenseClientId: isValidAdSenseId ? adsenseClientId : '',
    adsenseSlotDashboard: (process.env.NEXT_PUBLIC_ADSENSE_SLOT_DASHBOARD ?? '').trim(),
    adsenseSlotExplore: (process.env.NEXT_PUBLIC_ADSENSE_SLOT_EXPLORE ?? '').trim(),
    isAdSenseConfigured: isValidAdSenseId,
  };
}

export interface ServerSecretsConfig {
  supabaseServiceRoleKey: string;
  livekitApiKey: string;
  livekitApiSecret: string;
  isLivekitServerConfigured: boolean;
  translationProvider: '' | 'deepl' | 'google' | 'libretranslate';
  translationApiKey: string;
  translationApiUrl: string;
  translationDailyLimit: number;
  isTranslationConfigured: boolean;
}

/**
 * Strictly server-side secret loader. Throws if imported in a browser context.
 */
export function getServerSecrets(): ServerSecretsConfig {
  const isBrowserRuntime =
    typeof window !== 'undefined' &&
    typeof process !== 'undefined' &&
    process.env.NODE_ENV !== 'test' &&
    !process.env.VITEST;

  if (isBrowserRuntime) {
    throw new Error('SECURITY VIOLATION: getServerSecrets() must never be called on the client.');
  }

  const livekitApiKey = (process.env.LIVEKIT_API_KEY ?? '').trim();
  const livekitApiSecret = (process.env.LIVEKIT_API_SECRET ?? '').trim();
  const livekitUrl = (process.env.NEXT_PUBLIC_LIVEKIT_URL ?? '').trim();

  const rawProvider = (process.env.TRANSLATION_PROVIDER ?? '').trim().toLowerCase();
  const translationProvider: '' | 'deepl' | 'google' | 'libretranslate' =
    rawProvider === 'deepl' || rawProvider === 'google' || rawProvider === 'libretranslate'
      ? rawProvider
      : '';
  const translationApiKey = (process.env.TRANSLATION_API_KEY ?? '').trim();
  const translationApiUrl = (process.env.TRANSLATION_API_URL ?? '').trim();

  const isTranslationConfigured =
    Boolean(translationProvider) &&
    (translationProvider === 'libretranslate' ? Boolean(translationApiUrl) : Boolean(translationApiKey));

  return {
    supabaseServiceRoleKey: (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim(),
    livekitApiKey,
    livekitApiSecret,
    isLivekitServerConfigured: Boolean(livekitUrl && livekitApiKey && livekitApiSecret),
    translationProvider,
    translationApiKey,
    translationApiUrl,
    translationDailyLimit: Number(process.env.TRANSLATION_DAILY_LIMIT_PER_USER || 30),
    isTranslationConfigured,
  };
}
