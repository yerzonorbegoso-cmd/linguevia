'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  AvailabilitySlot,
  CallSession,
  CallStatus,
  CallType,
  CefrLevel,
  ChatMessage,
  Conversation,
  ConversationMode,
  ConversationRequest,
  GrammarCorrectionData,
  PlatformSettingsState,
  PrivateAccountRecord,
  PrivacySettings,
  ReportReasonCategory,
  ReportStatus,
  SavedVocabularyItem,
  UserLanguage,
  UserProfile,
  UserRole,
} from '@/types/database';
import { buildDemoSeedStore, PlatformDataStore } from '@/lib/store/demo-data';
import { isAdultBirthDate } from '@/lib/security/validators';
import {
  areUsersBlocked,
  isAuthorizedConversationParticipant,
} from '@/lib/security/rls-guard';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

const STORAGE_KEY = 'linguevia_shared_store_v1';
const SESSION_KEY = 'linguevia_session_user_v1';
const BROADCAST_CHANNEL_NAME = 'linguevia_realtime_bus';

export interface ToastNotice {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface RegisterInput {
  username: string; // Required unique identifier
  displayName: string;
  password: string;
  email?: string; // Optional
  securityQuestion: string; // Required for password recovery
  securityAnswer: string; // Required for password recovery
  birthDate: string;
  countryCode: string;
  timezone: string;
  confirmAdult: boolean;
  acceptTerms: boolean;
  provider?: 'credentials' | 'email';
  nativeLanguageCode?: string;
  learningLanguageCode?: string;
  learningLevel?: CefrLevel;
}

interface OnboardingUpdateInput {
  bio: string;
  learningGoals: string;
  countryCode: string;
  timezone: string;
  languages: Omit<UserLanguage, 'id' | 'user_id'>[];
  interestSlugs: string[];
  availabilitySlots: AvailabilitySlot[];
  privacySettings?: Partial<PrivacySettings>;
}

interface PlatformContextValue {
  isHydrated: boolean;
  store: PlatformDataStore;
  currentUser: UserProfile | null;
  currentPrivateEmail: string | null;
  currentEmailVerified: boolean;
  toasts: ToastNotice[];
  pushToast: (type: ToastNotice['type'], message: string) => void;
  dismissToast: (id: string) => void;

  // Auth & Account
  loginWithIdentifier: (identifier: string, password: string) => { ok: boolean; error?: string };
  loginWithEmail: (email: string, password: string) => { ok: boolean; error?: string };
  loginWithDemoAccount: (userId: string) => { ok: boolean; error?: string };
  registerAccount: (input: RegisterInput) => {
    ok: boolean;
    error?: string;
    requiresVerification?: boolean;
    onboardingCompleted?: boolean;
  };
  verifyCurrentEmail: (code: string) => { ok: boolean; error?: string };
  getSecurityQuestionForUser: (identifier: string) => {
    ok: boolean;
    question?: string;
    error?: string;
  };
  resetPasswordWithSecurityAnswer: (
    identifier: string,
    answer: string,
    newPassword: string
  ) => { ok: boolean; error?: string };
  requestPasswordRecovery: (email: string) => { ok: boolean; message: string };
  resetPasswordWithToken: (
    email: string,
    newPassword: string,
    birthDateVerification?: string
  ) => { ok: boolean; error?: string };
  logout: () => void;
  completeOnboardingAndSaveProfile: (input: OnboardingUpdateInput) => { ok: boolean; error?: string };
  updateConsentPreferences: (prefs: {
    ads_personalized_consent: boolean;
    ads_non_personalized_consent: boolean;
    analytics_consent: boolean;
  }) => void;
  deleteOwnAccount: (confirmPhrase: string) => Promise<{ ok: boolean; error?: string }>;

  // Matching, Requests & Blocks
  sendConversationRequest: (receiverId: string, introMessage: string, targetLanguageCode: string) => {
    ok: boolean;
    error?: string;
  };
  respondToConversationRequest: (
    requestId: string,
    decision: 'accepted' | 'rejected' | 'cancelled'
  ) => { ok: boolean; conversationId?: string; error?: string };
  blockUser: (targetUserId: string, reason?: string) => { ok: boolean; error?: string };
  unblockUser: (targetUserId: string) => void;

  // Chat, Voice & Learning
  sendMessage: (params: {
    conversationId: string;
    contentType: 'text' | 'voice' | 'correction' | 'system_prompt';
    body: string;
    voiceUrl?: string;
    voiceDurationSec?: number;
    voiceSizeBytes?: number;
    correctionData?: GrammarCorrectionData;
  }) => { ok: boolean; error?: string };
  markConversationRead: (conversationId: string) => void;
  setConversationLearningMode: (
    conversationId: string,
    mode: ConversationMode,
    activePrompt?: string | null
  ) => void;
  attachMessageTranslation: (
    messageId: string,
    translatedText: string,
    targetLang: string,
    provider: string
  ) => void;
  saveVocabularyItem: (item: {
    language_code: string;
    term: string;
    translation: string;
    context_example: string;
    source_message_id?: string | null;
  }) => { ok: boolean; error?: string };
  updateVocabularyMastery: (vocabId: string, level: 1 | 2 | 3 | 4 | 5) => void;
  removeVocabularyItem: (vocabId: string) => void;

  // WebRTC Audio/Video Calls
  startCallSession: (conversationId: string, callType: CallType) => {
    ok: boolean;
    session?: CallSession;
    error?: string;
  };
  updateCallSessionState: (
    sessionId: string,
    status: CallStatus,
    extra?: { durationSeconds?: number; endReason?: string; incrementReconnect?: boolean }
  ) => void;

