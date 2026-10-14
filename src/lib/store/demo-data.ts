import {
  AdminAuditLog,
  AppNotification,
  CallSession,
  ChatMessage,
  Conversation,
  ConversationRequest,
  InterestCatalogItem,
  LanguageCatalogItem,
  MessageOrProfileReport,
  PlatformSettingsState,
  PrivateAccountRecord,
  SavedVocabularyItem,
  UserBlock,
  UserConsentRecord,
  UserProfile,
} from '@/types/database';

export interface PlatformDataStore {
  languages: LanguageCatalogItem[];
  interests: InterestCatalogItem[];
  profiles: UserProfile[];
  privateAccounts: PrivateAccountRecord[];
  consents: UserConsentRecord[];
  conversationRequests: ConversationRequest[];
  conversations: Conversation[];
  messages: ChatMessage[];
  reports: MessageOrProfileReport[];
  blocks: UserBlock[];
  callSessions: CallSession[];
  notifications: AppNotification[];
  vocabulary: SavedVocabularyItem[];
  auditLogs: AdminAuditLog[];
  settings: PlatformSettingsState;
}

export const INITIAL_LANGUAGES: LanguageCatalogItem[] = [
  { code: 'es', name_es: 'Español', name_en: 'Spanish', native_name: 'Español', flag_emoji: '🇪🇸', is_active: true },
  { code: 'en', name_es: 'Inglés', name_en: 'English', native_name: 'English', flag_emoji: '🇬🇧', is_active: true },
  { code: 'fr', name_es: 'Francés', name_en: 'French', native_name: 'Français', flag_emoji: '🇫🇷', is_active: true },
  { code: 'de', name_es: 'Alemán', name_en: 'German', native_name: 'Deutsch', flag_emoji: '🇩🇪', is_active: true },
  { code: 'pt', name_es: 'Portugués', name_en: 'Portuguese', native_name: 'Português', flag_emoji: '🇧🇷', is_active: true },
  { code: 'it', name_es: 'Italiano', name_en: 'Italian', native_name: 'Italiano', flag_emoji: '🇮🇹', is_active: true },
  { code: 'ja', name_es: 'Japonés', name_en: 'Japanese', native_name: '日本語', flag_emoji: '🇯🇵', is_active: true },
  { code: 'ko', name_es: 'Coreano', name_en: 'Korean', native_name: '한국어', flag_emoji: '🇰🇷', is_active: true },
  { code: 'zh', name_es: 'Chino Mandarín', name_en: 'Mandarin Chinese', native_name: '中文', flag_emoji: '🇨🇳', is_active: true },
  { code: 'ar', name_es: 'Árabe', name_en: 'Arabic', native_name: 'العربية', flag_emoji: '🇸🇦', is_active: true },
];

export const INITIAL_INTERESTS: InterestCatalogItem[] = [
  { id: 'int-1', slug: 'technology', name_es: 'Tecnología y Software', name_en: 'Technology & Software', category: 'career', icon_name: 'Cpu', is_active: true },
  { id: 'int-2', slug: 'travel-culture', name_es: 'Viajes y Cultura', name_en: 'Travel & Culture', category: 'lifestyle', icon_name: 'Globe', is_active: true },
  { id: 'int-3', slug: 'cinema-series', name_es: 'Cine y Series', name_en: 'Cinema & Series', category: 'arts', icon_name: 'Film', is_active: true },
  { id: 'int-4', slug: 'gastronomy', name_es: 'Gastronomía y Cocina', name_en: 'Gastronomy & Cooking', category: 'lifestyle', icon_name: 'Utensils', is_active: true },
  { id: 'int-5', slug: 'literature', name_es: 'Literatura y Escritura', name_en: 'Literature & Writing', category: 'arts', icon_name: 'BookOpen', is_active: true },
  { id: 'int-6', slug: 'science', name_es: 'Ciencia y Naturaleza', name_en: 'Science & Nature', category: 'academic', icon_name: 'FlaskConical', is_active: true },
  { id: 'int-7', slug: 'business', name_es: 'Negocios y Emprendimiento', name_en: 'Business & Entrepreneurship', category: 'career', icon_name: 'Briefcase', is_active: true },
  { id: 'int-8', slug: 'music', name_es: 'Música e Instrumentos', name_en: 'Music & Instruments', category: 'arts', icon_name: 'Music', is_active: true },
];

