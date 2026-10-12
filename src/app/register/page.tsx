'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldCheck, AlertCircle, CheckCircle2 } from 'lucide-react';
import { usePlatform } from '@/components/providers/PlatformProvider';
import { COUNTRY_OPTIONS } from '@/lib/store/demo-data';
import { calculateAgeYears, isAdultBirthDate, registerSchema } from '@/lib/security/validators';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export default function RegisterPage() {
  const router = useRouter();
  const { registerAccount } = usePlatform();

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [countryCode, setCountryCode] = useState('ES');
  const [timezone, setTimezone] = useState('Europe/Madrid');
  const [confirmAdult, setConfirmAdult] = useState(true);
  const [acceptTerms, setAcceptTerms] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleCountryChange = (newCode: string) => {
    setCountryCode(newCode);
    const match = COUNTRY_OPTIONS.find((c) => c.code === newCode);
    if (match) {
      setTimezone(match.defaultTimezone);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isAdultBirthDate(birthDate)) {
      const calculated = calculateAgeYears(birthDate);
      setError(
        calculated >= 0 && calculated < 18
          ? `Acceso restringido: tienes ${calculated} años. Linguevia es exclusivamente para mayores de 18 años.`
          : 'Introduce una fecha de nacimiento válida (mayor de 18 años).'
      );
      return;
    }

    const parsed = registerSchema.safeParse({
      email,
      password,
      displayName,
      username,
      birthDate,
      countryCode,
      timezone,
      confirmAdult,
      acceptTerms,
    });

    if (!parsed.success) {
      const firstErr = parsed.error.issues[0]?.message || 'Verifica los campos del formulario.';
      setError(firstErr);
      return;
    }

    const res = registerAccount({
      email,
      password,
      displayName,
      username,
      birthDate,
      countryCode,
      timezone,
      confirmAdult,
      acceptTerms,
      provider: 'email',
    });

    if (!res.ok) {
      setError(res.error || 'No se pudo completar el registro.');
      return;
    }

    router.push('/onboarding');
  };

  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleEmail, setGoogleEmail] = useState('');
  const [googleName, setGoogleName] = useState('');
  const [googleBirthDate, setGoogleBirthDate] = useState('1995-06-15');
  const [googleModalError, setGoogleModalError] = useState<string | null>(null);

  const handleGoogleSignup = async () => {
    setError(null);
    setGoogleModalError(null);

    const supabase = createSupabaseBrowserClient();
    if (supabase) {
      const { error: oauthErr } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/onboarding`,
        },
      });
      if (oauthErr) {
        setError(oauthErr.message);
      }
      return;
    }

    // Pre-fill modal with any data already typed in the form
    if (email.trim()) setGoogleEmail(email.trim());
    if (displayName.trim()) setGoogleName(displayName.trim());
    if (birthDate) setGoogleBirthDate(birthDate);
    setShowGoogleModal(true);
  };

  const handleConfirmGoogleModal = (e: React.FormEvent) => {
    e.preventDefault();
    setGoogleModalError(null);

    const cleanGoogleEmail = googleEmail.trim().toLowerCase();
    if (!cleanGoogleEmail || !cleanGoogleEmail.includes('@')) {
      setGoogleModalError('Introduce tu dirección de correo de Google (ej. tucorreo@gmail.com).');
      return;
    }

    if (!googleBirthDate || !isAdultBirthDate(googleBirthDate)) {
      setGoogleModalError(
        'Debes indicar una fecha de nacimiento válida para mayores de 18 años.'
      );
      return;
    }

    const derivedName =
      googleName.trim() ||
      cleanGoogleEmail
        .split('@')[0]
        .replace(/[._-]+/g, ' ')
        .replace(/\b\w/g, (l) => l.toUpperCase());

    const baseUsername = (username.trim() || cleanGoogleEmail.split('@')[0])
      .toLowerCase()
      .replace(/[^a-z0-9_.-]/g, '_')
      .slice(0, 24);
    const finalUsername =
      baseUsername.length >= 3 ? baseUsername : `${baseUsername}_${Math.floor(100 + Math.random() * 900)}`;

    const res = registerAccount({
      email: cleanGoogleEmail,
      password: `GAuth_${Date.now()}!`,
      displayName: derivedName,
      username: finalUsername,
      birthDate: googleBirthDate,
      countryCode,
      timezone,
      confirmAdult: true,
      acceptTerms: true,
      provider: 'google',
    });

    if (!res.ok) {
      setGoogleModalError(res.error || 'No se pudo completar el registro con Google.');
      return;
    }

    setShowGoogleModal(false);
    router.push('/onboarding');
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-10">
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
                    Continuar con tu cuenta de Google
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Ingresa tu correo de Google para vincular tu perfil en Linguevia
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

            {googleModalError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                {googleModalError}
              </div>
            )}

            <form onSubmit={handleConfirmGoogleModal} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Correo electrónico de Google (Gmail)
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
                  Tu nombre visible
                </label>
                <input
                  type="text"
                  required
                  value={googleName}
                  onChange={(e) => setGoogleName(e.target.value)}
                  placeholder="Ej. Yerzon Orbegoso"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Fecha de nacimiento (Verificación +18)
                </label>
                <input
                  type="date"
                  required
                  value={googleBirthDate}
                  onChange={(e) => setGoogleBirthDate(e.target.value)}
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
            <span>Registro exclusivo para mayores de 18 años</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Crea tu cuenta en Linguevia</h1>
          <p className="text-xs text-slate-500">
            Tu correo electrónico y tu fecha de nacimiento se almacenan de forma privada y nunca se
            publican en tu perfil público.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            data-testid="register-error"
            className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 flex items-start gap-2"
          >
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="reg-display" className="block text-xs font-semibold text-slate-700">
                Nombre visible
              </label>
              <input
                id="reg-display"
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Ej. Mateo Rivera"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="reg-username" className="block text-xs font-semibold text-slate-700">
                Nombre de usuario (@)
              </label>
              <input
                id="reg-username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="mateo_rivera"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="reg-email" className="block text-xs font-semibold text-slate-700">
                Correo electrónico (Privado)
              </label>
              <input
                id="reg-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="reg-password" className="block text-xs font-semibold text-slate-700">
                Contraseña (mín. 8 caracteres)
              </label>
              <input
                id="reg-password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="reg-birth" className="block text-xs font-semibold text-slate-700">
                Fecha de nacimiento (+18)
              </label>
              <input
                id="reg-birth"
                type="date"
                required
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="reg-country" className="block text-xs font-semibold text-slate-700">
                País
              </label>
              <select
                id="reg-country"
                value={countryCode}
                onChange={(e) => handleCountryChange(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm bg-white"
              >
                {COUNTRY_OPTIONS.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="reg-tz" className="block text-xs font-semibold text-slate-700">
                Zona horaria
              </label>
              <input
                id="reg-tz"
                type="text"
                required
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm"
              />
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 space-y-2.5 text-xs text-slate-700">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmAdult}
                onChange={(e) => setConfirmAdult(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
              />
              <span>
                <strong>Confirmo que tengo 18 años o más.</strong> Entiendo que las cuentas de
                menores de edad son bloqueadas y eliminadas de inmediato.
              </span>
            </label>

            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
              />
              <span>
                Acepto las Normas de la Comunidad, la Política de Privacidad y el tratamiento seguro
                de mis datos (puedo eliminar mi cuenta en cualquier momento).
              </span>
            </label>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="submit"
              className="flex-1 py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Registrarme por correo</span>
            </button>

            <button
              type="button"
              onClick={handleGoogleSignup}
              className="py-2.5 px-4 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs"
            >
              Registrarme con Google
            </button>
          </div>
        </form>

        <p className="text-center text-xs text-slate-500">
          ¿Ya tienes una cuenta?{' '}
          <Link href="/login" className="text-teal-700 font-semibold hover:underline">
            Inicia sesión aquí
          </Link>
        </p>
      </div>
    </div>
  );
}
