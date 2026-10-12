'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Lock, Mail, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import { usePlatform } from '@/components/providers/PlatformProvider';
import {
  createSupabaseBrowserClient,
  isSupabaseGoogleOAuthEnabled,
} from '@/lib/supabase/client';
import { getPublicEnv } from '@/lib/env';

export default function LoginPage() {
  const router = useRouter();
  const { loginWithEmail, loginWithDemoAccount, registerAccount } = usePlatform();
  const env = getPublicEnv();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleEmail, setGoogleEmail] = useState('');
  const [googleName, setGoogleName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = loginWithEmail(email, password);
    setLoading(false);

    if (!res.ok) {
      setError(res.error || 'Error al iniciar sesión.');
      return;
    }

    router.push('/dashboard');
  };

  const handleGoogleLogin = async () => {
    setError(null);
    const supabase = createSupabaseBrowserClient();
    if (supabase && (await isSupabaseGoogleOAuthEnabled())) {
      const { error: oauthErr } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });
      if (oauthErr) {
        setError(oauthErr.message);
      }
      return;
    }

    if (email.trim()) setGoogleEmail(email.trim());
    setShowGoogleModal(true);
  };

  const handleConfirmGoogleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = googleEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Introduce un correo electrónico de Google válido.');
      return;
    }

    const derivedName =
      googleName.trim() ||
      cleanEmail
        .split('@')[0]
        .replace(/[._-]+/g, ' ')
        .replace(/\b\w/g, (l) => l.toUpperCase());

    const baseUser = cleanEmail
      .split('@')[0]
      .replace(/[^a-z0-9_.-]/g, '_')
      .slice(0, 24);

    const res = registerAccount({
      email: cleanEmail,
      password: `GAuth_${Date.now()}!`,
      displayName: derivedName,
      username: baseUser.length >= 3 ? baseUser : `${baseUser}_g`,
      birthDate: '1995-06-15',
      countryCode: 'PE',
      timezone: 'America/Lima',
      confirmAdult: true,
      acceptTerms: true,
      provider: 'google',
    });

    if (!res.ok) {
      setError(res.error || 'No se pudo iniciar sesión con Google.');
      return;
    }

    setShowGoogleModal(false);
    router.push(res.onboardingCompleted ? '/dashboard' : '/onboarding');
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      {showGoogleModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-white border border-slate-200 p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-sm text-blue-600">
                  G
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Iniciar sesión con Google
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Ingresa tu correo de Google para entrar a Linguevia
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGoogleModal(false)}
                className="text-xs text-slate-400 hover:text-slate-700 px-2 py-1"
              >
                Cerrar
              </button>
            </div>

            <form onSubmit={handleConfirmGoogleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Tu correo de Google (Gmail)
                </label>
                <input
                  type="email"
                  required
                  autoFocus
                  value={googleEmail}
                  onChange={(e) => setGoogleEmail(e.target.value)}
                  placeholder="tucorreo@gmail.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Tu nombre visible (si es tu primera vez)
                </label>
                <input
                  type="text"
                  value={googleName}
                  onChange={(e) => setGoogleName(e.target.value)}
                  placeholder="Ej. Yerzon Orbegoso"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowGoogleModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold"
                >
                  Continuar con Google
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-6">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Acceso seguro (+18)</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Iniciar sesión</h1>
          <p className="text-xs text-slate-500">
            Accede a tus conversaciones, sesiones de llamada y cuaderno de vocabulario.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 flex items-start gap-2"
          >
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="login-email" className="block text-xs font-semibold text-slate-700">
              Correo electrónico
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                id="login-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="elena.demo@linguevia.test"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="login-password" className="block text-xs font-semibold text-slate-700">
                Contraseña
              </label>
              <Link href="/recover" className="text-xs font-medium text-teal-700 hover:underline">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                id="login-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm transition-colors"
          >
            <span>{loading ? 'Verificando...' : 'Entrar a mi cuenta'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="relative flex py-1 items-center">
          <div className="grow border-t border-slate-200" />
          <span className="shrink mx-3 text-[11px] uppercase text-slate-400 font-semibold">
            O continuar con
          </span>
          <div className="grow border-t border-slate-200" />
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          className="w-full py-2.5 px-4 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center justify-center gap-2"
        >
          <span>Continuar con Google OAuth</span>
        </button>

        {env.demoMode && (
          <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3.5 space-y-2 text-xs">
            <div className="font-semibold text-slate-700">Cuentas rápidas de demostración:</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  loginWithDemoAccount('demo-user-elena');
                  router.push('/dashboard');
                }}
                className="p-2 rounded-lg bg-white border border-slate-200 hover:border-teal-500 text-left"
              >
                <div className="font-bold text-slate-800">Elena (Admin)</div>
                <div className="text-[10px] text-slate-500">ES nativo · EN B2</div>
              </button>
              <button
                type="button"
                onClick={() => {
                  loginWithDemoAccount('demo-user-liam');
                  router.push('/dashboard');
                }}
                className="p-2 rounded-lg bg-white border border-slate-200 hover:border-teal-500 text-left"
              >
                <div className="font-bold text-slate-800">Liam (Usuario)</div>
                <div className="text-[10px] text-slate-500">EN nativo · ES B1</div>
              </button>
            </div>
          </div>
        )}

        <p className="text-center text-xs text-slate-500">
          ¿Aún no tienes cuenta?{' '}
          <Link href="/register" className="text-teal-700 font-semibold hover:underline">
            Regístrate aquí (+18)
          </Link>
        </p>
      </div>
    </div>
  );
}