export const COUNTRY_OPTIONS = [
  { code: 'PE', name: 'Perú', defaultTimezone: 'America/Lima' },
  { code: 'MX', name: 'México', defaultTimezone: 'America/Mexico_City' },
  { code: 'CO', name: 'Colombia', defaultTimezone: 'America/Bogota' },
  { code: 'AR', name: 'Argentina', defaultTimezone: 'America/Argentina/Buenos_Aires' },
  { code: 'CL', name: 'Chile', defaultTimezone: 'America/Santiago' },
  { code: 'EC', name: 'Ecuador', defaultTimezone: 'America/Guayaquil' },
  { code: 'ES', name: 'España', defaultTimezone: 'Europe/Madrid' },
  { code: 'US', name: 'Estados Unidos', defaultTimezone: 'America/New_York' },
  { code: 'BR', name: 'Brasil', defaultTimezone: 'America/Sao_Paulo' },
  { code: 'GB', name: 'Reino Unido', defaultTimezone: 'Europe/London' },
  { code: 'FR', name: 'Francia', defaultTimezone: 'Europe/Paris' },
  { code: 'DE', name: 'Alemania', defaultTimezone: 'Europe/Berlin' },
  { code: 'IT', name: 'Italia', defaultTimezone: 'Europe/Rome' },
  { code: 'JP', name: 'Japón', defaultTimezone: 'Asia/Tokyo' },
  { code: 'KR', name: 'Corea del Sur', defaultTimezone: 'Asia/Seoul' },
  { code: 'CA', name: 'Canadá', defaultTimezone: 'America/Toronto' },
];

export const DEFAULT_SECURITY_QUESTIONS: string[] = [
  '¿Cuál fue el nombre de tu primera mascota?',
  '¿En qué ciudad nació tu madre o padre?',
  '¿Cuál es tu comida, plato o postre favorito?',
  '¿Cuál fue el nombre de tu primer colegio o escuela?',
  '¿Cuál es el nombre de tu mejor amigo/a de la infancia?',
  '¿Cuál es tu canción, película o libro favorito?',
  'Otra (escribir mi propia pregunta)...',
];

