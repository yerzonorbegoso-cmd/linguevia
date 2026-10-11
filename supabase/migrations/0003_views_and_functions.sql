-- =============================================================================
-- LINGUACONNECT - MIGRATION 0003: VIEWS, SECURITY HELPERS & MATCHING RPC
-- Description: Defines security-definer helpers for RLS without recursion,
--              privacy-preserving public views, and complementary matching RPC.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Security Helper Functions (Used by RLS & Server RPCs)
-- -----------------------------------------------------------------------------

-- Checks if two users have blocked each other in either direction
CREATE OR REPLACE FUNCTION public.are_users_blocked(user_a UUID, user_b UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_blocks b
        WHERE (b.blocker_id = user_a AND b.blocked_id = user_b)
           OR (b.blocker_id = user_b AND b.blocked_id = user_a)
    );
$$;

-- Checks if a user is an active participant in a conversation and not blocked
CREATE OR REPLACE FUNCTION public.is_authorized_conversation_member(target_conv_id UUID, target_user_id UUID)
RETURNS BOOLEAN
RETURNS NULL ON NULL INPUT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.conversation_participants cp
        JOIN public.conversations c ON c.id = cp.conversation_id
        WHERE cp.conversation_id = target_conv_id
          AND cp.user_id = target_user_id
          AND c.is_active = TRUE
          AND NOT EXISTS (
              SELECT 1
              FROM public.conversation_participants other_cp
              WHERE other_cp.conversation_id = target_conv_id
                AND other_cp.user_id <> target_user_id
                AND public.are_users_blocked(target_user_id, other_cp.user_id)
          )
    );
$$;

-- Checks if the current authenticated user is an admin or moderator
CREATE OR REPLACE FUNCTION public.is_admin_or_moderator(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = target_user_id
          AND p.role IN ('admin', 'moderator')
          AND p.is_suspended = FALSE
    );
$$;

-- -----------------------------------------------------------------------------
-- 2. Safe Public Profile View (Strictly excludes email, birth_date, exact location)
-- Respects user privacy preferences for country_code and timezone visibility.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.public_profiles_safe AS
SELECT
    p.id,
    p.username,
    p.display_name,
    p.avatar_url,
    p.bio,
    CASE
        WHEN COALESCE((p.privacy_settings->>'show_country')::boolean, true) THEN p.country_code
        ELSE NULL
    END AS country_code,
    CASE
        WHEN COALESCE((p.privacy_settings->>'show_timezone')::boolean, true) THEN p.timezone
        ELSE NULL
    END AS timezone,
    p.learning_goals,
    p.availability_slots,
    CASE
        WHEN COALESCE((p.privacy_settings->>'show_online_status')::boolean, true) THEN p.last_active_at
        ELSE NULL
    END AS last_active_at,
    p.created_at
FROM public.profiles p
WHERE p.is_suspended = FALSE
  AND p.is_adult_verified = TRUE
  AND p.onboarding_completed = TRUE;