  // Moderation & Admin
  submitModerationReport: (params: {
    reportedUserId: string;
    conversationId?: string | null;
    messageId?: string | null;
    reasonCategory: ReportReasonCategory;
    description: string;
    blockImmediately?: boolean;
  }) => Promise<{ ok: boolean; error?: string }>;
  adminReviewReport: (
    reportId: string,
    status: ReportStatus,
    adminNotes: string,
    suspendReportedUser?: boolean
  ) => Promise<{ ok: boolean; error?: string }>;
  adminToggleUserSuspension: (
    targetUserId: string,
    suspend: boolean,
    reason?: string
  ) => Promise<{ ok: boolean; error?: string }>;
  adminToggleLanguageCatalog: (code: string) => Promise<void>;
  adminAddLanguageCatalog: (lang: {
    code: string;
    name_es: string;
    name_en: string;
    native_name: string;
    flag_emoji: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  adminAddInterestCatalog: (interest: {
    slug: string;
    name_es: string;
    name_en: string;
    category: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  adminUpdatePlatformSettings: (partial: Partial<PlatformSettingsState>) => Promise<void>;
  adminResetUserPassword: (
    targetUserId: string,
    newPassword: string
  ) => Promise<{ ok: boolean; error?: string }>;
  adminGetUserAccountDetails: (
    targetUserId: string
  ) => { email: string; security_question: string } | null;
  adminPromoteCurrentUser: () => Promise<{ ok: boolean; error?: string }>;
  markAllNotificationsRead: () => void;
}

const PlatformContext = createContext<PlatformContextValue | null>(null);

export function PlatformProvider({ children }: { children: React.ReactNode }) {
  const [isHydrated, setIsHydrated] = useState(false);
  const [store, setStore] = useState<PlatformDataStore>(() => buildDemoSeedStore(true));
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastNotice[]>([]);

  const pushToast = useCallback((type: ToastNotice['type'], message: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev.slice(-3), { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Hydrate shared state & per-tab session
  useEffect(() => {
    let hydratedStore: PlatformDataStore | null = null;
    let tabUser: string | null = null;

    try {
      const rawStore = window.localStorage.getItem(STORAGE_KEY);
      if (rawStore) {
        hydratedStore = JSON.parse(rawStore) as PlatformDataStore;
      } else {
        const initial = buildDemoSeedStore(true);
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
        hydratedStore = initial;
      }

      // Enforce Yherzon21 as the SOLE administrator
      const baseSeed = buildDemoSeedStore(true);
      const yherzonProfile = baseSeed.profiles.find((p) => p.username.toLowerCase() === 'yherzon21')!;
      const yherzonPrivate = baseSeed.privateAccounts.find((a) => a.username?.toLowerCase() === 'yherzon21')!;

      const existingProfiles = hydratedStore.profiles || [];
      const sanitizedProfiles: UserProfile[] = existingProfiles.map((p) => {
        if (p.username.toLowerCase() === 'yherzon21') {
          return { ...p, role: 'admin' as UserRole };
        }
        if (p.role === 'admin' || p.role === 'moderator') {
          return { ...p, role: 'user' as UserRole };
        }
        return p;
      });

      if (!sanitizedProfiles.some((p) => p.username.toLowerCase() === 'yherzon21') && yherzonProfile) {
        sanitizedProfiles.unshift(yherzonProfile);
      }

      const existingPrivates = hydratedStore.privateAccounts || [];
      const sanitizedPrivates: PrivateAccountRecord[] = existingPrivates.filter(
        (a) => a.username?.toLowerCase() !== 'yherzon21' && a.user_id !== 'admin-yherzon21'
      );
      if (yherzonPrivate) {
        sanitizedPrivates.unshift(yherzonPrivate);
      }

      hydratedStore = {
        ...hydratedStore,
        profiles: sanitizedProfiles,
        privateAccounts: sanitizedPrivates,
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(hydratedStore));

      // Per-tab session (allows testing 2 different users in 2 tabs/browsers simultaneously!)
      tabUser =
        window.sessionStorage.getItem(SESSION_KEY) ||
        window.localStorage.getItem(SESSION_KEY);
    } catch {
      // Fallback to in-memory seed
    }

    queueMicrotask(() => {
      if (hydratedStore) setStore(hydratedStore);
      if (tabUser) setCurrentUserId(tabUser);
      setIsHydrated(true);
    });
  }, []);

  // Cross-tab / multi-browser window Realtime synchronization
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          setStore(JSON.parse(e.newValue) as PlatformDataStore);
        } catch {
          // Ignore malformed JSON
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    let channel: BroadcastChannel | null = null;
    if ('BroadcastChannel' in window) {
      channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      channel.onmessage = (event) => {
        if (event.data?.type === 'STORE_SYNC' && event.data?.payload) {
          setStore(event.data.payload as PlatformDataStore);
        }
      };
    }

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      if (channel) channel.close();
    };
  }, []);

  const commitStore = useCallback((updater: (prev: PlatformDataStore) => PlatformDataStore) => {
    setStore((prev) => {
      const next = updater(prev);
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
          if ('BroadcastChannel' in window) {
            const ch = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
            ch.postMessage({ type: 'STORE_SYNC', payload: next });
            ch.close();
          }
        } catch {
          // Ignore quota errors
        }
      }
      return next;
    });
  }, []);

  const setActiveSessionUser = useCallback((userId: string | null) => {
    setCurrentUserId(userId);
    if (typeof window !== 'undefined') {
      if (userId) {
        window.sessionStorage.setItem(SESSION_KEY, userId);
        window.localStorage.setItem(SESSION_KEY, userId);
      } else {
        window.sessionStorage.removeItem(SESSION_KEY);
        window.localStorage.removeItem(SESSION_KEY);
      }
    }
  }, []);

  const currentUser = useMemo(() => {
    if (!currentUserId) return null;
    return store.profiles.find((p) => p.id === currentUserId) ?? null;
  }, [currentUserId, store.profiles]);

  const currentPrivateRecord = useMemo(() => {
    if (!currentUserId) return null;
    return store.privateAccounts.find((a) => a.user_id === currentUserId) ?? null;
  }, [currentUserId, store.privateAccounts]);

  const loginWithIdentifier = useCallback(
    (identifier: string, password: string) => {
      const clean = identifier.trim().toLowerCase().replace(/^@/, '');
      if (!clean) {
        return { ok: false, error: 'Ingresa tu nombre de usuario o correo electrónico.' };
      }

      // Check if identifier matches a username in profiles or an email in private accounts
      const profileByUsername = store.profiles.find(
        (p) => p.username.toLowerCase() === clean
      );
      const privByEmail = store.privateAccounts.find(
        (a) => a.email && a.email.toLowerCase() === clean
      );

      const targetUserId = profileByUsername?.id ?? privByEmail?.user_id;
      if (!targetUserId) {
        return { ok: false, error: 'Usuario o correo no encontrado. Verifica tus datos.' };
      }

      const priv = store.privateAccounts.find((a) => a.user_id === targetUserId);
      if (!priv || (priv.password_hash && priv.password_hash !== password)) {
        return { ok: false, error: 'Contraseña incorrecta. Verifica tus datos o recupera tu acceso.' };
      }

      const profile = store.profiles.find((p) => p.id === targetUserId);
      if (!profile) {
        return { ok: false, error: 'Perfil de usuario no encontrado.' };
      }

      if (profile.is_suspended) {
        return {
          ok: false,
          error: `Esta cuenta ha sido suspendida. Motivo: ${
            profile.suspension_reason || 'Incumplimiento de normas de la comunidad.'
          }`,
        };
      }

      setActiveSessionUser(profile.id);
      pushToast('success', `¡Bienvenido/a de nuevo, ${profile.display_name}!`);
      return { ok: true };
    },
    [pushToast, setActiveSessionUser, store.privateAccounts, store.profiles]
  );

  const loginWithEmail = useCallback(
    (email: string, password: string) => {
      return loginWithIdentifier(email, password);
    },
    [loginWithIdentifier]
  );

  const loginWithDemoAccount = useCallback(
    (userId: string) => {
      const profile = store.profiles.find((p) => p.id === userId);
      if (!profile) {
        return { ok: false, error: 'Cuenta de demostración no encontrada.' };
      }
      if (profile.is_suspended) {
        return { ok: false, error: 'Esta cuenta se encuentra suspendida.' };
      }
      setActiveSessionUser(profile.id);
      pushToast('info', `Sesión iniciada como ${profile.display_name}`);
      return { ok: true };
    },
    [pushToast, setActiveSessionUser, store.profiles]
  );

  const registerAccount = useCallback(
    (input: RegisterInput) => {
      if (!input.confirmAdult || !isAdultBirthDate(input.birthDate)) {
        return {
          ok: false,
          error: 'Registro denegado: Linguevia es exclusivamente para mayores de 18 años.',
        };
      }
      if (!input.acceptTerms) {
        return { ok: false, error: 'Debes aceptar las condiciones de uso y privacidad.' };
      }

      const cleanUsername = input.username.trim().toLowerCase().replace(/^@/, '');
      if (!cleanUsername || cleanUsername.length < 3) {
        return { ok: false, error: 'El nombre de usuario debe tener al menos 3 caracteres.' };
      }
      if (!/^[a-zA-Z0-9_.-]+$/.test(cleanUsername)) {
        return {
          ok: false,
          error: 'El nombre de usuario solo puede contener letras, números, guiones y puntos.',
        };
      }

      // Check reserved admin usernames
      if (['yherzon21', 'admin', 'administrator', 'root', 'moderator'].includes(cleanUsername)) {
        return {
          ok: false,
          error: `El nombre de usuario '@${cleanUsername}' está reservado para la administración oficial de Linguevia.`,
        };
      }

      // Check username uniqueness strictly
      const usernameExists = store.profiles.some(
        (p) => p.username.toLowerCase() === cleanUsername
      );
      if (usernameExists) {
        return {
          ok: false,
          error: `El nombre de usuario '@${cleanUsername}' ya está registrado por otra persona. Por favor, elige uno diferente.`,
        };
      }

      // Optional email uniqueness check
      const cleanEmail = (input.email || '').trim().toLowerCase();
      if (cleanEmail) {
        const emailExists = store.privateAccounts.some(
          (a) => a.email && a.email.toLowerCase() === cleanEmail
        );
        if (emailExists) {
          return { ok: false, error: 'Ya existe una cuenta registrada con este correo electrónico.' };
        }
      }

      // Security Question and Answer validation
      const cleanQuestion = (input.securityQuestion || '').trim();
      const cleanAnswer = (input.securityAnswer || '').trim().toLowerCase();
      if (!cleanQuestion || cleanQuestion.length < 4) {
        return {
          ok: false,
          error: 'Debes seleccionar o escribir una pregunta secreta de seguridad.',
        };
      }
      if (!cleanAnswer || cleanAnswer.length < 2) {
        return {
          ok: false,
          error: 'Debes escribir la respuesta secreta que usarás para recuperar tu cuenta.',
        };
      }

      if (!input.password || input.password.length < 8) {
        return { ok: false, error: 'La contraseña debe tener al menos 8 caracteres.' };
      }

      const newUserId = `user-${Date.now()}`;
      const nowIso = new Date().toISOString();

      const nativeCode = input.nativeLanguageCode || 'es';
      const learningCode =
        input.learningLanguageCode && input.learningLanguageCode !== nativeCode
          ? input.learningLanguageCode
          : nativeCode === 'es'
          ? 'en'
          : 'es';
      const level: CefrLevel = input.learningLevel || 'B1';

      const initialLanguages: UserLanguage[] = [
        {
          id: `ul-${Date.now()}-1`,
          user_id: newUserId,
          language_code: nativeCode,
          relation_type: 'native',
          proficiency_level: 'native',
          target_goal: 'Compartir mi idioma nativo y cultura',
        },
        {
          id: `ul-${Date.now()}-2`,
          user_id: newUserId,
          language_code: learningCode,
          relation_type: 'learning',
          proficiency_level: level,
          target_goal: 'Practicar conversación fluida con compañeros nativos',
        },
      ];

      const newProfile: UserProfile = {
        id: newUserId,
        username: cleanUsername,
        display_name: input.displayName.trim() || cleanUsername,
        avatar_url: null,
        bio: '',
        country_code: (input.countryCode || 'PE').toUpperCase(),
        timezone: input.timezone || 'America/Lima',
        learning_goals: 'Practicar conversación fluida y vocabulario cotidiano.',
        availability_slots: [{ day: 'sat', window: 'evening' }],
        privacy_settings: {
          show_country: true,
          show_timezone: true,
          allow_calls_from_partners: true,
          allow_search_indexing: true,
          show_online_status: true,
        },
        role: 'user',
        is_adult_verified: true,
        onboarding_completed: false,
        is_suspended: false,
        last_active_at: nowIso,
        created_at: nowIso,
        updated_at: nowIso,
        languages: initialLanguages,
        interest_slugs: ['travel-culture', 'technology'],
      };

      const newPrivate: PrivateAccountRecord = {
        user_id: newUserId,
        username: cleanUsername,
        email: cleanEmail,
        email_verified: Boolean(cleanEmail),
        birth_date: input.birthDate,
        auth_provider: 'credentials',
        password_hash: input.password,
        security_question: cleanQuestion,
        security_answer_hash: cleanAnswer,
      };

      commitStore((prev) => ({
        ...prev,
        profiles: [...prev.profiles, newProfile],
        privateAccounts: [...prev.privateAccounts, newPrivate],
        consents: [
          ...prev.consents,
          {
            id: `consent-${Date.now()}`,
            user_id: newUserId,
            is_adult_confirmed: true,
            age_verified_at: nowIso,
            terms_version: '1.0',
            privacy_version: '1.0',
            ads_personalized_consent: false,
            ads_non_personalized_consent: true,
            analytics_consent: false,
            consent_region: 'GLOBAL',
            updated_at: nowIso,
          },
        ],
      }));

      setActiveSessionUser(newUserId);
      pushToast(
        'success',
        `¡Cuenta @${cleanUsername} creada con éxito! Personaliza tus preferencias para conectar.`
      );
      return { ok: true, requiresVerification: false, onboardingCompleted: false };
    },
    [commitStore, pushToast, setActiveSessionUser, store.privateAccounts, store.profiles]
  );

  const verifyCurrentEmail = useCallback(
    (code: string) => {
      if (!currentUserId) return { ok: false, error: 'Sesión no encontrada.' };
      if (code.trim().length < 4) {
        return { ok: false, error: 'Introduce un código de verificación válido.' };
      }

      commitStore((prev) => ({
        ...prev,
        privateAccounts: prev.privateAccounts.map((a) =>
          a.user_id === currentUserId ? { ...a, email_verified: true } : a
        ),
      }));
      pushToast('success', 'Correo electrónico verificado correctamente.');
      return { ok: true };
    },
    [commitStore, currentUserId, pushToast]
  );

  const getSecurityQuestionForUser = useCallback(
    (identifier: string) => {
      const clean = identifier.trim().toLowerCase().replace(/^@/, '');
      if (!clean) {
        return { ok: false, error: 'Ingresa tu nombre de usuario o correo.' };
      }

      const profile = store.profiles.find((p) => p.username.toLowerCase() === clean);
      const privByEmail = store.privateAccounts.find(
        (a) => a.email && a.email.toLowerCase() === clean
      );
      const targetUserId = profile?.id ?? privByEmail?.user_id;

      if (!targetUserId) {
        return { ok: false, error: 'No se encontró ninguna cuenta con ese usuario o correo.' };
      }

      const priv = store.privateAccounts.find((a) => a.user_id === targetUserId);
      if (!priv || !priv.security_question) {
        return {
          ok: false,
          error:
            'Esta cuenta no tiene configurada una pregunta secreta de seguridad. Por motivos de protección, la cuenta no puede recuperarse por este medio. Contacta al administrador para asistencia y recuperación manual.',
        };
      }

      return { ok: true, question: priv.security_question };
    },
    [store.privateAccounts, store.profiles]
  );

  const resetPasswordWithSecurityAnswer = useCallback(
    (identifier: string, answer: string, newPassword: string) => {
      if (newPassword.length < 8) {
        return { ok: false, error: 'La nueva contraseña debe tener al menos 8 caracteres.' };
      }
      const clean = identifier.trim().toLowerCase().replace(/^@/, '');
      const cleanAnswer = answer.trim().toLowerCase();

      const profile = store.profiles.find((p) => p.username.toLowerCase() === clean);
      const privByEmail = store.privateAccounts.find(
        (a) => a.email && a.email.toLowerCase() === clean
      );
      const targetUserId = profile?.id ?? privByEmail?.user_id;

      if (!targetUserId) {
        return { ok: false, error: 'No se encontró la cuenta a recuperar.' };
      }

      const priv = store.privateAccounts.find((a) => a.user_id === targetUserId);
      if (!priv || !priv.security_question || !priv.security_answer_hash) {
        return {
          ok: false,
          error:
            'Esta cuenta no cuenta con pregunta secreta configurada. Por seguridad, la cuenta queda sin acceso directo. Contacta al administrador para asistencia.',
        };
      }

      if (priv.security_answer_hash.toLowerCase() !== cleanAnswer) {
        return {
          ok: false,
          error:
            'Respuesta secreta incorrecta. Si no recuerdas la respuesta exacta, la cuenta no podrá ser recuperada por este medio. Contacta al administrador de la página para asistencia.',
        };
      }

      commitStore((prev) => ({
        ...prev,
        privateAccounts: prev.privateAccounts.map((a) =>
          a.user_id === targetUserId ? { ...a, password_hash: newPassword } : a
        ),
      }));

      setActiveSessionUser(targetUserId);
      pushToast('success', '¡Respuesta correcta! Tu contraseña fue actualizada y tu sesión iniciada.');
      return { ok: true };
    },
    [commitStore, pushToast, setActiveSessionUser, store.privateAccounts, store.profiles]
  );

  const requestPasswordRecovery = useCallback(
    (email: string) => {
      const clean = email.trim().toLowerCase();
      const exists = store.privateAccounts.some(
        (a) => a.email.toLowerCase() === clean || a.username?.toLowerCase() === clean
      );
      if (!exists) {
        return {
          ok: false,
          message: 'No encontramos ninguna cuenta registrada con esos datos.',
        };
      }
      return {
        ok: true,
        message: 'Cuenta encontrada. Responde a tu pregunta secreta de seguridad a continuación.',
      };
    },
    [store.privateAccounts]
  );

  const resetPasswordWithToken = useCallback(
    (email: string, newPassword: string, birthDateVerification?: string) => {
      if (newPassword.length < 8) {
        return { ok: false, error: 'La nueva contraseña debe tener al menos 8 caracteres.' };
      }
      const clean = email.trim().toLowerCase();
      const matched = store.privateAccounts.find(
        (a) => a.email.toLowerCase() === clean || a.username?.toLowerCase() === clean
      );
      if (!matched) {
        return { ok: false, error: 'Los datos de verificación no coinciden con ninguna cuenta.' };
      }

      if (birthDateVerification !== undefined && matched.birth_date !== birthDateVerification.trim()) {
        return {
          ok: false,
          error:
            'Verificación fallida: la fecha de nacimiento privada no coincide con la registrada en esta cuenta.',
        };
      }

      commitStore((prev) => ({
        ...prev,
        privateAccounts: prev.privateAccounts.map((a) =>
          a.user_id === matched.user_id ? { ...a, password_hash: newPassword } : a
        ),
      }));
      setActiveSessionUser(matched.user_id);
      pushToast('success', 'Identidad verificada y contraseña actualizada.');
      return { ok: true };
    },
    [commitStore, pushToast, setActiveSessionUser, store.privateAccounts]
  );

  const adminResetUserPassword = useCallback(
    async (targetUserId: string, newPassword: string) => {
      if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'moderator')) {
        return { ok: false, error: 'Operación denegada: rol administrativo requerido.' };
      }
      if (newPassword.length < 6) {
        return { ok: false, error: 'La nueva contraseña debe tener al menos 6 caracteres.' };
      }

      commitStore((prev) => ({
        ...prev,
        privateAccounts: prev.privateAccounts.map((a) =>
          a.user_id === targetUserId ? { ...a, password_hash: newPassword } : a
        ),
      }));
      pushToast('success', 'Contraseña de usuario restablecida por el administrador.');
      return { ok: true };
    },
    [commitStore, currentUser, pushToast]
  );