export function buildDemoSeedStore(includeDemoUsers: boolean = true): PlatformDataStore {
  const defaultSettings: PlatformSettingsState = {
    ads_enabled: true,
    ads_require_consent: true,
    ads_disable_on_flagged_pages: true,
    max_daily_requests: 20,
    max_messages_per_minute: 45,
    max_calls_per_hour: 12,
    max_voice_note_mb: 5,
    daily_translation_quota: 30,
  };

  if (!includeDemoUsers) {
    return {
      languages: INITIAL_LANGUAGES,
      interests: INITIAL_INTERESTS,
      profiles: [],
      privateAccounts: [],
      consents: [],
      conversationRequests: [],
      conversations: [],
      messages: [],
      reports: [],
      blocks: [],
      callSessions: [],
      notifications: [],
      vocabulary: [],
      auditLogs: [],
      settings: defaultSettings,
    };
  }

  const demoProfiles: UserProfile[] = [
    {
      id: 'demo-user-elena',
      username: 'elena_madrid_demo',
      display_name: 'Elena Vargas (Demo)',
      avatar_url: null,
      bio: 'Arquitecta en Madrid. Busco practicar inglés e italiano mediante conversaciones sobre cultura, viajes y diseño urbano.',
      country_code: 'ES',
      timezone: 'Europe/Madrid',
      learning_goals: 'Alcanzar fluidez C1 en inglés técnico y mejorar conversación cotidiana en italiano.',
      availability_slots: [
        { day: 'tue', window: 'evening' },
        { day: 'thu', window: 'evening' },
        { day: 'sat', window: 'morning' },
      ],
      privacy_settings: {
        show_country: true,
        show_timezone: true,
        allow_calls_from_partners: true,
        allow_search_indexing: true,
        show_online_status: true,
      },
      role: 'admin',
      is_adult_verified: true,
      onboarding_completed: true,
      is_suspended: false,
      last_active_at: '2026-10-11T17:45:00Z',
      created_at: '2026-08-10T10:00:00Z',
      updated_at: '2026-10-10T18:00:00Z',
      is_demo_account: true,
      languages: [
        { id: 'ul-1', user_id: 'demo-user-elena', language_code: 'es', relation_type: 'native', proficiency_level: 'native', target_goal: 'Nativa dispuesta a corregir gramática' },
        { id: 'ul-2', user_id: 'demo-user-elena', language_code: 'en', relation_type: 'learning', proficiency_level: 'B2', target_goal: 'Debates profesionales y pronunciación' },
        { id: 'ul-3', user_id: 'demo-user-elena', language_code: 'it', relation_type: 'learning', proficiency_level: 'A2', target_goal: 'Conversación de viaje' },
      ],
      interest_slugs: ['travel-culture', 'literature', 'cinema-series', 'technology'],
    },
    {
      id: 'demo-user-liam',
      username: 'liam_london_demo',
      display_name: 'Liam O’Connor (Demo)',
      avatar_url: null,
      bio: 'Ingeniero de software en Londres. Aprendiendo español para comunicarme con equipos en Latinoamérica y España.',
      country_code: 'GB',
      timezone: 'Europe/London',
      learning_goals: 'Practicar tiempos pasados en español y expresiones naturales de conversación.',
      availability_slots: [
        { day: 'mon', window: 'evening' },
        { day: 'tue', window: 'evening' },
        { day: 'sat', window: 'morning' },
      ],
      privacy_settings: {
        show_country: true,
        show_timezone: true,
        allow_calls_from_partners: true,
        allow_search_indexing: true,
        show_online_status: true,
      },
      role: 'user',
      is_adult_verified: true,
      onboarding_completed: true,
      is_suspended: false,
      last_active_at: '2026-10-11T17:40:00Z',
      created_at: '2026-08-14T14:20:00Z',
      updated_at: '2026-10-11T09:00:00Z',
      is_demo_account: true,
      languages: [
        { id: 'ul-4', user_id: 'demo-user-liam', language_code: 'en', relation_type: 'native', proficiency_level: 'native', target_goal: 'Happy to help with British & international English' },
        { id: 'ul-5', user_id: 'demo-user-liam', language_code: 'es', relation_type: 'learning', proficiency_level: 'B1', target_goal: 'Conversación fluida 30 min por semana' },
      ],
      interest_slugs: ['technology', 'travel-culture', 'music', 'science'],
    },
    {
      id: 'demo-user-claire',
      username: 'claire_lyon_demo',
      display_name: 'Claire Moreau (Demo)',
      avatar_url: null,
      bio: 'Investigadora gastronómica en Lyon. Hablo francés nativo e inglés avanzado; quiero perfeccionar mi español y japonés.',
      country_code: 'FR',
      timezone: 'Europe/Paris',
      learning_goals: 'Intercambio estructurado 15 minutos en cada idioma con correcciones constructivas.',
      availability_slots: [
        { day: 'wed', window: 'afternoon' },
        { day: 'fri', window: 'evening' },
        { day: 'sun', window: 'morning' },
      ],
      privacy_settings: {
        show_country: true,
        show_timezone: true,
        allow_calls_from_partners: true,
        allow_search_indexing: true,
        show_online_status: true,
      },
      role: 'user',
      is_adult_verified: true,
      onboarding_completed: true,
      is_suspended: false,
      last_active_at: '2026-10-11T17:20:00Z',
      created_at: '2026-09-01T11:30:00Z',
      updated_at: '2026-10-11T10:15:00Z',
      is_demo_account: true,
      languages: [
        { id: 'ul-6', user_id: 'demo-user-claire', language_code: 'fr', relation_type: 'native', proficiency_level: 'native', target_goal: 'Expresión oral y cultura francesa' },
        { id: 'ul-7', user_id: 'demo-user-claire', language_code: 'es', relation_type: 'learning', proficiency_level: 'B2', target_goal: 'Debates culturales y modismos' },
        { id: 'ul-8', user_id: 'demo-user-claire', language_code: 'ja', relation_type: 'learning', proficiency_level: 'A2', target_goal: 'Lectura y conversación básica' },
      ],
      interest_slugs: ['gastronomy', 'travel-culture', 'literature'],
    },
    {
      id: 'demo-user-kenji',
      username: 'kenji_tokyo_demo',
      display_name: 'Kenji Takahashi (Demo)',
      avatar_url: null,
      bio: 'Diseñador de producto en Tokio. Me apasiona el cine independiente, la música jazz y practicar inglés y español.',
      country_code: 'JP',
      timezone: 'Asia/Tokyo',
      learning_goals: 'Mejorar comprensión auditiva en llamadas de voz y vocabulario cotidiano.',
      availability_slots: [
        { day: 'sat', window: 'morning' },
        { day: 'sun', window: 'evening' },
      ],
      privacy_settings: {
        show_country: true,
        show_timezone: true,
        allow_calls_from_partners: true,
        allow_search_indexing: true,
        show_online_status: true,
      },
      role: 'user',
      is_adult_verified: true,
      onboarding_completed: true,
      is_suspended: false,
      last_active_at: '2026-10-11T16:50:00Z',
      created_at: '2026-09-12T08:00:00Z',
      updated_at: '2026-10-10T22:00:00Z',
      is_demo_account: true,
      languages: [
        { id: 'ul-9', user_id: 'demo-user-kenji', language_code: 'ja', relation_type: 'native', proficiency_level: 'native', target_goal: 'Japonés natural y de negocios' },
        { id: 'ul-10', user_id: 'demo-user-kenji', language_code: 'en', relation_type: 'learning', proficiency_level: 'B2', target_goal: 'Presentaciones de diseño' },
        { id: 'ul-11', user_id: 'demo-user-kenji', language_code: 'es', relation_type: 'learning', proficiency_level: 'A2', target_goal: 'Conversación inicial' },
      ],
      interest_slugs: ['cinema-series', 'music', 'technology'],
    },
  ];

  const privateAccounts: PrivateAccountRecord[] = [
    {
      user_id: 'demo-user-elena',
      username: 'elena_madrid_demo',
      email: 'elena.demo@linguevia.test',
      email_verified: true,
      birth_date: '1993-04-18',
      auth_provider: 'credentials',
      password_hash: 'DemoPass123!',
      security_question: '¿Cuál fue el nombre de tu primera mascota?',
      security_answer_hash: 'toby',
    },
    {
      user_id: 'demo-user-liam',
      username: 'liam_london_demo',
      email: 'liam.demo@linguevia.test',
      email_verified: true,
      birth_date: '1991-11-05',
      auth_provider: 'credentials',
      password_hash: 'DemoPass123!',
      security_question: '¿Cuál fue el nombre de tu primera mascota?',
      security_answer_hash: 'biscuit',
    },
    {
      user_id: 'demo-user-claire',
      username: 'claire_paris_demo',
      email: 'claire.demo@linguevia.test',
      email_verified: true,
      birth_date: '1995-07-22',
      auth_provider: 'credentials',
      password_hash: 'DemoPass123!',
      security_question: '¿Cuál es tu comida, plato o postre favorito?',
      security_answer_hash: 'croissant',
    },
    {
      user_id: 'demo-user-kenji',
      username: 'kenji_tokyo_demo',
      email: 'kenji.demo@linguevia.test',
      email_verified: true,
      birth_date: '1994-02-14',
      auth_provider: 'credentials',
      password_hash: 'DemoPass123!',
      security_question: '¿Cuál es tu comida, plato o postre favorito?',
      security_answer_hash: 'ramen',
    },
  ];

  const consents: UserConsentRecord[] = demoProfiles.map((p, idx) => ({
    id: `consent-demo-${idx + 1}`,
    user_id: p.id,
    is_adult_confirmed: true,
    age_verified_at: p.created_at,
    terms_version: '1.0',
    privacy_version: '1.0',
    ads_personalized_consent: false,
    ads_non_personalized_consent: true,
    analytics_consent: true,
    consent_region: 'EU',
    updated_at: p.updated_at,
  }));

  const conversations: Conversation[] = [
    {
      id: 'conv-demo-elena-liam',
      origin_request_id: 'req-demo-1',
      mode: 'guided',
      active_topic_prompt: '¿Cuáles son las mayores ventajas y desafíos de trabajar con equipos multiculturales en distintas zonas horarias?',
      last_message_at: '2026-10-11T17:35:00Z',
      is_active: true,
      created_at: '2026-10-01T17:00:00Z',
      participant_ids: ['demo-user-elena', 'demo-user-liam'],
    },
  ];

  const conversationRequests: ConversationRequest[] = [
    {
      id: 'req-demo-1',
      sender_id: 'demo-user-liam',
      receiver_id: 'demo-user-elena',
      status: 'accepted',
      intro_message: '¡Hola Elena! Vi que buscas practicar inglés B2 y yo estoy aprendiendo español B1. ¿Hacemos tándem esta semana?',
      target_language_code: 'es',
      created_at: '2026-10-01T16:45:00Z',
      responded_at: '2026-10-01T17:00:00Z',
    },
    {
      id: 'req-demo-2',
      sender_id: 'demo-user-claire',
      receiver_id: 'demo-user-elena',
      status: 'pending',
      intro_message: 'Bonjour Elena ! Me encantaría practicar español contigo hablando de arquitectura y gastronomía.',
      target_language_code: 'es',
      created_at: '2026-10-11T14:00:00Z',
      responded_at: null,
    },
  ];

  const messages: ChatMessage[] = [
    {
      id: 'msg-demo-1',
      conversation_id: 'conv-demo-elena-liam',
      sender_id: 'demo-user-liam',
      content_type: 'text',
      body: 'Hola Elena! Ayer yo fue a una exposición de arquitectura moderna en Londres.',
      delivery_status: 'read',
      read_at: '2026-10-11T17:20:00Z',
      is_flagged: false,
      created_at: '2026-10-11T17:15:00Z',
    },
    {
      id: 'msg-demo-2',
      conversation_id: 'conv-demo-elena-liam',
      sender_id: 'demo-user-elena',
      content_type: 'correction',
      body: '¡Qué genial, Liam! Te dejo una pequeña corrección del pretérito indefinido en primera persona:',
      correction_data: {
        original_text: 'Ayer yo fue a una exposición de arquitectura moderna',
        corrected_text: 'Ayer fui a una exposición de arquitectura moderna',
        explanation: 'Con "yo", el verbo ir en pretérito indefinido es "fui" ("fue" se usa para él/ella/usted). Además, en español suele omitirse el pronombre "yo".',
        language_code: 'es',
      },
      delivery_status: 'read',
      read_at: '2026-10-11T17:28:00Z',
      is_flagged: false,
      created_at: '2026-10-11T17:25:00Z',
    },
    {
      id: 'msg-demo-3',
      conversation_id: 'conv-demo-elena-liam',
      sender_id: 'demo-user-liam',
      content_type: 'text',
      body: '¡Muchas gracias! "Ayer fui a una exposición". Look forward to our 15-minute audio call later today!',
      delivery_status: 'read',
      read_at: '2026-10-11T17:36:00Z',
      is_flagged: false,
      created_at: '2026-10-11T17:35:00Z',
    },
  ];

  const vocabulary: SavedVocabularyItem[] = [
    {
      id: 'voc-demo-1',
      user_id: 'demo-user-elena',
      source_message_id: 'msg-demo-3',
      language_code: 'en',
      term: 'Look forward to (+ -ing / noun)',
      translation: 'Tener muchas ganas de / esperar con ilusión',
      context_example: 'Look forward to our 15-minute audio call later today!',
      mastery_level: 4,
      created_at: '2026-10-11T17:36:00Z',
    },
  ];

  const callSessions: CallSession[] = [
    {
      id: 'call-demo-1',
      conversation_id: 'conv-demo-elena-liam',
      caller_id: 'demo-user-elena',
      callee_id: 'demo-user-liam',
      room_name: 'lc-room-conv-demo-elena-liam-1',
      call_type: 'audio',
      status: 'ended',
      recording_enabled: false,
      started_at: '2026-10-08T18:00:00Z',
      answered_at: '2026-10-08T18:00:09Z',
      ended_at: '2026-10-08T18:18:39Z',
      duration_seconds: 1110,
      end_reason: 'completed_normally',
      reconnect_count: 0,
    },
  ];

  const reports: MessageOrProfileReport[] = [
    {
      id: 'rep-demo-1',
      reporter_id: 'demo-user-liam',
      reported_user_id: 'demo-user-kenji',
      conversation_id: null,
      message_id: null,
      reason_category: 'spam',
      description: 'Reporte de prueba en entorno demo para verificar la cola de revisión de moderación y bloqueo de anuncios.',
      status: 'pending',
      admin_notes: null,
      resolved_by: null,
      created_at: '2026-10-11T13:00:00Z',
      resolved_at: null,
    },
  ];

  const notifications: AppNotification[] = [
    {
      id: 'notif-demo-1',
      user_id: 'demo-user-elena',
      type: 'conversation_request',
      title: 'Nueva solicitud de intercambio',
      body: 'Claire Moreau (Demo) quiere practicar español contigo.',
      action_url: '/messages',
      is_read: false,
      created_at: '2026-10-11T14:00:00Z',
    },
  ];

  const auditLogs: AdminAuditLog[] = [
    {
      id: 'audit-demo-1',
      admin_id: 'demo-user-elena',
      action_type: 'SYSTEM_SEED_INIT',
      target_entity: 'platform_settings',
      target_id: 'ads_config',
      details: { note: 'Entorno de demostración inicializado con políticas de privacidad activas.' },
      created_at: '2026-10-01T10:00:00Z',
    },
  ];

  return {
    languages: INITIAL_LANGUAGES,
    interests: INITIAL_INTERESTS,
    profiles: demoProfiles,
    privateAccounts,
    consents,
    conversationRequests,
    conversations,
    messages,
    reports,
    blocks: [],
    callSessions,
    notifications,
    vocabulary,
    auditLogs,
    settings: defaultSettings,
  };
}
