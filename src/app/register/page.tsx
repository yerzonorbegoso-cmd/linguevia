'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldCheck, AlertCircle, CheckCircle2, HelpCircle, Lock, User, Globe2 } from 'lucide-react';
import { usePlatform } from '@/components/providers/PlatformProvider';
import { COUNTRY_OPTIONS, INITIAL_LANGUAGES, DEFAULT_SECURITY_QUESTIONS } from '@/lib/store/demo-data';
import { calculateAgeYears, isAdultBirthDate, registerSchema } from '@/lib/security/validators';
import { CefrLevel } from '@/types/database';

const LEARNING_LEVELS: Array<{ value: CefrLevel; label: string }> = [
  { value: 'A1', label: 'A1 - Principiante' },
  { value: 'A2', label: 'A2 - Básico' },
  { value: 'B1', label: 'B1 - Intermedio' },
  { value: 'B2', label: 'B2 - Intermedio Alto' },
  { value: 'C1', label: 'C1 - Avanzado' },
  { value: 'C2', label: 'C2 - Dominio' },
];

export default function RegisterPage() {
  const router = useRouter();
  const { registerAccount } = usePlatform();

  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedQuestion, setSelectedQuestion] = useState(DEFAULT_SECURITY_QUESTIONS[0]);
  const [customQuestion, setCustomQuestion] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [countryCode, setCountryCode] = useState('PE');
  const [timezone, setTimezone] = useState('America/Lima');
  const [nativeLanguageCode, setNativeLanguageCode] = useState('es');
  const [learningLanguageCode, setLearningLanguageCode] = useState('en');
  const [learningLevel, setLearningLevel] = useState<CefrLevel>('B1');
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

  const finalSecurityQuestion =
    selectedQuestion.startsWith('Otra')
      ? customQuestion.trim()
      : selectedQuestion.trim();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate username format
    const cleanUser = username.trim().toLowerCase().replace(/^@/, '');
    if (!cleanUser || cleanUser.length < 3) {
      setError('El nombre de usuario debe tener al menos 3 caracteres.');
      return;
    }
    if (!/^[a-zA-Z0-9_.-]+$/.test(cleanUser)) {
      setError('El nombre de usuario solo puede tener letras, números, guiones y puntos.');
      return;
    }

    // Validate passwords match
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden. Por favor, escríbelas iguales.');
      return;
    }

    // Validate security question
    if (!finalSecurityQuestion || finalSecurityQuestion.length < 4) {
      setError('Debes elegir o escribir una pregunta secreta de seguridad.');
      return;
    }
    if (!securityAnswer.trim() || securityAnswer.trim().length < 2) {
      setError('Debes escribir la respuesta a tu pregunta secreta de seguridad.');
      return;
    }

    // Validate 18+
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
      email: email.trim(),
      password,
      displayName: displayName.trim() || cleanUser,
      username: cleanUser,
      securityQuestion: finalSecurityQuestion,
      securityAnswer: securityAnswer.trim(),
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
      username: cleanUser,
      displayName: displayName.trim() || cleanUser,
      email: email.trim(),
      password,
      securityQuestion: finalSecurityQuestion,
      securityAnswer: securityAnswer.trim(),
      birthDate,
      countryCode,
      timezone,
      confirmAdult,
      acceptTerms,
      nativeLanguageCode,
      learningLanguageCode,
      learningLevel,
    });

    if (!res.ok) {
      setError(res.error || 'No se pudo completar el registro.');
      return;
    }

    router.push('/onboarding');
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-10">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-6">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Registro seguro y privado (+18 años)</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Crea tu cuenta en Linguevia</h1>
          <p className="text-xs text-slate-500">
            Regístrate con tu nombre de usuario único y define tu pregunta secreta para proteger tu
            cuenta en todo momento.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            data-testid="register-error"
            className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800 flex items-start gap-2"
          >
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* IDENTIFICADOR / USUARIO Y NOMBRE */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="reg-username" className="block text-xs font-semibold text-slate-700">
                Nombre de usuario (@) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-slate-400 text-sm font-semibold">
                  @
                </span>
                <input
                  id="reg-username"
                  type="text"
                  required
                  autoFocus
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  placeholder="tu_usuario"
                  className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
                />
              </div>
              <p className="text-[11px] text-slate-500">
                Único e irrepetible. Con este usuario ingresarás a tu cuenta.
              </p>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="reg-display" className="block text-xs font-semibold text-slate-700">
                Nombre visible <span className="text-rose-500">*</span>
              </label>
              <input
                id="reg-display"
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Ej. Yerzon"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <p className="text-[11px] text-slate-500">
                El nombre con el que te verán otros compañeros.
              </p>
            </div>
          </div>

          {/* CORREO OPCIONAL */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="reg-email" className="block text-xs font-semibold text-slate-700">
                Correo electrónico
              </label>
              <span className="text-[11px] font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full">
                Opcional (no obligatorio)
              </span>
            </div>
            <input
              id="reg-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com (opcional)"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <p className="text-[11px] text-slate-500">
              No es necesario para registrarte. Solo agrégalo si deseas vincular un correo a tu cuenta.
            </p>
          </div>

          {/* CONTRASEÑA Y CONFIRMACIÓN */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="reg-password" className="block text-xs font-semibold text-slate-700">
                Contraseña <span className="text-rose-500">*</span>
              </label>
              <input
                id="reg-password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="reg-confirm-pw" className="block text-xs font-semibold text-slate-700">
                Confirmar contraseña <span className="text-rose-500">*</span>
              </label>
              <input
                id="reg-confirm-pw"
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repite la contraseña"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* PREGUNTA SECRETA DE SEGURIDAD */}
          <div className="rounded-2xl bg-amber-50/70 border border-amber-200/80 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-amber-700 shrink-0" />
              <div className="text-xs font-bold text-amber-900">
                Pregunta secreta de seguridad (Recuperación de contraseña)
              </div>
            </div>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              Esta pregunta te será solicitada si olvidas tu contraseña. Si no tienes la respuesta
              correcta, la cuenta no podrá ser recuperada directamente.
            </p>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">
                Selecciona tu pregunta secreta:
              </label>
              <select
                value={selectedQuestion}
                onChange={(e) => setSelectedQuestion(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                {DEFAULT_SECURITY_QUESTIONS.map((q: string) => (
                  <option key={q} value={q}>
                    {q}
                  </option>
                ))}
              </select>

              {selectedQuestion.startsWith('Otra') && (
                <div className="space-y-1 pt-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Escribe tu pregunta secreta personalizada:
                  </label>
                  <input
                    type="text"
                    required
                    value={customQuestion}
                    onChange={(e) => setCustomQuestion(e.target.value)}
                    placeholder="Ej. ¿En qué hospital nací?"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              )}

              <div className="space-y-1 pt-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Respuesta a tu pregunta secreta: <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={securityAnswer}
                  onChange={(e) => setSecurityAnswer(e.target.value)}
                  placeholder="Escribe tu respuesta secreta"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                />
                <p className="text-[11px] text-slate-500">
                  No distingue entre mayúsculas y minúsculas. Recuerda bien esta respuesta.
                </p>
              </div>
            </div>
          </div>

          {/* NACIONALIDAD Y FECHA DE NACIMIENTO */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="reg-country" className="block text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Globe2 className="w-3.5 h-3.5 text-teal-700" />
                <span>Nacionalidad / País</span>
              </label>
              <select
                id="reg-country"
                value={countryCode}
                onChange={(e) => handleCountryChange(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
              >
                {COUNTRY_OPTIONS.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="reg-birth" className="block text-xs font-semibold text-slate-700">
                Fecha de nacimiento (+18 años) <span className="text-rose-500">*</span>
              </label>
              <input
                id="reg-birth"
                type="date"
                required
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* PREFERENCIAS DE IDIOMA */}
          <div className="rounded-2xl bg-teal-50/60 border border-teal-100 p-4 space-y-3">
            <div className="text-xs font-bold text-teal-900">
              Preferencias lingüísticas (para que otros compañeros te encuentren)
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Mi idioma nativo
                </label>
                <select
                  value={nativeLanguageCode}
                  onChange={(e) => setNativeLanguageCode(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs bg-white"
                >
                  {INITIAL_LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.flag_emoji} {l.name_es}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Idioma que deseo aprender
                </label>
                <select
                  value={learningLanguageCode}
                  onChange={(e) => setLearningLanguageCode(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs bg-white"
                >
                  {INITIAL_LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.flag_emoji} {l.name_es}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Mi nivel actual
                </label>
                <select
                  value={learningLevel}
                  onChange={(e) => setLearningLevel(e.target.value as CefrLevel)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs bg-white"
                >
                  {LEARNING_LEVELS.map((lvl) => (
                    <option key={lvl.value} value={lvl.value}>
                      {lvl.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* CHECKBOXES DE EDAD Y TÉRMINOS */}
          <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 space-y-2.5 text-xs text-slate-700">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmAdult}
                onChange={(e) => setConfirmAdult(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
              />
              <span>
                <strong>Confirmo que tengo 18 años o más.</strong> Linguevia es una plataforma
                exclusiva para mayores de edad.
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
                Acepto las Normas de la Comunidad, la Política de Privacidad y el tratamiento de mis
                preferencias de aprendizaje.
              </span>
            </label>
          </div>

          <button
            type="submit"
            className="w-full py-3 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-sm transition-colors"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Crear cuenta en Linguevia</span>
          </button>
        </form>

        <p className="text-center text-xs text-slate-500">
          ¿Ya tienes una cuenta creada?{' '}
          <Link href="/login" className="text-teal-700 font-semibold hover:underline">
            Inicia sesión con tu usuario aquí
          </Link>
        </p>
      </div>
    </div>
  );
}
