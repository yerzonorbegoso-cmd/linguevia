'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Plus,
  Trash2,
  Star,
  SpellCheck,
  Sparkles,
  Languages,
} from 'lucide-react';
import { usePlatform } from '@/components/providers/PlatformProvider';
import { GUIDED_CONVERSATION_TOPICS } from '@/lib/learning/guided-prompts';

export default function LearningCenterPage() {
  const {
    isHydrated,
    currentUser,
    store,
    saveVocabularyItem,
    updateVocabularyMastery,
    removeVocabularyItem,
    loginWithDemoAccount,
  } = usePlatform();

  const [languageCode, setLanguageCode] = useState('en');
  const [term, setTerm] = useState('');
  const [translation, setTranslation] = useState('');
  const [contextExample, setContextExample] = useState('');

  if (!isHydrated) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12 text-center text-sm text-slate-500">
        Cargando tu cuaderno de aprendizaje...
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 space-y-4">
          <h1 className="text-xl font-bold text-slate-900">Centro de Aprendizaje Personal</h1>
          <p className="text-xs text-slate-500">
            Inicia sesión para consultar tu vocabulario guardado e historial de correcciones.
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

  const myVocab = store.vocabulary.filter((v) => v.user_id === currentUser.id);
  const myConversationIds = new Set(
    store.conversations
      .filter((c) => c.participant_ids.includes(currentUser.id))
      .map((c) => c.id)
  );
  const myCorrections = store.messages.filter(
    (m) =>
      myConversationIds.has(m.conversation_id) &&
      m.content_type === 'correction' &&
      m.correction_data
  );

  const handleAddVocab = (e: React.FormEvent) => {
    e.preventDefault();
    const res = saveVocabularyItem({
      language_code: languageCode,
      term,
      translation,
      context_example: contextExample,
    });
    if (res.ok) {
      setTerm('');
      setTranslation('');
      setContextExample('');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
          Centro de Aprendizaje y Vocabulario
        </h1>
        <p className="text-xs sm:text-sm text-slate-600">
          Consolida las expresiones aprendidas en tus conversaciones, repasa correcciones
          gramaticales y explora guías de conversación por nivel MCER.
        </p>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        {/* Left: Saved Vocabulary & Add Form */}
        <div className="lg:col-span-7 space-y-6">
          <form
            onSubmit={handleAddVocab}
            className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-teal-600" />
                <span>Añadir nueva palabra o expresión</span>
              </h2>
              <BookOpen className="w-4 h-4 text-slate-400" />
            </div>

            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Idioma
                </label>
                <select
                  value={languageCode}
                  onChange={(e) => setLanguageCode(e.target.value)}
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

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Expresión / Vocablo
                </label>
                <input
                  type="text"
                  required
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  placeholder="Ej. Break the ice"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Traducción o significado
                </label>
                <input
                  type="text"
                  required
                  value={translation}
                  onChange={(e) => setTranslation(e.target.value)}
                  placeholder="Romper el hielo al iniciar una charla"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Ejemplo en contexto
                </label>
                <input
                  type="text"
                  value={contextExample}
                  onChange={(e) => setContextExample(e.target.value)}
                  placeholder="Guided topics help break the ice."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>
            </div>

            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold"
            >
              Guardar en mi vocabulario
            </button>
          </form>

          {/* Vocabulary Cards */}
          <div className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
              Mi vocabulario guardado ({myVocab.length})
            </h2>

            {myVocab.length === 0 ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">
                Aún no tienes palabras guardadas. Puedes guardarlas desde cualquier mensaje del
                chat o usando el formulario superior.
              </div>
            ) : (
              myVocab.map((v) => (
                <div
                  key={v.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs flex items-start justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-teal-50 text-teal-800 text-[10px] font-bold uppercase">
                        {v.language_code}
                      </span>
                      <span className="font-bold text-sm text-slate-900">{v.term}</span>
                    </div>
                    <p className="text-xs text-slate-700 font-medium">→ {v.translation}</p>
                    {v.context_example && (
                      <p className="text-xs text-slate-500 italic">“{v.context_example}”</p>
                    )}

                    <div className="flex items-center gap-1 pt-1">
                      <span className="text-[10px] text-slate-400 mr-1">Dominio:</span>
                      {[1, 2, 3, 4, 5].map((lvl) => (
                        <button
                          key={lvl}
                          type="button"
                          onClick={() => updateVocabularyMastery(v.id, lvl as 1 | 2 | 3 | 4 | 5)}
                          aria-label={`Nivel de dominio ${lvl}`}
                          className={`${
                            lvl <= v.mastery_level ? 'text-amber-500' : 'text-slate-300'
                          }`}
                        >
                          <Star className="w-3.5 h-3.5 fill-current" />
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeVocabularyItem(v.id)}
                    aria-label="Eliminar vocablo"
                    className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Grammar Corrections History & Guided Prompts */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <SpellCheck className="w-4 h-4 text-teal-600" />
                <span>Historial de correcciones ({myCorrections.length})</span>
              </h2>
            </div>

            {myCorrections.length === 0 ? (
              <p className="text-xs text-slate-500">
                Aquí aparecerán las correcciones gramaticales intercambiadas en tus conversaciones.
              </p>
            ) : (
              <div className="space-y-3">
                {myCorrections.map((msg) => (
                  <div
                    key={msg.id}
                    className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1.5"
                  >
                    <div className="text-rose-600 line-through">
                      ✗ {msg.correction_data?.original_text}
                    </div>
                    <div className="font-bold text-emerald-700">
                      ✓ {msg.correction_data?.corrected_text}
                    </div>
                    {msg.correction_data?.explanation && (
                      <p className="text-slate-600 pt-1">
                        💡 {msg.correction_data.explanation}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-teal-600" />
                <span>Guías de práctica por nivel MCER</span>
              </h2>
              <Languages className="w-4 h-4 text-slate-400" />
            </div>

            <div className="space-y-3">
              {GUIDED_CONVERSATION_TOPICS.map((topic) => (
                <div
                  key={topic.id}
                  className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-1.5 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{topic.titleEs}</span>
                    <span className="px-2 py-0.5 rounded bg-teal-100 text-teal-800 font-bold">
                      {topic.level}
                    </span>
                  </div>
                  <p className="text-slate-600">{topic.promptEs}</p>
                  <div className="flex flex-wrap gap-1 pt-1">
                    {topic.keyVocabulary.map((kv, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded bg-white border border-slate-200 text-[10px] text-slate-600"
                      >
                        {kv}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
