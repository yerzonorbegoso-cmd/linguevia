import { z } from 'zod';

/**
 * Calculates exact age in years given an ISO YYYY-MM-DD birth date string
 * relative to a reference date (defaults to current UTC date).
 */
export function calculateAgeYears(birthDateIso: string, referenceDate: Date = new Date()): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDateIso.trim());
  if (!match) {
    return -1;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const birth = new Date(Date.UTC(year, month - 1, day));
  if (
    Number.isNaN(birth.getTime()) ||
    birth.getUTCFullYear() !== year ||
    birth.getUTCMonth() !== month - 1 ||
    birth.getUTCDate() !== day
  ) {
    return -1;
  }

  let age = referenceDate.getUTCFullYear() - year;
  const monthDiff = referenceDate.getUTCMonth() + 1 - month;
  if (monthDiff < 0 || (monthDiff === 0 && referenceDate.getUTCDate() < day)) {
    age -= 1;
  }
  return age;
}

export function isAdultBirthDate(birthDateIso: string, referenceDate: Date = new Date()): boolean {
  const age = calculateAgeYears(birthDateIso, referenceDate);
  return age >= 18 && age <= 120;
}

export const registerSchema = z.object({
  email: z
    .string()
    .trim()
    .refine((val) => val === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), {
      message: 'Introduce un correo electrónico válido o déjalo en blanco.',
    })
    .default(''),
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres.')
    .max(72, 'La contraseña no puede superar los 72 caracteres.'),
  displayName: z
    .string()
    .trim()
    .min(2, 'El nombre visible debe tener al menos 2 caracteres.')
    .max(60, 'El nombre visible es demasiado largo.'),
  username: z
    .string()
    .trim()
    .min(3, 'El nombre de usuario debe tener entre 3 y 32 caracteres.')
    .max(32)
    .regex(/^[a-zA-Z0-9_.-]+$/, 'El usuario solo puede contener letras, números, guiones y puntos.'),
  securityQuestion: z
    .string()
    .trim()
    .min(4, 'Selecciona o escribe una pregunta secreta de seguridad.'),
  securityAnswer: z
    .string()
    .trim()
    .min(2, 'Escribe la respuesta a tu pregunta secreta.'),
  birthDate: z
    .string()
    .refine((val) => isAdultBirthDate(val), {
      message: 'Debes ser mayor de 18 años para registrarte en Linguevia.',
    }),
  countryCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/, 'Selecciona un país válido (código ISO de 2 letras).'),
  timezone: z.string().trim().min(2).max(64),
  confirmAdult: z.literal(true, {
    message: 'Debes confirmar explícitamente que eres mayor de 18 años.',
  }),
  acceptTerms: z.literal(true, {
    message: 'Debes aceptar las normas de la comunidad y privacidad.',
  }),
});

export const sendMessageSchema = z.object({
  conversationId: z.string().min(3),
  contentType: z.enum(['text', 'voice', 'correction', 'system_prompt']),
  body: z.string().trim().max(4000),
  voiceDurationSec: z.number().int().min(1).max(180).optional(),
  voiceSizeBytes: z
    .number()
    .int()
    .min(1)
    .max(5 * 1024 * 1024, 'La nota de voz supera el límite máximo de 5 MB.')
    .optional(),
  correctionData: z
    .object({
      original_text: z.string().min(1).max(1000),
      corrected_text: z.string().min(1).max(1000),
      explanation: z.string().max(1000),
      language_code: z.string().min(2).max(10),
    })
    .optional(),
});

export const createReportSchema = z.object({
  reportedUserId: z.string().min(3),
  conversationId: z.string().optional().nullable(),
  messageId: z.string().optional().nullable(),
  reasonCategory: z.enum([
    'spam',
    'harassment',
    'inappropriate_content',
    'underage_suspicion',
    'scam_or_commercial',
    'hate_speech',
    'other',
  ]),
  description: z
    .string()
    .trim()
    .min(10, 'Describe el motivo de la denuncia con al menos 10 caracteres.')
    .max(1500, 'La descripción no puede exceder 1500 caracteres.'),
  blockUserImmediately: z.boolean().default(false),
});

export const livekitTokenRequestSchema = z.object({
  conversationId: z.string().min(3),
  sessionId: z.string().min(3),
  callType: z.enum(['audio', 'video']),
});

/**
 * Sanitizes public profile output so email, birth_date, and exact coordinates
 * can NEVER leak even if passed accidentally in an object.
 */
export function stripSensitiveProfileFields<T extends Record<string, unknown>>(
  raw: T
): Omit<T, 'email' | 'birth_date' | 'birthDate' | 'password_hash' | 'exact_location' | 'latitude' | 'longitude'> {
  const clone = { ...raw };
  delete clone.email;
  delete clone.birth_date;
  delete clone.birthDate;
  delete clone.password_hash;
  delete clone.exact_location;
  delete clone.latitude;
  delete clone.longitude;
  return clone;
}
