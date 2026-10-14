'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Lock, User, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import { usePlatform } from '@/components/providers/PlatformProvider';
import { getPublicEnv } from '@/lib/env';

export default function LoginPage() {
  const router = useRouter();
  const { loginWithIdentifier, loginWithDemoAccount } = usePlatform();
  const env = getPublicEnv();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = loginWithIdentifier(identifier, password);
    setLoading(false);

    if (!res.ok) {
      setError(res.error || 'Error al iniciar sesión.');
      return;
    }

    router.push('/dashboard');
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
            Ingresa con tu nombre de usuario o correo electrónico registrado.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800 flex items-start gap-2"
          >
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="login-identifier" className="block text-xs font-semibold text-slate-700">
              Usuario o Correo electrónico
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                id="login-identifier"
                type="text"
                required
                autoFocus
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="tu_usuario o tu@correo.com"
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
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm transition-colors shadow-sm"
          >
            <span>{loading ? 'Verificando...' : 'Entrar a mi cuenta'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {env.demoMode && (
          <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3.5 space-y-2 text-xs">
            <div className="font-semibold text-slate-700">Acceso rápido a cuentas del sistema:</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  loginWithDemoAccount('admin-yherzon21');
                  router.push('/admin');
                }}
                className="p-2 rounded-lg bg-teal-50 border border-teal-200 hover:border-teal-500 text-left"
              >
                <div className="font-bold text-teal-900">🛡️ Yherzon21 (Admin)</div>
                <div className="text-[10px] text-teal-700 font-mono">@Yherzon21</div>
              </button>
              <button
                type="button"
                onClick={() => {
                  loginWithDemoAccount('demo-user-elena');
                  router.push('/dashboard');
                }}
                className="p-2 rounded-lg bg-white border border-slate-200 hover:border-teal-500 text-left"
              >
                <div className="font-bold text-slate-800">Elena (Usuario)</div>
                <div className="text-[10px] text-slate-500">@elena_madrid_demo</div>
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
