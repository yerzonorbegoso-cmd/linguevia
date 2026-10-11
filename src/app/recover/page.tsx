'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { KeyRound, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';
import { usePlatform } from '@/components/providers/PlatformProvider';

export default function RecoverPasswordPage() {
  const { requestPasswordRecovery, resetPasswordWithToken } = usePlatform();

  const [email, setEmail] = useState('');
  const [step, setStep] = useState<'request' | 'reset' | 'done'>('request');
  const [newPassword, setNewPassword] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRequest = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const res = requestPasswordRecovery(email);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    setNotice(res.message);
    setStep('reset');
  };

  const handleReset = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const res = resetPasswordWithToken(email, newPassword);
    if (!res.ok) {
      setError(res.error || 'No se pudo actualizar la contraseña.');
      return;
    }
    setStep('done');
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-6">
        <div className="w-11 h-11 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center">
          <KeyRound className="w-5 h-5" />
        </div>

        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900">Recuperar contraseña</h1>
          <p className="text-xs text-slate-500">
            Restablece el acceso a tu cuenta de forma segura sin exponer tus datos.
          </p>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {notice && step === 'reset' && (
          <div className="rounded-xl border border-teal-200 bg-teal-50 p-3 text-xs text-teal-900">
            {notice}
          </div>
        )}

        {step === 'request' && (
          <form onSubmit={handleRequest} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="rec-email" className="block text-xs font-semibold text-slate-700">
                Correo electrónico de tu cuenta
              </label>
              <input
                id="rec-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="elena.demo@linguaconnect.test"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm"
            >
              Enviar enlace de recuperación
            </button>
          </form>
        )}

        {step === 'reset' && (
          <form onSubmit={handleReset} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="rec-new-pass" className="block text-xs font-semibold text-slate-700">
                Nueva contraseña (mín. 8 caracteres)
              </label>
              <input
                id="rec-new-pass"
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm"
            >
              Confirmar nueva contraseña
            </button>
          </form>
        )}

        {step === 'done' && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-xs text-emerald-900 flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>Tu contraseña ha sido actualizada. Ya puedes iniciar sesión.</span>
            </div>
            <Link
              href="/login"
              className="block text-center w-full py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm"
            >
              Ir a Iniciar sesión
            </Link>
          </div>
        )}

        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Volver al inicio de sesión</span>
        </Link>
      </div>
    </div>
  );
}
