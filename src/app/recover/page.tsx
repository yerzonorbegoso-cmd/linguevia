'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  KeyRound,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  HelpCircle,
  Lock,
  User,
  Mail,
  ShieldAlert,
  Clock,
  Send,
  ExternalLink,
} from 'lucide-react';
import { usePlatform } from '@/components/providers/PlatformProvider';

export default function RecoverPasswordPage() {
  const router = useRouter();
  const {
    getSecurityQuestionForUser,
    resetPasswordWithSecurityAnswer,
    submitPasswordResetRequest,
  } = usePlatform();

  // Mode: 'admin_request' (Primary & recommended) or 'security_question'
  const [mode, setMode] = useState<'admin_request' | 'security_question'>('admin_request');

  // Form states for Admin Request (Email recovery)
  const [reqUsername, setReqUsername] = useState('');
  const [reqContactEmail, setReqContactEmail] = useState('');
  const [reqNotes, setReqNotes] = useState('');
  const [reqSubmittedTicket, setReqSubmittedTicket] = useState<{
    ticketId: string;
    username: string;
    email: string;
  } | null>(null);

  // Form states for Security Question recovery
  const [secStep, setSecStep] = useState<'find' | 'answer'>('find');
  const [secIdentifier, setSecIdentifier] = useState('');
  const [secQuestion, setSecQuestion] = useState<string | null>(null);
  const [secAnswer, setSecAnswer] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLockedWithoutQuestion, setIsLockedWithoutQuestion] = useState(false);

  // Status and messages
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Handler for Admin Recovery Request via Email
  const handleSubmitAdminRequest = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanUser = reqUsername.trim().toLowerCase().replace(/^@/, '');
    const cleanEmail = reqContactEmail.trim().toLowerCase();

    if (!cleanUser) {
      setError('Por favor, introduce tu nombre de usuario registrado.');
      return;
    }
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError('Por favor, introduce un correo electrónico de contacto válido.');
      return;
    }

    const res = submitPasswordResetRequest({
      username: cleanUser,
      contactEmail: cleanEmail,
      notes: reqNotes.trim() || undefined,
    });

    if (!res.ok) {
      setError(res.error || 'No se pudo registrar la solicitud.');
      return;
    }

    setReqSubmittedTicket({
      ticketId: res.ticketId || `reset-${Date.now()}`,
      username: cleanUser,
      email: cleanEmail,
    });
  };

  // Handler for Security Question Step 1: Find User
  const handleFindSecurityUser = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLockedWithoutQuestion(false);

    const clean = secIdentifier.trim().toLowerCase().replace(/^@/, '');
    if (!clean) {
      setError('Por favor, ingresa tu nombre de usuario o correo registrado.');
      return;
    }

    const res = getSecurityQuestionForUser(clean);
    if (!res.ok) {
      if (res.error?.includes('no tiene configurada una pregunta secreta')) {
        setIsLockedWithoutQuestion(true);
      }
      setError(res.error || 'No se pudo encontrar la cuenta.');
      return;
    }

    setSecQuestion(res.question || null);
    setSecStep('answer');
  };

  // Handler for Security Question Step 2: Answer & Reset
  const handleAnswerAndReset = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError('La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden. Por favor, asegúrate de que sean iguales.');
      return;
    }
    if (!secAnswer.trim()) {
      setError('Debes ingresar la respuesta a tu pregunta secreta.');
      return;
    }

    const res = resetPasswordWithSecurityAnswer(secIdentifier, secAnswer, newPassword);
    if (!res.ok) {
      setError(res.error || 'Respuesta incorrecta. No se pudo verificar tu identidad.');
      return;
    }

    setSuccessMessage('¡Identidad verificada con éxito! Contraseña restablecida. Redirigiendo a tu cuenta...');
    setTimeout(() => {
      router.push('/dashboard');
    }, 1500);
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-10">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="w-11 h-11 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center">
            <KeyRound className="w-5 h-5" />
          </div>
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Volver a Iniciar sesión</span>
          </Link>
        </div>

        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900">Recuperación de contraseña</h1>
          <p className="text-xs text-slate-500">
            Solicita al Administrador el restablecimiento de tu contraseña o utiliza tu pregunta secreta registrada.
          </p>
        </div>

        {/* Navigation Selector */}
        {!reqSubmittedTicket && !successMessage && (
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl">
            <button
              type="button"
              onClick={() => {
                setMode('admin_request');
                setError(null);
              }}
              className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                mode === 'admin_request'
                  ? 'bg-white text-teal-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Solicitar por Correo</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('security_question');
                setError(null);
              }}
              className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                mode === 'security_question'
                  ? 'bg-white text-teal-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Pregunta Secreta</span>
            </button>
          </div>
        )}

        {/* Global Error Banner */}
        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* MODE 1: ADMIN REQUEST VIA CONTACT EMAIL (DEFAULT & REQUIRED) */}
        {mode === 'admin_request' && (
          <div className="space-y-4">
            {/* 24-HOUR NOTICE BANNER (CRITICAL USER REQUIREMENT) */}
            <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 space-y-1.5 text-xs text-amber-900">
              <div className="flex items-center gap-2 font-bold text-amber-950">
                <Clock className="w-4 h-4 text-amber-700 shrink-0" />
                <span>Aviso de tiempo de respuesta (Hasta 24 horas)</span>
              </div>
              <p className="leading-relaxed">
                Por motivos de seguridad y verificación manual de cuentas, <strong>el reseteo de la contraseña podría demorar hasta 24 horas</strong>. El Administrador verificará tu usuario en el registro maestro y te responderá con tu contraseña restablecida al correo electrónico que indiques a continuación.
              </p>
            </div>

            {reqSubmittedTicket ? (
              /* Success screen after submitting ticket */
              <div className="rounded-3xl border border-teal-200 bg-teal-50/50 p-6 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-teal-100 text-teal-700 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-base font-bold text-teal-950">
                    Solicitud registrada correctamente
                  </h2>
                  <p className="text-xs text-slate-600 max-w-sm mx-auto">
                    Tu solicitud ha sido entregada al Administrador corporativo.
                  </p>
                </div>

                <div className="p-3 bg-white rounded-2xl border border-teal-200 text-left space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-500">
                    <span>Ticket de atención:</span>
                    <span className="font-mono font-bold text-teal-900">{reqSubmittedTicket.ticketId}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Usuario a restablecer:</span>
                    <span className="font-semibold text-slate-900">@{reqSubmittedTicket.username}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Correo de respuesta:</span>
                    <span className="font-semibold text-slate-900">{reqSubmittedTicket.email}</span>
                  </div>
                  <div className="flex justify-between text-amber-700 pt-1 border-t border-slate-100 font-medium">
                    <span>Tiempo estimado:</span>
                    <span>Hasta 24 hrs</span>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <a
                    href={`mailto:soporte@linguevia.com?subject=Solicitud de Restablecimiento de Contrase%C3%B1a - @${encodeURIComponent(
                      reqSubmittedTicket.username
                    )}&body=Hola Administrador,%0D%0A%0D%0AHe solicitado el restablecimiento de contrase%C3%B1a para mi usuario: @${encodeURIComponent(
                      reqSubmittedTicket.username
                    )}.%0D%0ATicket: ${encodeURIComponent(
                      reqSubmittedTicket.ticketId
                    )}%0D%0APor favor, enviar la nueva contrase%C3%B1a al correo de contacto: ${encodeURIComponent(
                      reqSubmittedTicket.email
                    )}.%0D%0A%0D%0AGracias.`}
                    className="w-full py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors"
                  >
                    <Mail className="w-4 h-4" />
                    <span>Enviar confirmación por correo a soporte@linguevia.com</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => {
                      setReqSubmittedTicket(null);
                      setReqUsername('');
                      setReqContactEmail('');
                      setReqNotes('');
                    }}
                    className="w-full py-2 px-3 rounded-xl border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 font-medium"
                  >
                    Enviar otra solicitud
                  </button>
                </div>
              </div>
            ) : (
              /* Request Form */
              <form onSubmit={handleSubmitAdminRequest} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="req-user" className="block text-xs font-semibold text-slate-700">
                    Tu nombre de usuario en Linguevia <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      id="req-user"
                      type="text"
                      required
                      autoFocus
                      value={reqUsername}
                      onChange={(e) => setReqUsername(e.target.value)}
                      placeholder="Ej. pedrogomez"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500">
                    El usuario registrado con el que ingresabas a la plataforma.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="req-email" className="block text-xs font-semibold text-slate-700">
                    Correo electrónico de contacto <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      id="req-email"
                      type="email"
                      required
                      value={reqContactEmail}
                      onChange={(e) => setReqContactEmail(e.target.value)}
                      placeholder="tu-correo@ejemplo.com"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500">
                    A este correo el Administrador te enviará tu nueva contraseña una vez restablecida.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="req-notes" className="block text-xs font-semibold text-slate-700">
                    Información adicional para verificación (Opcional)
                  </label>
                  <textarea
                    id="req-notes"
                    rows={2}
                    value={reqNotes}
                    onChange={(e) => setReqNotes(e.target.value)}
                    placeholder="Ej. País de registro, idiomas que aprendías o detalles de tu cuenta..."
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm transition-colors shadow-sm flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span>Enviar solicitud de restablecimiento</span>
                </button>
              </form>
            )}
          </div>
        )}

        {/* MODE 2: RECOVER WITH SECURITY QUESTION */}
        {mode === 'security_question' && (
          <div className="space-y-4">
            {isLockedWithoutQuestion && (
              <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 space-y-2 text-xs text-amber-900">
                <div className="flex items-center gap-2 font-bold text-amber-950">
                  <ShieldAlert className="w-4 h-4 text-amber-700" />
                  <span>Cuenta sin pregunta secreta: Acceso bloqueado</span>
                </div>
                <p className="leading-relaxed">
                  Por políticas de seguridad, al no contar con pregunta secreta, la cuenta no puede restablecerse de forma automática. Utiliza la opción <strong>&quot;Solicitar por Correo&quot;</strong> para que el Administrador de Linguevia verifique tu registro maestro y te entregue tu contraseña.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setMode('admin_request');
                    setIsLockedWithoutQuestion(false);
                    setError(null);
                  }}
                  className="mt-1 px-3 py-1.5 rounded-lg bg-teal-700 text-white font-semibold text-xs inline-flex items-center gap-1.5"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Cambiar a solicitud por correo</span>
                </button>
              </div>
            )}

            {successMessage ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <p className="text-xs font-semibold text-emerald-900">{successMessage}</p>
              </div>
            ) : secStep === 'find' ? (
              /* Step 1: Find user */
              <form onSubmit={handleFindSecurityUser} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="sec-user" className="block text-xs font-semibold text-slate-700">
                    Tu nombre de usuario registrado
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      id="sec-user"
                      type="text"
                      required
                      autoFocus
                      value={secIdentifier}
                      onChange={(e) => setSecIdentifier(e.target.value)}
                      placeholder="Ej. pedrogomez"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Se consultará la pregunta secreta configurada en tu registro.
                  </p>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm transition-colors shadow-sm"
                >
                  Continuar a pregunta secreta
                </button>
              </form>
            ) : (
              /* Step 2: Answer secret question */
              <form onSubmit={handleAnswerAndReset} className="space-y-4">
                <div className="rounded-2xl bg-teal-50/70 border border-teal-100 p-3.5 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-teal-900">
                    <HelpCircle className="w-4 h-4 text-teal-700 shrink-0" />
                    <span>Pregunta secreta de seguridad registrada:</span>
                  </div>
                  <p className="text-xs font-semibold text-slate-800 bg-white p-2.5 rounded-xl border border-teal-200">
                    {secQuestion}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="sec-answer" className="block text-xs font-semibold text-slate-700">
                    Tu respuesta secreta <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="sec-answer"
                    type="text"
                    required
                    autoFocus
                    value={secAnswer}
                    onChange={(e) => setSecAnswer(e.target.value)}
                    placeholder="Escribe tu respuesta aquí"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <p className="text-[11px] text-slate-500">
                    Debe coincidir con la respuesta registrada en tu cuenta.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="sec-newpass" className="block text-xs font-semibold text-slate-700">
                    Nueva contraseña (mín. 8 caracteres) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      id="sec-newpass"
                      type="password"
                      required
                      minLength={8}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="sec-confpass" className="block text-xs font-semibold text-slate-700">
                    Confirmar nueva contraseña <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      id="sec-confpass"
                      type="password"
                      required
                      minLength={8}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setSecStep('find');
                      setError(null);
                    }}
                    className="py-2.5 px-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Atrás
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm transition-colors shadow-sm"
                  >
                    Actualizar contraseña y entrar
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Corporate Support Footer Info */}
        <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 space-y-2 text-xs text-slate-600">
          <div className="font-semibold text-slate-800 flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5 text-teal-700" />
            <span>Contacto corporativo de Administración</span>
          </div>
          <p className="text-[11px] leading-relaxed">
            El <strong>Administrador de Linguevia</strong> administra el registro maestro de usuarios para resolver pérdidas de acceso. Las solicitudes se atienden en orden de llegada dentro de las 24 horas.
          </p>
          <div className="flex items-center justify-between pt-1">
            <span className="font-mono text-xs font-bold text-teal-800">
              soporte@linguevia.com
            </span>
            <a
              href="mailto:soporte@linguevia.com"
              className="text-teal-700 hover:underline flex items-center gap-1 text-[11px] font-medium"
            >
              <span>Escribir directamente</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
