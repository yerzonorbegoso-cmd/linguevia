'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldCheck, AlertCircle, CheckCircle2, ArrowRight, MailCheck } from 'lucide-react';
import { usePlatform } from '@/components/providers/PlatformProvider';
import { COUNTRY_OPTIONS } from '@/lib/store/demo-data';
import { calculateAgeYears, isAdultBirthDate, registerSchema } from '@/lib/security/validators';

export default function RegisterPage() {
  const router = useRouter();
  const { registerAccount, verifyCurrentEmail } = usePlatform();

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [countryCode, setCountryCode] = useState('ES');
  const [timezone, setTimezone] = useState('Europe/Madrid');
  const [confirmAdult, setConfirmAdult] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);

  const [step, setStep] = useState<'form' | 'verify_email'>('form');
  const [verificationCode, setVerificationCode] = useState('184920');
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
          ? `Acceso restringido: tienes ${calculated} años. LinguaConnect es exclusivamente para mayores de 18 años.`
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

    if (res.requiresVerification) {
      setStep('verify_email');
    } else {
      router.push('/onboarding');
    }
  };

  const handleGoogleSignup = () => {
    setError(null);
    if (!birthDate || !isAdultBirthDate(birthDate) || !confirmAdult || !acceptTerms) {
      setError(
        'Por seguridad legal, antes de registrarte con Google debes indicar tu fecha de nacimiento (+18) y aceptar las condiciones.'
      );
      return;
    }

    const fallbackName = displayName.trim() || 'Nuevo Miembro';
    const fallbackUser = username.trim() || `user_${Math.floor(1000 + Math.random() * 9000)}`;
    const fallbackEmail = email.trim() || `${fallbackUser}@google-oauth.test`;

    const res = registerAccount({
      email: fallbackEmail,
      password: `GAuth_${Date.now()}!`,
      displayName: fallbackName,
      username: fallbackUser,
      birthDate,
      countryCode,
      timezone,
      confirmAdult: true,
      acceptTerms: true,
      provider: 'google',
    });

    if (!res.ok) {
      setError(res.error || 'Error con registro Google.');
      return;
    }

    router.push('/onboarding');
  };

  const handleVerifyEmail = (e: React.FormEvent) => {
    e.preventDefault();
    const res = verifyCurrentEmail(verificationCode);
    if (!res.ok) {
      setError(res.error || 'Código inválido.');
      return;
    }
    router.push('/onboarding');
  };

  if (step === 'verify_email') {
    return (
      <div className="max-w-md mx-auto px-4 py-12">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-6">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center">
            <MailCheck className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-2xl font-bold text-slate-900">Verifica tu correo electrónico</h1>
            <p className="text-xs text-slate-600 leading-relaxed">
              Hemos enviado un código de verificación a <strong>{email}</strong>. Tu dirección de
              correo jamás será visible en tu perfil público.
            </p>
          </div>

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
              {error}
            </div>
          )}

          <form onSubmit={handleVerifyEmail} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="verify-code"
                className="block text-xs font-semibold text-slate-700"
              >
                Código de confirmación de 6 dígitos
              </label>
              <input
                id="verify-code"
                type="text"
                required
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono tracking-widest"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm flex items-center justify-center gap-2"
            >
              <span>Confirmar correo y configurar idiomas</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-10">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-6">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Registro exclusivo para mayores de 18 años</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Crea tu cuenta en LinguaConnect</h1>
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
