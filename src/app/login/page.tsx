'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Lock, Mail, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import { usePlatform } from '@/components/providers/PlatformProvider';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { getPublicEnv } from '@/lib/env';

export default function LoginPage() {
  const router = useRouter();
  const { loginWithEmail, loginWithDemoAccount } = usePlatform();
  const env = getPublicEnv();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
    if (supabase) {
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

    if (env.demoMode) {
      loginWithDemoAccount('demo-user-elena');
      router.push('/dashboard');
    } else {
      setError(
        'Para usar el inicio de sesión con Google en producción, configura NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local.'
      );
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12">
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
                placeholder="elena.demo@linguaconnect.test"
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
