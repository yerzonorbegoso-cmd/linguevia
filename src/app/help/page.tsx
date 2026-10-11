'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  HelpCircle,
  ShieldCheck,
  Lock,
  Video,
  MessageSquare,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

const FAQS = [
  {
    q: '¿Por qué LinguaConnect es exclusivamente para mayores de 18 años?',
    a: 'Para garantizar un entorno de intercambio seguro, legalmente claro y adaptado a conversaciones entre personas adultas de distintos países. Verificamos la mayoría de edad en el registro y mediante restricciones en la base de datos (CHECK constraint y políticas RLS).',
  },
  {
    q: '¿Qué datos personales son visibles en mi perfil público?',
    a: 'Únicamente tu nombre visible, tu @username, biografía, idiomas (nativos y en aprendizaje), intereses y, si lo autorizas en Ajustes, tu país y zona horaria. Tu correo electrónico, fecha de nacimiento y ubicación exacta NUNCA se publican.',
  },
  {
    q: '¿Cómo funciona el emparejamiento por idiomas complementarios?',
    a: 'El motor de búsqueda asigna mayor puntuación a quienes hablan como nativos el idioma que tú deseas practicar y, al mismo tiempo, están aprendiendo el idioma que tú hablas como nativo (tándem mutuo).',
  },
  {
    q: '¿Se graban las llamadas de audio o video?',
    a: 'No. Las llamadas WebRTC generan tokens temporales en el backend con el permiso roomRecord explícitamente deshabilitado (recording_enabled = FALSE en la base de datos).',
  },
  {
    q: '¿Cómo funcionan las denuncias, bloqueos y los espacios publicitarios?',
    a: 'Puedes bloquear o denunciar cualquier perfil o mensaje en un clic. Al bloquear a alguien, se revoca inmediatamente su acceso al chat y llamadas mediante Row Level Security. Además, cualquier vista con denuncias pendientes oculta automáticamente los espacios publicitarios.',
  },
  {
    q: '¿Puedo usar mi misma cuenta en la futura aplicación móvil en Flutter?',
    a: 'Sí. Toda la arquitectura (Supabase Auth, PostgreSQL con RLS, RPC find_language_partners y endpoints /api/v1/*) está desacoplada para que la aplicación móvil en Flutter consuma exactamente el mismo backend y las mismas cuentas.',
  },
];

export default function HelpCenterPage() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-10">
      <div className="space-y-2 text-center max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 text-teal-700 text-xs font-semibold">
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Soporte, Seguridad y Normas de la Comunidad</span>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900">Centro de Ayuda LinguaConnect</h1>
        <p className="text-xs sm:text-sm text-slate-600">
          Guía rápida sobre privacidad, aprendizaje tándem, llamadas WebRTC y moderación.
        </p>
      </div>

      {/* Quick Guide Cards */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-2">
          <ShieldCheck className="w-6 h-6 text-teal-600" />
          <h2 className="font-bold text-sm text-slate-900">Seguridad +18</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Control estricto de mayoría de edad, bloqueo instantáneo y revisión de reportes por
            moderadores.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-2">
          <MessageSquare className="w-6 h-6 text-indigo-600" />
          <h2 className="font-bold text-sm text-slate-900">Práctica Guiada y Libre</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Alterna entre conversación libre y temas sugeridos por nivel MCER, guardando
            vocabulario y correcciones.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-2">
          <Video className="w-6 h-6 text-emerald-600" />
          <h2 className="font-bold text-sm text-slate-900">Llamadas sin grabación</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Salas individuales de audio y video protegidas por tokens temporales firmados en el
            servidor.
          </p>
        </div>
      </div>

      {/* Accordion FAQs */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-slate-900">Preguntas frecuentes</h2>
        {FAQS.map((item, idx) => {
          const isOpen = openIdx === idx;
          return (
            <div
              key={idx}
              className="rounded-2xl border border-slate-200 bg-white overflow-hidden"
            >
              <button
                type="button"
                onClick={() => setOpenIdx(isOpen ? null : idx)}
                className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 font-bold text-sm text-slate-900 hover:bg-slate-50"
              >
                <span>{item.q}</span>
                {isOpen ? (
                  <ChevronUp className="w-4 h-4 text-slate-500 shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
                )}
              </button>
              {isOpen && (
                <div className="px-5 pb-4 text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                  {item.a}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Data Retention & Privacy Box */}
      <div className="rounded-3xl border border-slate-200 bg-slate-900 text-white p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-teal-400 font-bold text-sm">
            <Lock className="w-4 h-4" />
            <span>Política de Retención y Eliminación de Datos</span>
          </div>
          <p className="text-xs text-slate-300 max-w-xl">
            Puedes gestionar tu consentimiento publicitario, ocultar tu país o zona horaria y
            eliminar permanentemente tu cuenta y todos tus mensajes desde tu panel de Ajustes.
          </p>
        </div>
        <Link
          href="/settings"
          className="px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shrink-0"
        >
          Ir a Ajustes de Privacidad
        </Link>
      </div>
    </div>
  );
}
