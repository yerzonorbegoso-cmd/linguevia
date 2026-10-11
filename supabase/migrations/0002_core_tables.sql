-- =============================================================================
-- LINGUACONNECT - MIGRATION 0002: CORE TABLES, CONSTRAINTS & INDEXES
-- Description: Creates all 14 required tables + private PII vault, learning
--              vocabulary, and administrative audit/settings tables.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. profiles (Public & Semi-Public Safe Profile Attributes)
-- Note: Email, birth_date and exact coordinates are NEVER stored in public columns.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username CITEXT NOT NULL UNIQUE CHECK (char_length(username) BETWEEN 3 AND 32 AND username ~ '^[a-zA-Z0-9_.-]+$'),
    display_name TEXT NOT NULL CHECK (char_length(trim(display_name)) BETWEEN 2 AND 60),
    avatar_url TEXT,
    bio TEXT DEFAULT '' CHECK (char_length(bio) <= 600),
    country_code CHAR(2) NOT NULL CHECK (country_code ~ '^[A-Z]{2}$'),
    timezone TEXT NOT NULL DEFAULT 'UTC' CHECK (char_length(timezone) BETWEEN 2 AND 64),
    learning_goals TEXT DEFAULT '' CHECK (char_length(learning_goals) <= 400),
    availability_slots JSONB NOT NULL DEFAULT '[]'::jsonb,
    privacy_settings JSONB NOT NULL DEFAULT '{
        "show_country": true,
        "show_timezone": true,
        "allow_calls_from_partners": true,
        "allow_search_indexing": true,
        "show_online_status": true
    }'::jsonb,
    role public.user_role NOT NULL DEFAULT 'user',
    is_adult_verified BOOLEAN NOT NULL DEFAULT FALSE,
    onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
    is_suspended BOOLEAN NOT NULL DEFAULT FALSE,
    suspension_reason TEXT,
    last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_country ON public.profiles(country_code) WHERE NOT is_suspended AND onboarding_completed;
CREATE INDEX IF NOT EXISTS idx_profiles_timezone ON public.profiles(timezone) WHERE NOT is_suspended AND onboarding_completed;
CREATE INDEX IF NOT EXISTS idx_profiles_last_active ON public.profiles(last_active_at DESC);

-- -----------------------------------------------------------------------------
-- 1b. profile_private (Isolated PII Table: birth_date & email verification record)
-- Strictly inaccessible to other users; enforces 18+ age rule at DB level.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profile_private (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    birth_date DATE NOT NULL CHECK (birth_date <= (CURRENT_DATE - INTERVAL '18 years') AND birth_date >= DATE '1900-01-01'),
    deletion_requested_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 2. languages
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.languages (
    code VARCHAR(10) PRIMARY KEY CHECK (code ~ '^[a-z]{2,3}(-[A-Z]{2})?$'),
    name_es TEXT NOT NULL,
    name_en TEXT NOT NULL,
    native_name TEXT NOT NULL,
    flag_emoji TEXT NOT NULL DEFAULT '🌐',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 3. user_languages
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_languages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    language_code VARCHAR(10) NOT NULL REFERENCES public.languages(code) ON DELETE RESTRICT,
    relation_type public.language_relation_type NOT NULL,
    proficiency_level public.cefr_level NOT NULL,
    target_goal TEXT DEFAULT '' CHECK (char_length(target_goal) <= 250),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_language UNIQUE (user_id, language_code),
    CONSTRAINT chk_native_proficiency CHECK (
        (relation_type = 'native' AND proficiency_level = 'native')
        OR (relation_type = 'learning' AND proficiency_level <> 'native')
    )
);

CREATE INDEX IF NOT EXISTS idx_user_languages_lookup ON public.user_languages(language_code, relation_type, proficiency_level);
CREATE INDEX IF NOT EXISTS idx_user_languages_user ON public.user_languages(user_id);

-- -----------------------------------------------------------------------------
-- 4. interests
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.interests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug CITEXT NOT NULL UNIQUE,
    name_es TEXT NOT NULL,
    name_en TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'general',
    icon_name TEXT NOT NULL DEFAULT 'Sparkles',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 5. user_interests
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_interests (
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    interest_id UUID NOT NULL REFERENCES public.interests(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, interest_id)
);

CREATE INDEX IF NOT EXISTS idx_user_interests_interest ON public.user_interests(interest_id);

-- -----------------------------------------------------------------------------
-- 6. conversation_requests
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.conversation_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status public.request_status NOT NULL DEFAULT 'pending',
    intro_message TEXT NOT NULL CHECK (char_length(trim(intro_message)) BETWEEN 5 AND 500),
    target_language_code VARCHAR(10) REFERENCES public.languages(code),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    responded_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
    CONSTRAINT chk_no_self_request CHECK (sender_id <> receiver_id)
);

