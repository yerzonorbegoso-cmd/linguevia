'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Globe2,
  Compass,
  MessageSquare,
  BookOpen,
  LayoutDashboard,
  Settings,
  ShieldAlert,
  HelpCircle,
  Bell,
  LogOut,
  PhoneIncoming,
  CheckCircle2,
  AlertCircle,
  Info,
  X,
} from 'lucide-react';
import { usePlatform } from '@/components/providers/PlatformProvider';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    isHydrated,
    currentUser,
    store,
    toasts,
    dismissToast,
    logout,
    markAllNotificationsRead,
    updateCallSessionState,
  } = usePlatform();

  const [showNotifPanel, setShowNotifPanel] = useState(false);

  const unreadNotifications = currentUser
    ? store.notifications.filter((n) => n.user_id === currentUser.id && !n.is_read)
    : [];

  const userNotifications = currentUser
    ? store.notifications.filter((n) => n.user_id === currentUser.id).slice(0, 8)
    : [];

  const pendingIncomingCall = currentUser
    ? store.callSessions.find(
        (s) => s.callee_id === currentUser.id && s.status === 'ringing'
      )
    : undefined;

  const callerProfile = pendingIncomingCall
    ? store.profiles.find((p) => p.id === pendingIncomingCall.caller_id)
    : undefined;

  const navItems = [
    { href: '/dashboard', label: 'Panel', icon: LayoutDashboard },
    { href: '/explore', label: 'Explorar', icon: Compass },
    { href: '/messages', label: 'Mensajes', icon: MessageSquare },
    { href: '/learning', label: 'Aprendizaje', icon: BookOpen },
    { href: '/onboarding', label: 'Mis Idiomas', icon: Globe2 },
    { href: '/settings', label: 'Ajustes', icon: Settings },
  ];

  if (currentUser && (currentUser.role === 'admin' || currentUser.role === 'moderator')) {
    navItems.push({ href: '/admin', label: 'Admin', icon: ShieldAlert });
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-6">
            <Link
              href={currentUser ? '/dashboard' : '/'}
              className="flex items-center gap-2.5 font-bold text-lg tracking-tight text-slate-900"
            >
              <span className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-xs">
                <Globe2 className="w-5 h-5" />
              </span>
              <span>Linguevia</span>
              <span className="hidden sm:inline-block text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                18+ Internacional
              </span>
            </Link>

            {isHydrated && currentUser && (
              <nav aria-label="Navegación principal" className="hidden md:flex items-center gap-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const active =
                    pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-colors ${
                        active
                          ? 'bg-teal-50 text-teal-800 font-semibold'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/help"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            >
              <HelpCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Centro de ayuda</span>
            </Link>

            {isHydrated && currentUser ? (
              <>
                {/* Notifications Dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    aria-label="Notificaciones"
                    onClick={() => {
                      setShowNotifPanel((v) => !v);
                      if (!showNotifPanel && unreadNotifications.length > 0) {
                        markAllNotificationsRead();
                      }
                    }}
                    className="relative p-2 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  >
                    <Bell className="w-5 h-5" />
                    {unreadNotifications.length > 0 && (
                      <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center">
                        {unreadNotifications.length}
                      </span>
                    )}
                  </button>

                  {showNotifPanel && (
                    <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-slate-200 bg-white shadow-xl p-3 z-50">
                      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                          Notificaciones recientes
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowNotifPanel(false)}
                          className="text-xs text-slate-400 hover:text-slate-600"
                        >
                          Cerrar
                        </button>
                      </div>
                      {userNotifications.length === 0 ? (
                        <p className="text-xs text-slate-500 py-4 text-center">
                          No tienes notificaciones pendientes.
                        </p>
                      ) : (
                        <ul className="space-y-1.5 max-h-72 overflow-y-auto">
                          {userNotifications.map((n) => (
                            <li
                              key={n.id}
                              className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-xs transition-colors"
                            >
                              <div className="font-semibold text-slate-800">{n.title}</div>
                              <p className="text-slate-600 mt-0.5">{n.body}</p>
                              {n.action_url && (
                                <Link
                                  href={n.action_url}
                                  onClick={() => setShowNotifPanel(false)}
                                  className="inline-block mt-1 text-teal-700 font-semibold hover:underline"
                                >
                                  Abrir →
                                </Link>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>

                {/* Public Profile Shortcut */}
                <Link
                  href={`/u/${currentUser.username}`}
                  className="hidden sm:flex items-center gap-2 pl-2 pr-3 py-1 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-700"
                >
                  <span className="w-6 h-6 rounded-full bg-teal-600 text-white font-bold flex items-center justify-center uppercase">
                    {currentUser.display_name.slice(0, 1)}
                  </span>
                  <span className="max-w-[120px] truncate">{currentUser.display_name}</span>
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    logout();
                    router.push('/');
                  }}
                  title="Cerrar sesión / Salir de la cuenta"
                  aria-label="Cerrar sesión"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Salir</span>
                </button>
              </>
            ) : (
              isHydrated && (
                <div className="flex items-center gap-2">
                  <Link
                    href="/login"
                    className="px-3.5 py-2 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-100"
                  >
                    Iniciar sesión
                  </Link>
                  <Link
                    href="/register"
                    className="px-4 py-2 rounded-xl text-sm font-semibold bg-teal-600 text-white hover:bg-teal-700 shadow-xs"
                  >
                    Registrarse (+18)
                  </Link>
                </div>
              )
            )}
          </div>
        </div>
      </header>

      {/* Incoming Call Real-Time Banner (Does not block critical controls, allows instant accept/reject) */}
      {pendingIncomingCall && (
        <div
          role="alert"
          data-testid="incoming-call-banner"
          className="bg-slate-900 text-white px-4 py-3 border-b border-slate-700 shadow-lg"
        >
          <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center animate-pulse">
                <PhoneIncoming className="w-5 h-5" />
              </span>
              <div>
                <p className="text-sm font-semibold">
                  Llamada {pendingIncomingCall.call_type === 'video' ? 'de video' : 'de audio'}{' '}
                  entrante de {callerProfile?.display_name ?? 'tu compañero'}
                </p>
                <p className="text-xs text-slate-300">
                  Sala segura WebRTC · Sin grabación por defecto
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  updateCallSessionState(pendingIncomingCall.id, 'accepted');
                  router.push(`/call/${pendingIncomingCall.id}`);
                }}
                className="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold text-xs"
              >
                Aceptar llamada
              </button>
              <button
                type="button"
                onClick={() =>
                  updateCallSessionState(pendingIncomingCall.id, 'rejected', {
                    endReason: 'rejected_by_callee',
                  })
                }
                className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs"
              >
                Rechazar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 pb-20 md:pb-10">{children}</main>

      {/* Mobile Bottom Navigation */}
      {isHydrated && currentUser && (
        <nav
          aria-label="Navegación móvil"
          className="md:hidden fixed bottom-0 inset-x-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur px-2 py-1.5 flex items-center justify-around"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-0.5 px-2.5 py-1 rounded-xl text-[11px] font-medium ${
                  active ? 'text-teal-700 font-semibold' : 'text-slate-500'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      )}

      {/* Toast Notification Stack */}
      {toasts.length > 0 && (
        <div
          aria-live="polite"
          className="fixed bottom-16 md:bottom-5 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
        >
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-start gap-2.5 px-4 py-3 rounded-2xl shadow-lg border text-xs font-medium ${
                t.type === 'success'
                  ? 'bg-emerald-950 text-emerald-50 border-emerald-800'
                  : t.type === 'error'
                  ? 'bg-rose-950 text-rose-50 border-rose-800'
                  : 'bg-slate-900 text-slate-50 border-slate-700'
              }`}
            >
              {t.type === 'success' && (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              )}
              {t.type === 'error' && (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              {t.type === 'info' && (
                <Info className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
              )}
              <span className="flex-1">{t.message}</span>
              <button
                type="button"
                onClick={() => dismissToast(t.id)}
                aria-label="Cerrar notificación"
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
