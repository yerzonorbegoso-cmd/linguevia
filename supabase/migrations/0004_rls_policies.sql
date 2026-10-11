-- =============================================================================
-- LINGUACONNECT - MIGRATION 0004: ROW LEVEL SECURITY (RLS) POLICIES
-- Description: Enforces strict Row Level Security on every exposed table.
--              Guarantees message isolation, block enforcement, and role gates.
-- =============================================================================

BEGIN;

-- 1. Enable RLS across all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_private ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_vocabulary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 2. Policies for profiles & profile_private
-- -----------------------------------------------------------------------------
CREATE POLICY "profiles_select_visible"
ON public.profiles FOR SELECT
USING (
    auth.uid() = id
    OR public.is_admin_or_moderator(auth.uid())
    OR (
        is_suspended = FALSE
        AND is_adult_verified = TRUE
        AND (auth.uid() IS NULL OR NOT public.are_users_blocked(auth.uid(), id))
    )
);

CREATE POLICY "profiles_insert_own"
ON public.profiles FOR INSERT
WITH CHECK (
    auth.uid() = id
    AND role = 'user'
    AND is_suspended = FALSE
);

CREATE POLICY "profiles_update_own_safe"
ON public.profiles FOR UPDATE
USING (auth.uid() = id AND is_suspended = FALSE)
WITH CHECK (
    auth.uid() = id
    AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
    AND is_suspended = (SELECT p.is_suspended FROM public.profiles p WHERE p.id = auth.uid())
);

CREATE POLICY "profiles_admin_update"
ON public.profiles FOR UPDATE
USING (public.is_admin_or_moderator(auth.uid()))
WITH CHECK (public.is_admin_or_moderator(auth.uid()));

-- profile_private: Strictly owner-only (birth_date never readable by peers)
CREATE POLICY "profile_private_owner_select"
ON public.profile_private FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "profile_private_owner_insert"
ON public.profile_private FOR INSERT
WITH CHECK (
    auth.uid() = user_id
    AND birth_date <= (CURRENT_DATE - INTERVAL '18 years')
);

CREATE POLICY "profile_private_owner_update"
ON public.profile_private FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (
    auth.uid() = user_id
    AND birth_date <= (CURRENT_DATE - INTERVAL '18 years')
);

-- -----------------------------------------------------------------------------
-- 3. Policies for languages & user_languages
-- -----------------------------------------------------------------------------
CREATE POLICY "languages_select_all"
ON public.languages FOR SELECT
USING (is_active = TRUE OR public.is_admin_or_moderator(auth.uid()));

CREATE POLICY "languages_admin_write"
ON public.languages FOR ALL
USING (public.is_admin_or_moderator(auth.uid()))
WITH CHECK (public.is_admin_or_moderator(auth.uid()));

CREATE POLICY "user_languages_select_unblocked"
ON public.user_languages FOR SELECT
USING (
    auth.uid() = user_id
    OR public.is_admin_or_moderator(auth.uid())
    OR (auth.uid() IS NOT NULL AND NOT public.are_users_blocked(auth.uid(), user_id))
);

CREATE POLICY "user_languages_owner_manage"
ON public.user_languages FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- 4. Policies for interests & user_interests
-- -----------------------------------------------------------------------------
CREATE POLICY "interests_select_all"
ON public.interests FOR SELECT
USING (is_active = TRUE OR public.is_admin_or_moderator(auth.uid()));

CREATE POLICY "interests_admin_write"
ON public.interests FOR ALL
USING (public.is_admin_or_moderator(auth.uid()))
WITH CHECK (public.is_admin_or_moderator(auth.uid()));

CREATE POLICY "user_interests_select_unblocked"
ON public.user_interests FOR SELECT
USING (
    auth.uid() = user_id
    OR public.is_admin_or_moderator(auth.uid())
    OR (auth.uid() IS NOT NULL AND NOT public.are_users_blocked(auth.uid(), user_id))
);

CREATE POLICY "user_interests_owner_manage"
ON public.user_interests FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- 5. Policies for conversation_requests
-- -----------------------------------------------------------------------------
CREATE POLICY "conv_requests_select_involved"
ON public.conversation_requests FOR SELECT
USING (
    auth.uid() = sender_id
    OR auth.uid() = receiver_id
    OR public.is_admin_or_moderator(auth.uid())
);

CREATE POLICY "conv_requests_insert_sender"
ON public.conversation_requests FOR INSERT
WITH CHECK (
    auth.uid() = sender_id
    AND sender_id <> receiver_id
    AND status = 'pending'
    AND NOT public.are_users_blocked(sender_id, receiver_id)
);

CREATE POLICY "conv_requests_update_involved"
ON public.conversation_requests FOR UPDATE
USING (
    (auth.uid() = receiver_id AND status = 'pending')
    OR (auth.uid() = sender_id AND status = 'pending')
)
WITH CHECK (
    (auth.uid() = receiver_id AND status IN ('accepted', 'rejected'))
    OR (auth.uid() = sender_id AND status = 'cancelled')
);

