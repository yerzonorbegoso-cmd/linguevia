'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Search,
  Filter,
  Sparkles,
  Send,
  Ban,
  Globe2,
  Clock,
  RotateCcw,
} from 'lucide-react';
import { usePlatform } from '@/components/providers/PlatformProvider';
import { PartnerMatchFilters, rankLanguagePartners } from '@/lib/matching/engine';
import { CefrLevel, UserProfile } from '@/types/database';
import { COUNTRY_OPTIONS } from '@/lib/store/demo-data';
import { AdSenseSlot } from '@/components/ads/AdSenseSlot';

export default function ExplorePartnersPage() {
  const {
    isHydrated,
    currentUser,
    store,
    sendConversationRequest,
    blockUser,
    loginWithDemoAccount,
  } = usePlatform();

  const [practiceLanguage, setPracticeLanguage] = useState('');
  const [teachLanguage, setTeachLanguage] = useState('');
  const [proficiencyLevel, setProficiencyLevel] = useState<CefrLevel | ''>('');
  const [countryCode, setCountryCode] = useState('');
  const [timezone, setTimezone] = useState('');
  const [interestSlug, setInterestSlug] = useState('');
  const [availabilityWindow, setAvailabilityWindow] = useState<
    'morning' | 'afternoon' | 'evening' | 'weekend' | ''
  >('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal state for sending a conversation request
  const [selectedCandidate, setSelectedCandidate] = useState<UserProfile | null>(null);
  const [introMessage, setIntroMessage] = useState(
    '¡Hola! Vi que tenemos idiomas complementarios. ¿Te gustaría practicar esta semana?'
  );
  const [targetLang, setTargetLang] = useState('es');
  const [requestError, setRequestError] = useState<string | null>(null);

  const blockedSet = useMemo(() => {
    if (!currentUser) return new Set<string>();
    const set = new Set<string>();
    store.blocks.forEach((b) => {
      if (b.blocker_id === currentUser.id) set.add(b.blocked_id);
      if (b.blocked_id === currentUser.id) set.add(b.blocker_id);
    });
    return set;
  }, [currentUser, store.blocks]);

  const filters: PartnerMatchFilters = useMemo(
    () => ({
      practiceLanguage: practiceLanguage || undefined,
      teachLanguage: teachLanguage || undefined,
      proficiencyLevel: proficiencyLevel || undefined,
      countryCode: countryCode || undefined,
      timezone: timezone || undefined,
      interestSlug: interestSlug || undefined,
      availabilityWindow: availabilityWindow || undefined,
      searchQuery: searchQuery || undefined,
    }),
    [
      availabilityWindow,
      countryCode,
      interestSlug,
      practiceLanguage,
      proficiencyLevel,
      searchQuery,
      teachLanguage,
      timezone,
    ]
  );

  const rankedMatches = useMemo(() => {
    if (!currentUser) return [];
    return rankLanguagePartners(currentUser, store.profiles, blockedSet, filters);
  }, [blockedSet, currentUser, filters, store.profiles]);

  const resetFilters = () => {
    setPracticeLanguage('');
    setTeachLanguage('');
    setProficiencyLevel('');
    setCountryCode('');
    setTimezone('');
    setInterestSlug('');
    setAvailabilityWindow('');
    setSearchQuery('');
  };

  if (!isHydrated) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center text-sm text-slate-500">
        Cargando explorador de compañeros...
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm space-y-4">
          <h1 className="text-xl font-bold text-slate-900">
            Inicia sesión para explorar la comunidad (+18)
          </h1>
          <p className="text-xs text-slate-500">
            El directorio de miembros solo es accesible para usuarios adultos autenticados.
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
              Probar como Elena (Demo)
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleSendRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCandidate) return;
    setRequestError(null);

    const res = sendConversationRequest(selectedCandidate.id, introMessage, targetLang);
    if (!res.ok) {
      setRequestError(res.error || 'No se pudo enviar la solicitud.');
      return;
    }
    setSelectedCandidate(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Explorador de Compañeros Lingüísticos
          </h1>
          <p className="text-xs sm:text-sm text-slate-600">
            Ordenado automáticamente por compatibilidad tándem (quien habla lo que practicas y
            aprende lo que enseñas).
          </p>
        </div>

        <button
          type="button"
          onClick={resetFilters}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 self-start"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Limpiar filtros</span>
        </button>
      </div>

      {/* Multi-Criteria Filter Bar */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
          <Filter className="w-4 h-4 text-teal-600" />
          <span>Filtros de emparejamiento</span>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label htmlFor="flt-practice" className="block text-[11px] font-semibold text-slate-600 mb-1">
              Idioma que quiero practicar
            </label>
            <select
              id="flt-practice"
              value={practiceLanguage}
              onChange={(e) => setPracticeLanguage(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
            >
              <option value="">Todos los idiomas</option>
              {store.languages
                .filter((l) => l.is_active)
                .map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.flag_emoji} {l.name_es}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label htmlFor="flt-teach" className="block text-[11px] font-semibold text-slate-600 mb-1">
              Idioma que puedo enseñar
            </label>
            <select
              id="flt-teach"
              value={teachLanguage}
              onChange={(e) => setTeachLanguage(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
            >
              <option value="">Cualquier idioma</option>
              {store.languages
                .filter((l) => l.is_active)
                .map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.flag_emoji} {l.name_es}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label htmlFor="flt-level" className="block text-[11px] font-semibold text-slate-600 mb-1">
              Nivel de competencia (MCER)
            </label>
            <select
              id="flt-level"
              value={proficiencyLevel}
              onChange={(e) => setProficiencyLevel(e.target.value as CefrLevel | '')}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
            >
              <option value="">Todos los niveles</option>
              <option value="A1">A1 (Principiante)</option>
              <option value="A2">A2 (Elemental)</option>
              <option value="B1">B1 (Intermedio)</option>
              <option value="B2">B2 (Intermedio alto)</option>
              <option value="C1">C1 (Avanzado)</option>
              <option value="C2">C2 (Maestría)</option>
            </select>
          </div>

          <div>
            <label htmlFor="flt-country" className="block text-[11px] font-semibold text-slate-600 mb-1">
              País
            </label>
            <select
              id="flt-country"
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
            >
              <option value="">Todos los países</option>
              {COUNTRY_OPTIONS.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="flt-interest" className="block text-[11px] font-semibold text-slate-600 mb-1">
              Interés compartido
            </label>
            <select
              id="flt-interest"
              value={interestSlug}
              onChange={(e) => setInterestSlug(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
            >
              <option value="">Todos los intereses</option>
              {store.interests
                .filter((i) => i.is_active)
                .map((i) => (
                  <option key={i.id} value={i.slug}>
                    {i.name_es}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label htmlFor="flt-avail" className="block text-[11px] font-semibold text-slate-600 mb-1">
              Disponibilidad
            </label>
            <select
              id="flt-avail"
              value={availabilityWindow}
              onChange={(e) =>
                setAvailabilityWindow(
                  e.target.value as 'morning' | 'afternoon' | 'evening' | 'weekend' | ''
                )
              }
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
            >
              <option value="">Cualquier franja</option>
              <option value="morning">Mañanas</option>
              <option value="afternoon">Tardes</option>
              <option value="evening">Noches</option>
              <option value="weekend">Fines de semana</option>
            </select>
          </div>

          <div>
            <label htmlFor="flt-tz" className="block text-[11px] font-semibold text-slate-600 mb-1">
              Zona horaria
            </label>
            <input
              id="flt-tz"
              type="text"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              placeholder="Ej. Europe/London"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
            />
          </div>

          <div>
            <label htmlFor="flt-search" className="block text-[11px] font-semibold text-slate-600 mb-1">
              Búsqueda por nombre o bio
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                id="flt-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Arquitectura, Londres..."
                className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-300 text-xs"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Results List */}
      {rankedMatches.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center space-y-3">
          <p className="text-sm font-semibold text-slate-800">
            No encontramos compañeros con esa combinación exacta de filtros.
          </p>
          <p className="text-xs text-slate-500">
            Prueba ampliando la franja horaria o limpiando los filtros activos.
          </p>
          <button
            type="button"
            onClick={resetFilters}
            className="px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-semibold"
          >
            Restablecer búsqueda
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-5">
          {rankedMatches.map((match) => {
            const p = match.profile;
            const nativeLangs = p.languages.filter((l) => l.relation_type === 'native');
            const learningLangs = p.languages.filter((l) => l.relation_type === 'learning');

            return (
              <article
                key={p.id}
                data-testid={`partner-card-${p.username}`}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col justify-between gap-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="w-11 h-11 rounded-2xl bg-teal-600 text-white font-bold text-base flex items-center justify-center uppercase">
                        {p.display_name.slice(0, 1)}
                      </span>
                      <div>
                        <Link
                          href={`/u/${p.username}`}
                          className="font-bold text-base text-slate-900 hover:text-teal-700"
                        >
                          {p.display_name}
                        </Link>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span className="inline-flex items-center gap-1">
                            <Globe2 className="w-3 h-3" />
                            {p.privacy_settings.show_country ? p.country_code : 'País privado'}
                          </span>
                          <span>·</span>
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {p.privacy_settings.show_timezone ? p.timezone : 'TZ privada'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                          match.isComplementaryTandem
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>{match.compatibilityScore}% Afinidad</span>
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">{p.bio}</p>

                  {/* Languages Badges */}
                  <div className="grid sm:grid-cols-2 gap-2 pt-1">
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="text-[10px] font-bold uppercase text-slate-400">
                        Habla Nativo
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {nativeLangs.map((l) => (
                          <span
                            key={l.id}
                            className="px-2 py-0.5 rounded bg-slate-900 text-white text-[11px] font-semibold"
                          >
                            {l.language_code.toUpperCase()}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-teal-50/60 border border-teal-100">
                      <div className="text-[10px] font-bold uppercase text-teal-700">
                        Practica / Aprende
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {learningLangs.map((l) => (
                          <span
                            key={l.id}
                            className="px-2 py-0.5 rounded bg-teal-600 text-white text-[11px] font-semibold"
                          >
                            {l.language_code.toUpperCase()} ({l.proficiency_level})
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Complementary reasons */}
                  {match.complementaryReasons.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {match.complementaryReasons.map((r, idx) => (
                        <span
                          key={idx}
                          className="text-[11px] px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 font-medium"
                        >
                          ✓ {r}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCandidate(p);
                        setTargetLang(nativeLangs[0]?.language_code || 'es');
                        setRequestError(null);
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Solicitar conversación</span>
                    </button>

                    <Link
                      href={`/u/${p.username}`}
                      className="px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700"
                    >
                      Perfil público
                    </Link>
                  </div>

                  <button
                    type="button"
                    onClick={() => blockUser(p.id, 'Bloqueado desde el explorador')}
                    title="Bloquear usuario"
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                  >
                    <Ban className="w-4 h-4" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Request Modal */}
      {selectedCandidate && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="max-w-md w-full rounded-3xl bg-white border border-slate-200 p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-slate-900">
              Enviar solicitud a {selectedCandidate.display_name}
            </h2>
            <p className="text-xs text-slate-500">
              Preséntate brevemente e indica qué idioma deseas practicar juntos.
            </p>

            {requestError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
                {requestError}
              </div>
            )}

            <form onSubmit={handleSendRequest} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Idioma principal del intercambio
                </label>
                <select
                  value={targetLang}
                  onChange={(e) => setTargetLang(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                >
                  {store.languages
                    .filter((l) => l.is_active)
                    .map((l) => (
                      <option key={l.code} value={l.code}>
                        {l.flag_emoji} {l.name_es}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mensaje de presentación
                </label>
                <textarea
                  rows={3}
                  required
                  value={introMessage}
                  onChange={(e) => setIntroMessage(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedCandidate(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-600"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold"
                >
                  Enviar solicitud
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <AdSenseSlot placement="explore" />
    </div>
  );
}
