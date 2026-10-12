'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { KeyRound, CheckCircle2, AlertCircle, ArrowLeft, ShieldCheck } from 'lucide-react';
import { usePlatform } from '@/components/providers/PlatformProvider';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export default function RecoverPasswordPage() {
  const router = useRouter();
  const { resetPasswordWithToken } = usePlatform();

  const [email, setEmail] = useState('');
  const [birthDateVerification, setBirthDateVerification] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [doneMessage, setDoneMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDirectReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const supabase = createSupabaseBrowserClient();
    if (supabase) {
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/recover`,
      });
      if (resetErr) {
        setError(resetErr.message);
        return;
      }
      setDoneMessage(
        'Hemos enviado un enlace criptográfico de recuperación a tu correo electrónico.'
      );
      return;
    }

    if (!birthDateVerification) {
      setError('Debes ingresar la fecha de nacimiento exacta con la que registraste tu cuenta.');
      return;
    }

    if (newPassword.length < 8) {
      setError('La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden. Verifícalas por favor.');
      return;
    }

    const res = resetPasswordWithToken(email, newPassword, birthDateVerification);
    if (!res.ok) {
      setError(res.error || 'No se pudo verificar la titularidad de la cuenta.');
      return;
    }

    setDoneMessage(
      '¡Identidad verificada y contraseña actualizada! Redirigiendo a tu panel...'
    );
    setTimeout(() => {
      router.push('/dashboard');
    }, 1200);
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-6">
        <div className="w-11 h-11 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center">
          <KeyRound className="w-5 h-5" />
        </div>

        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900">Restablecer contraseña</h1>
          <p className="text-xs text-slate-500">
            Para proteger tu cuenta, verificamos dos datos privados que nunca se muestran en ningún
            perfil público: tu correo electrónico y tu fecha de nacimiento exacta.
          </p>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!doneMessage ? (
          <form onSubmit={handleDirectReset} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="rec-email" className="block text-xs font-semibold text-slate-700">
                1. Correo electrónico privado de tu cuenta
              </label>
              <input
                id="rec-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tucorreo@ejemplo.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="rec-birth" className="block text-xs font-semibold text-slate-700">
                2. Fecha de nacimiento exacta registrada (Verificación de seguridad)
              </label>
              <input
                id="rec-birth"
                type="date"
                required
                value={birthDateVerification}
                onChange={(e) => setBirthDateVerification(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <p className="text-[11px] text-slate-500 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                <span>
                  Dato privado oculto en tu bóveda de seguridad: ningún otro usuario puede verlo.
                </span>
              </p>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="rec-new-pass" className="block text-xs font-semibold text-slate-700">
                3. Nueva contraseña (mín. 8 caracteres)
              </label>
              <input
                id="rec-new-pass"
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="rec-confirm-pass"
                className="block text-xs font-semibold text-slate-700"
              >
                4. Confirmar nueva contraseña
              </label>
              <input
                id="rec-confirm-pass"
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm"
            >
              Verificar identidad y cambiar contraseña
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-xs text-emerald-900 flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{doneMessage}</span>
            </div>
            <Link
              href="/dashboard"
              className="block text-center w-full py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm"
            >
              Ir a mi panel ahora
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
