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

  const addLanguageRow = (type: LanguageRelationType) => {
    setLanguages((prev) => [
      ...prev,
      {
        language_code: type === 'native' ? 'es' : 'fr',
        relation_type: type,
        proficiency_level: type === 'native' ? 'native' : 'A2',
        target_goal: '',
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

          {/* Languages */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Mis idiomas (Nativos y en Aprendizaje)
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => addLanguageRow('native')}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Añadir nativo</span>
                </button>
                <button
                  type="button"
                  onClick={() => addLanguageRow('learning')}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-xs font-semibold text-teal-800"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Añadir idioma a practicar</span>
                </button>
              </div>
            </div>

            <div className="space-y-2.5">
              {languages.map((row, idx) => (
                <div
                  key={idx}
                  className="grid sm:grid-cols-12 gap-2.5 items-center p-3 rounded-2xl border border-slate-200 bg-slate-50/70"
                >
                  <div className="sm:col-span-3">
                    <select
                      value={row.relation_type}
                      onChange={(e) => {
                        const rel = e.target.value as LanguageRelationType;
                        setLanguages((prev) =>
                          prev.map((item, i) =>
                            i === idx
                              ? {
                                  ...item,
                                  relation_type: rel,
                                  proficiency_level: rel === 'native' ? 'native' : 'B1',
                                }
                              : item
                          )
                        );
                      }}
                      className="w-full px-2.5 py-2 rounded-xl border border-slate-300 text-xs bg-white font-semibold"
                    >
                      <option value="native">Hablo Nativo</option>
                      <option value="learning">Aprendo / Practico</option>
                    </select>
                  </div>

                  <div className="sm:col-span-3">
                    <select
                      value={row.language_code}
                      onChange={(e) =>
                        setLanguages((prev) =>
                          prev.map((item, i) =>
                            i === idx ? { ...item, language_code: e.target.value } : item
                          )
                        )
                      }
                      className="w-full px-2.5 py-2 rounded-xl border border-slate-300 text-xs bg-white"
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

                  <div className="sm:col-span-2">
                    {row.relation_type === 'native' ? (
                      <span className="block px-2.5 py-2 rounded-xl bg-teal-100 text-teal-900 text-xs font-bold text-center">
                        Nativo
                      </span>
                    ) : (
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
                        className="w-full px-2.5 py-2 rounded-xl border border-slate-300 text-xs bg-white font-semibold"
                      >
                        <option value="A1">Nivel A1</option>
                        <option value="A2">Nivel A2</option>
                        <option value="B1">Nivel B1</option>
                        <option value="B2">Nivel B2</option>
                        <option value="C1">Nivel C1</option>
                        <option value="C2">Nivel C2</option>
                      </select>
                    )}
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
                      placeholder="Meta específica..."
                      className="w-full px-2.5 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                    />
                  </div>

                  <div className="sm:col-span-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => removeLanguageRow(idx)}
                      aria-label="Eliminar idioma"
                      className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
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
