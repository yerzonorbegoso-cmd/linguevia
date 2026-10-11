'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  Lock,
  Ban,
  Trash2,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { usePlatform } from '@/components/providers/PlatformProvider';
import { PrivacySettings } from '@/types/database';

export default function SettingsAndPrivacyPage() {
  const router = useRouter();
  const {
    isHydrated,
    currentUser,
    currentPrivateEmail,
    currentEmailVerified,
    store,
    completeOnboardingAndSaveProfile,
    updateConsentPreferences,
    unblockUser,
    deleteOwnAccount,
    loginWithDemoAccount,
  } = usePlatform();

  const [privacy, setPrivacy] = useState<PrivacySettings>({
    show_country: true,
    show_timezone: true,
    allow_calls_from_partners: true,
    allow_search_indexing: true,
    show_online_status: true,
  });

  const [adsPersonalized, setAdsPersonalized] = useState(false);
  const [adsNonPersonalized, setAdsNonPersonalized] = useState(true);
  const [analyticsConsent, setAnalyticsConsent] = useState(false);

  const [deletePhrase, setDeletePhrase] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    queueMicrotask(() => {
      setPrivacy(currentUser.privacy_settings);
      const consent = store.consents.find((c) => c.user_id === currentUser.id);
      if (consent) {
        setAdsPersonalized(consent.ads_personalized_consent);
        setAdsNonPersonalized(consent.ads_non_personalized_consent);
        setAnalyticsConsent(consent.analytics_consent);
      }
    });
  }, [currentUser, store.consents]);

  if (!isHydrated) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center text-sm text-slate-500">
        Cargando ajustes y preferencias de privacidad...
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 space-y-4">
          <h1 className="text-xl font-bold text-slate-900">Ajustes y Privacidad</h1>
          <p className="text-xs text-slate-500">
            Inicia sesión para gestionar tus controles de privacidad, consentimiento y bloqueos.
          </p>
          <div className="flex justify-center gap-3">
            <Link
              href="/login"
              className="px-5 py-2.5 rounded-xl bg-teal-600 text-white font-semibold text-xs"
            >
              Iniciar sesión
            </Link>
            <button
              type="button"
              onClick={() => loginWithDemoAccount('demo-user-elena')}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold"
            >
              Entrar como Elena (Demo)
            </button>
          </div>
        </div>
      </div>
    );
  }

  const myBlocks = store.blocks.filter((b) => b.blocker_id === currentUser.id);

  const handleSavePrivacy = (e: React.FormEvent) => {
    e.preventDefault();
    completeOnboardingAndSaveProfile({
      bio: currentUser.bio,
      learningGoals: currentUser.learning_goals,
      countryCode: currentUser.country_code,
      timezone: currentUser.timezone,
      languages: currentUser.languages,
      interestSlugs: currentUser.interest_slugs,
      availabilitySlots: currentUser.availability_slots,
      privacySettings: privacy,
    });
  };

  const handleSaveConsents = (e: React.FormEvent) => {
    e.preventDefault();
    updateConsentPreferences({
      ads_personalized_consent: adsPersonalized,
      ads_non_personalized_consent: adsNonPersonalized,
      analytics_consent: analyticsConsent,
    });
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeleteError(null);
    setDeleting(true);

    const res = await deleteOwnAccount(deletePhrase);
    setDeleting(false);

    if (!res.ok) {
      setDeleteError(res.error || 'Frase de confirmación incorrecta.');
      return;
    }

    router.push('/');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
          Ajustes, Privacidad y Consentimiento
        </h1>
        <p className="text-xs sm:text-sm text-slate-600">
          Controla qué información es visible en tu perfil público, administra tus usuarios
          bloqueados y gestiona tus derechos de privacidad y eliminación de datos.
        </p>
      </div>

      {/* Private Account Info (Owner Only) */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-teal-700">
          <Lock className="w-4 h-4" />
          <span>Datos privados de tu cuenta (Nunca visibles en tu perfil público)</span>
        </div>
        <div className="grid sm:grid-cols-3 gap-4 text-xs pt-1">
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="text-slate-400 font-semibold">Correo registrado</div>
            <div className="font-bold text-slate-800 mt-0.5">
              {currentPrivateEmail ?? 'Protegido'}
            </div>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="text-slate-400 font-semibold">Estado del correo</div>
            <div className="font-bold text-emerald-700 mt-0.5">
              {currentEmailVerified ? '✓ Verificado' : 'Pendiente de verificación'}
            </div>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="text-slate-400 font-semibold">Verificación de mayoría de edad</div>
            <div className="font-bold text-emerald-700 mt-0.5">✓ Adulto (+18) confirmado</div>
          </div>
        </div>
      </section>

      {/* Public Profile Visibility Controls */}
      <form
        onSubmit={handleSavePrivacy}
        className="rounded-3xl border border-slate-200 bg-white p-6 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-teal-600" />
            <span>Visibilidad del perfil y llamadas</span>
          </h2>
          <Link
            href="/onboarding"
            className="text-xs font-semibold text-teal-700 hover:underline"
          >
            Editar idiomas y biografía →
          </Link>
        </div>

        <div className="space-y-3 text-xs text-slate-700">
          <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 cursor-pointer">
            <span>Mostrar mi país (código ISO) en mi perfil público</span>
            <input
              type="checkbox"
              checked={privacy.show_country}
              onChange={(e) => setPrivacy({ ...privacy, show_country: e.target.checked })}
              className="rounded border-slate-300 text-teal-600"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 cursor-pointer">
            <span>Mostrar mi zona horaria para facilitar la coordinación de sesiones</span>
            <input
              type="checkbox"
              checked={privacy.show_timezone}
              onChange={(e) => setPrivacy({ ...privacy, show_timezone: e.target.checked })}
              className="rounded border-slate-300 text-teal-600"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 cursor-pointer">
            <span>Permitir que mis compañeros autorizados inicien llamadas de audio/video</span>
            <input
              type="checkbox"
              checked={privacy.allow_calls_from_partners}
              onChange={(e) =>
                setPrivacy({ ...privacy, allow_calls_from_partners: e.target.checked })
              }
              className="rounded border-slate-300 text-teal-600"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 cursor-pointer">
            <span>Aparecer en el explorador de emparejamiento de compañeros</span>
            <input
              type="checkbox"
              checked={privacy.allow_search_indexing}
              onChange={(e) =>
                setPrivacy({ ...privacy, allow_search_indexing: e.target.checked })
              }
              className="rounded border-slate-300 text-teal-600"
            />
          </label>
        </div>

        <button
          type="submit"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Guardar preferencias de visibilidad</span>
        </button>
      </form>

      {/* Advertising & GDPR Consent */}
      <form
        onSubmit={handleSaveConsents}
        className="rounded-3xl border border-slate-200 bg-white p-6 space-y-4"
      >
        <h2 className="text-base font-bold text-slate-900">
          Consentimiento publicitario y normativas regionales (RGPD / CCPA)
        </h2>
        <p className="text-xs text-slate-500">
          LinguaConnect se financia mediante publicidad no intrusiva. Aquí puedes elegir cómo se
          procesan los espacios publicitarios en tu sesión.
        </p>

        <div className="space-y-2.5 text-xs text-slate-700">
          <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 cursor-pointer">
            <span>Permitir anuncios contextuales no personalizados (Google AdSense NPA=1)</span>
            <input
              type="checkbox"
              checked={adsNonPersonalized}
              onChange={(e) => setAdsNonPersonalized(e.target.checked)}
              className="rounded border-slate-300 text-teal-600"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 cursor-pointer">
            <span>Permitir anuncios personalizados basados en intereses</span>
            <input
              type="checkbox"
              checked={adsPersonalized}
              onChange={(e) => setAdsPersonalized(e.target.checked)}
              className="rounded border-slate-300 text-teal-600"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 cursor-pointer">
            <span>Permitir métricas agregadas de rendimiento técnico</span>
            <input
              type="checkbox"
              checked={analyticsConsent}
              onChange={(e) => setAnalyticsConsent(e.target.checked)}
              className="rounded border-slate-300 text-teal-600"
            />
          </label>
        </div>

        <button
          type="submit"
          className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold"
        >
          Actualizar consentimiento
        </button>
      </form>

      {/* Blocked Users Management */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Ban className="w-4 h-4 text-rose-600" />
          <span>Usuarios bloqueados ({myBlocks.length})</span>
        </h2>

        {myBlocks.length === 0 ? (
          <p className="text-xs text-slate-500">No tienes ningún usuario bloqueado actualmente.</p>
        ) : (
          <ul className="space-y-2">
            {myBlocks.map((b) => {
              const blockedProfile = store.profiles.find((p) => p.id === b.blocked_id);
              return (
                <li
                  key={b.blocked_id}
                  className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs"
                >
                  <div>
                    <span className="font-bold text-slate-900">
                      {blockedProfile?.display_name ?? b.blocked_id}
                    </span>
                    <span className="text-slate-500 ml-2">({b.reason})</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => unblockUser(b.blocked_id)}
                    className="px-3 py-1 rounded-lg border border-slate-300 hover:bg-white font-semibold text-slate-700"
                  >
                    Desbloquear
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Permanent Account Deletion */}
      <section className="rounded-3xl border border-rose-200 bg-rose-50/40 p-6 space-y-4">
        <div className="flex items-center gap-2 text-rose-800 font-bold text-base">
          <AlertTriangle className="w-5 h-5 text-rose-600" />
          <h2>Eliminación permanente de cuenta y derecho al olvido</h2>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          Esta acción eliminará tu perfil, tus datos privados, tus solicitudes, vocabulario y
          mensajes asociados conforme a nuestra política de retención y privacidad.
        </p>

        {deleteError && (
          <div className="p-3 rounded-xl bg-rose-100 text-rose-900 text-xs font-medium">
            {deleteError}
          </div>
        )}

        <form onSubmit={handleDeleteAccount} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            required
            value={deletePhrase}
            onChange={(e) => setDeletePhrase(e.target.value)}
            placeholder='Escribe "ELIMINAR MI CUENTA" para confirmar'
            className="flex-1 px-3.5 py-2 rounded-xl border border-rose-300 bg-white text-xs"
          />
          <button
            type="submit"
            disabled={deleting}
            className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shrink-0"
          >
            <Trash2 className="w-4 h-4" />
            <span>{deleting ? 'Eliminando...' : 'Eliminar cuenta definitivamente'}</span>
          </button>
        </form>
      </section>
    </div>
  );
}
