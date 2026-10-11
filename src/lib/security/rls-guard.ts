import { ChatMessage, Conversation, MessageOrProfileReport, PrivateAccountRecord, UserBlock, UserProfile } from '@/types/database';
import { stripSensitiveProfileFields } from '@/lib/security/validators';

export function areUsersBlocked(blocks: UserBlock[], userA: string, userB: string): boolean {
  return blocks.some(
    (b) =>
      (b.blocker_id === userA && b.blocked_id === userB) ||
      (b.blocker_id === userB && b.blocked_id === userA)
  );
}

export function isAuthorizedConversationParticipant(
  conversation: Conversation | undefined,
  blocks: UserBlock[],
  viewerId: string | null
): boolean {
  if (!conversation || !viewerId || !conversation.is_active) {
    return false;
  }
  if (!conversation.participant_ids.includes(viewerId)) {
    return false;
  }
  // If any participant has blocked the viewer (or vice versa), access is revoked
  for (const otherId of conversation.participant_ids) {
    if (otherId !== viewerId && areUsersBlocked(blocks, viewerId, otherId)) {
      return false;
    }
  }
  return true;
}

/**
 * Enforces Row-Level Security on message queries.
 * Returns empty array if viewer is not an authorized, unblocked participant.
 */
export function selectMessagesForViewer(
  allMessages: ChatMessage[],
  conversation: Conversation | undefined,
  blocks: UserBlock[],
  viewerId: string | null
): ChatMessage[] {
  if (!isAuthorizedConversationParticipant(conversation, blocks, viewerId)) {
    return [];
  }
  return allMessages.filter(
    (m) => m.conversation_id === conversation!.id && !m.deleted_at
  );
}

/**
 * Enforces Row-Level Security on private PII records (`profile_private`).
 * A user can ONLY read their own private record (birth_date, email).
 */
export function selectPrivateAccountForViewer(
  privateAccounts: PrivateAccountRecord[],
  targetUserId: string,
  viewerId: string | null
): PrivateAccountRecord | null {
  if (!viewerId || viewerId !== targetUserId) {
    return null;
  }
  return privateAccounts.find((a) => a.user_id === targetUserId) ?? null;
}

/**
 * Returns a sanitized public profile respecting user privacy flags and blocks.
 * Never exposes email, birth_date, or exact location.
 */
export function selectSafePublicProfile(
  profile: UserProfile | undefined,
  blocks: UserBlock[],
  viewerId: string | null
): UserProfile | null {
  if (!profile) return null;
  if (profile.is_suspended && viewerId !== profile.id) return null;
  if (viewerId && viewerId !== profile.id && areUsersBlocked(blocks, viewerId, profile.id)) {
    return null;
  }

  const sanitized = stripSensitiveProfileFields({ ...profile }) as UserProfile;

  if (viewerId !== profile.id) {
    return {
      ...sanitized,
      country_code: profile.privacy_settings.show_country ? profile.country_code : '--',
      timezone: profile.privacy_settings.show_timezone ? profile.timezone : 'Oculta por privacidad',
      last_active_at: profile.privacy_settings.show_online_status
        ? profile.last_active_at
        : profile.created_at,
    };
  }

  return sanitized;
}

/**
 * Determines whether an advertisement slot is allowed to render on a given view.
 * Rule (Section 10):
 * - Never render if ads are disabled globally
 * - Never render on pages with flagged/reported content or pending moderation
 * - Never render if consent is required and the user has not granted ad consent
 * - Never render fake ads as real ads when publisher ID is not configured
 */
export function canRenderAdSlot(params: {
  adsEnabledGlobally: boolean;
  hasFlaggedOrPendingModerationContent: boolean;
  requireConsent: boolean;
  userGrantedAdConsent: boolean;
}): { allowed: boolean; reason?: string } {
  if (!params.adsEnabledGlobally) {
    return { allowed: false, reason: 'ads_disabled_globally' };
  }
  if (params.hasFlaggedOrPendingModerationContent) {
    return { allowed: false, reason: 'blocked_on_moderated_or_reported_content' };
  }
  if (params.requireConsent && !params.userGrantedAdConsent) {
    return { allowed: false, reason: 'awaiting_user_privacy_consent' };
  }
  return { allowed: true };
}

export function isProfileOrConversationUnderModeration(
  reports: MessageOrProfileReport[],
  targetUserId?: string | null,
  conversationId?: string | null
): boolean {
  return reports.some((r) => {
    if (r.status !== 'pending' && r.status !== 'investigating') return false;
    if (targetUserId && r.reported_user_id === targetUserId) return true;
    if (conversationId && r.conversation_id === conversationId) return true;
    return false;
  });
}
