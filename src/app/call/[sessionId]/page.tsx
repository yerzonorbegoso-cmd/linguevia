'use client';

import React, { use, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  RefreshCw,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
} from 'lucide-react';
import { usePlatform } from '@/components/providers/PlatformProvider';
import { areUsersBlocked, isAuthorizedConversationParticipant } from '@/lib/security/rls-guard';

export default function CallSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = use(params);
  const {
    isHydrated,
    currentUser,
    store,
    updateCallSessionState,
    pushToast,
  } = usePlatform();

  const [tokenState, setTokenState] = useState<{
    loading: boolean;
    configured: boolean;
    mode: string;
    roomName: string;
    message?: string;
    error?: string;
  }>({
    loading: true,
    configured: false,
    mode: 'checking',
    roomName: '',
  });

  const [micEnabled, setMicEnabled] = useState(true);
  const [camEnabled, setCamEnabled] = useState(true);
  const [mediaPermissionStatus, setMediaPermissionStatus] = useState<
    'prompt' | 'granted' | 'denied' | 'fallback_simulated'
  >('prompt');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [reconnecting, setReconnecting] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const session = store.callSessions.find((s) => s.id === sessionId);
  const conversation = session
    ? store.conversations.find((c) => c.id === session.conversation_id)
    : undefined;

  const isParticipant = Boolean(
    currentUser &&
      session &&
      (session.caller_id === currentUser.id || session.callee_id === currentUser.id) &&
      isAuthorizedConversationParticipant(conversation, store.blocks, currentUser.id) &&
      !areUsersBlocked(store.blocks, session.caller_id, session.callee_id)
  );

  // Request temporary backend WebRTC token
  const fetchRoomToken = useCallback(async () => {
    if (!currentUser || !session) return;
    setTokenState((prev) => ({ ...prev, loading: true, error: undefined }));

    try {
      const blocked = areUsersBlocked(store.blocks, session.caller_id, session.callee_id);
      const res = await fetch('/api/v1/livekit/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
          'x-user-name': currentUser.display_name,
          'x-participant-authorized': isParticipant ? 'true' : 'false',
          'x-users-blocked': blocked ? 'true' : 'false',
        },
        body: JSON.stringify({
          conversationId: session.conversation_id,
          sessionId: session.id,
          callType: session.call_type,
        }),
      });

      const data = (await res.json()) as {
        configured?: boolean;
        mode?: string;
        roomName?: string;
        message?: string;
        error?: string;
      };

      if (!res.ok) {
        setTokenState({
          loading: false,
          configured: false,
          mode: 'denied',
          roomName: '',
          error: data.error || 'No autorizado para entrar en la sala WebRTC.',
        });
        return;
      }

      setTokenState({
        loading: false,
        configured: Boolean(data.configured),
        mode: data.mode || 'local_webrtc_signaling',
        roomName: data.roomName || session.room_name,
        message: data.message,
      });
    } catch {
      setTokenState({
        loading: false,
        configured: false,
        mode: 'error',
        roomName: '',
        error: 'Error de red al validar token de llamada.',
      });
    }
  }, [currentUser, isParticipant, session, store.blocks]);

  useEffect(() => {
    if (isHydrated && currentUser && session) {
      queueMicrotask(() => {
        void fetchRoomToken();
      });
    }
  }, [currentUser, fetchRoomToken, isHydrated, session]);

  // Request camera/microphone permissions safely
  const requestMediaPermissions = useCallback(async () => {
    if (!session) return;
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setMediaPermissionStatus('fallback_simulated');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: session.call_type === 'video',
      });
      mediaStreamRef.current = stream;
      if (localVideoRef.current && session.call_type === 'video') {
        localVideoRef.current.srcObject = stream;
      }
      setMediaPermissionStatus('granted');
    } catch {
      // Headless or hardware-less browser fallback so call flow remains testable
      setMediaPermissionStatus('fallback_simulated');
    }
  }, [session]);

  useEffect(() => {
    if (session && (session.status === 'ringing' || session.status === 'accepted')) {
      queueMicrotask(() => {
        void requestMediaPermissions();
      });
    }
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [requestMediaPermissions, session]);

  // Call duration counter while status === 'accepted'
  useEffect(() => {
    if (!session || session.status !== 'accepted') return;
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [session]);

  if (!isHydrated) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center text-sm text-slate-500">
        Inicializando sala de llamada segura...
      </div>
    );
  }

  if (!currentUser || !session || !isParticipant || tokenState.error) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <div
          data-testid="call-access-denied"
          className="rounded-3xl border border-rose-200 bg-white p-8 space-y-3"
        >
          <AlertCircle className="w-10 h-10 text-rose-600 mx-auto" />
          <h1 className="text-xl font-bold text-slate-900">
            Sala de llamada restringida o no encontrada
          </h1>
          <p className="text-xs text-slate-600">
            {tokenState.error ||
              'El backend ha rechazado el token temporal porque no eres participante autorizado de esta sesión.'}
          </p>
          <Link
            href="/messages"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-semibold"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Volver a mis mensajes</span>
          </Link>
        </div>
      </div>
    );
  }

  const partnerId =
    session.caller_id === currentUser.id ? session.callee_id : session.caller_id;
  const partner = store.profiles.find((p) => p.id === partnerId);

  const toggleMic = () => {
    const next = !micEnabled;
    setMicEnabled(next);
    mediaStreamRef.current?.getAudioTracks().forEach((t) => {
      t.enabled = next;
    });
  };

  const toggleCam = () => {
    const next = !camEnabled;
    setCamEnabled(next);
    mediaStreamRef.current?.getVideoTracks().forEach((t) => {
      t.enabled = next;
    });
  };

  const handleSimulateReconnect = () => {
    setReconnecting(true);
    updateCallSessionState(session.id, session.status, { incrementReconnect: true });
    setTimeout(() => {
      fetchRoomToken();
      setReconnecting(false);
      pushToast('info', 'Conexión WebRTC restablecida.');
    }, 900);
  };

  const handleEndCall = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
    }
    updateCallSessionState(session.id, 'ended', {
      durationSeconds: Math.max(elapsedSeconds, session.duration_seconds),
      endReason: 'ended_by_participant',
    });
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      {/* Top Security & Status Header */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900 text-white p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 text-[11px] font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Sala 1-a-1 · Sin grabación ({tokenState.roomName})</span>
            </span>
            <span
              data-testid="call-status-badge"
              className="px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-xs font-bold uppercase"
            >
              Estado: {session.status}
            </span>
          </div>
          <h1 className="text-lg sm:text-xl font-bold">
            {session.call_type === 'video' ? 'Videollamada' : 'Llamada de voz'} con{' '}
            {partner?.display_name ?? 'Compañero'}
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-[11px] text-slate-400">Duración de sesión</div>
            <div className="font-mono text-lg font-bold text-teal-400">
              {String(Math.floor(elapsedSeconds / 60)).padStart(2, '0')}:
              {String(elapsedSeconds % 60).padStart(2, '0')}
            </div>
          </div>
          <Link
            href={`/messages/${session.conversation_id}`}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold"
          >
            Volver al chat
          </Link>
        </div>
      </div>

      {/* Provider & Hardware Notice */}
      {tokenState.message && (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600 flex flex-wrap items-center justify-between gap-2">
          <span>{tokenState.message}</span>
          <span className="font-semibold text-teal-700">
            Permisos multimedia:{' '}
            {mediaPermissionStatus === 'granted'
              ? 'Cámara/Micrófono activos'
              : ' Canal de señalización verificado'}
          </span>
        </div>
      )}

      {/* Video / Audio Stage Grid */}
      <div className="grid md:grid-cols-2 gap-5">
        {/* Local Participant Tile */}
        <div className="relative rounded-3xl bg-slate-900 border border-slate-800 aspect-video overflow-hidden flex flex-col items-center justify-center text-white p-6">
          {session.call_type === 'video' &&
          camEnabled &&
          mediaPermissionStatus === 'granted' ? (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-teal-600 text-white font-extrabold text-2xl flex items-center justify-center uppercase">
              {currentUser.display_name.slice(0, 1)}
            </div>
          )}
          <div className="absolute bottom-4 left-4 px-3 py-1 rounded-xl bg-black/60 backdrop-blur text-xs font-semibold">
            Tú ({currentUser.display_name}) · {micEnabled ? '🎙️ Mic activo' : '🔇 Silenciado'}
          </div>
        </div>

        {/* Remote Partner Tile */}
        <div className="relative rounded-3xl bg-slate-900 border border-slate-800 aspect-video overflow-hidden flex flex-col items-center justify-center text-white p-6 space-y-3">
          <div className="w-20 h-20 rounded-full bg-indigo-600 text-white font-extrabold text-2xl flex items-center justify-center uppercase">
            {partner?.display_name.slice(0, 1) ?? 'P'}
          </div>
          <div className="text-center space-y-1">
            <div className="font-bold text-base">{partner?.display_name ?? 'Compañero'}</div>
            <p className="text-xs text-slate-300">
              {reconnecting
                ? 'Reconectando transporte WebRTC...'
                : session.status === 'ringing'
                ? 'Llamando... Esperando que acepte en su navegador'
                : session.status === 'accepted'
                ? 'Conectado en tiempo real'
                : `Llamada ${session.status}`}
            </p>
          </div>

          {session.status === 'ringing' && session.callee_id === currentUser.id && (
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => updateCallSessionState(session.id, 'accepted')}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs"
              >
                Aceptar llamada ahora
              </button>
              <button
                type="button"
                onClick={() =>
                  updateCallSessionState(session.id, 'rejected', {
                    endReason: 'rejected_by_callee',
                  })
                }
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs"
              >
                Rechazar
              </button>
            </div>
          )}

          {/* Allow caller in single-browser test or multi-tab test to transition ringing -> accepted */}
          {session.status === 'ringing' && session.caller_id === currentUser.id && (
            <p className="text-[11px] text-teal-300 max-w-xs text-center">
              Abre otra pestaña o navegador con la cuenta de {partner?.display_name} para ver el
              aviso de llamada entrante y aceptarla en vivo.
            </p>
          )}
        </div>
      </div>

      {/* Call Control Bar (Clearly separated from any ad space; no ads are rendered on call pages) */}
      <div className="rounded-3xl border border-slate-200 bg-white p-4 flex flex-wrap items-center justify-center gap-3 shadow-sm">
        <button
          type="button"
          onClick={toggleMic}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-semibold border ${
            micEnabled
              ? 'bg-slate-100 text-slate-800 border-slate-200'
              : 'bg-amber-50 text-amber-900 border-amber-300'
          }`}
        >
          {micEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
          <span>{micEnabled ? 'Silenciar micrófono' : 'Activar micrófono'}</span>
        </button>

        {session.call_type === 'video' && (
          <button
            type="button"
            onClick={toggleCam}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-semibold border ${
              camEnabled
                ? 'bg-slate-100 text-slate-800 border-slate-200'
                : 'bg-amber-50 text-amber-900 border-amber-300'
            }`}
          >
            {camEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
            <span>{camEnabled ? 'Apagar cámara' : 'Encender cámara'}</span>
          </button>
        )}

        <button
          type="button"
          onClick={handleSimulateReconnect}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700"
        >
          <RefreshCw className={`w-4 h-4 ${reconnecting ? 'animate-spin' : ''}`} />
          <span>Reconectar red ({session.reconnect_count})</span>
        </button>

        {session.status !== 'ended' && session.status !== 'rejected' ? (
          <button
            type="button"
            onClick={handleEndCall}
            data-testid="end-call-button"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
          >
            <PhoneOff className="w-4 h-4" />
            <span>Finalizar llamada</span>
          </button>
        ) : (
          <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-emerald-50 text-emerald-800 text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4" />
            <span>Sesión finalizada y guardada en el historial</span>
          </div>
        )}
      </div>
    </div>
  );
}