-- -----------------------------------------------------------------------------
-- 6. Policies for conversations & conversation_participants
-- -----------------------------------------------------------------------------
CREATE POLICY "conversations_select_participants_only"
ON public.conversations FOR SELECT
USING (
    public.is_authorized_conversation_member(id, auth.uid())
    OR public.is_admin_or_moderator(auth.uid())
);

CREATE POLICY "conversations_update_participants_only"
ON public.conversations FOR UPDATE
USING (public.is_authorized_conversation_member(id, auth.uid()))
WITH CHECK (public.is_authorized_conversation_member(id, auth.uid()));

CREATE POLICY "conv_participants_select_members"
ON public.conversation_participants FOR SELECT
USING (
    user_id = auth.uid()
    OR public.is_authorized_conversation_member(conversation_id, auth.uid())
    OR public.is_admin_or_moderator(auth.uid())
);

CREATE POLICY "conv_participants_update_self"
ON public.conversation_participants FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- 7. Policies for messages (Strict Isolation to Authorized Participants)
-- -----------------------------------------------------------------------------
CREATE POLICY "messages_select_authorized_participants"
ON public.messages FOR SELECT
USING (
    deleted_at IS NULL
    AND public.is_authorized_conversation_member(conversation_id, auth.uid())
);

CREATE POLICY "messages_insert_authorized_sender"
ON public.messages FOR INSERT
WITH CHECK (
    auth.uid() = sender_id
    AND public.is_authorized_conversation_member(conversation_id, auth.uid())
);

CREATE POLICY "messages_update_read_or_soft_delete"
ON public.messages FOR UPDATE
USING (public.is_authorized_conversation_member(conversation_id, auth.uid()))
WITH CHECK (public.is_authorized_conversation_member(conversation_id, auth.uid()));

-- -----------------------------------------------------------------------------
-- 8. Policies for message_reports & user_blocks
-- -----------------------------------------------------------------------------
CREATE POLICY "message_reports_insert_reporter"
ON public.message_reports FOR INSERT
WITH CHECK (
    auth.uid() = reporter_id
    AND reporter_id <> reported_user_id
);

CREATE POLICY "message_reports_select_own_or_admin"
ON public.message_reports FOR SELECT
USING (
    auth.uid() = reporter_id
    OR public.is_admin_or_moderator(auth.uid())
);

CREATE POLICY "message_reports_update_admin_only"
ON public.message_reports FOR UPDATE
USING (public.is_admin_or_moderator(auth.uid()))
WITH CHECK (public.is_admin_or_moderator(auth.uid()));

CREATE POLICY "user_blocks_owner_only"
ON public.user_blocks FOR ALL
USING (auth.uid() = blocker_id)
WITH CHECK (auth.uid() = blocker_id AND blocker_id <> blocked_id);

-- -----------------------------------------------------------------------------
-- 9. Policies for call_sessions
-- -----------------------------------------------------------------------------
CREATE POLICY "call_sessions_select_participants"
ON public.call_sessions FOR SELECT
USING (
    auth.uid() = caller_id
    OR auth.uid() = callee_id
    OR public.is_admin_or_moderator(auth.uid())
);

CREATE POLICY "call_sessions_insert_caller"
ON public.call_sessions FOR INSERT
WITH CHECK (
    auth.uid() = caller_id
    AND public.is_authorized_conversation_member(conversation_id, auth.uid())
    AND NOT public.are_users_blocked(caller_id, callee_id)
    AND recording_enabled = FALSE
);

CREATE POLICY "call_sessions_update_participants"
ON public.call_sessions FOR UPDATE
USING (auth.uid() = caller_id OR auth.uid() = callee_id)
WITH CHECK (
    (auth.uid() = caller_id OR auth.uid() = callee_id)
    AND recording_enabled = FALSE
);

-- -----------------------------------------------------------------------------
-- 10. Policies for notifications, user_consents, saved_vocabulary & admin tables
-- -----------------------------------------------------------------------------
CREATE POLICY "notifications_owner_only"
ON public.notifications FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_consents_owner_manage"
ON public.user_consents FOR ALL
USING (auth.uid() = user_id OR public.is_admin_or_moderator(auth.uid()))
WITH CHECK (auth.uid() = user_id AND is_adult_confirmed = TRUE);

CREATE POLICY "saved_vocabulary_owner_only"
ON public.saved_vocabulary FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "admin_audit_logs_admin_only"
ON public.admin_audit_logs FOR SELECT
USING (public.is_admin_or_moderator(auth.uid()));

CREATE POLICY "admin_audit_logs_insert_admin"
ON public.admin_audit_logs FOR INSERT
WITH CHECK (
    auth.uid() = admin_id
    AND public.is_admin_or_moderator(auth.uid())
);

CREATE POLICY "platform_settings_select_public"
ON public.platform_settings FOR SELECT
USING (TRUE);

CREATE POLICY "platform_settings_admin_write"
ON public.platform_settings FOR ALL
USING (public.is_admin_or_moderator(auth.uid()))
WITH CHECK (public.is_admin_or_moderator(auth.uid()));

COMMIT;
