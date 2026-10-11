import { describe, it, expect, beforeEach } from 'vitest';
import {
  calculateAgeYears,
  isAdultBirthDate,
  registerSchema,
  sendMessageSchema,
  stripSensitiveProfileFields,
} from '@/lib/security/validators';
import {
  areUsersBlocked,
  canRenderAdSlot,
  isAuthorizedConversationParticipant,
  isProfileOrConversationUnderModeration,
  selectMessagesForViewer,
  selectPrivateAccountForViewer,
  selectSafePublicProfile,
} from '@/lib/security/rls-guard';
import { checkRateLimit, resetRateLimitBuckets } from '@/lib/security/rate-limit';
import { rankLanguagePartners } from '@/lib/matching/engine';
import { buildDemoSeedStore } from '@/lib/store/demo-data';

describe('LinguaConnect Security, 18+ Verification, RLS & Matching Engine', () => {
  const refDate = new Date('2026-10-11T12:00:00Z');

  beforeEach(() => {
    resetRateLimitBuckets();
  });

  describe('1. Adult (18+) Age Verification & Registration Constraints', () => {
    it('accepts users who are 18 years or older', () => {
      expect(calculateAgeYears('2008-10-11', refDate)).toBe(18);
      expect(isAdultBirthDate('2008-10-11', refDate)).toBe(true);
      expect(isAdultBirthDate('1994-05-20', refDate)).toBe(true);
    });

    it('rejects underage users (under 18) even by a single day', () => {
      expect(calculateAgeYears('2008-10-12', refDate)).toBe(17);
      expect(isAdultBirthDate('2008-10-12', refDate)).toBe(false);
      expect(isAdultBirthDate('2012-01-01', refDate)).toBe(false);
    });

    it('enforces 18+ confirmation and valid birthDate in registerSchema', () => {
      const underageAttempt = registerSchema.safeParse({
        email: 'teen@example.test',
        password: 'Password123!',
        displayName: 'Teen User',
        username: 'teen_user',
        birthDate: '2011-04-10',
        countryCode: 'ES',
        timezone: 'Europe/Madrid',
        confirmAdult: true,
        acceptTerms: true,
      });
      expect(underageAttempt.success).toBe(false);
    });
  });

  describe('2. Voice Note Size & Message Validation', () => {
    it('rejects voice notes exceeding 5 MB (5,242,880 bytes)', () => {
      const oversized = sendMessageSchema.safeParse({
        conversationId: 'conv-demo-elena-liam',
        contentType: 'voice',
        body: 'Voice note',
        voiceDurationSec: 30,
        voiceSizeBytes: 6 * 1024 * 1024, // 6 MB > 5 MB
      });
      expect(oversized.success).toBe(false);

      const validVoice = sendMessageSchema.safeParse({
        conversationId: 'conv-demo-elena-liam',
        contentType: 'voice',
        body: 'Voice note',
        voiceDurationSec: 15,
        voiceSizeBytes: 512 * 1024, // 512 KB
      });
      expect(validVoice.success).toBe(true);
    });
  });

  describe('3. Negative RLS Isolation Tests (Messages, Private PII & Blocks)', () => {
    it('denies non-participants from reading private conversation messages', () => {
      const store = buildDemoSeedStore(true);
      const conv = store.conversations.find((c) => c.id === 'conv-demo-elena-liam');

      // Elena and Liam are participants; Claire ('demo-user-claire') is NOT
      const elenaView = selectMessagesForViewer(
        store.messages,
        conv,
        store.blocks,
        'demo-user-elena'
      );
      expect(elenaView.length).toBeGreaterThan(0);

      const claireIntrusionView = selectMessagesForViewer(
        store.messages,
        conv,
        store.blocks,
        'demo-user-claire'
      );
      expect(claireIntrusionView).toHaveLength(0);
    });

    it('immediately revokes conversation and message access when a participant blocks the other', () => {
      const store = buildDemoSeedStore(true);
      const conv = store.conversations.find((c) => c.id === 'conv-demo-elena-liam');

      const blocksWithElenaBlockingLiam = [
        {
          blocker_id: 'demo-user-elena',
          blocked_id: 'demo-user-liam',
          reason: 'Safety block',
          created_at: new Date().toISOString(),
        },
      ];

      expect(
        isAuthorizedConversationParticipant(conv, blocksWithElenaBlockingLiam, 'demo-user-liam')
      ).toBe(false);

      const liamMessagesAfterBlock = selectMessagesForViewer(
        store.messages,
        conv,
        blocksWithElenaBlockingLiam,
        'demo-user-liam'
      );
      expect(liamMessagesAfterBlock).toHaveLength(0);
    });

    it('prevents any user from reading another user private birth_date or email', () => {
      const store = buildDemoSeedStore(true);

      const ownPrivate = selectPrivateAccountForViewer(
        store.privateAccounts,
        'demo-user-elena',
        'demo-user-elena'
      );
      expect(ownPrivate?.birth_date).toBe('1993-04-18');

      const foreignAttempt = selectPrivateAccountForViewer(
        store.privateAccounts,
        'demo-user-elena',
        'demo-user-liam'
      );
      expect(foreignAttempt).toBeNull();
    });

    it('strips sensitive fields (email, birth_date, coordinates) from public profile payloads', () => {
      const store = buildDemoSeedStore(true);
      const rawWithLeakedFields = {
        ...store.profiles[0],
        email: 'secret@example.com',
        birth_date: '1993-04-18',
        latitude: 40.4168,
        longitude: -3.7038,
      };

      const sanitized = stripSensitiveProfileFields(rawWithLeakedFields);
      expect('email' in sanitized).toBe(false);
      expect('birth_date' in sanitized).toBe(false);
      expect('latitude' in sanitized).toBe(false);
      expect('longitude' in sanitized).toBe(false);

      const publicView = selectSafePublicProfile(
        store.profiles[0],
        store.blocks,
        'demo-user-liam'
      );
      expect(publicView).not.toBeNull();
      const publicObj = publicView as unknown as Record<string, unknown>;
      expect('email' in publicObj).toBe(false);
      expect('birth_date' in publicObj).toBe(false);
    });
  });

  describe('4. Complementary Language Partner Matching Engine', () => {
    it('prioritizes mutual tandem partners (speaks what viewer learns + learns what viewer speaks)', () => {
      const store = buildDemoSeedStore(true);
      const elena = store.profiles.find((p) => p.id === 'demo-user-elena')!;

      const ranked = rankLanguagePartners(elena, store.profiles, new Set());
      expect(ranked.length).toBeGreaterThan(0);

      // Liam speaks native EN (Elena learns EN) and learns ES (Elena speaks native ES)
      expect(ranked[0].profile.id).toBe('demo-user-liam');
      expect(ranked[0].isComplementaryTandem).toBe(true);
      expect(ranked[0].compatibilityScore).toBeGreaterThanOrEqual(90);
    });

    it('excludes blocked users from partner search results', () => {
      const store = buildDemoSeedStore(true);
      const elena = store.profiles.find((p) => p.id === 'demo-user-elena')!;
      const blockedIds = new Set(['demo-user-liam']);

      const ranked = rankLanguagePartners(elena, store.profiles, blockedIds);
      expect(ranked.some((m) => m.profile.id === 'demo-user-liam')).toBe(false);
      expect(areUsersBlocked([{ blocker_id: elena.id, blocked_id: 'demo-user-liam', reason: '', created_at: '' }], elena.id, 'demo-user-liam')).toBe(true);
    });
  });

  describe('5. AdSense Moderation Suppression & Rate Limiting', () => {
    it('suppresses ads on pages with reported content or pending moderation', () => {
      const store = buildDemoSeedStore(true);
      // In demo seed, demo-user-kenji has a pending report ('rep-demo-1')
      const kenjiFlagged = isProfileOrConversationUnderModeration(
        store.reports,
        'demo-user-kenji',
        null
      );
      expect(kenjiFlagged).toBe(true);

      const adDecision = canRenderAdSlot({
        adsEnabledGlobally: true,
        hasFlaggedOrPendingModerationContent: kenjiFlagged,
        requireConsent: true,
        userGrantedAdConsent: true,
      });
      expect(adDecision.allowed).toBe(false);
      expect(adDecision.reason).toBe('blocked_on_moderated_or_reported_content');
    });

    it('enforces API rate limits per key and window', () => {
      const r1 = checkRateLimit('test-user', 2, 60_000, 1000);
      const r2 = checkRateLimit('test-user', 2, 60_000, 1100);
      const r3 = checkRateLimit('test-user', 2, 60_000, 1200);

      expect(r1.allowed).toBe(true);
      expect(r2.allowed).toBe(true);
      expect(r3.allowed).toBe(false);
      expect(r3.remaining).toBe(0);
    });
  });
});