CREATE INDEX IF NOT EXISTS idx_conv_requests_receiver ON public.conversation_requests(receiver_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conv_requests_sender ON public.conversation_requests(sender_id, status, created_at DESC);

-- -----------------------------------------------------------------------------
-- 7. conversations
-- Separated from profiles; holds conversation state and learning mode.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    origin_request_id UUID UNIQUE REFERENCES public.conversation_requests(id) ON DELETE SET NULL,
    mode public.conversation_mode NOT NULL DEFAULT 'free',
    active_topic_prompt TEXT,
    last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversations_last_msg ON public.conversations(last_message_at DESC);

-- -----------------------------------------------------------------------------
-- 8. conversation_participants
-- Explicitly maps authorized users to each conversation.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.conversation_participants (
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_muted BOOLEAN NOT NULL DEFAULT FALSE,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_conv_participants_user ON public.conversation_participants(user_id, conversation_id);

-- -----------------------------------------------------------------------------
-- 9. messages
-- Accessible ONLY to authorized participants in conversation_participants.
-- Voice notes strictly bounded to <= 5 MB (5,242,880 bytes) and <= 180 seconds.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content_type public.message_content_type NOT NULL DEFAULT 'text',
    body TEXT NOT NULL DEFAULT '' CHECK (char_length(body) <= 4000),
    voice_url TEXT,
    voice_duration_sec INTEGER CHECK (voice_duration_sec IS NULL OR (voice_duration_sec BETWEEN 1 AND 180)),
    voice_size_bytes INTEGER CHECK (voice_size_bytes IS NULL OR (voice_size_bytes BETWEEN 1 AND 5242880)),
    reply_to_message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
    correction_data JSONB, -- { original_text, corrected_text, explanation, language_code }
    translation_data JSONB, -- { translated_text, target_lang, provider, translated_at }
    delivery_status public.message_delivery_status NOT NULL DEFAULT 'sent',
    read_at TIMESTAMPTZ,
    is_flagged BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    retention_expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '365 days'),
    CONSTRAINT chk_voice_metadata CHECK (
        (content_type <> 'voice')
        OR (voice_url IS NOT NULL AND voice_duration_sec IS NOT NULL AND voice_size_bytes IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON public.messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id, created_at DESC);

-- -----------------------------------------------------------------------------
-- 10. message_reports (Covers both Message and Profile reports)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.message_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reported_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
    message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
    reason_category public.report_reason_category NOT NULL,
    description TEXT NOT NULL CHECK (char_length(trim(description)) BETWEEN 10 AND 1500),
    status public.report_status NOT NULL DEFAULT 'pending',
    admin_notes TEXT,
    resolved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    CONSTRAINT chk_no_self_report CHECK (reporter_id <> reported_user_id)
);

CREATE INDEX IF NOT EXISTS idx_message_reports_status ON public.message_reports(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_message_reports_reported_user ON public.message_reports(reported_user_id);

-- -----------------------------------------------------------------------------
-- 11. user_blocks
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_blocks (
    blocker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reason TEXT DEFAULT '' CHECK (char_length(reason) <= 300),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (blocker_id, blocked_id),
    CONSTRAINT chk_no_self_block CHECK (blocker_id <> blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON public.user_blocks(blocked_id);

-- -----------------------------------------------------------------------------
-- 12. call_sessions
-- WebRTC 1-to-1 Audio/Video session tracking. No call recordings by default.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.call_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    caller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    callee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    room_name TEXT NOT NULL UNIQUE,
    call_type public.call_type NOT NULL DEFAULT 'audio',
    status public.call_status NOT NULL DEFAULT 'ringing',
    recording_enabled BOOLEAN NOT NULL DEFAULT FALSE CHECK (recording_enabled = FALSE),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    answered_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    duration_seconds INTEGER NOT NULL DEFAULT 0 CHECK (duration_seconds >= 0),
    end_reason TEXT,
    reconnect_count INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT chk_call_distinct_users CHECK (caller_id <> callee_id)
);

CREATE INDEX IF NOT EXISTS idx_call_sessions_conversation ON public.call_sessions(conversation_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_call_sessions_participants ON public.call_sessions(caller_id, callee_id, status);

-- -----------------------------------------------------------------------------
-- 13. notifications
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type public.notification_type NOT NULL,
    title TEXT NOT NULL CHECK (char_length(title) <= 140),
    body TEXT NOT NULL CHECK (char_length(body) <= 500),
    action_url TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    retention_expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '90 days')
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, is_read, created_at DESC);

-- -----------------------------------------------------------------------------
-- 14. user_consents
-- Tracks 18+ confirmation, Terms, Privacy Policy, and Regional Ad Consent.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    is_adult_confirmed BOOLEAN NOT NULL CHECK (is_adult_confirmed = TRUE),
    age_verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    terms_version VARCHAR(20) NOT NULL DEFAULT '1.0',
    privacy_version VARCHAR(20) NOT NULL DEFAULT '1.0',
    ads_personalized_consent BOOLEAN NOT NULL DEFAULT FALSE,
    ads_non_personalized_consent BOOLEAN NOT NULL DEFAULT TRUE,
    analytics_consent BOOLEAN NOT NULL DEFAULT FALSE,
    consent_region VARCHAR(10) NOT NULL DEFAULT 'GLOBAL',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 15. Supporting Tables for Learning & Administration (Modules 7, 9, 11)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.saved_vocabulary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    source_message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
    language_code VARCHAR(10) NOT NULL REFERENCES public.languages(code),
    term TEXT NOT NULL CHECK (char_length(trim(term)) BETWEEN 1 AND 200),
    translation TEXT NOT NULL CHECK (char_length(trim(translation)) BETWEEN 1 AND 300),
    context_example TEXT DEFAULT '' CHECK (char_length(context_example) <= 500),
    mastery_level SMALLINT NOT NULL DEFAULT 1 CHECK (mastery_level BETWEEN 1 AND 5),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saved_vocabulary_user ON public.saved_vocabulary(user_id, language_code, created_at DESC);

CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    action_type TEXT NOT NULL,
    target_entity TEXT NOT NULL,
    target_id TEXT NOT NULL,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_created ON public.admin_audit_logs(created_at DESC);

CREATE TABLE IF NOT EXISTS public.platform_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMIT;
