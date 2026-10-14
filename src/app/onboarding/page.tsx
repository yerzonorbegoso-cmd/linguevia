'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Globe2, Plus, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import { usePlatform } from '@/components/providers/PlatformProvider';
import { AvailabilitySlot, CefrLevel, LanguageRelationType } from '@/types/database';
import { COUNTRY_OPTIONS } from '@/lib/store/demo-data';

interface DraftLang {
  language_code: string;
  relation_type: LanguageRelationType;
  proficiency_level: CefrLevel;
  target_goal: string;
}

const WINDOWS: Array<{ id: AvailabilitySlot['window']; label: string }> = [
  { id: 'morning', label: 'Mañanas (08:00 - 12:00)' },
  { id: 'afternoon', label: 'Tardes (12:00 - 18:00)' },
  { id: 'evening', label: 'Noches (18:00 - 22:00)' },
  { id: 'weekend', label: 'Fines de semana' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { isHydrated, currentUser, store, completeOnboardingAndSaveProfile } = usePlatform();

  const [bio, setBio] = useState('');
  const [learningGoals, setLearningGoals] = useState('');
  const [countryCode, setCountryCode] = useState('PE');
  const [timezone, setTimezone] = useState('America/Lima');
  const [languages, setLanguages] = useState<DraftLang[]>([
    { language_code: 'es', relation_type: 'native', proficiency_level: 'native', target_goal: 'Enseñar conversación y cultura' },
    { language_code: 'en', relation_type: 'learning', proficiency_level: 'B1', target_goal: 'Mejorar fluidez oral' },
  ]);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([
    'travel-culture',
    'technology',
  ]);
  const [selectedWindows, setSelectedWindows] = useState<Array<AvailabilitySlot['window']>>([
    'evening',
    'weekend',
  ]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser) return;
    queueMicrotask(() => {
      setBio(currentUser.bio || '');
      setLearningGoals(currentUser.learning_goals || '');
      setCountryCode(currentUser.country_code || 'PE');
      setTimezone(currentUser.timezone || 'America/Lima');
      if (currentUser.languages.length > 0) {
        setLanguages(
          currentUser.languages.map((l) => ({
            language_code: l.language_code,
            relation_type: l.relation_type,
            proficiency_level: l.proficiency_level,
            target_goal: l.target_goal,
          }))
        );
      }
      if (currentUser.interest_slugs.length > 0) {
        setSelectedInterests(currentUser.interest_slugs);
      }
    });
  }, [currentUser]);

  if (!isHydrated) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center text-sm text-slate-500">
        Cargando asistente de configuración...
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-4">
        <p className="text-sm text-slate-600">
          Debes iniciar sesión para configurar tu perfil lingüístico.
        </p>
        <Link
          href="/login"
          className="inline-block px-5 py-2.5 rounded-xl bg-teal-600 text-white font-semibold text-sm"
        >
          Iniciar sesión
        </Link>
      </div>
    );
  }

  const nativeLanguages = languages.filter((l) => l.relation_type === 'native');
  const learningLanguages = languages.filter((l) => l.relation_type === 'learning');

  const addNativeLanguage = () => {
    if (nativeLanguages.length >= 4) return;
    const usedCodes = languages.map((l) => l.language_code);
    const available = store.languages.find((l) => l.is_active && !usedCodes.includes(l.code));
    const nextCode = available?.code || 'en';
    setLanguages((prev) => [
      ...prev,
      {
        language_code: nextCode,
        relation_type: 'native',
        proficiency_level: 'native',
        target_goal: 'Compartir mi idioma nativo y cultura',
      },
    ]);
  };

  const addLearningLanguage = () => {
    if (learningLanguages.length >= 4) return;
    const usedCodes = languages.map((l) => l.language_code);
    const available = store.languages.find((l) => l.is_active && !usedCodes.includes(l.code));
    const nextCode = available?.code || (usedCodes.includes('en') ? 'fr' : 'en');
    setLanguages((prev) => [
      ...prev,
      {
        language_code: nextCode,
        relation_type: 'learning',
        proficiency_level: 'B1',
        target_goal: 'Practicar fluidez y conversación',
      },
    ]);
  };

  const removeLanguageRow = (idx: number) => {
    setLanguages((prev) => prev.filter((_, i) => i !== idx));
  };

  const toggleInterest = (slug: string) => {
    setSelectedInterests((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  };

  const toggleWindow = (win: AvailabilitySlot['window']) => {
    setSelectedWindows((prev) =>
      prev.includes(win) ? prev.filter((w) => w !== win) : [...prev, win]
    );
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const availabilitySlots: AvailabilitySlot[] = selectedWindows.map((w) => ({
      day: w === 'weekend' ? 'sat' : 'tue',
      window: w,
    }));

    const res = completeOnboardingAndSaveProfile({
      bio,
      learningGoals,
      countryCode,
      timezone,
      languages,
      interestSlugs: selectedInterests,
      availabilitySlots,
    });

    if (!res.ok) {
      setError(res.error || 'Verifica los idiomas seleccionados.');
      return;
    }

    router.push('/dashboard');
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-slate-900">
              Configuración inicial de tu perfil lingüístico
            </h1>
            <p className="text-xs text-slate-500">
              Estos datos se utilizan para encontrar compañeros con idiomas e intereses
              complementarios.
            </p>
          </div>
          <Globe2 className="w-8 h-8 text-teal-600 shrink-0" />
        </div>

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* Location & Timezone */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="onb-country" className="block text-xs font-semibold text-slate-700">
                País
              </label>
              <select
                id="onb-country"
                value={countryCode}
                onChange={(e) => {
                  const code = e.target.value;
                  setCountryCode(code);
                  const found = COUNTRY_OPTIONS.find((c) => c.code === code);
                  if (found) setTimezone(found.defaultTimezone);
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white"
              >
                {COUNTRY_OPTIONS.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="onb-tz" className="block text-xs font-semibold text-slate-700">
                Zona horaria
              </label>
              <input
                id="onb-tz"
                type="text"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
              />
            </div>
          </div>

          {/* Bio & Learning Goals */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="onb-bio" className="block text-xs font-semibold text-slate-700">
                Presentación pública (Bio)
              </label>
              <textarea
                id="onb-bio"
                rows={3}
                required
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Cuéntale a la comunidad sobre tus aficiones y cómo te gusta practicar idiomas..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="onb-goals" className="block text-xs font-semibold text-slate-700">
                Objetivos de aprendizaje
              </label>
              <input
                id="onb-goals"
                type="text"
                required
                value={learningGoals}
                onChange={(e) => setLearningGoals(e.target.value)}
                placeholder="Ej. Practicar 20 min en cada idioma dos veces por semana con correcciones."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
              />
            </div>
          </div>

          {/* Section 1: Native / Spoken Languages (1 to 4) */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Idiomas que hablo / domino
                  </span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                    {nativeLanguages.length} / 4
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Indica tu lengua materna o los idiomas que hablas con fluidez (mínimo 1, máximo 4).
                </p>
              </div>

              {nativeLanguages.length < 4 && (
                <button
                  type="button"
                  onClick={addNativeLanguage}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Añadir idioma que hablo</span>
                </button>
              )}
            </div>

            <div className="space-y-3">
              {languages.map((row, idx) => {
                if (row.relation_type !== 'native') return null;

                return (
                  <div
                    key={idx}
                    className="grid sm:grid-cols-12 gap-2.5 items-center p-3 rounded-2xl border border-slate-200 bg-slate-50/70"
                  >
                    <div className="sm:col-span-5">
                      <select
                        value={row.language_code}
                        onChange={(e) =>
                          setLanguages((prev) =>
                            prev.map((item, i) =>
                              i === idx ? { ...item, language_code: e.target.value } : item
                            )
                          )
                        }
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white font-medium"
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

                    <div className="sm:col-span-3">
                      <span className="block px-3 py-2 rounded-xl bg-teal-100 text-teal-900 text-xs font-bold text-center">
                        Dominio / Nativo
                      </span>
                    </div>

                    <div className="sm:col-span-3">
                      <input
                        type="text"
                        value={row.target_goal}
                        onChange={(e) =>
                          setLanguages((prev) =>
                            prev.map((item, i) =>
                              i === idx ? { ...item, target_goal: e.target.value } : item
                            )
                          )
                        }
                        placeholder="Nota o enfoque..."
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                      />
                    </div>

                    <div className="sm:col-span-1 flex justify-end">
                      {nativeLanguages.length > 1 ? (
                        <button
                          type="button"
                          onClick={() => removeLanguageRow(idx)}
                          aria-label="Eliminar idioma que hablo"
                          className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-medium px-1">Principal</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 2: Learning Languages (0 to 4, Optional) */}
          <div className="rounded-2xl border border-teal-200/80 bg-teal-50/30 p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-teal-100 pb-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-teal-950">
                    Idiomas que deseo aprender o practicar
                  </span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">
                    {learningLanguages.length} / 4
                  </span>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                    Opcional
                  </span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Puedes añadir hasta 4 idiomas con tu nivel actual. Si solo deseas enseñar o conversar
                  en los que dominas, puedes dejarlo vacío.
                </p>
              </div>

              {learningLanguages.length < 4 && (
                <button
                  type="button"
                  onClick={addLearningLanguage}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Añadir idioma para aprender</span>
                </button>
              )}
            </div>

            {learningLanguages.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-teal-200 bg-white/70 text-center text-xs text-slate-500">
                No has seleccionado ningún idioma por aprender. Es opcional; pulsa el botón de arriba si deseas agregar hasta 4 idiomas.
              </div>
            ) : (
              <div className="space-y-3">
                {languages.map((row, idx) => {
                  if (row.relation_type !== 'learning') return null;

                  return (
                    <div
                      key={idx}
                      className="grid sm:grid-cols-12 gap-2.5 items-center p-3 rounded-2xl border border-teal-100 bg-white"
                    >
                      <div className="sm:col-span-4">
                        <select
                          value={row.language_code}
                          onChange={(e) =>
                            setLanguages((prev) =>
                              prev.map((item, i) =>
                                i === idx ? { ...item, language_code: e.target.value } : item
                              )
                            )
                          }
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white font-medium"
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

                      <div className="sm:col-span-3">
                        <select
                          value={row.proficiency_level}
                          onChange={(e) =>
                            setLanguages((prev) =>
                              prev.map((item, i) =>
                                i === idx
                                  ? { ...item, proficiency_level: e.target.value as CefrLevel }
                                  : item
                              )
                            )
                          }
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white font-semibold text-teal-800"
                        >
                          <option value="A1">Nivel A1 (Principiante)</option>
                          <option value="A2">Nivel A2 (Básico)</option>
                          <option value="B1">Nivel B1 (Intermedio)</option>
                          <option value="B2">Nivel B2 (Intermedio Alto)</option>
                          <option value="C1">Nivel C1 (Avanzado)</option>
                          <option value="C2">Nivel C2 (Maestría)</option>
                        </select>
                      </div>

                      <div className="sm:col-span-4">
                        <input
                          type="text"
                          value={row.target_goal}
                          onChange={(e) =>
                            setLanguages((prev) =>
                              prev.map((item, i) =>
                                i === idx ? { ...item, target_goal: e.target.value } : item
                              )
                            )
                          }
                          placeholder="Meta (ej. hablar con nativos, viajar)..."
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                        />
                      </div>

                      <div className="sm:col-span-1 flex justify-end">
                        <button
                          type="button"
                          onClick={() => removeLanguageRow(idx)}
                          aria-label="Eliminar idioma por aprender"
                          className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Interests */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Intereses de conversación
            </label>
            <div className="flex flex-wrap gap-2">
              {store.interests
                .filter((i) => i.is_active)
                .map((interest) => {
                  const active = selectedInterests.includes(interest.slug);
                  return (
                    <button
                      key={interest.id}
                      type="button"
                      onClick={() => toggleInterest(interest.slug)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                        active
                          ? 'bg-teal-600 text-white border-teal-600'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {interest.name_es}
                    </button>
                  );
                })}
            </div>
          </div>

          {/* Availability */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Disponibilidad horaria habitual
            </label>
            <div className="grid sm:grid-cols-2 gap-2">
              {WINDOWS.map((win) => {
                const active = selectedWindows.includes(win.id);
                return (
                  <button
                    key={win.id}
                    type="button"
                    onClick={() => toggleWindow(win.id)}
                    className={`p-3 rounded-xl border text-left text-xs font-medium transition-colors ${
                      active
                        ? 'border-teal-600 bg-teal-50 text-teal-900 font-semibold'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {win.label}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 px-5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Guardar perfil y entrar a Linguevia</span>
          </button>
        </form>
      </div>
    </div>
  );
}
