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
  KeyRound,
  Search,
  Lock,
  Mail,
  Copy,
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
    adminResetUserPassword,
    adminGetUserAccountDetails,
    adminPromoteCurrentUser,
    loginWithDemoAccount,
  } = usePlatform();

  const [activeTab, setActiveTab] = useState<
    'reports' | 'users' | 'catalog' | 'ads_and_quotas' | 'audit'
  >('reports');

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab === 'users' || tab === 'reports' || tab === 'catalog' || tab === 'ads_and_quotas' || tab === 'audit') {
        setActiveTab(tab);
      }
    }
  }, []);
  const [adminNotesMap, setAdminNotesMap] = useState<Record<string, string>>({});

  // User management & credentials recovery state
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [selectedUserForReset, setSelectedUserForReset] = useState<{
    id: string;
    username: string;
    display_name: string;
  } | null>(null);
  const [resetModalNewPass, setResetModalNewPass] = useState('');
  const [resetModalSuccess, setResetModalSuccess] = useState<string | null>(null);
  const [resetModalError, setResetModalError] = useState<string | null>(null);

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
    currentUser &&
    currentUser.role === 'admin' &&
    currentUser.username.toLowerCase() === 'yherzon21';

  if (!isAuthorizedAdmin) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <div
          data-testid="admin-access-denied"
          className="rounded-3xl border border-rose-200 bg-white p-8 space-y-4"
        >
          <ShieldAlert className="w-10 h-10 text-rose-600 mx-auto" />
          <h1 className="text-xl font-bold text-slate-900">
            Acceso Restringido: Panel de Administración
          </h1>
          <p className="text-xs text-slate-600">
            Esta sección es de acceso privado y exclusivo para la cuenta del Administrador oficial (
            <strong className="text-slate-900 font-mono">@Yherzon21</strong>). Ninguna otra cuenta
            tiene permisos de administración.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold"
            >
              Iniciar sesión como @Yherzon21
            </Link>
            <Link
              href="/dashboard"
              className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold"
            >
              Volver a mi panel
            </Link>
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

      {/* TAB 2: USERS MANAGEMENT & CREDENTIAL RECOVERY REGISTRY */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          {/* Informative Admin Notice */}
          <div className="rounded-3xl border border-teal-200 bg-teal-50/60 p-5 space-y-2 text-xs text-teal-900">
            <div className="flex items-center gap-2 font-bold text-sm text-teal-950">
              <KeyRound className="w-4 h-4 text-teal-700" />
              <span>Registro Maestro de Cuentas y Recuperación (Exclusivo Administrador)</span>
            </div>
            <p className="leading-relaxed">
              Como administrador de Linguevia, conservas el registro maestro de todos los usuarios
              registrados. Si un usuario olvida su contraseña o su respuesta secreta y reporta su
              caso al correo oficial de soporte, puedes verificar su usuario aquí, consultar su
              pregunta secreta y restablecerle una contraseña temporal para entregársela
              directamente.
            </p>
          </div>

          {/* Modal for setting new password for user */}
          {selectedUserForReset && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="w-full max-w-md rounded-3xl bg-white border border-slate-200 p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <KeyRound className="w-5 h-5 text-teal-600" />
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">
                        Restablecer y entregar contraseña
                      </h2>
                      <p className="text-[11px] text-slate-500">
                        Usuario: @{selectedUserForReset.username} ({selectedUserForReset.display_name})
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedUserForReset(null);
                      setResetModalNewPass('');
                      setResetModalSuccess(null);
                      setResetModalError(null);
                    }}
                    className="text-xs text-slate-400 hover:text-slate-700 px-2 py-1"
                  >
                    Cerrar
                  </button>
                </div>

                {resetModalError && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                    {resetModalError}
                  </div>
                )}

                {resetModalSuccess ? (
                  <div className="space-y-3">
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900 space-y-1">
                      <div className="font-bold flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>¡Contraseña actualizada en el sistema!</span>
                      </div>
                      <p>
                        Copia los siguientes datos para entregárselos al usuario por el canal de
                        soporte:
                      </p>
                    </div>

                    <div className="p-3 bg-slate-900 text-white rounded-xl font-mono text-xs space-y-1 select-all">
                      <div>Usuario: @{selectedUserForReset.username}</div>
                      <div>Nueva Contraseña: {resetModalNewPass}</div>
                      <div>Web: https://linguevia.vercel.app/login</div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (typeof navigator !== 'undefined') {
                          navigator.clipboard.writeText(
                            `Tus datos de acceso a Linguevia:\nUsuario: @${selectedUserForReset.username}\nContraseña: ${resetModalNewPass}\nAcceso: https://linguevia.vercel.app/login`
                          );
                        }
                        alert('Copiado al portapapeles para enviar al usuario.');
                      }}
                      className="w-full py-2 px-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar datos para el usuario</span>
                    </button>
                  </div>
                ) : (
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      setResetModalError(null);
                      if (resetModalNewPass.length < 6) {
                        setResetModalError('La contraseña debe tener al menos 6 caracteres.');
                        return;
                      }
                      const res = await adminResetUserPassword(
                        selectedUserForReset.id,
                        resetModalNewPass
                      );
                      if (!res.ok) {
                        setResetModalError(res.error || 'Error al restablecer la contraseña.');
                        return;
                      }
                      setResetModalSuccess('Contraseña restablecida con éxito.');
                    }}
                    className="space-y-3.5"
                  >
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-slate-700">
                        Nueva contraseña temporal para entregar al usuario:
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          required
                          value={resetModalNewPass}
                          onChange={(e) => setResetModalNewPass(e.target.value)}
                          placeholder="Ej. Linguevia2026!"
                          className="flex-1 px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const generated = `Linguevia_${Math.floor(1000 + Math.random() * 9000)}!`;
                            setResetModalNewPass(generated);
                          }}
                          className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium"
                        >
                          Generar
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        El usuario podrá ingresar de inmediato a su cuenta con esta contraseña.
                      </p>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setSelectedUserForReset(null)}
                        className="px-4 py-2 rounded-xl border border-slate-200 text-xs text-slate-600 hover:bg-slate-50"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs"
                      >
                        Guardar y entregar
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}

          {/* User List & Filter */}
          <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                  placeholder="Buscar usuario (@), nombre o país..."
                  className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div className="text-xs text-slate-500">
                Total cuentas registradas: <strong>{store.profiles.length}</strong> · Suspendidas:{' '}
                <strong>{suspendedUsersCount}</strong>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {store.profiles
                .filter((u) => {
                  if (!userSearchTerm.trim()) return true;
                  const q = userSearchTerm.toLowerCase();
                  return (
                    u.username.toLowerCase().includes(q) ||
                    u.display_name.toLowerCase().includes(q) ||
                    u.country_code.toLowerCase().includes(q)
                  );
                })
                .map((u) => {
                  const accountDetails = adminGetUserAccountDetails(u.id);

                  return (
                    <div
                      key={u.id}
                      className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs hover:bg-slate-50/50"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-slate-900">{u.display_name}</span>
                          <span className="font-mono text-teal-700 font-semibold bg-teal-50 px-2 py-0.5 rounded-md">
                            @{u.username}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold uppercase text-[10px]">
                            {u.role}
                          </span>
                          {u.is_suspended && (
                            <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold text-[10px]">
                              SUSPENDIDO
                            </span>
                          )}
                        </div>

                        <div className="text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span>
                            <strong>Nacionalidad / País:</strong> {u.country_code}
                          </span>
                          <span>
                            <strong>Correo:</strong> {accountDetails?.email || 'Solo usuario'}
                          </span>
                          <span>
                            <strong>Pregunta secreta:</strong>{' '}
                            {accountDetails?.security_question || 'No configurada'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* ADMIN PASSWORD RESET BUTTON */}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedUserForReset({
                              id: u.id,
                              username: u.username,
                              display_name: u.display_name,
                            });
                            setResetModalNewPass(`Linguevia_${Math.floor(1000 + Math.random() * 9000)}!`);
                            setResetModalSuccess(null);
                            setResetModalError(null);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 font-semibold border border-teal-200"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                          <span>Restablecer contraseña</span>
                        </button>

                        {u.id !== currentUser.id && (
                          <>
                            {u.is_suspended ? (
                              <button
                                type="button"
                                onClick={() => adminToggleUserSuspension(u.id, false)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-semibold"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Restaurar</span>
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
                                <span>Suspender</span>
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
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
