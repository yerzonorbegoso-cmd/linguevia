'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  MessageSquare,
  CheckCircle2,
  XCircle,
  Sparkles,
  ArrowRight,
  Compass,
} from 'lucide-react';
import { usePlatform } from '@/components/providers/PlatformProvider';
import { isAuthorizedConversationParticipant } from '@/lib/security/rls-guard';

export default function MessagesInboxPage() {
  const router = useRouter();
  const {
    isHydrated,
    currentUser,
    store,
    respondToConversationRequest,
    loginWithDemoAccount,
  } = usePlatform();

  if (!isHydrated) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 text-center text-sm text-slate-500">
        Cargando bandeja de conversaciones...
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 space-y-4">
          <h1 className="text-xl font-bold text-slate-900">Bandeja privada de conversaciones</h1>
          <p className="text-xs text-slate-500">
            Inicia sesión para consultar tus chats privados y solicitudes de intercambio.
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

  const authorizedConversations = store.conversations
    .filter((c) => isAuthorizedConversationParticipant(c, store.blocks, currentUser.id))
    .sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());

  const incomingRequests = store.conversationRequests.filter(
    (r) => r.receiver_id === currentUser.id && r.status === 'pending'
  );

  const outgoingRequests = store.conversationRequests.filter(
    (r) => r.sender_id === currentUser.id && r.status === 'pending'
  );

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Bandeja de Conversaciones
          </h1>
          <p className="text-xs sm:text-sm text-slate-600">
            Tus conversaciones están protegidas por políticas de aislamiento (RLS): solo tú y tu
            compañero autorizado podéis leerlas.
          </p>
        </div>

        <Link
          href="/explore"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold self-start"
        >
          <Compass className="w-4 h-4" />
          <span>Encontrar más compañeros</span>
        </Link>
      </div>

      {/* Active Conversations */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
          Conversaciones activas ({authorizedConversations.length})
        </h2>

        {authorizedConversations.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center space-y-3">
            <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-800">
              Aún no tienes conversaciones activas.
            </p>
            <p className="text-xs text-slate-500">
              Acepta una solicitud pendiente o envía una desde el Explorador de compañeros.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {authorizedConversations.map((conv) => {
              const partnerId = conv.participant_ids.find((id) => id !== currentUser.id);
              const partner = store.profiles.find((p) => p.id === partnerId);
              const convMessages = store.messages.filter(
                (m) => m.conversation_id === conv.id && !m.deleted_at
              );
              const lastMsg = convMessages[convMessages.length - 1];
              const unreadCount = convMessages.filter(
                (m) => m.sender_id !== currentUser.id && m.delivery_status !== 'read'
              ).length;

              return (
                <Link
                  key={conv.id}
                  href={`/messages/${conv.id}`}
                  className="block rounded-2xl border border-slate-200 bg-white hover:border-teal-500 p-5 shadow-xs transition-all"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <span className="w-12 h-12 rounded-2xl bg-teal-600 text-white font-bold text-lg flex items-center justify-center shrink-0 uppercase">
                        {partner?.display_name.slice(0, 1) ?? 'U'}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-base text-slate-900 truncate">
                            {partner?.display_name ?? 'Compañero'}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-semibold">
                            Modo {conv.mode === 'guided' ? 'Práctica Guiada' : 'Libre'}
                          </span>
                          {unreadCount > 0 && (
                            <span className="px-2 py-0.5 rounded-full bg-teal-600 text-white text-[10px] font-bold">
                              {unreadCount} nuevo(s)
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 truncate mt-1">
                          {lastMsg
                            ? lastMsg.content_type === 'correction'
                              ? `✏️ Corrección: ${lastMsg.correction_data?.corrected_text}`
                              : lastMsg.content_type === 'voice'
                              ? '🎵 Nota de voz'
                              : lastMsg.body
                            : 'Conversación lista para empezar.'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 text-xs font-semibold text-teal-700">
                      <span className="hidden sm:inline">Abrir chat</span>
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Requests Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Incoming Requests */}
        <section className="rounded-3xl border border-slate-200 bg-white p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">
              Solicitudes recibidas ({incomingRequests.length})
            </h2>
            <Sparkles className="w-4 h-4 text-teal-600" />
          </div>

          {incomingRequests.length === 0 ? (
            <p className="text-xs text-slate-500 py-4">
              No tienes solicitudes entrantes pendientes.
            </p>
          ) : (
            <div className="space-y-3">
              {incomingRequests.map((req) => {
                const sender = store.profiles.find((p) => p.id === req.sender_id);
                return (
                  <div
                    key={req.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <Link
                        href={`/u/${sender?.username ?? ''}`}
                        className="font-bold text-xs text-slate-900 hover:underline"
                      >
                        {sender?.display_name ?? 'Usuario'}
                      </Link>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-teal-100 text-teal-800">
                        Idioma: {req.target_language_code.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">“{req.intro_message}”</p>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          const res = respondToConversationRequest(req.id, 'accepted');
                          if (res.ok && res.conversationId) {
                            router.push(`/messages/${res.conversationId}`);
                          }
                        }}
                        className="flex-1 py-2 px-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Aceptar y conversar</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => respondToConversationRequest(req.id, 'rejected')}
                        className="py-2 px-3 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-600 text-xs font-semibold flex items-center gap-1"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Rechazar</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Outgoing Requests */}
        <section className="rounded-3xl border border-slate-200 bg-white p-6 space-y-4">
          <h2 className="text-sm font-bold text-slate-900">
            Solicitudes enviadas ({outgoingRequests.length})
          </h2>

          {outgoingRequests.length === 0 ? (
            <p className="text-xs text-slate-500 py-4">
              No tienes solicitudes enviadas pendientes de respuesta.
            </p>
          ) : (
            <div className="space-y-3">
              {outgoingRequests.map((req) => {
                const receiver = store.profiles.find((p) => p.id === req.receiver_id);
                return (
                  <div
                    key={req.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900">
                        Para: {receiver?.display_name ?? 'Usuario'}
                      </span>
                      <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-semibold">
                        Pendiente
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">“{req.intro_message}”</p>
                    <button
                      type="button"
                      onClick={() => respondToConversationRequest(req.id, 'cancelled')}
                      className="text-xs font-semibold text-rose-600 hover:underline pt-1"
                    >
                      Cancelar solicitud
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