  const adminGetUserAccountDetails = useCallback(
    (targetUserId: string) => {
      if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'moderator')) {
        return null;
      }
      const priv = store.privateAccounts.find((a) => a.user_id === targetUserId);
      if (!priv) return null;
      return {
        email: priv.email || 'No proporcionado (Solo usuario)',
        security_question: priv.security_question || 'No configurada',
      };
    },
    [currentUser, store.privateAccounts]
  );

  const adminPromoteCurrentUser = useCallback(async () => {
    return {
      ok: false,
      error: 'Operación denegada: @Yherzon21 es la única cuenta administradora autorizada de la plataforma.',
    };
  }, []);

  const logout = useCallback(() => {
    const supabase = createSupabaseBrowserClient();
    if (supabase) {
      supabase.auth.signOut().catch(() => {});
    }
    setActiveSessionUser(null);
    pushToast('info', 'Has cerrado sesión de forma segura.');
  }, [pushToast, setActiveSessionUser]);

  const completeOnboardingAndSaveProfile = useCallback(
    (input: OnboardingUpdateInput) => {
      if (!currentUserId) return { ok: false, error: 'Debes iniciar sesión.' };

      const hasNative = input.languages.some((l) => l.relation_type === 'native');
      const hasLearning = input.languages.some((l) => l.relation_type === 'learning');
      if (!hasNative || !hasLearning) {
        return {
          ok: false,
          error: 'Debes indicar al menos un idioma nativo y un idioma que deseas practicar.',
        };
      }

      const nowIso = new Date().toISOString();
      const mappedLanguages: UserLanguage[] = input.languages.map((l, idx) => ({
        id: `ul-${currentUserId}-${idx}-${Date.now()}`,
        user_id: currentUserId,
        language_code: l.language_code,
        relation_type: l.relation_type,
        proficiency_level: l.relation_type === 'native' ? 'native' : l.proficiency_level,
        target_goal: l.target_goal,
      }));

      commitStore((prev) => ({
        ...prev,
        profiles: prev.profiles.map((p) =>
          p.id === currentUserId
            ? {
                ...p,
                bio: input.bio.trim(),
                learning_goals: input.learningGoals.trim(),
                country_code: input.countryCode.toUpperCase(),
                timezone: input.timezone,
                languages: mappedLanguages,
                interest_slugs: input.interestSlugs,
                availability_slots: input.availabilitySlots,
                privacy_settings: {
                  ...p.privacy_settings,
                  ...(input.privacySettings ?? {}),
                },
                onboarding_completed: true,
                updated_at: nowIso,
              }
            : p
        ),
      }));

      pushToast('success', 'Perfil lingüístico y preferencias guardadas.');
      return { ok: true };
    },
    [commitStore, currentUserId, pushToast]
  );

  const updateConsentPreferences = useCallback(
    (prefs: {
      ads_personalized_consent: boolean;
      ads_non_personalized_consent: boolean;
      analytics_consent: boolean;
    }) => {
      if (!currentUserId) return;
      const nowIso = new Date().toISOString();
      commitStore((prev) => ({
        ...prev,
        consents: prev.consents.map((c) =>
          c.user_id === currentUserId
            ? {
                ...c,
                ...prefs,
                updated_at: nowIso,
              }
            : c
        ),
      }));
      pushToast('success', 'Preferencias de consentimiento y privacidad actualizadas.');
    },
    [commitStore, currentUserId, pushToast]
  );

  const deleteOwnAccount = useCallback(
    async (confirmPhrase: string) => {
      if (!currentUserId) return { ok: false, error: 'No autenticado.' };

      const res = await fetch('/api/v1/account/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUserId,
        },
        body: JSON.stringify({ confirmPhrase }),
      });

      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        return { ok: false, error: data.error || 'No se pudo eliminar la cuenta.' };
      }

      const targetId = currentUserId;
      commitStore((prev) => ({
        ...prev,
        profiles: prev.profiles.filter((p) => p.id !== targetId),
        privateAccounts: prev.privateAccounts.filter((a) => a.user_id !== targetId),
        consents: prev.consents.filter((c) => c.user_id !== targetId),
        conversationRequests: prev.conversationRequests.filter(
          (r) => r.sender_id !== targetId && r.receiver_id !== targetId
        ),
        conversations: prev.conversations.filter((c) => !c.participant_ids.includes(targetId)),
        messages: prev.messages.filter((m) => m.sender_id !== targetId),
        vocabulary: prev.vocabulary.filter((v) => v.user_id !== targetId),
        notifications: prev.notifications.filter((n) => n.user_id !== targetId),
      }));

      setActiveSessionUser(null);
      pushToast('info', 'Tu cuenta y tus datos personales han sido eliminados permanentemente.');
      return { ok: true };
    },
    [commitStore, currentUserId, pushToast, setActiveSessionUser]
  );

  const sendConversationRequest = useCallback(
    (receiverId: string, introMessage: string, targetLanguageCode: string) => {
      if (!currentUser) return { ok: false, error: 'Inicia sesión primero.' };
      if (currentUser.id === receiverId) {
        return { ok: false, error: 'No puedes enviarte una solicitud a ti mismo.' };
      }
      if (areUsersBlocked(store.blocks, currentUser.id, receiverId)) {
        return { ok: false, error: 'No es posible contactar con este usuario.' };
      }
      const trimmed = introMessage.trim();
      if (trimmed.length < 5 || trimmed.length > 500) {
        return {
          ok: false,
          error: 'El mensaje de presentación debe tener entre 5 y 500 caracteres.',
        };
      }

      // Check daily request limit
      const dayAgo = Date.now() - 24 * 3600 * 1000;
      const sentToday = store.conversationRequests.filter(
        (r) => r.sender_id === currentUser.id && new Date(r.created_at).getTime() > dayAgo
      ).length;

      if (sentToday >= store.settings.max_daily_requests) {
        return {
          ok: false,
          error: `Has alcanzado el límite diario de solicitudes (${store.settings.max_daily_requests}/día).`,
        };
      }

      const existingPending = store.conversationRequests.find(
        (r) =>
          r.status === 'pending' &&
          ((r.sender_id === currentUser.id && r.receiver_id === receiverId) ||
            (r.sender_id === receiverId && r.receiver_id === currentUser.id))
      );
      if (existingPending) {
        return { ok: false, error: 'Ya existe una solicitud pendiente con esta persona.' };
      }

      const nowIso = new Date().toISOString();
      const newReq: ConversationRequest = {
        id: `req-${Date.now()}`,
        sender_id: currentUser.id,
        receiver_id: receiverId,
        status: 'pending',
        intro_message: trimmed,
        target_language_code: targetLanguageCode,
        created_at: nowIso,
        responded_at: null,
      };

      commitStore((prev) => ({
        ...prev,
        conversationRequests: [newReq, ...prev.conversationRequests],
        notifications: [
          {
            id: `notif-${Date.now()}`,
            user_id: receiverId,
            type: 'conversation_request',
            title: 'Nueva solicitud de conversación',
            body: `${currentUser.display_name} quiere practicar ${targetLanguageCode.toUpperCase()} contigo.`,
            action_url: '/messages',
            is_read: false,
            created_at: nowIso,
          },
          ...prev.notifications,
        ],
      }));

      pushToast('success', 'Solicitud de conversación enviada.');
      return { ok: true };
    },
    [commitStore, currentUser, pushToast, store.blocks, store.conversationRequests, store.settings.max_daily_requests]
  );

  const respondToConversationRequest = useCallback(
    (requestId: string, decision: 'accepted' | 'rejected' | 'cancelled') => {
      if (!currentUser) return { ok: false, error: 'Inicia sesión primero.' };

      const req = store.conversationRequests.find((r) => r.id === requestId);
      if (!req || req.status !== 'pending') {
        return { ok: false, error: 'La solicitud no existe o ya fue procesada.' };
      }

      if (decision === 'cancelled' && req.sender_id !== currentUser.id) {
        return { ok: false, error: 'Solo quien envió la solicitud puede cancelarla.' };
      }
      if ((decision === 'accepted' || decision === 'rejected') && req.receiver_id !== currentUser.id) {
        return { ok: false, error: 'Solo el destinatario puede aceptar o rechazar la solicitud.' };
      }

      const nowIso = new Date().toISOString();
      let createdConvId: string | undefined;

      commitStore((prev) => {
        const updatedRequests = prev.conversationRequests.map((r) =>
          r.id === requestId ? { ...r, status: decision, responded_at: nowIso } : r
        );

        if (decision !== 'accepted') {
          return { ...prev, conversationRequests: updatedRequests };
        }

        // Check if a conversation already exists between these two users
        const existingConv = prev.conversations.find(
          (c) =>
            c.participant_ids.includes(req.sender_id) &&
            c.participant_ids.includes(req.receiver_id)
        );

        if (existingConv) {
          createdConvId = existingConv.id;
          return {
            ...prev,
            conversationRequests: updatedRequests,
            conversations: prev.conversations.map((c) =>
              c.id === existingConv.id ? { ...c, is_active: true, last_message_at: nowIso } : c
            ),
          };
        }

        createdConvId = `conv-${Date.now()}`;
        const newConv: Conversation = {
          id: createdConvId,
          origin_request_id: req.id,
          mode: 'free',
          active_topic_prompt: null,
          last_message_at: nowIso,
          is_active: true,
          created_at: nowIso,
          participant_ids: [req.sender_id, req.receiver_id],
        };

        const introMsg: ChatMessage = {
          id: `msg-${Date.now()}`,
          conversation_id: createdConvId,
          sender_id: req.sender_id,
          content_type: 'text',
          body: req.intro_message,
          delivery_status: 'delivered',
          is_flagged: false,
          created_at: nowIso,
        };

        return {
          ...prev,
          conversationRequests: updatedRequests,
          conversations: [newConv, ...prev.conversations],
          messages: [...prev.messages, introMsg],
          notifications: [
            {
              id: `notif-${Date.now()}`,
              user_id: req.sender_id,
              type: 'request_accepted',
              title: 'Solicitud aceptada',
              body: `${currentUser.display_name} aceptó tu solicitud de intercambio.`,
              action_url: `/messages/${createdConvId}`,
              is_read: false,
              created_at: nowIso,
            },
            ...prev.notifications,
          ],
        };
      });

      if (decision === 'accepted') {
        pushToast('success', 'Solicitud aceptada. ¡Conversación habilitada!');
      } else if (decision === 'rejected') {
        pushToast('info', 'Solicitud rechazada.');
      } else {
        pushToast('info', 'Solicitud cancelada.');
      }

      return { ok: true, conversationId: createdConvId };
    },
    [commitStore, currentUser, pushToast, store.conversationRequests]
  );

  const blockUser = useCallback(
    (targetUserId: string, reason: string = 'Bloqueado por el usuario') => {
      if (!currentUser) return { ok: false, error: 'No autenticado.' };
      if (currentUser.id === targetUserId) {
        return { ok: false, error: 'No puedes bloquearte a ti mismo.' };
      }

      const nowIso = new Date().toISOString();
      commitStore((prev) => ({
        ...prev,
        blocks: [
          ...prev.blocks.filter(
            (b) => !(b.blocker_id === currentUser.id && b.blocked_id === targetUserId)
          ),
          {
            blocker_id: currentUser.id,
            blocked_id: targetUserId,
            reason,
            created_at: nowIso,
          },
        ],
        conversationRequests: prev.conversationRequests.map((r) =>
          (r.sender_id === currentUser.id && r.receiver_id === targetUserId) ||
          (r.sender_id === targetUserId && r.receiver_id === currentUser.id)
            ? { ...r, status: 'cancelled', responded_at: nowIso }
            : r
        ),
      }));

      pushToast('info', 'Usuario bloqueado. No podrá enviarte mensajes ni llamarte.');
      return { ok: true };
    },
    [commitStore, currentUser, pushToast]
  );

  const unblockUser = useCallback(
    (targetUserId: string) => {
      if (!currentUser) return;
      commitStore((prev) => ({
        ...prev,
        blocks: prev.blocks.filter(
          (b) => !(b.blocker_id === currentUser.id && b.blocked_id === targetUserId)
        ),
      }));
      pushToast('info', 'Usuario desbloqueado.');
    },
    [commitStore, currentUser, pushToast]
  );

  const sendMessage = useCallback(
    (params: {
      conversationId: string;
      contentType: 'text' | 'voice' | 'correction' | 'system_prompt';
      body: string;
      voiceUrl?: string;
      voiceDurationSec?: number;
      voiceSizeBytes?: number;
      correctionData?: GrammarCorrectionData;
    }) => {
      if (!currentUser) return { ok: false, error: 'Debes iniciar sesión.' };

      const conv = store.conversations.find((c) => c.id === params.conversationId);
      if (!isAuthorizedConversationParticipant(conv, store.blocks, currentUser.id)) {
        return {
          ok: false,
          error: 'No tienes permiso para enviar mensajes en esta conversación.',
        };
      }

      if (params.contentType === 'voice') {
        if (!params.voiceSizeBytes || params.voiceSizeBytes > 5 * 1024 * 1024) {
          return { ok: false, error: 'La nota de voz supera el límite máximo permitido (5 MB).' };
        }
      } else if (!params.body.trim()) {
        return { ok: false, error: 'El mensaje no puede estar vacío.' };
      }

      const oneMinuteAgo = Date.now() - 60 * 1000;
      const recentSent = store.messages.filter(
        (m) => m.sender_id === currentUser.id && new Date(m.created_at).getTime() > oneMinuteAgo
      ).length;
      if (recentSent >= store.settings.max_messages_per_minute) {
        return {
          ok: false,
          error: 'Has superado el límite de mensajes por minuto. Espera unos segundos.',
        };
      }

      const nowIso = new Date().toISOString();
      const newMsg: ChatMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        conversation_id: params.conversationId,
        sender_id: currentUser.id,
        content_type: params.contentType,
        body: params.body.trim(),
        voice_url: params.voiceUrl ?? null,
        voice_duration_sec: params.voiceDurationSec ?? null,
        voice_size_bytes: params.voiceSizeBytes ?? null,
        correction_data: params.correctionData ?? null,
        delivery_status: 'delivered',
        is_flagged: false,
        created_at: nowIso,
      };

      const recipientId = conv!.participant_ids.find((id) => id !== currentUser.id);

      commitStore((prev) => ({
        ...prev,
        messages: [...prev.messages, newMsg],
        conversations: prev.conversations.map((c) =>
          c.id === params.conversationId ? { ...c, last_message_at: nowIso } : c
        ),
        notifications: recipientId
          ? [
              {
                id: `notif-${Date.now()}`,
                user_id: recipientId,
                type:
                  params.contentType === 'correction' ? 'grammar_correction' : 'new_message',
                title:
                  params.contentType === 'correction'
                    ? `${currentUser.display_name} envió una corrección gramatical`
                    : `Nuevo mensaje de ${currentUser.display_name}`,
                body:
                  params.contentType === 'voice'
                    ? '🎵 Nota de voz'
                    : params.body.trim().slice(0, 100),
                action_url: `/messages/${params.conversationId}`,
                is_read: false,
                created_at: nowIso,
              },
              ...prev.notifications,
            ]
          : prev.notifications,
      }));

      return { ok: true };
    },
    [commitStore, currentUser, store.blocks, store.conversations, store.messages, store.settings.max_messages_per_minute]
  );

  const markConversationRead = useCallback(
    (conversationId: string) => {
      if (!currentUser) return;
      const nowIso = new Date().toISOString();
      commitStore((prev) => ({
        ...prev,
        messages: prev.messages.map((m) =>
          m.conversation_id === conversationId &&
          m.sender_id !== currentUser.id &&
          m.delivery_status !== 'read'
            ? { ...m, delivery_status: 'read', read_at: nowIso }
            : m
        ),
      }));
    },
    [commitStore, currentUser]
  );

  const setConversationLearningMode = useCallback(
    (conversationId: string, mode: ConversationMode, activePrompt?: string | null) => {
      if (!currentUser) return;
      commitStore((prev) => ({
        ...prev,
        conversations: prev.conversations.map((c) =>
          c.id === conversationId && c.participant_ids.includes(currentUser.id)
            ? {
                ...c,
                mode,
                active_topic_prompt:
                  mode === 'guided' ? activePrompt ?? c.active_topic_prompt : null,
              }
            : c
        ),
      }));
    },
    [commitStore, currentUser]
  );

  const attachMessageTranslation = useCallback(
    (messageId: string, translatedText: string, targetLang: string, provider: string) => {
      const nowIso = new Date().toISOString();
      commitStore((prev) => ({
        ...prev,
        messages: prev.messages.map((m) =>
          m.id === messageId
            ? {
                ...m,
                translation_data: {
                  translated_text: translatedText,
                  target_lang: targetLang,
                  provider,
                  translated_at: nowIso,
                },
              }
            : m
        ),
      }));
    },
    [commitStore]
  );

  const saveVocabularyItem = useCallback(
    (item: {
      language_code: string;
      term: string;
      translation: string;
      context_example: string;
      source_message_id?: string | null;
    }) => {
      if (!currentUser) return { ok: false, error: 'No autenticado.' };
      if (!item.term.trim() || !item.translation.trim()) {
        return { ok: false, error: 'El término y la traducción son obligatorios.' };
      }

      const newVocab: SavedVocabularyItem = {
        id: `voc-${Date.now()}`,
        user_id: currentUser.id,
        source_message_id: item.source_message_id ?? null,
        language_code: item.language_code,
        term: item.term.trim(),
        translation: item.translation.trim(),
        context_example: item.context_example.trim(),
        mastery_level: 1,
        created_at: new Date().toISOString(),
      };

      commitStore((prev) => ({
        ...prev,
        vocabulary: [newVocab, ...prev.vocabulary],
      }));
      pushToast('success', 'Expresión guardada en tu cuaderno de vocabulario.');
      return { ok: true };
    },
    [commitStore, currentUser, pushToast]
  );

  const updateVocabularyMastery = useCallback(
    (vocabId: string, level: 1 | 2 | 3 | 4 | 5) => {
      if (!currentUser) return;
      commitStore((prev) => ({
        ...prev,
        vocabulary: prev.vocabulary.map((v) =>
          v.id === vocabId && v.user_id === currentUser.id ? { ...v, mastery_level: level } : v
        ),
      }));
    },
    [commitStore, currentUser]
  );

  const removeVocabularyItem = useCallback(
    (vocabId: string) => {
      if (!currentUser) return;
      commitStore((prev) => ({
        ...prev,
        vocabulary: prev.vocabulary.filter(
          (v) => !(v.id === vocabId && v.user_id === currentUser.id)
        ),
      }));
    },
    [commitStore, currentUser]
  );

  const startCallSession = useCallback(
    (conversationId: string, callType: CallType) => {
      if (!currentUser) return { ok: false, error: 'Debes iniciar sesión.' };
      const conv = store.conversations.find((c) => c.id === conversationId);
      if (!isAuthorizedConversationParticipant(conv, store.blocks, currentUser.id)) {
        return { ok: false, error: 'No tienes permiso para iniciar llamadas en esta conversación.' };
      }

      const calleeId = conv!.participant_ids.find((id) => id !== currentUser.id);
      if (!calleeId) {
        return { ok: false, error: 'Destinatario de llamada no encontrado.' };
      }

      const calleeProfile = store.profiles.find((p) => p.id === calleeId);
      if (calleeProfile && !calleeProfile.privacy_settings.allow_calls_from_partners) {
        return {
          ok: false,
          error: 'Tu compañero ha desactivado las llamadas en su configuración de privacidad.',
        };
      }

      const sessionId = `call-${Date.now()}`;
      const nowIso = new Date().toISOString();
      const newSession: CallSession = {
        id: sessionId,
        conversation_id: conversationId,
        caller_id: currentUser.id,
        callee_id: calleeId,
        room_name: `lc-room-${conversationId}-${sessionId}`,
        call_type: callType,
        status: 'ringing',
        recording_enabled: false,
        started_at: nowIso,
        answered_at: null,
        ended_at: null,
        duration_seconds: 0,
        end_reason: null,
        reconnect_count: 0,
      };

      commitStore((prev) => ({
        ...prev,
        callSessions: [newSession, ...prev.callSessions],
        notifications: [
          {
            id: `notif-${Date.now()}`,
            user_id: calleeId,
            type: 'incoming_call',
            title: `Llamada entrante de ${currentUser.display_name}`,
            body:
              callType === 'video'
                ? 'Videollamada de práctica lingüística en curso'
                : 'Llamada de audio de práctica lingüística en curso',
            action_url: `/call/${sessionId}`,
            is_read: false,
            created_at: nowIso,
          },
          ...prev.notifications,
        ],
      }));

      return { ok: true, session: newSession };
    },
    [commitStore, currentUser, store.blocks, store.conversations, store.profiles]
  );

  const updateCallSessionState = useCallback(
    (
      sessionId: string,
      status: CallStatus,
      extra?: { durationSeconds?: number; endReason?: string; incrementReconnect?: boolean }
    ) => {
      const nowIso = new Date().toISOString();
      commitStore((prev) => ({
        ...prev,
        callSessions: prev.callSessions.map((s) => {
          if (s.id !== sessionId) return s;
          return {
            ...s,
            status,
            answered_at: status === 'accepted' && !s.answered_at ? nowIso : s.answered_at,
            ended_at:
              status === 'ended' || status === 'rejected' || status === 'missed'
                ? nowIso
                : s.ended_at,
            duration_seconds: extra?.durationSeconds ?? s.duration_seconds,
            end_reason: extra?.endReason ?? s.end_reason,
            reconnect_count: extra?.incrementReconnect
              ? s.reconnect_count + 1
              : s.reconnect_count,
          };
        }),
      }));
    },
    [commitStore]
  );

  const submitModerationReport = useCallback(
    async (params: {
      reportedUserId: string;
      conversationId?: string | null;
      messageId?: string | null;
      reasonCategory: ReportReasonCategory;
      description: string;
      blockImmediately?: boolean;
    }) => {
      if (!currentUser) return { ok: false, error: 'Inicia sesión primero.' };

      const res = await fetch('/api/v1/moderation/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
        },
        body: JSON.stringify({
          reportedUserId: params.reportedUserId,
          conversationId: params.conversationId ?? null,
          messageId: params.messageId ?? null,
          reasonCategory: params.reasonCategory,
          description: params.description,
          blockUserImmediately: Boolean(params.blockImmediately),
        }),
      });

      const data = (await res.json()) as { error?: string; reportId?: string };
      if (!res.ok) {
        return { ok: false, error: data.error || 'Error al registrar la denuncia.' };
      }

      const nowIso = new Date().toISOString();
      commitStore((prev) => ({
        ...prev,
        reports: [
          {
            id: data.reportId || `rep-${Date.now()}`,
            reporter_id: currentUser.id,
            reported_user_id: params.reportedUserId,
            conversation_id: params.conversationId ?? null,
            message_id: params.messageId ?? null,
            reason_category: params.reasonCategory,
            description: params.description.trim(),
            status: 'pending',
            admin_notes: null,
            resolved_by: null,
            created_at: nowIso,
            resolved_at: null,
          },
          ...prev.reports,
        ],
        messages: params.messageId
          ? prev.messages.map((m) => (m.id === params.messageId ? { ...m, is_flagged: true } : m))
          : prev.messages,
        blocks: params.blockImmediately
          ? [
              ...prev.blocks.filter(
                (b) =>
                  !(b.blocker_id === currentUser.id && b.blocked_id === params.reportedUserId)
              ),
              {
                blocker_id: currentUser.id,
                blocked_id: params.reportedUserId,
                reason: `Bloqueado al reportar (${params.reasonCategory})`,
                created_at: nowIso,
              },
            ]
          : prev.blocks,
      }));

      pushToast(
        'success',
        'Denuncia enviada al equipo de moderación. Los anuncios han sido desactivados en el contenido reportado.'
      );
      return { ok: true };
    },
    [commitStore, currentUser, pushToast]
  );

  const adminReviewReport = useCallback(
    async (
      reportId: string,
      status: ReportStatus,
      adminNotes: string,
      suspendReportedUser: boolean = false
    ) => {
      if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'moderator')) {
        return { ok: false, error: 'Permisos insuficientes.' };
      }

      const targetReport = store.reports.find((r) => r.id === reportId);
      if (!targetReport) return { ok: false, error: 'Denuncia no encontrada.' };

      const res = await fetch('/api/v1/admin/action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
          'x-user-role': currentUser.role,
        },
        body: JSON.stringify({
          actionType: status === 'dismissed' ? 'DISMISS_REPORT' : 'RESOLVE_REPORT',
          targetEntity: 'message_reports',
          targetId: reportId,
          details: { status, adminNotes, suspendReportedUser },
        }),
      });

      if (!res.ok) {
        return { ok: false, error: 'No se pudo auditar la acción administrativa en el servidor.' };
      }

      const nowIso = new Date().toISOString();
      commitStore((prev) => ({
        ...prev,
        reports: prev.reports.map((r) =>
          r.id === reportId
            ? {
                ...r,
                status,
                admin_notes: adminNotes,
                resolved_by: currentUser.id,
                resolved_at: nowIso,
              }
            : r
        ),
        profiles: suspendReportedUser
          ? prev.profiles.map((p) =>
              p.id === targetReport.reported_user_id
                ? {
                    ...p,
                    is_suspended: true,
                    suspension_reason: adminNotes || 'Suspendido tras revisión de denuncia',
                  }
                : p
            )
          : prev.profiles,
        auditLogs: [
          {
            id: `audit-${Date.now()}`,
            admin_id: currentUser.id,
            action_type: status === 'dismissed' ? 'DISMISS_REPORT' : 'RESOLVE_REPORT',
            target_entity: 'message_reports',
            target_id: reportId,
            details: { status, adminNotes, suspendReportedUser },
            created_at: nowIso,
          },
          ...prev.auditLogs,
        ],
      }));

      pushToast('success', 'Denuncia actualizada y registrada en auditoría.');
      return { ok: true };
    },
    [commitStore, currentUser, pushToast, store.reports]
  );

  const adminToggleUserSuspension = useCallback(
    async (targetUserId: string, suspend: boolean, reason: string = 'Acción administrativa') => {
      if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'moderator')) {
        return { ok: false, error: 'Permisos insuficientes.' };
      }

      const res = await fetch('/api/v1/admin/action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
          'x-user-role': currentUser.role,
        },
        body: JSON.stringify({
          actionType: suspend ? 'SUSPEND_USER' : 'RESTORE_USER',
          targetEntity: 'profiles',
          targetId: targetUserId,
          details: { suspend, reason },
        }),
      });

      if (!res.ok) {
        return { ok: false, error: 'Error al registrar acción administrativa.' };
      }

      const nowIso = new Date().toISOString();
      commitStore((prev) => ({
        ...prev,
        profiles: prev.profiles.map((p) =>
          p.id === targetUserId
            ? {
                ...p,
                is_suspended: suspend,
                suspension_reason: suspend ? reason : null,
                updated_at: nowIso,
              }
            : p
        ),
        auditLogs: [
          {
            id: `audit-${Date.now()}`,
            admin_id: currentUser.id,
            action_type: suspend ? 'SUSPEND_USER' : 'RESTORE_USER',
            target_entity: 'profiles',
            target_id: targetUserId,
            details: { suspend, reason },
            created_at: nowIso,
          },
          ...prev.auditLogs,
        ],
      }));

      pushToast('info', suspend ? 'Cuenta suspendida.' : 'Cuenta restaurada.');
      return { ok: true };
    },
    [commitStore, currentUser, pushToast]
  );

  const adminToggleLanguageCatalog = useCallback(
    async (code: string) => {
      if (!currentUser || currentUser.role !== 'admin') return;
      await fetch('/api/v1/admin/action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
          'x-user-role': currentUser.role,
        },
        body: JSON.stringify({
          actionType: 'TOGGLE_LANGUAGE',
          targetEntity: 'languages',
          targetId: code,
          details: {},
        }),
      });

      commitStore((prev) => ({
        ...prev,
        languages: prev.languages.map((l) =>
          l.code === code ? { ...l, is_active: !l.is_active } : l
        ),
        auditLogs: [
          {
            id: `audit-${Date.now()}`,
            admin_id: currentUser.id,
            action_type: 'TOGGLE_LANGUAGE',
            target_entity: 'languages',
            target_id: code,
            details: {},
            created_at: new Date().toISOString(),
          },
          ...prev.auditLogs,
        ],
      }));
    },
    [commitStore, currentUser]
  );

  const adminAddLanguageCatalog = useCallback(
    async (lang: {
      code: string;
      name_es: string;
      name_en: string;
      native_name: string;
      flag_emoji: string;
    }) => {
      if (!currentUser || currentUser.role !== 'admin') {
        return { ok: false, error: 'Solo administradores.' };
      }
      const cleanCode = lang.code.trim().toLowerCase();
      if (store.languages.some((l) => l.code === cleanCode)) {
        return { ok: false, error: 'El código de idioma ya existe.' };
      }

      await fetch('/api/v1/admin/action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
          'x-user-role': currentUser.role,
        },
        body: JSON.stringify({
          actionType: 'ADD_LANGUAGE',
          targetEntity: 'languages',
          targetId: cleanCode,
          details: lang,
        }),
      });

      commitStore((prev) => ({
        ...prev,
        languages: [
          ...prev.languages,
          {
            code: cleanCode,
            name_es: lang.name_es.trim(),
            name_en: lang.name_en.trim(),
            native_name: lang.native_name.trim(),
            flag_emoji: lang.flag_emoji.trim() || '🌐',
            is_active: true,
          },
        ],
        auditLogs: [
          {
            id: `audit-${Date.now()}`,
            admin_id: currentUser.id,
            action_type: 'ADD_LANGUAGE',
            target_entity: 'languages',
            target_id: cleanCode,
            details: lang,
            created_at: new Date().toISOString(),
          },
          ...prev.auditLogs,
        ],
      }));

      pushToast('success', `Idioma ${lang.name_es} añadido al catálogo.`);
      return { ok: true };
    },
    [commitStore, currentUser, pushToast, store.languages]
  );

  const adminAddInterestCatalog = useCallback(
    async (interest: { slug: string; name_es: string; name_en: string; category: string }) => {
      if (!currentUser || currentUser.role !== 'admin') {
        return { ok: false, error: 'Solo administradores.' };
      }
      const cleanSlug = interest.slug.trim().toLowerCase();
      if (store.interests.some((i) => i.slug === cleanSlug)) {
        return { ok: false, error: 'El interés ya existe.' };
      }

      await fetch('/api/v1/admin/action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
          'x-user-role': currentUser.role,
        },
        body: JSON.stringify({
          actionType: 'ADD_INTEREST',
          targetEntity: 'interests',
          targetId: cleanSlug,
          details: interest,
        }),
      });

      commitStore((prev) => ({
        ...prev,
        interests: [
          ...prev.interests,
          {
            id: `int-${Date.now()}`,
            slug: cleanSlug,
            name_es: interest.name_es.trim(),
            name_en: interest.name_en.trim(),
            category: interest.category.trim() || 'general',
            icon_name: 'Sparkles',
            is_active: true,
          },
        ],
        auditLogs: [
          {
            id: `audit-${Date.now()}`,
            admin_id: currentUser.id,
            action_type: 'ADD_INTEREST',
            target_entity: 'interests',
            target_id: cleanSlug,
            details: interest,
            created_at: new Date().toISOString(),
          },
          ...prev.auditLogs,
        ],
      }));

      pushToast('success', `Interés ${interest.name_es} añadido.`);
      return { ok: true };
    },
    [commitStore, currentUser, pushToast, store.interests]
  );

  const adminUpdatePlatformSettings = useCallback(
    async (partial: Partial<PlatformSettingsState>) => {
      if (!currentUser || currentUser.role !== 'admin') return;
      await fetch('/api/v1/admin/action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
          'x-user-role': currentUser.role,
        },
        body: JSON.stringify({
          actionType: 'UPDATE_PLATFORM_SETTINGS',
          targetEntity: 'platform_settings',
          targetId: 'global',
          details: partial,
        }),
      });

      commitStore((prev) => ({
        ...prev,
        settings: {
          ...prev.settings,
          ...partial,
        },
        auditLogs: [
          {
            id: `audit-${Date.now()}`,
            admin_id: currentUser.id,
            action_type: 'UPDATE_PLATFORM_SETTINGS',
            target_entity: 'platform_settings',
            target_id: 'global',
            details: partial as Record<string, unknown>,
            created_at: new Date().toISOString(),
          },
          ...prev.auditLogs,
        ],
      }));
      pushToast('success', 'Configuración global actualizada.');
    },
    [commitStore, currentUser, pushToast]
  );

  const markAllNotificationsRead = useCallback(() => {
    if (!currentUser) return;
    commitStore((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) =>
        n.user_id === currentUser.id ? { ...n, is_read: true } : n
      ),
    }));
  }, [commitStore, currentUser]);

  const value = useMemo<PlatformContextValue>(
    () => ({
      isHydrated,
      store,
      currentUser,
      currentPrivateEmail: currentPrivateRecord?.email ?? null,
      currentEmailVerified: currentPrivateRecord?.email_verified ?? false,
      toasts,
      pushToast,
      dismissToast,
      loginWithIdentifier,
      loginWithEmail,
      loginWithDemoAccount,
      registerAccount,
      verifyCurrentEmail,
      getSecurityQuestionForUser,
      resetPasswordWithSecurityAnswer,
      requestPasswordRecovery,
      resetPasswordWithToken,
      logout,
      completeOnboardingAndSaveProfile,
      updateConsentPreferences,
      deleteOwnAccount,
      sendConversationRequest,
      respondToConversationRequest,
      blockUser,
      unblockUser,
      sendMessage,
      markConversationRead,
      setConversationLearningMode,
      attachMessageTranslation,
      saveVocabularyItem,
      updateVocabularyMastery,
      removeVocabularyItem,
      startCallSession,
      updateCallSessionState,
      submitModerationReport,
      adminReviewReport,
      adminToggleUserSuspension,
      adminToggleLanguageCatalog,
      adminAddLanguageCatalog,
      adminAddInterestCatalog,
      adminUpdatePlatformSettings,
      adminResetUserPassword,
      adminGetUserAccountDetails,
      adminPromoteCurrentUser,
      markAllNotificationsRead,
    }),
    [
      isHydrated,
      store,
      currentUser,
      currentPrivateRecord,
      toasts,
      pushToast,
      dismissToast,
      loginWithIdentifier,
      loginWithEmail,
      loginWithDemoAccount,
      registerAccount,
      verifyCurrentEmail,
      getSecurityQuestionForUser,
      resetPasswordWithSecurityAnswer,
      requestPasswordRecovery,
      resetPasswordWithToken,
      logout,
      completeOnboardingAndSaveProfile,
      updateConsentPreferences,
      deleteOwnAccount,
      sendConversationRequest,
      respondToConversationRequest,
      blockUser,
      unblockUser,
      sendMessage,
      markConversationRead,
      setConversationLearningMode,
      attachMessageTranslation,
      saveVocabularyItem,
      updateVocabularyMastery,
      removeVocabularyItem,
      startCallSession,
      updateCallSessionState,
      submitModerationReport,
      adminReviewReport,
      adminToggleUserSuspension,
      adminToggleLanguageCatalog,
      adminAddLanguageCatalog,
      adminAddInterestCatalog,
      adminUpdatePlatformSettings,
      adminResetUserPassword,
      adminGetUserAccountDetails,
      adminPromoteCurrentUser,
      markAllNotificationsRead,
    ]
  );

  return <PlatformContext.Provider value={value}>{children}</PlatformContext.Provider>;
}

export function usePlatform() {
  const ctx = useContext(PlatformContext);
  if (!ctx) {
    throw new Error('usePlatform must be used within a PlatformProvider');
  }
  return ctx;
}
