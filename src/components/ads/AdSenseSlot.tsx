'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import { ShieldCheck, Info } from 'lucide-react';
import { getPublicEnv } from '@/lib/env';
import { usePlatform } from '@/components/providers/PlatformProvider';
import { canRenderAdSlot, isProfileOrConversationUnderModeration } from '@/lib/security/rls-guard';

interface AdSenseSlotProps {
  placement: 'dashboard' | 'explore' | 'public_footer';
  targetUserId?: string | null;
  conversationId?: string | null;
  forceFlaggedContent?: boolean;
  className?: string;
}

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

export function AdSenseSlot({
  placement,
  targetUserId,
  conversationId,
  forceFlaggedContent = false,
  className = '',
}: AdSenseSlotProps) {
  const { store, currentUser } = usePlatform();
  const env = getPublicEnv();
  const adPushedRef = useRef(false);

  const isUnderModeration =
    forceFlaggedContent ||
    (store.settings.ads_disable_on_flagged_pages &&
      isProfileOrConversationUnderModeration(store.reports, targetUserId, conversationId));

  const userConsent = currentUser
    ? store.consents.find((c) => c.user_id === currentUser.id)
    : null;

  const hasGrantedConsent = Boolean(
    userConsent
      ? userConsent.ads_personalized_consent || userConsent.ads_non_personalized_consent
      : true
  );

  const guard = canRenderAdSlot({
    adsEnabledGlobally: store.settings.ads_enabled,
    hasFlaggedOrPendingModerationContent: isUnderModeration,
    requireConsent: store.settings.ads_require_consent,
    userGrantedAdConsent: hasGrantedConsent,
  });

  useEffect(() => {
    if (!guard.allowed || !env.isAdSenseConfigured || adPushedRef.current) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      adPushedRef.current = true;
    } catch {
      // AdSense script not yet loaded or blocked by browser extension
    }
  }, [env.isAdSenseConfigured, guard.allowed]);

  // Strictly suppress the entire container if blocked by moderation or disabled globally
  if (!guard.allowed) {
    if (guard.reason === 'blocked_on_moderated_or_reported_content') {
      return (
        <div
          data-testid="ad-suppressed-moderation"
          className="rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-2.5 text-xs text-amber-800 flex items-center gap-2"
        >
          <ShieldCheck className="w-4 h-4 shrink-0 text-amber-600" />
          <span>
            Publicidad desactivada automáticamente: esta vista contiene elementos en revisión por
            moderación.
          </span>
        </div>
      );
    }
    return null;
  }

  const slotId =
    placement === 'dashboard'
      ? env.adsenseSlotDashboard
      : placement === 'explore'
      ? env.adsenseSlotExplore
      : env.adsenseSlotDashboard;

  // If valid Google AdSense publisher ID and slot are configured in .env.local, render real <ins>
  if (env.isAdSenseConfigured && slotId) {
    return (
      <aside
        aria-label="Espacio patrocinado"
        className={`rounded-2xl border border-slate-200 bg-white p-3 shadow-xs ${className}`}
      >
        <div className="flex items-center justify-between text-[11px] text-slate-400 uppercase tracking-wider mb-1.5">
          <span>Publicidad · Google AdSense</span>
          <Link href="/settings" className="hover:text-slate-600 underline">
            Preferencias de anuncios
          </Link>
        </div>
        <ins
          className="adsbygoogle block min-h-[90px] w-full"
          style={{ display: 'block' }}
          data-ad-client={env.adsenseClientId}
          data-ad-slot={slotId}
          data-ad-format="auto"
          data-full-width-responsive="true"
          data-npa={userConsent?.ads_personalized_consent ? '0' : '1'}
        />
      </aside>
    );
  }

  // Transparent technical placeholder when NEXT_PUBLIC_ADSENSE_CLIENT_ID is not yet configured.
  // Never pretends to be a commercial advertisement or invents a publisher ID.
  return (
    <aside
      aria-label="Espacio reservado para publicidad"
      data-testid={`ad-slot-placeholder-${placement}`}
      className={`rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 px-4 py-3 text-xs text-slate-600 flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${className}`}
    >
      <div className="flex items-start sm:items-center gap-2.5">
        <Info className="w-4 h-4 text-teal-600 shrink-0 mt-0.5 sm:mt-0" />
        <div>
          <span className="font-semibold text-slate-700">
            Espacio publicitario reservado ({placement})
          </span>
          <p className="text-slate-500">
            Integración lista para Google AdSense. Configura{' '}
            <code className="px-1 py-0.5 bg-slate-200/70 rounded text-[11px]">
              NEXT_PUBLIC_ADSENSE_CLIENT_ID
            </code>{' '}
            en <code className="px-1 py-0.5 bg-slate-200/70 rounded text-[11px]">.env.local</code>.
            Consentimiento actual:{' '}
            <strong>
              {userConsent?.ads_personalized_consent
                ? 'Personalizado'
                : 'Estándar no personalizado'}
            </strong>
            .
          </p>
        </div>
      </div>
      <Link
        href="/settings"
        className="text-teal-700 hover:text-teal-800 font-medium underline shrink-0"
      >
        Gestionar privacidad
      </Link>
    </aside>
  );
}
