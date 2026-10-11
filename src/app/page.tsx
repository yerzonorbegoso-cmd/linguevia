'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Globe2,
  ShieldCheck,
  MessageSquare,
  Video,
  Sparkles,
  Users,
  ArrowRight,
  Lock,
  CheckCircle2,
} from 'lucide-react';
import { usePlatform } from '@/components/providers/PlatformProvider';
import { getPublicEnv } from '@/lib/env';

export default function HomePage() {
  const router = useRouter();
  const { currentUser, store, loginWithDemoAccount } = usePlatform();
  const env = getPublicEnv();

  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-br from-slate-900 via-slate-900 to-teal-950 text-white py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-500/15 border border-teal-400/30 text-teal-300 text-xs font-semibold">
              <ShieldCheck className="w-4 h-4" />
              <span>Comunidad Exclusiva para Adultos (+18) · Segura y Verificada</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
              Aprende idiomas reales conversando con hablantes nativos de todo el mundo.
            </h1>

            <p className="text-base sm:text-lg text-slate-300 max-w-2xl leading-relaxed">
              Emparejamiento inteligente por intereses lingüísticos complementarios, chat en
              tiempo real con correcciones gramaticales estructuradas, notas de voz y llamadas
              WebRTC 1-a-1 sin grabaciones ocultas.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              {currentUser ? (
                <>
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-sm transition-colors shadow-lg"
                  >
                    <span>Ir a mi Panel Principal</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    href="/explore"
                    className="inline-flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-semibold text-sm transition-colors"
                  >
                    <span>Explorar compañeros</span>
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/register"
                    className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-sm transition-colors shadow-lg"
                  >
                    <span>Crear cuenta gratuita (+18)</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-semibold text-sm transition-colors"
                  >
                    <span>Ya tengo cuenta</span>
                  </Link>
                </>
              )}
            </div>

            <div className="grid grid-cols-3 gap-4 pt-6 border-t border-slate-800 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
                <span>Privacidad con RLS en cada tabla</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
                <span>Sin publicar correo ni fecha de nacimiento</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
                <span>Backend compartido Web + Flutter</span>
              </div>
            </div>
          </div>

          {/* Interactive Language & Demo Switcher Card */}
          <div className="lg:col-span-5">
            <div className="rounded-3xl border border-slate-700/80 bg-slate-800/80 backdrop-blur p-6 shadow-2xl space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-white">Idiomas activos en catálogo</h2>
                  <p className="text-xs text-slate-400">
                    Emparejamiento por nivel MCER (A1 a C2 y nativo)
                  </p>
                </div>
                <Globe2 className="w-6 h-6 text-teal-400" />
              </div>

              <div className="flex flex-wrap gap-2">
                {store.languages
                  .filter((l) => l.is_active)
                  .map((lang) => (
                    <span
                      key={lang.code}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700 text-xs font-medium text-slate-200"
                    >
                      <span>{lang.flag_emoji}</span>
                      <span>{lang.name_es}</span>
                    </span>
                  ))}
              </div>

              {env.demoMode && (
                <div className="rounded-2xl border border-teal-500/30 bg-teal-950/40 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-teal-300">
                      Entorno de Demostración Verificable
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded bg-teal-500/20 text-teal-200">
                      Datos Ficticios
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">
                    Prueba acceso instantáneo con perfiles ficticios preconfigurados (puedes abrir
                    otra ventana o navegador con otra cuenta para probar chat y llamadas en vivo):
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        loginWithDemoAccount('demo-user-elena');
                        router.push('/dashboard');
                      }}
                      className="text-left p-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-900 border border-slate-700 transition-colors"
                    >
                      <div className="text-xs font-bold text-white">🇪🇸 Elena Vargas (Admin)</div>
                      <div className="text-[11px] text-slate-400">Nativo ES · Aprende EN (B2)</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        loginWithDemoAccount('demo-user-liam');
                        router.push('/dashboard');
                      }}
                      className="text-left p-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-900 border border-slate-700 transition-colors"
                    >
                      <div className="text-xs font-bold text-white">🇬🇧 Liam O’Connor (User)</div>
                      <div className="text-[11px] text-slate-400">Nativo EN · Aprende ES (B1)</div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Core Pillars */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 space-y-10">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Diseñado para un aprendizaje auténtico y seguro
          </h2>
          <p className="text-sm text-slate-600">
            Cada módulo prioriza la reciprocidad lingüística, la protección de datos personales y
            la claridad pedagógica.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900">Emparejamiento Tándem</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Algoritmo que prioriza compañeros que hablan como nativos el idioma que practicas y
              aprenden el idioma que tú enseñas.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <MessageSquare className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900">Chat y Correcciones</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Mensajes en tiempo real, notas de voz (máx. 5 MB), correcciones gramaticales línea a
              línea y cuaderno de vocabulario personal.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Video className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900">Audio y Video WebRTC</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Llamadas individuales con tokens temporales firmados en el backend, control de
              permisos de cámara/micrófono y reconexión automática.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900">Seguridad +18 y RLS</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Verificación de mayoría de edad, bloqueo instantáneo, moderación de denuncias y
              ocultación de correo y fecha de nacimiento en perfiles públicos.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-teal-600" />
            <span>
              <strong>LinguaConnect</strong> (Nombre provisional) · Plataforma para mayores de 18
              años.
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/help" className="hover:text-slate-900 underline">
              Centro de Ayuda y Privacidad
            </Link>
            <Link href="/login" className="hover:text-slate-900 underline">
              Acceso
            </Link>
            <Link href="/register" className="hover:text-slate-900 underline">
              Registro +18
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
