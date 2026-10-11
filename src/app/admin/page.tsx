'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ShieldAlert,
  Flag,
  Users,
  Globe2,
  Activity,
  Megaphone,
  FileText,
  CheckCircle2,
  Ban,
  RotateCcw,
  Plus,
} from 'lucide-react';
import { usePlatform } from '@/components/providers/PlatformProvider';

export default function AdminDashboardPage() {
  const {
    isHydrated,
    currentUser,
    store,
    adminReviewReport,
    adminToggleUserSuspension,
    adminToggleLanguageCatalog,
    adminAddLanguageCatalog,
    adminAddInterestCatalog,
    adminUpdatePlatformSettings,
    loginWithDemoAccount,
  } = usePlatform();

  const [activeTab, setActiveTab] = useState<
    'reports' | 'users' | 'catalog' | 'ads_and_quotas' | 'audit'
  >('reports');
  const [adminNotesMap, setAdminNotesMap] = useState<Record<string, string>>({});

  // New language form
  const [newLangCode, setNewLangCode] = useState('');
  const [newLangEs, setNewLangEs] = useState('');
  const [newLangEn, setNewLangEn] = useState('');
  const [newLangNative, setNewLangNative] = useState('');
  const [newLangFlag, setNewLangFlag] = useState('🌐');

  // New interest form
  const [newIntSlug, setNewIntSlug] = useState('');
  const [newIntEs, setNewIntEs] = useState('');
  const [newIntEn, setNewIntEn] = useState('');
  const newIntCategory = 'general';

  if (!isHydrated) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center text-sm text-slate-500">
        Verificando credenciales de rol administrativo...
      </div>
    );
  }

  const isAuthorizedAdmin =
    currentUser && (currentUser.role === 'admin' || currentUser.role === 'moderator');

  if (!isAuthorizedAdmin) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <div
          data-testid="admin-access-denied"
          className="rounded-3xl border border-rose-200 bg-white p-8 space-y-4"
        >
          <ShieldAlert className="w-10 h-10 text-rose-600 mx-auto" />
          <h1 className="text-xl font-bold text-slate-900">
            Acceso Restringido: Panel de Administración (RBAC)
          </h1>
          <p className="text-xs text-slate-600">
            Esta ruta está protegida por rol (`admin` o `moderator`). Tu cuenta actual no tiene
            privilegios administrativos.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/dashboard"
              className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold"
            >
              Volver a mi panel
            </Link>
            <button
              type="button"
              onClick={() => loginWithDemoAccount('demo-user-elena')}
              className="px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-semibold"
            >
              Cambiar a Elena (Rol Admin Demo)
            </button>
          </div>
        </div>
      </div>
    );
  }

  const pendingReportsCount = store.reports.filter((r) => r.status === 'pending').length;
  const suspendedUsersCount = store.profiles.filter((p) => p.is_suspended).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900 text-white p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 text-xs font-semibold">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Panel Protegido por Rol ({currentUser.role.toUpperCase()})</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold">
            Administración, Moderación y Métricas
          </h1>
          <p className="text-xs text-slate-300">
            Todas las operaciones administrativas se validan en el servidor (`/api/v1/admin/action`)
            y quedan registradas en `admin_audit_logs`.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="px-4 py-2.5 rounded-2xl bg-slate-800 border border-slate-700">
            <div className="text-lg font-extrabold text-white">{store.profiles.length}</div>
            <div className="text-[10px] text-slate-400 uppercase">Usuarios</div>
          </div>
          <div className="px-4 py-2.5 rounded-2xl bg-slate-800 border border-slate-700">
            <div className="text-lg font-extrabold text-amber-400">{pendingReportsCount}</div>
            <div className="text-[10px] text-slate-400 uppercase">Denuncias pend.</div>
          </div>
          <div className="px-4 py-2.5 rounded-2xl bg-slate-800 border border-slate-700">
            <div className="text-lg font-extrabold text-teal-400">{store.messages.length}</div>
            <div className="text-[10px] text-slate-400 uppercase">Mensajes</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {[
          { id: 'reports', label: `Denuncias (${store.reports.length})`, icon: Flag },
          { id: 'users', label: `Usuarios (${store.profiles.length})`, icon: Users },
          { id: 'catalog', label: 'Idiomas e Intereses', icon: Globe2 },
          { id: 'ads_and_quotas', label: 'Anuncios, Límites y Salud', icon: Megaphone },
          { id: 'audit', label: `Auditoría (${store.auditLogs.length})`, icon: FileText },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() =>
                setActiveTab(
                  tab.id as 'reports' | 'users' | 'catalog' | 'ads_and_quotas' | 'audit'
                )
              }
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
                active
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: MODERATION REPORTS */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          {store.reports.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">
              No hay denuncias registradas.
            </div>
          ) : (
            store.reports.map((rep) => {
              const reporter = store.profiles.find((p) => p.id === rep.reporter_id);
              const reported = store.profiles.find((p) => p.id === rep.reported_user_id);
              const noteVal = adminNotesMap[rep.id] ?? rep.admin_notes ?? '';

              return (
                <div
                  key={rep.id}
                  className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                          rep.status === 'pending'
                            ? 'bg-amber-100 text-amber-800'
                            : rep.status === 'resolved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {rep.status}
                      </span>
                      <span className="text-xs font-bold text-slate-900">
                        Categoría: {rep.reason_category}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400">
                      {new Date(rep.created_at).toLocaleString()}
                    </span>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3 text-xs bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                    <div>
                      <span className="text-slate-400 font-semibold">Denunciante: </span>
                      <span className="font-bold text-slate-800">
                        {reporter?.display_name ?? rep.reporter_id}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold">Usuario reportado: </span>
                      <span className="font-bold text-rose-700">
                        {reported?.display_name ?? rep.reported_user_id}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-700 bg-amber-50/50 border border-amber-100 p-3 rounded-xl">
                    <strong>Descripción del reporte:</strong> {rep.description}
                  </p>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={noteVal}
                      onChange={(e) =>
                        setAdminNotesMap((prev) => ({ ...prev, [rep.id]: e.target.value }))
                      }
                      placeholder="Resolución o nota de auditoría interna..."
                      className="flex-1 px-3 py-2 rounded-xl border border-slate-300 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        adminReviewReport(
                          rep.id,
                          'resolved',
                          noteVal || 'Resuelto sin suspensión',
                          false
                        )
                      }
                      className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Resolver</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        adminReviewReport(
                          rep.id,
                          'resolved',
                          noteVal || 'Cuenta suspendida por infracción',
                          true
                        )
                      }
                      className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-1"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      <span>Resolver y Suspender Cuenta</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        adminReviewReport(rep.id, 'dismissed', noteVal || 'Desestimado', false)
                      }
                      className="px-3.5 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold"
                    >
                      Desestimar
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 2: USERS MANAGEMENT */}
      {activeTab === 'users' && (
        <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>
              Total cuentas: <strong>{store.profiles.length}</strong> · Suspendidas:{' '}
              <strong>{suspendedUsersCount}</strong>
            </span>
          </div>
          <div className="divide-y divide-slate-100">
            {store.profiles.map((u) => (
              <div
                key={u.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900">{u.display_name}</span>
                    <span className="text-slate-400">@{u.username}</span>
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold uppercase text-[10px]">
                      {u.role}
                    </span>
                    {u.is_suspended && (
                      <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold text-[10px]">
                        SUSPENDIDO
                      </span>
                    )}
                  </div>
                  <div className="text-slate-500 mt-0.5">
                    País: {u.country_code} · Adulto +18: {u.is_adult_verified ? 'Sí' : 'No'}
                  </div>
                </div>

                {u.id !== currentUser.id && (
                  <div>
                    {u.is_suspended ? (
                      <button
                        type="button"
                        onClick={() => adminToggleUserSuspension(u.id, false)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-semibold"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Restaurar cuenta</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          adminToggleUserSuspension(
                            u.id,
                            true,
                            'Suspensión preventiva desde panel admin'
                          )
                        }
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold border border-rose-200"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        <span>Suspender cuenta</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: LANGUAGES & INTERESTS CATALOG */}
      {activeTab === 'catalog' && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Languages */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-900">Catálogo de Idiomas</h2>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const res = await adminAddLanguageCatalog({
                  code: newLangCode,
                  name_es: newLangEs,
                  name_en: newLangEn || newLangEs,
                  native_name: newLangNative || newLangEs,
                  flag_emoji: newLangFlag,
                });
                if (res.ok) {
                  setNewLangCode('');
                  setNewLangEs('');
                  setNewLangEn('');
                  setNewLangNative('');
                }
              }}
              className="grid grid-cols-2 sm:grid-cols-4 gap-2"
            >
              <input
                type="text"
                required
                placeholder="Código (nl)"
                value={newLangCode}
                onChange={(e) => setNewLangCode(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl border border-slate-300 text-xs"
              />
              <input
                type="text"
                required
                placeholder="Nombre ES"
                value={newLangEs}
                onChange={(e) => setNewLangEs(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl border border-slate-300 text-xs"
              />
              <input
                type="text"
                placeholder="Emoji 🇳🇱"
                value={newLangFlag}
                onChange={(e) => setNewLangFlag(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl border border-slate-300 text-xs"
              />
              <button
                type="submit"
                className="px-3 py-1.5 rounded-xl bg-teal-600 text-white text-xs font-semibold flex items-center justify-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Añadir</span>
              </button>
            </form>

            <ul className="space-y-2">
              {store.languages.map((l) => (
                <li
                  key={l.code}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 text-xs"
                >
                  <span>
                    {l.flag_emoji} <strong>{l.name_es}</strong> ({l.code})
                  </span>
                  <button
                    type="button"
                    onClick={() => adminToggleLanguageCatalog(l.code)}
                    className={`px-2.5 py-1 rounded-lg font-semibold ${
                      l.is_active
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {l.is_active ? 'Activo' : 'Inactivo'}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Interests */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-900">Catálogo de Intereses</h2>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const res = await adminAddInterestCatalog({
                  slug: newIntSlug,
                  name_es: newIntEs,
                  name_en: newIntEn || newIntEs,
                  category: newIntCategory,
                });
                if (res.ok) {
                  setNewIntSlug('');
                  setNewIntEs('');
                  setNewIntEn('');
                }
              }}
              className="grid grid-cols-1 sm:grid-cols-3 gap-2"
            >
              <input
                type="text"
                required
                placeholder="Slug (photography)"
                value={newIntSlug}
                onChange={(e) => setNewIntSlug(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl border border-slate-300 text-xs"
              />
              <input
                type="text"
                required
                placeholder="Nombre ES (Fotografía)"
                value={newIntEs}
                onChange={(e) => setNewIntEs(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl border border-slate-300 text-xs"
              />
              <button
                type="submit"
                className="px-3 py-1.5 rounded-xl bg-teal-600 text-white text-xs font-semibold flex items-center justify-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Añadir interés</span>
              </button>
            </form>

            <ul className="space-y-2">
              {store.interests.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 text-xs"
                >
                  <span>
                    <strong>{item.name_es}</strong> ({item.slug})
                  </span>
                  <span className="text-slate-500 uppercase text-[10px]">{item.category}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* TAB 4: ADS, QUOTAS & TECHNICAL HEALTH */}
      {activeTab === 'ads_and_quotas' && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-900">
              Gestión Publicitaria (Google AdSense) y Reglas de Moderación
            </h2>
            <div className="space-y-3 text-xs text-slate-700">
              <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 cursor-pointer">
                <span>Habilitar espacios publicitarios en páginas permitidas</span>
                <input
                  type="checkbox"
                  checked={store.settings.ads_enabled}
                  onChange={(e) =>
                    adminUpdatePlatformSettings({ ads_enabled: e.target.checked })
                  }
                  className="rounded border-slate-300 text-teal-600"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 cursor-pointer">
                <span>Exigir consentimiento previo del usuario antes de cargar anuncios</span>
                <input
                  type="checkbox"
                  checked={store.settings.ads_require_consent}
                  onChange={(e) =>
                    adminUpdatePlatformSettings({ ads_require_consent: e.target.checked })
                  }
                  className="rounded border-slate-300 text-teal-600"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 cursor-pointer">
                <span>
                  Ocultar automáticamente anuncios en perfiles o chats con denuncias pendientes
                </span>
                <input
                  type="checkbox"
                  checked={store.settings.ads_disable_on_flagged_pages}
                  onChange={(e) =>
                    adminUpdatePlatformSettings({
                      ads_disable_on_flagged_pages: e.target.checked,
                    })
                  }
                  className="rounded border-slate-300 text-teal-600"
                />
              </label>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-4 h-4 text-teal-600" />
              <span>Supervisión de Consumo, Cuotas y Errores Técnicos</span>
            </h2>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between p-2.5 rounded-xl bg-slate-50">
                <span>Límite diario de solicitudes de conversación:</span>
                <strong>{store.settings.max_daily_requests} / usuario</strong>
              </div>
              <div className="flex justify-between p-2.5 rounded-xl bg-slate-50">
                <span>Límite de mensajes por minuto (Anti-spam):</span>
                <strong>{store.settings.max_messages_per_minute} / min</strong>
              </div>
              <div className="flex justify-between p-2.5 rounded-xl bg-slate-50">
                <span>Límite de sesiones WebRTC por hora:</span>
                <strong>{store.settings.max_calls_per_hour} / hora</strong>
              </div>
              <div className="flex justify-between p-2.5 rounded-xl bg-slate-50">
                <span>Tamaño máximo de nota de voz:</span>
                <strong>{store.settings.max_voice_note_mb} MB</strong>
              </div>
              <div className="flex justify-between p-2.5 rounded-xl bg-emerald-50 text-emerald-900">
                <span>Errores críticos del servidor en las últimas 24h:</span>
                <strong>0 incidentes</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 space-y-4">
          <h2 className="text-base font-bold text-slate-900">
            Registro Inmutable de Acciones Administrativas (`admin_audit_logs`)
          </h2>
          <div className="space-y-2">
            {store.auditLogs.map((log) => (
              <div
                key={log.id}
                className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div>
                  <span className="px-2 py-0.5 rounded bg-slate-900 text-white font-mono text-[10px] mr-2">
                    {log.action_type}
                  </span>
                  <span className="font-semibold text-slate-800">
                    Entidad: {log.target_entity} ({log.target_id})
                  </span>
                  <span className="text-slate-500 ml-2">
                    Por Admin ID: {log.admin_id}
                  </span>
                </div>
                <span className="text-slate-400 font-mono text-[11px]">
                  {new Date(log.created_at).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
