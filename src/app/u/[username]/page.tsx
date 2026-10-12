'use client';

import React, { use, useState } from 'react';
import Link from 'next/link';
import {
  Globe2,
  Clock,
  ShieldCheck,
  Send,
  Flag,
  Ban,
  ArrowLeft,
  Lock,
} from 'lucide-react';
import { usePlatform } from '@/components/providers/PlatformProvider';
import { selectSafePublicProfile } from '@/lib/security/rls-guard';
import { ReportReasonCategory } from '@/types/database';
import { AdSenseSlot } from '@/components/ads/AdSenseSlot';

export default function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = use(params);
  const {
    isHydrated,
    currentUser,
    store,
    sendConversationRequest,
    blockUser,
    submitModerationReport,
  } = usePlatform();

  const [showReportModal, setShowReportModal] = useState(false);
  const [reportCategory, setReportCategory] = useState<ReportReasonCategory>('spam');
  const [reportDesc, setReportDesc] = useState('');
  const [blockOnReport, setBlockOnReport] = useState(true);

  if (!isHydrated) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center text-sm text-slate-500">
        Cargando perfil público...
      </div>
    );
  }

  const rawTarget = store.profiles.find(
    (p) => p.username.toLowerCase() === decodeURIComponent(username).toLowerCase()
  );

  const safeProfile = selectSafePublicProfile(
    rawTarget,
    store.blocks,
    currentUser?.id ?? null
  );

  if (!safeProfile) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 space-y-3">
          <h1 className="text-xl font-bold text-slate-900">Perfil no disponible</h1>
          <p className="text-xs text-slate-500">
            Este usuario no existe, ha sido suspendido o existe una restricción de privacidad/bloqueo.
          </p>
          <Link
            href="/explore"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-semibold"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Volver al explorador</span>
          </Link>
        </div>
      </div>
    );
  }

  const isOwnProfile = currentUser?.id === safeProfile.id;

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await submitModerationReport({
      reportedUserId: safeProfile.id,
      reasonCategory: reportCategory,
      description: reportDesc,
      blockImmediately: blockOnReport,
    });
    if (res.ok) {
      setShowReportModal(false);
      setReportDesc('');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <Link
        href="/explore"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Volver al explorador de compañeros</span>
      </Link>

      <div
        data-testid="public-profile-card"
        className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-6"
      >
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-teal-600 text-white font-extrabold text-2xl flex items-center justify-center uppercase">
              {safeProfile.display_name.slice(0, 1)}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900">{safeProfile.display_name}</h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200 text-[11px] font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Adulto +18 verificado</span>
                </span>
              </div>
              <p className="text-xs text-slate-500">@{safeProfile.username}</p>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 pt-1">
                <span className="inline-flex items-center gap-1">
                  <Globe2 className="w-3.5 h-3.5 text-teal-600" />
                  <span>País: {safeProfile.country_code}</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-teal-600" />
                  <span>Zona horaria: {safeProfile.timezone}</span>
                </span>
              </div>
            </div>
          </div>

          {isOwnProfile && (
            <Link
              href="/onboarding"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs"
            >
              <span>Editar mis idiomas y preferencias de aprendizaje</span>
            </Link>
          )}

          {!isOwnProfile && currentUser && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  sendConversationRequest(
                    safeProfile.id,
                    `¡Hola ${safeProfile.display_name}! Me gustaría practicar idiomas contigo.`,
                    safeProfile.languages.find((l) => l.relation_type === 'native')
                      ?.language_code || 'es'
                  )
                }
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Solicitar conversación</span>
              </button>

              <button
                type="button"
                onClick={() => setShowReportModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 hover:bg-amber-50 hover:text-amber-800 text-xs font-semibold text-slate-600"
              >
                <Flag className="w-3.5 h-3.5" />
                <span>Denunciar</span>
              </button>

              <button
                type="button"
                onClick={() => blockUser(safeProfile.id, 'Bloqueado desde perfil público')}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 hover:bg-rose-50 hover:text-rose-700 text-xs font-semibold text-slate-600"
              >
                <Ban className="w-3.5 h-3.5" />
                <span>Bloquear</span>
              </button>
            </div>
          )}
        </div>

        {/* Privacy Notice Badge */}
        <div
          data-testid="privacy-protection-notice"
          className="rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3 text-xs text-slate-600 flex items-center gap-2.5"
        >
          <Lock className="w-4 h-4 text-teal-600 shrink-0" />
          <span>
            <strong>Protección de Privacidad Linguevia:</strong> El correo electrónico, la
            fecha de nacimiento y la ubicación precisa nunca se muestran en ningún perfil público.
          </span>
        </div>

        {/* Bio & Goals */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Sobre mí
            </h2>
            <p className="text-sm text-slate-700 leading-relaxed">
              {safeProfile.bio || 'Este usuario aún no ha añadido una biografía.'}
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Objetivos de aprendizaje
            </h2>
            <p className="text-sm text-slate-700 leading-relaxed">
              {safeProfile.learning_goals || 'Practicar conversación fluida y vocabulario cotidiano.'}
            </p>
          </div>
        </div>

        {/* Languages */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Idiomas nativos y en práctica
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {safeProfile.languages.map((l) => {
              const langMeta = store.languages.find((cat) => cat.code === l.language_code);
              return (
                <div
                  key={l.id}
                  className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/60 flex items-center justify-between"
                >
                  <div>
                    <div className="font-bold text-sm text-slate-900">
                      {langMeta?.flag_emoji} {langMeta?.name_es ?? l.language_code.toUpperCase()}
                    </div>
                    {l.target_goal && (
                      <p className="text-xs text-slate-500 mt-0.5">{l.target_goal}</p>
                    )}
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                      l.relation_type === 'native'
                        ? 'bg-slate-900 text-white'
                        : 'bg-teal-600 text-white'
                    }`}
                  >
                    {l.relation_type === 'native' ? 'Nativo' : `Nivel ${l.proficiency_level}`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Interests & Availability */}
        <div className="grid sm:grid-cols-2 gap-6 pt-2">
          <div className="space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Intereses culturales
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {safeProfile.interest_slugs.map((slug) => {
                const cat = store.interests.find((i) => i.slug === slug);
                return (
                  <span
                    key={slug}
                    className="px-3 py-1 rounded-xl bg-slate-100 text-slate-700 text-xs font-medium"
                  >
                    {cat?.name_es ?? slug}
                  </span>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Franjas disponibles
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {safeProfile.availability_slots.map((slot, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 rounded-xl bg-teal-50 text-teal-800 border border-teal-200 text-xs font-medium"
                >
                  {slot.day.toUpperCase()} · {slot.window}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* AdSense slot automatically suppresses itself if safeProfile has a pending report! */}
      <AdSenseSlot placement="explore" targetUserId={safeProfile.id} />

      {/* Report Modal */}
      {showReportModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="max-w-md w-full rounded-3xl bg-white border border-slate-200 p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-slate-900">
              Denunciar perfil de {safeProfile.display_name}
            </h2>
            <p className="text-xs text-slate-500">
              Nuestro equipo de moderación revisará el reporte. Los espacios publicitarios se
              desactivan inmediatamente en perfiles bajo moderación.
            </p>

            <form onSubmit={handleReportSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Motivo de la denuncia
                </label>
                <select
                  value={reportCategory}
                  onChange={(e) => setReportCategory(e.target.value as ReportReasonCategory)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                >
                  <option value="spam">Spam o publicidad no deseada</option>
                  <option value="harassment">Acoso o conducta irrespetuosa</option>
                  <option value="inappropriate_content">Contenido inapropiado</option>
                  <option value="underage_suspicion">Sospecha de menor de 18 años</option>
                  <option value="scam_or_commercial">Estafa o intento comercial</option>
                  <option value="hate_speech">Discurso de odio</option>
                  <option value="other">Otro motivo</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Descripción detallada (mín. 10 caracteres)
                </label>
                <textarea
                  rows={3}
                  required
                  minLength={10}
                  value={reportDesc}
                  onChange={(e) => setReportDesc(e.target.value)}
                  placeholder="Explica qué ocurrió para ayudar a los moderadores..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={blockOnReport}
                  onChange={(e) => setBlockOnReport(e.target.checked)}
                  className="rounded border-slate-300 text-teal-600"
                />
                <span>Bloquear también a este usuario inmediatamente</span>
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-600"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold"
                >
                  Enviar denuncia
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
