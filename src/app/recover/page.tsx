'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { KeyRound, CheckCircle2, AlertCircle, ArrowLeft, HelpCircle, Lock, User, Mail, ShieldAlert } from 'lucide-react';
import { usePlatform } from '@/components/providers/PlatformProvider';

export default function RecoverPasswordPage() {
  const router = useRouter();
  const { getSecurityQuestionForUser, resetPasswordWithSecurityAnswer } = usePlatform();

  const [step, setStep] = useState<'find' | 'answer'>('find');
  const [identifier, setIdentifier] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState<string | null>(null);
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [doneMessage, setDoneMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLockedWithoutQuestion, setIsLockedWithoutQuestion] = useState(false);

  // STEP 1: Search user and retrieve secret question
  const handleFindUser = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLockedWithoutQuestion(false);

    const clean = identifier.trim().toLowerCase().replace(/^@/, '');
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

    setSecurityQuestion(res.question || null);
    setStep('answer');
  };

  // STEP 2: Verify secret answer and update password
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
    if (!securityAnswer.trim()) {
      setError('Debes ingresar la respuesta a tu pregunta secreta.');
      return;
    }

    const res = resetPasswordWithSecurityAnswer(identifier, securityAnswer, newPassword);
    if (!res.ok) {
      setError(res.error || 'Respuesta incorrecta. No se pudo verificar tu identidad.');
      return;
    }

    setDoneMessage('¡Identidad verificada con éxito! Contraseña restablecida. Redirigiendo a tu cuenta...');
    setTimeout(() => {
      router.push('/dashboard');
    }, 1500);
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-6">
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
          <h1 className="text-2xl font-bold text-slate-900">Recuperación de acceso</h1>
          <p className="text-xs text-slate-500">
            Recupera tu cuenta respondiendo a la pregunta secreta de seguridad que configuraste al
            registrarte.
          </p>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {isLockedWithoutQuestion && (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 space-y-2 text-xs text-amber-900">
            <div className="flex items-center gap-2 font-bold text-amber-950">
              <ShieldAlert className="w-4 h-4 text-amber-700" />
              <span>Cuenta sin pregunta secreta: Acceso bloqueado</span>
            </div>
            <p className="leading-relaxed">
              Por estrictas políticas de seguridad, al no contar con pregunta secreta, la cuenta
              permanece sin acceso directo. El <strong>Administrador de Linguevia</strong> es el
              único autorizado para validar tu identidad en el registro maestro y entregarte tus
              credenciales de acceso.
            </p>
            <p className="font-semibold text-teal-800 pt-1">
              Reporta tu caso al soporte oficial del Administrador: <br />
              <span className="font-mono underline">soporte@linguevia.com</span>
            </p>
          </div>
        )}

        {doneMessage ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
            <p className="text-xs font-semibold text-emerald-900">{doneMessage}</p>
          </div>
        ) : step === 'find' ? (
          /* STEP 1: FIND USERNAME / EMAIL */
          <form onSubmit={handleFindUser} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="rec-user" className="block text-xs font-semibold text-slate-700">
                Tu nombre de usuario o correo registrado
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  id="rec-user"
                  type="text"
                  required
                  autoFocus
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Ej. yerzon o tu@correo.com"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <p className="text-[11px] text-slate-500">
                Escribe el usuario con el que te registraste en Linguevia.
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
          /* STEP 2: ANSWER SECRET QUESTION AND SET NEW PASSWORD */
          <form onSubmit={handleAnswerAndReset} className="space-y-4">
            <div className="rounded-2xl bg-teal-50/70 border border-teal-100 p-3.5 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-teal-900">
                <HelpCircle className="w-4 h-4 text-teal-700 shrink-0" />
                <span>Pregunta secreta de seguridad registrada:</span>
              </div>
              <p className="text-xs font-semibold text-slate-800 bg-white p-2.5 rounded-xl border border-teal-200">
                {securityQuestion}
              </p>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="rec-answer" className="block text-xs font-semibold text-slate-700">
                Tu respuesta secreta <span className="text-rose-500">*</span>
              </label>
              <input
                id="rec-answer"
                type="text"
                required
                autoFocus
                value={securityAnswer}
                onChange={(e) => setSecurityAnswer(e.target.value)}
                placeholder="Escribe tu respuesta aquí"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <p className="text-[11px] text-slate-500">
                Debe coincidir exactamente con la respuesta configurada en tu registro.
              </p>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="rec-newpass" className="block text-xs font-semibold text-slate-700">
                Nueva contraseña (mín. 8 caracteres) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  id="rec-newpass"
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
              <label htmlFor="rec-confpass" className="block text-xs font-semibold text-slate-700">
                Confirmar nueva contraseña <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  id="rec-confpass"
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
                  setStep('find');
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

        {/* REPORTE AL ADMINISTRADOR */}
        <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 space-y-1.5 text-xs text-slate-600">
          <div className="font-semibold text-slate-800 flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5 text-teal-700" />
            <span>¿Perdiste tu usuario o tu respuesta secreta?</span>
          </div>
          <p className="text-[11px] leading-relaxed">
            El <strong>Administrador de la página</strong> tiene los registros maestros de cuentas
            para poder entregarte o restablecer tus credenciales en caso de pérdida total. Cualquier
            detalle o reclamo sobre tu cuenta, repórtalo directamente al correo oficial de soporte:
          </p>
          <div className="pt-1 font-mono text-xs font-bold text-teal-800">
            soporte@linguevia.com
          </div>
        </div>
      </div>
    </div>
  );
}
