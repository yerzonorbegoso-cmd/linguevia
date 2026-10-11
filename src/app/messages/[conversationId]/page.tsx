'use client';

import React, { use, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Send,
  Mic,
  Square,
  Phone,
  Video,
  Sparkles,
  BookMarked,
  Languages,
  CheckCheck,
  Flag,
  SpellCheck,
  ArrowLeft,
  ShieldAlert,
  Paperclip,
} from 'lucide-react';
import { usePlatform } from '@/components/providers/PlatformProvider';
import {
  isAuthorizedConversationParticipant,
  selectMessagesForViewer,
} from '@/lib/security/rls-guard';
import { GUIDED_CONVERSATION_TOPICS } from '@/lib/learning/guided-prompts';
import { ChatMessage, ReportReasonCategory } from '@/types/database';

const MAX_VOICE_BYTES = 5 * 1024 * 1024; // 5 MB strict limit

export default function PrivateChatPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = use(params);
  const router = useRouter();
  const {
    isHydrated,
    currentUser,
    store,
    sendMessage,
    markConversationRead,
    setConversationLearningMode,
    attachMessageTranslation,
    saveVocabularyItem,
    startCallSession,
    submitModerationReport,
    pushToast,
  } = usePlatform();

  const [textBody, setTextBody] = useState('');
  const [correctingMsg, setCorrectingMsg] = useState<ChatMessage | null>(null);
  const [correctedText, setCorrectedText] = useState('');
  const [correctionExplanation, setCorrectionExplanation] = useState('');
  const [translatingMsgId, setTranslatingMsgId] = useState<string | null>(null);
  const [translationBanner, setTranslationBanner] = useState<string | null>(null);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Report modal state
  const [reportingMsg, setReportingMsg] = useState<ChatMessage | null>(null);
  const [reportCategory, setReportCategory] = useState<ReportReasonCategory>('inappropriate_content');
  const [reportDesc, setReportDesc] = useState('');

  const conversation = store.conversations.find((c) => c.id === conversationId);
  const isAuthorized = isAuthorizedConversationParticipant(
    conversation,
    store.blocks,
    currentUser?.id ?? null
  );

  const visibleMessages = selectMessagesForViewer(
    store.messages,
    conversation,
    store.blocks,
    currentUser?.id ?? null
  );

  useEffect(() => {
    if (isAuthorized && conversation) {
      markConversationRead(conversation.id);
    }
  }, [conversation, isAuthorized, markConversationRead, visibleMessages.length]);

  if (!isHydrated) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 text-center text-sm text-slate-500">
        Verificando permisos de sala y cargando conversación...
      </div>
    );
  }

  if (!currentUser || !conversation || !isAuthorized) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <div
          data-testid="rls-chat-denied"
          className="rounded-3xl border border-rose-200 bg-white p-8 space-y-3"
        >
          <ShieldAlert className="w-10 h-10 text-rose-600 mx-auto" />
          <h1 className="text-xl font-bold text-slate-900">
            Acceso denegado a esta conversación (Política RLS)
          </h1>
          <p className="text-xs text-slate-600">
            Solo los participantes autorizados sin bloqueos activos pueden leer o enviar mensajes
            en esta sala privada.
          </p>
          <Link
            href="/messages"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-semibold"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Volver a mi bandeja</span>
          </Link>
        </div>
      </div>
    );
  }

  const partnerId = conversation.participant_ids.find((id) => id !== currentUser.id);
  const partner = store.profiles.find((p) => p.id === partnerId);

  const handleSendText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textBody.trim()) return;
    const res = sendMessage({
      conversationId: conversation.id,
      contentType: 'text',
      body: textBody,
    });
    if (!res.ok) {
      pushToast('error', res.error || 'No se pudo enviar el mensaje.');
      return;
    }
    setTextBody('');
  };

  const handleSendCorrection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctingMsg || !correctedText.trim()) return;
    const res = sendMessage({
      conversationId: conversation.id,
      contentType: 'correction',
      body: correctionExplanation.trim() || 'Sugerencia gramatical:',
      correctionData: {
        original_text: correctingMsg.body,
        corrected_text: correctedText.trim(),
        explanation: correctionExplanation.trim(),
        language_code: 'es',
      },
    });
    if (res.ok) {
      setCorrectingMsg(null);
      setCorrectedText('');
      setCorrectionExplanation('');
    }
  };

  const handleTranslateMessage = async (msg: ChatMessage) => {
    setTranslatingMsgId(msg.id);
    setTranslationBanner(null);

    try {
      const targetLang =
        currentUser.languages.find((l) => l.relation_type === 'native')?.language_code || 'es';
      const res = await fetch('/api/v1/learning/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
        },
        body: JSON.stringify({
          text: msg.body,
          targetLang,
        }),
      });

      const data = (await res.json()) as {
        configured: boolean;
        success: boolean;
        translatedText?: string;
        provider?: string;
        errorMessage?: string;
      };

      if (!res.ok || !data.success) {
        setTranslationBanner(
          data.errorMessage ||
            'El proveedor de traducción externa no está configurado en el servidor.'
        );
        return;
      }

      if (data.translatedText) {
        attachMessageTranslation(
          msg.id,
          data.translatedText,
          targetLang,
          data.provider || 'external'
        );
      }
    } finally {
      setTranslatingMsgId(null);
    }
  };

  const handleStartVoiceRecording = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        pushToast(
          'error',
          'Tu navegador no soporta grabación de micrófono directa. Puedes adjuntar un archivo de audio (máx. 5 MB).'
        );
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        if (blob.size > MAX_VOICE_BYTES) {
          pushToast('error', 'La nota de voz supera el límite máximo permitido de 5 MB.');
          return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = typeof reader.result === 'string' ? reader.result : '';
          sendMessage({
            conversationId: conversation.id,
            contentType: 'voice',
            body: 'Nota de voz',
            voiceUrl: dataUrl,
            voiceDurationSec: Math.max(1, recordSeconds),
            voiceSizeBytes: blob.size,
          });
        };
        reader.readAsDataURL(blob);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setRecordSeconds(1);
      timerRef.current = setInterval(() => {
        setRecordSeconds((s) => s + 1);
      }, 1000);
    } catch {
      pushToast(
        'error',
        'Permiso de micrófono denegado o dispositivo no disponible. Revisa los permisos del navegador.'
      );
    }
  };

  const handleStopVoiceRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const handleAudioFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_VOICE_BYTES) {
      pushToast(
        'error',
        `Archivo rechazado: ${(file.size / (1024 * 1024)).toFixed(2)} MB excede el límite de 5 MB.`
      );
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      sendMessage({
        conversationId: conversation.id,
        contentType: 'voice',
        body: `Nota de voz (${file.name})`,
        voiceUrl: dataUrl,
        voiceDurationSec: 12,
        voiceSizeBytes: file.size,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleLaunchCall = (callType: 'audio' | 'video') => {
    const res = startCallSession(conversation.id, callType);
    if (!res.ok || !res.session) {
      pushToast('error', res.error || 'No se pudo iniciar la llamada.');
      return;
    }
    router.push(`/call/${res.session.id}`);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 flex flex-col h-[calc(100vh-5.5rem)]">
      {/* Top Chat Header */}
      <div className="rounded-t-3xl border border-slate-200 bg-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/messages"
            aria-label="Volver a conversaciones"
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-600"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <span className="w-10 h-10 rounded-2xl bg-teal-600 text-white font-bold flex items-center justify-center uppercase">
            {partner?.display_name.slice(0, 1) ?? 'U'}
          </span>
          <div>
            <Link
              href={`/u/${partner?.username ?? ''}`}
              className="font-bold text-sm text-slate-900 hover:text-teal-700"
            >
              {partner?.display_name ?? 'Compañero'}
            </Link>
            <div className="text-[11px] text-slate-500">
              {partner?.country_code} · {partner?.timezone}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Mode Switcher: Free vs Guided Practice */}
          <button
            type="button"
            onClick={() => {
              const nextMode = conversation.mode === 'free' ? 'guided' : 'free';
              const randomPrompt =
                GUIDED_CONVERSATION_TOPICS[
                  Math.floor(Math.random() * GUIDED_CONVERSATION_TOPICS.length)
                ]?.promptEs;
              setConversationLearningMode(conversation.id, nextMode, randomPrompt);
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
              conversation.mode === 'guided'
                ? 'bg-teal-50 text-teal-800 border-teal-300'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>
              Modo: {conversation.mode === 'guided' ? 'Práctica Guiada' : 'Conversación Libre'}
            </span>
          </button>

          {/* Audio & Video Call Triggers */}
          <button
            type="button"
            onClick={() => handleLaunchCall('audio')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold"
          >
            <Phone className="w-3.5 h-3.5" />
            <span>Llamada Audio</span>
          </button>

          <button
            type="button"
            onClick={() => handleLaunchCall('video')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold"
          >
            <Video className="w-3.5 h-3.5" />
            <span>Videollamada</span>
          </button>
        </div>
      </div>

      {/* Guided Practice Topic Banner */}
      {conversation.mode === 'guided' && (
        <div className="border-x border-b border-teal-200 bg-teal-50/80 px-5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-teal-950">
          <div>
            <span className="font-bold uppercase tracking-wider text-[10px] text-teal-700 mr-2">
              Tema sugerido de práctica guiada:
            </span>
            <span className="font-medium">
              {conversation.active_topic_prompt || GUIDED_CONVERSATION_TOPICS[0].promptEs}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              const nextTopic =
                GUIDED_CONVERSATION_TOPICS[
                  Math.floor(Math.random() * GUIDED_CONVERSATION_TOPICS.length)
                ];
              setConversationLearningMode(conversation.id, 'guided', nextTopic.promptEs);
            }}
            className="text-teal-700 font-semibold hover:underline shrink-0"
          >
            Cambiar tema ↻
          </button>
        </div>
      )}

      {/* Translation Provider Status Banner (Never simulates AI/Translation if unconfigured) */}
      {translationBanner && (
        <div className="border-x border-b border-amber-200 bg-amber-50 px-5 py-2 text-xs text-amber-900 flex items-center justify-between gap-2">
          <span>{translationBanner}</span>
          <button
            type="button"
            onClick={() => setTranslationBanner(null)}
            className="font-bold text-amber-800"
          >
            ✕
          </button>
        </div>
      )}

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto border-x border-slate-200 bg-slate-50/60 p-4 sm:p-6 space-y-4">
        {visibleMessages.map((msg) => {
          const isMine = msg.sender_id === currentUser.id;
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-xl rounded-2xl p-4 space-y-2 shadow-2xs ${
                  isMine
                    ? 'bg-teal-600 text-white rounded-br-none'
                    : 'bg-white border border-slate-200 text-slate-900 rounded-bl-none'
                }`}
              >
                {msg.content_type === 'correction' && msg.correction_data ? (
                  <div className="space-y-2">
                    <div className="text-[11px] font-bold uppercase tracking-wider opacity-90 flex items-center gap-1">
                      <SpellCheck className="w-3.5 h-3.5" />
                      <span>Corrección gramatical</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-black/15 text-xs space-y-1">
                      <div className="line-through opacity-80">
                        ✗ {msg.correction_data.original_text}
                      </div>
                      <div className="font-bold">✓ {msg.correction_data.corrected_text}</div>
                    </div>
                    {msg.correction_data.explanation && (
                      <p className="text-xs leading-relaxed opacity-95">
                        💡 {msg.correction_data.explanation}
                      </p>
                    )}
                  </div>
                ) : msg.content_type === 'voice' ? (
                  <div className="space-y-1.5">
                    <div className="text-xs font-semibold flex items-center gap-2">
                      <Mic className="w-4 h-4" />
                      <span>
                        Nota de voz ({msg.voice_duration_sec ?? 5}s ·{' '}
                        {Math.round((msg.voice_size_bytes ?? 2048) / 1024)} KB / máx. 5 MB)
                      </span>
                    </div>
                    {msg.voice_url && (
                      <audio controls src={msg.voice_url} className="h-8 max-w-[240px]" />
                    )}
                  </div>
                ) : (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.body}</p>
                )}

                {msg.translation_data && (
                  <div className="pt-2 border-t border-white/20 text-xs italic opacity-90">
                    🌐 [{msg.translation_data.target_lang.toUpperCase()}]:{' '}
                    {msg.translation_data.translated_text}
                  </div>
                )}

                {/* Message Footer Metadata & Learning Actions */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-[10px] opacity-80">
                  <span>
                    {new Date(msg.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>

                  <div className="flex items-center gap-2">
                    {!isMine && msg.content_type === 'text' && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setCorrectingMsg(msg);
                            setCorrectedText(msg.body);
                            setCorrectionExplanation('');
                          }}
                          className="underline hover:opacity-100 inline-flex items-center gap-0.5"
                        >
                          <SpellCheck className="w-3 h-3" />
                          <span>Corregir</span>
                        </button>

                        <button
                          type="button"
                          disabled={translatingMsgId === msg.id}
                          onClick={() => handleTranslateMessage(msg)}
                          className="underline hover:opacity-100 inline-flex items-center gap-0.5"
                        >
                          <Languages className="w-3 h-3" />
                          <span>
                            {translatingMsgId === msg.id ? 'Traduciendo...' : 'Traducir'}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            saveVocabularyItem({
                              language_code:
                                partner?.languages.find((l) => l.relation_type === 'native')
                                  ?.language_code || 'en',
                              term: msg.body.slice(0, 80),
                              translation: 'Pendiente de anotar significado personal',
                              context_example: msg.body,
                              source_message_id: msg.id,
                            })
                          }
                          className="underline hover:opacity-100 inline-flex items-center gap-0.5"
                        >
                          <BookMarked className="w-3 h-3" />
                          <span>Guardar vocabulario</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setReportingMsg(msg)}
                          className="underline hover:opacity-100 inline-flex items-center gap-0.5 text-rose-600"
                        >
                          <Flag className="w-3 h-3" />
                          <span>Denunciar</span>
                        </button>
                      </>
                    )}

                    {isMine && (
                      <span className="inline-flex items-center gap-0.5">
                        <CheckCheck className="w-3.5 h-3.5" />
                        <span>{msg.delivery_status === 'read' ? 'Leído' : 'Entregado'}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Inline Grammar Correction Composer */}
      {correctingMsg && (
        <form
          onSubmit={handleSendCorrection}
          className="border-x border-t border-teal-200 bg-teal-50 p-4 space-y-2.5"
        >
          <div className="flex items-center justify-between text-xs font-bold text-teal-900">
            <span>Enviar corrección gramatical para: “{correctingMsg.body}”</span>
            <button
              type="button"
              onClick={() => setCorrectingMsg(null)}
              className="text-slate-500 hover:text-slate-800"
            >
              Cancelar
            </button>
          </div>
          <div className="grid sm:grid-cols-2 gap-2">
            <input
              type="text"
              required
              value={correctedText}
              onChange={(e) => setCorrectedText(e.target.value)}
              placeholder="Frase corregida..."
              className="px-3 py-2 rounded-xl border border-teal-300 bg-white text-xs"
            />
            <input
              type="text"
              value={correctionExplanation}
              onChange={(e) => setCorrectionExplanation(e.target.value)}
              placeholder="Explicación breve de la regla o sugerencia..."
              className="px-3 py-2 rounded-xl border border-teal-300 bg-white text-xs"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold"
          >
            Enviar corrección estructurada
          </button>
        </form>
      )}

      {/* Bottom Message Composer & Voice Note Controls */}
      <form
        onSubmit={handleSendText}
        className="rounded-b-3xl border border-slate-200 bg-white p-3.5 flex items-center gap-2"
      >
        {isRecording ? (
          <button
            type="button"
            onClick={handleStopVoiceRecording}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-bold animate-pulse"
          >
            <Square className="w-3.5 h-3.5" />
            <span>Detener ({recordSeconds}s)</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleStartVoiceRecording}
            title="Grabar nota de voz (máx. 5 MB)"
            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600"
          >
            <Mic className="w-4 h-4" />
          </button>
        )}

        <label
          title="Adjuntar nota de voz (máx. 5 MB)"
          className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 cursor-pointer"
        >
          <Paperclip className="w-4 h-4" />
          <input
            type="file"
            accept="audio/*"
            onChange={handleAudioFileUpload}
            className="hidden"
          />
        </label>

        <input
          type="text"
          value={textBody}
          onChange={(e) => setTextBody(e.target.value)}
          placeholder="Escribe un mensaje en el idioma que practicas..."
          className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
        />

        <button
          type="submit"
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs"
        >
          <Send className="w-4 h-4" />
          <span className="hidden sm:inline">Enviar</span>
        </button>
      </form>

      {/* Report Message Modal */}
      {reportingMsg && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="max-w-md w-full rounded-3xl bg-white border border-slate-200 p-6 shadow-2xl space-y-4">
            <h2 className="text-base font-bold text-slate-900">Denunciar mensaje</h2>
            <p className="text-xs text-slate-500">Mensaje: “{reportingMsg.body}”</p>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const res = await submitModerationReport({
                  reportedUserId: reportingMsg.sender_id,
                  conversationId: conversation.id,
                  messageId: reportingMsg.id,
                  reasonCategory: reportCategory,
                  description: reportDesc,
                });
                if (res.ok) {
                  setReportingMsg(null);
                  setReportDesc('');
                }
              }}
              className="space-y-3"
            >
              <select
                value={reportCategory}
                onChange={(e) => setReportCategory(e.target.value as ReportReasonCategory)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
              >
                <option value="inappropriate_content">Contenido inapropiado</option>
                <option value="harassment">Acoso</option>
                <option value="spam">Spam</option>
                <option value="underage_suspicion">Sospecha de menor de 18 años</option>
              </select>
              <textarea
                rows={3}
                required
                minLength={10}
                value={reportDesc}
                onChange={(e) => setReportDesc(e.target.value)}
                placeholder="Explica el motivo de la denuncia (mín. 10 caracteres)..."
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setReportingMsg(null)}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-semibold"
                >
                  Enviar reporte
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