-- -----------------------------------------------------------------------------
-- 3. Complementary Language Matching RPC (Shared by Web & Future Flutter App)
-- Calculates compatibility score prioritizing mutual native <-> learning pairs.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.find_language_partners(
    p_practice_lang VARCHAR(10) DEFAULT NULL,
    p_teach_lang VARCHAR(10) DEFAULT NULL,
    p_min_level public.cefr_level DEFAULT NULL,
    p_country_code CHAR(2) DEFAULT NULL,
    p_timezone TEXT DEFAULT NULL,
    p_interest_slug TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 30
)
RETURNS TABLE (
    user_id UUID,
    username CITEXT,
    display_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    country_code CHAR(2),
    timezone TEXT,
    complementary_score INTEGER,
    is_mutual_tandem BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller UUID := auth.uid();
BEGIN
    IF v_caller IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    RETURN QUERY
    SELECT
        p.id AS user_id,
        p.username,
        p.display_name,
        p.avatar_url,
        p.bio,
        CASE WHEN COALESCE((p.privacy_settings->>'show_country')::boolean, true) THEN p.country_code ELSE NULL END,
        CASE WHEN COALESCE((p.privacy_settings->>'show_timezone')::boolean, true) THEN p.timezone ELSE NULL END,
        (
            -- +50 points if candidate speaks natively a language caller is learning
            CASE WHEN EXISTS (
                SELECT 1 FROM public.user_languages ul_cand
                JOIN public.user_languages ul_me ON ul_me.language_code = ul_cand.language_code
                WHERE ul_cand.user_id = p.id AND ul_cand.relation_type = 'native'
                  AND ul_me.user_id = v_caller AND ul_me.relation_type = 'learning'
            ) THEN 50 ELSE 0 END
            +
            -- +40 points if candidate is learning a language caller speaks natively
            CASE WHEN EXISTS (
                SELECT 1 FROM public.user_languages ul_cand
                JOIN public.user_languages ul_me ON ul_me.language_code = ul_cand.language_code
                WHERE ul_cand.user_id = p.id AND ul_cand.relation_type = 'learning'
                  AND ul_me.user_id = v_caller AND ul_me.relation_type = 'native'
            ) THEN 40 ELSE 0 END
            +
            -- +10 points per shared interest (up to 30)
            LEAST(30, (
                SELECT COUNT(*)::int * 10
                FROM public.user_interests ui_cand
                JOIN public.user_interests ui_me ON ui_me.interest_id = ui_cand.interest_id
                WHERE ui_cand.user_id = p.id AND ui_me.user_id = v_caller
            ))
        )::INTEGER AS complementary_score,
        (
            EXISTS (
                SELECT 1 FROM public.user_languages ul_cand
                JOIN public.user_languages ul_me ON ul_me.language_code = ul_cand.language_code
                WHERE ul_cand.user_id = p.id AND ul_cand.relation_type = 'native'
                  AND ul_me.user_id = v_caller AND ul_me.relation_type = 'learning'
            )
            AND EXISTS (
                SELECT 1 FROM public.user_languages ul_cand
                JOIN public.user_languages ul_me ON ul_me.language_code = ul_cand.language_code
                WHERE ul_cand.user_id = p.id AND ul_cand.relation_type = 'learning'
                  AND ul_me.user_id = v_caller AND ul_me.relation_type = 'native'
            )
        ) AS is_mutual_tandem
    FROM public.profiles p
    WHERE p.id <> v_caller
      AND p.is_suspended = FALSE
      AND p.is_adult_verified = TRUE
      AND p.onboarding_completed = TRUE
      AND COALESCE((p.privacy_settings->>'allow_search_indexing')::boolean, true) = TRUE
      AND NOT public.are_users_blocked(v_caller, p.id)
      AND (p_country_code IS NULL OR p.country_code = p_country_code)
      AND (p_timezone IS NULL OR p.timezone = p_timezone)
      AND (
          p_practice_lang IS NULL OR EXISTS (
              SELECT 1 FROM public.user_languages ul
              WHERE ul.user_id = p.id
                AND ul.language_code = p_practice_lang
                AND ul.relation_type = 'native'
          )
      )
      AND (
          p_teach_lang IS NULL OR EXISTS (
              SELECT 1 FROM public.user_languages ul
              WHERE ul.user_id = p.id
                AND ul.language_code = p_teach_lang
                AND ul.relation_type = 'learning'
                AND (p_min_level IS NULL OR ul.proficiency_level = p_min_level)
          )
      )
      AND (
          p_interest_slug IS NULL OR EXISTS (
              SELECT 1 FROM public.user_interests ui
              JOIN public.interests i ON i.id = ui.interest_id
              WHERE ui.user_id = p.id AND i.slug = p_interest_slug
          )
      )
    ORDER BY complementary_score DESC, p.last_active_at DESC
    LIMIT LEAST(p_limit, 100);
END;
$$;

COMMIT;
