import { CefrLevel, UserProfile } from '@/types/database';

export interface PartnerMatchFilters {
  practiceLanguage?: string; // Language the current user wants to practice (candidate speaks natively or C1+)
  teachLanguage?: string; // Language the current user can teach (candidate is learning)
  proficiencyLevel?: CefrLevel | '';
  countryCode?: string;
  timezone?: string;
  interestSlug?: string;
  availabilityWindow?: 'morning' | 'afternoon' | 'evening' | 'weekend' | '';
  searchQuery?: string;
}

export interface ScoredPartnerMatch {
  profile: UserProfile;
  compatibilityScore: number; // 0..100
  isComplementaryTandem: boolean;
  complementaryReasons: string[];
  sharedInterests: string[];
  sharedAvailabilityWindows: string[];
}

const CEFR_ORDER: Record<CefrLevel, number> = {
  A1: 1,
  A2: 2,
  B1: 3,
  B2: 4,
  C1: 5,
  C2: 6,
  native: 7,
};

/**
 * Ranks and filters candidate language partners for `viewer`.
 * Strictly excludes:
 * - The viewer themselves
 * - Suspended accounts or accounts without 18+ verification / completed onboarding
 * - Accounts where either party has blocked the other
 * - Accounts that opted out of search indexing
 */
export function rankLanguagePartners(
  viewer: UserProfile,
  candidates: UserProfile[],
  blockedUserIds: Set<string>,
  filters: PartnerMatchFilters = {}
): ScoredPartnerMatch[] {
  const viewerNativeCodes = new Set(
    viewer.languages.filter((l) => l.relation_type === 'native').map((l) => l.language_code)
  );
  const viewerLearningCodes = new Set(
    viewer.languages.filter((l) => l.relation_type === 'learning').map((l) => l.language_code)
  );
  const viewerInterests = new Set(viewer.interest_slugs);
  const viewerWindows = new Set(viewer.availability_slots.map((s) => s.window));

  const results: ScoredPartnerMatch[] = [];

  for (const candidate of candidates) {
    if (candidate.id === viewer.id) continue;
    if (candidate.is_suspended || !candidate.is_adult_verified || !candidate.onboarding_completed) {
      continue;
    }
    if (!candidate.privacy_settings.allow_search_indexing) continue;
    if (blockedUserIds.has(candidate.id)) continue;

    const candNative = candidate.languages.filter((l) => l.relation_type === 'native');
    const candLearning = candidate.languages.filter((l) => l.relation_type === 'learning');

    // Apply explicit filters
    if (filters.practiceLanguage) {
      const speaksTarget = candidate.languages.some(
        (l) =>
          l.language_code === filters.practiceLanguage &&
          (l.relation_type === 'native' || CEFR_ORDER[l.proficiency_level] >= CEFR_ORDER.C1)
      );
      if (!speaksTarget) continue;
    }

    if (filters.teachLanguage) {
      const learnsOffered = candLearning.some((l) => l.language_code === filters.teachLanguage);
      if (!learnsOffered) continue;
    }

    if (filters.proficiencyLevel) {
      const matchesLevel = candidate.languages.some(
        (l) => l.proficiency_level === filters.proficiencyLevel
      );
      if (!matchesLevel) continue;
    }

    if (filters.countryCode && candidate.country_code !== filters.countryCode) {
      continue;
    }

    if (filters.timezone && candidate.timezone !== filters.timezone) {
      continue;
    }

    if (filters.interestSlug && !candidate.interest_slugs.includes(filters.interestSlug)) {
      continue;
    }

    if (filters.availabilityWindow) {
      const hasWindow = candidate.availability_slots.some(
        (s) => s.window === filters.availabilityWindow
      );
      if (!hasWindow) continue;
    }

    if (filters.searchQuery && filters.searchQuery.trim() !== '') {
      const q = filters.searchQuery.trim().toLowerCase();
      const inName = candidate.display_name.toLowerCase().includes(q);
      const inUsername = candidate.username.toLowerCase().includes(q);
      const inBio = candidate.bio.toLowerCase().includes(q);
      if (!inName && !inUsername && !inBio) continue;
    }

    // Score calculation prioritizing complementary language interests
    let score = 0;
    const reasons: string[] = [];

    const candidateTeachesViewer = candNative.filter((l) =>
      viewerLearningCodes.has(l.language_code)
    );
    const candidateLearnsFromViewer = candLearning.filter((l) =>
      viewerNativeCodes.has(l.language_code)
    );

    if (candidateTeachesViewer.length > 0) {
      score += 45;
      reasons.push(
        `Habla nativo ${candidateTeachesViewer.map((l) => l.language_code.toUpperCase()).join(', ')}`
      );
    }

    if (candidateLearnsFromViewer.length > 0) {
      score += 35;
      reasons.push(
        `Aprende tu idioma (${candidateLearnsFromViewer.map((l) => l.language_code.toUpperCase()).join(', ')})`
      );
    }

    const isComplementaryTandem =
      candidateTeachesViewer.length > 0 && candidateLearnsFromViewer.length > 0;

    if (isComplementaryTandem) {
      score += 10; // Mutual tandem bonus
    }

    const sharedInterests = candidate.interest_slugs.filter((slug) => viewerInterests.has(slug));
    score += Math.min(6, sharedInterests.length * 2);

    const sharedAvailabilityWindows = Array.from(
      new Set(
        candidate.availability_slots
          .map((s) => s.window)
          .filter((w) => viewerWindows.has(w))
      )
    );
    score += Math.min(4, sharedAvailabilityWindows.length * 2);

    results.push({
      profile: candidate,
      compatibilityScore: Math.min(100, Math.max(10, score)),
      isComplementaryTandem,
      complementaryReasons: reasons,
      sharedInterests,
      sharedAvailabilityWindows,
    });
  }

  return results.sort((a, b) => {
    if (a.isComplementaryTandem !== b.isComplementaryTandem) {
      return a.isComplementaryTandem ? -1 : 1;
    }
    return b.compatibilityScore - a.compatibilityScore;
  });
}
