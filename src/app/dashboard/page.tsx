'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import {
  Compass,
  MessageSquare,
  BookOpen,
  PhoneCall,
  Sparkles,
  CheckCircle2,
  Clock,
  ArrowRight,
  UserCheck,
} from 'lucide-react';
import { usePlatform } from '@/components/providers/PlatformProvider';
import { rankLanguagePartners } from '@/lib/matching/engine';
import { AdSenseSlot } from '@/components/ads/AdSenseSlot';

export default function DashboardPage() {
  const {
    isHydrated,
    currentUser,
    store,
    respondToConversationRequest,
    loginWithDemoAccount,
  } = usePlatform();

  const blockedSet = useMemo(() => {
    if (!currentUser) return new Set<string>();
    const ids = new Set<string>();
    store.blocks.forEach((b) => {
      if (b.blocker_id === currentUser.id) ids.add(b.blocked_id);
      if (b.blocked_id === currentUser.id) ids.add(b.blocker_id);
    });
    return ids;
  }, [currentUser, store.blocks]);

  const topMatches = useMemo(() => {
    if (!currentUser) return [];
    return rankLanguagePartners(currentUser, store.profiles, blockedSet).slice(0, 3);
  }, [blockedSet, currentUser, store.profiles]);

  if (!isHydrated) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center text-sm text-slate-500">
        Cargando tu panel principal...
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-5">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm space-y-4">
          <h1 className="text-xl font-bold text-slate-900">Inicia sesión para ver tu panel</h1>
          <p className="text-xs text-slate-500">
            Accede con tu cuenta o inicia una sesión de prueba instantánea.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/login"
              className="px-5 py-2.5 rounded-xl bg-teal-600 text-white font-semibold text-xs"
            >
              Iniciar sesión
            </Link>
            <button
              type="button"
              onClick={() => loginWithDemoAccount('demo-user-elena')}
              className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-700"
            >
              Entrar como Elena (Demo)
            </button>
          </div>
        </div>
      </div>
    );
  }

  const incomingRequests = store.conversationRequests.filter(
    (r) => r.receiver_id === currentUser.id && r.status === 'pending'
  );

  const myConversations = store.conversations.filter(
    (c) => c.is_active && c.participant_ids.includes(currentUser.id)
  );

  const myVocabCount = store.vocabulary.filter((v) => v.user_id === currentUser.id).length;

  const myCallSessions = store.callSessions.filter(
    (s) => s.caller_id === currentUser.id || s.callee_id === currentUser.id
  );

  const totalCallMinutes = Math.round(
    myCallSessions.reduce((acc, s) => acc + s.duration_seconds, 0) / 60
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header Banner */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-teal-700 bg-teal-50 px-3 py-1 rounded-full">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Panel de Intercambio Lingüístico</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Hola, {currentUser.display_name}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 max-w-2xl">
            {currentUser.learning_goals ||
              'Configura tus objetivos para encontrar compañeros con idiomas complementarios.'}
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {currentUser.languages.map((l) => (
              <span
                key={l.id}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                  l.relation_type === 'native'
                    ? 'bg-slate-900 text-white'
                    : 'bg-teal-50 text-teal-800 border border-teal-200'
                }`}
              >
                {l.language_code.toUpperCase()} ·{' '}
                {l.relation_type === 'native' ? 'Nativo' : `Aprendiendo (${l.proficiency_level})`}
              </span>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/explore"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-xs"
          >
            <Compass className="w-4 h-4" />
            <span>Buscar compañeros</span>
          </Link>
          <Link
            href="/onboarding"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs"
          >
            <span>Editar idiomas y metas</span>
          </Link>
        </div>
      </div>

      {/* KPI Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium text-slate-500">Conversaciones activas</span>
            <MessageSquare className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{myConversations.length}</div>
          <Link href="/messages" className="text-[11px] font-semibold text-teal-700 hover:underline">
            Ir a bandeja →
          </Link>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium text-slate-500">Solicitudes pendientes</span>
            <UserCheck className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{incomingRequests.length}</div>
          <span className="text-[11px] text-slate-500">Por responder</span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium text-slate-500">Minutos en llamadas</span>
            <PhoneCall className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{totalCallMinutes} min</div>
          <span className="text-[11px] text-slate-500">
            {myCallSessions.length} sesiones registradas
          </span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium text-slate-500">Vocabulario guardado</span>
            <BookOpen className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{myVocabCount}</div>
          <Link href="/learning" className="text-[11px] font-semibold text-teal-700 hover:underline">
            Repasar expresiones →
          </Link>
        </div>
      </div>

      {/* Main Two-Column Grid */}
      <div className="grid lg:grid-cols-12 gap-8">
        {/* Left: Recommended Complementary Partners */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Compañeros con idiomas complementarios
              </h2>
              <p className="text-xs text-slate-500">
                Priorizados porque enseñan el idioma que practicas y aprenden tu idioma nativo.
              </p>
            </div>
            <Link
              href="/explore"
              className="text-xs font-semibold text-teal-700 hover:underline flex items-center gap-1"
            >
              <span>Ver todos</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {topMatches.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">
              No hay coincidencias disponibles en este momento. Ajusta tus idiomas en tu perfil.
            </div>
          ) : (
            <div className="space-y-3">
              {topMatches.map((match) => (
                <div
                  key={match.profile.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/u/${match.profile.username}`}
                        className="font-bold text-sm text-slate-900 hover:text-teal-700"
                      >
                        {match.profile.display_name}
                      </Link>
                      <span className="text-xs text-slate-400">
                        ({match.profile.country_code} · {match.profile.timezone})
                      </span>
                      {match.isComplementaryTandem && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                          Tándem Mutuo {match.compatibilityScore}%
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 line-clamp-2">{match.profile.bio}</p>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {match.complementaryReasons.map((reason, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-medium"
                        >
                          {reason}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex sm:flex-col gap-2 shrink-0">
                    <Link
                      href={`/u/${match.profile.username}`}
                      className="px-3.5 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 font-semibold text-xs text-center"
                    >
                      Ver perfil
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Incoming Requests & Recent Call History */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
            <h2 className="text-sm font-bold text-slate-900">
              Solicitudes de conversación recibidas ({incomingRequests.length})
            </h2>

            {incomingRequests.length === 0 ? (
              <p className="text-xs text-slate-500 py-3">
                No tienes solicitudes pendientes de revisión.
              </p>
            ) : (
              <div className="space-y-3">
                {incomingRequests.map((req) => {
                  const sender = store.profiles.find((p) => p.id === req.sender_id);
                  return (
                    <div
                      key={req.id}
                      className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">
                          {sender?.display_name ?? 'Usuario'}
                        </span>
                        <span className="text-[11px] px-2 py-0.5 rounded bg-teal-100 text-teal-800 font-semibold">
                          Idioma: {req.target_language_code.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 italic">“{req.intro_message}”</p>
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => respondToConversationRequest(req.id, 'accepted')}
                          className="flex-1 py-1.5 px-3 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold flex items-center justify-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Aceptar</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => respondToConversationRequest(req.id, 'rejected')}
                          className="py-1.5 px-3 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-600 text-xs font-semibold"
                        >
                          Rechazar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Call Session History */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">Historial reciente de llamadas</h2>
              <Clock className="w-4 h-4 text-slate-400" />
            </div>

            {myCallSessions.length === 0 ? (
              <p className="text-xs text-slate-500 py-2">
                Aún no has realizado llamadas de voz o video.
              </p>
            ) : (
              <ul className="space-y-2">
                {myCallSessions.slice(0, 4).map((call) => {
                  const otherId =
                    call.caller_id === currentUser.id ? call.callee_id : call.caller_id;
                  const other = store.profiles.find((p) => p.id === otherId);
                  return (
                    <li
                      key={call.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 text-xs"
                    >
                      <div>
                        <span className="font-semibold text-slate-800">
                          {other?.display_name ?? 'Compañero'}
                        </span>
                        <span className="text-slate-500 ml-1.5">
                          ({call.call_type === 'video' ? 'Video' : 'Audio'})
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-semibold text-slate-700">
                          {Math.floor(call.duration_seconds / 60)}m {call.duration_seconds % 60}s
                        </span>
                        <span className="ml-2 text-[10px] uppercase px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                          {call.status}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Non-intrusive AdSense Slot at the bottom of Dashboard */}
      <AdSenseSlot placement="dashboard" />
    </div>
  );
}
