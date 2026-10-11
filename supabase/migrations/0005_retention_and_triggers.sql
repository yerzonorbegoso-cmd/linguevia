-- =============================================================================
-- LINGUACONNECT - MIGRATION 0005: TRIGGERS, RATE LIMITS & RETENTION POLICIES
-- Description: Automates timestamp updates, request-to-conversation promotion,
--              database-level rate limiting, and retention cleanup jobs.
-- =============================================================================

BEGIN;

-- 1. Automatic updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_conversations_updated_at ON public.conversations;
CREATE TRIGGER trg_conversations_updated_at
BEFORE UPDATE ON public.conversations
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_user_consents_updated_at ON public.user_consents;
CREATE TRIGGER trg_user_consents_updated_at
BEFORE UPDATE ON public.user_consents
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 2. Automatic Adult Verification Sync from profile_private
CREATE OR REPLACE FUNCTION public.sync_adult_verification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.birth_date > (CURRENT_DATE - INTERVAL '18 years') THEN
        RAISE EXCEPTION 'LinguaConnect is strictly for adults (18+ years old).';
    END IF;

    UPDATE public.profiles
    SET is_adult_verified = TRUE,
        updated_at = NOW()
    WHERE id = NEW.user_id;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_adult_verification ON public.profile_private;
CREATE TRIGGER trg_sync_adult_verification
AFTER INSERT OR UPDATE ON public.profile_private
FOR EACH ROW EXECUTE FUNCTION public.sync_adult_verification();

-- 3. Automatic Conversation Creation when a Request is Accepted
CREATE OR REPLACE FUNCTION public.handle_accepted_conversation_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_conv_id UUID;
BEGIN
    IF OLD.status = 'pending' AND NEW.status = 'accepted' THEN
        NEW.responded_at := NOW();

        INSERT INTO public.conversations (origin_request_id, mode, last_message_at, is_active)
        VALUES (NEW.id, 'free', NOW(), TRUE)
        RETURNING id INTO v_conv_id;

        INSERT INTO public.conversation_participants (conversation_id, user_id)
        VALUES
            (v_conv_id, NEW.sender_id),
            (v_conv_id, NEW.receiver_id)
        ON CONFLICT DO NOTHING;

        -- Seed initial intro message into the new conversation
        INSERT INTO public.messages (conversation_id, sender_id, content_type, body, delivery_status)
        VALUES (v_conv_id, NEW.sender_id, 'text', NEW.intro_message, 'delivered');

        -- Notify sender
        INSERT INTO public.notifications (user_id, type, title, body, action_url)
        VALUES (
            NEW.sender_id,
            'request_accepted',
            'Solicitud de conversación aceptada',
            'Tu solicitud de intercambio fue aceptada. ¡Ya puedes conversar!',
            '/messages/' || v_conv_id::text
        );
    ELSIF OLD.status = 'pending' AND NEW.status IN ('rejected', 'cancelled') THEN
        NEW.responded_at := NOW();
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_conversation_request_status ON public.conversation_requests;
CREATE TRIGGER trg_conversation_request_status
BEFORE UPDATE ON public.conversation_requests
FOR EACH ROW EXECUTE FUNCTION public.handle_accepted_conversation_request();

-- 4. Server/DB Rate Limiting Guard on Conversation Requests (Max 20/day per user)
CREATE OR REPLACE FUNCTION public.enforce_request_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_recent_count INTEGER;
BEGIN
    SELECT COUNT(*)::int INTO v_recent_count
    FROM public.conversation_requests
    WHERE sender_id = NEW.sender_id
      AND created_at > (NOW() - INTERVAL '24 hours');

    IF v_recent_count >= 20 THEN
        RAISE EXCEPTION 'Daily conversation request limit (20) reached. Please try again tomorrow.';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_request_rate_limit ON public.conversation_requests;
CREATE TRIGGER trg_enforce_request_rate_limit
BEFORE INSERT ON public.conversation_requests
FOR EACH ROW EXECUTE FUNCTION public.enforce_request_rate_limit();

-- 5. Update conversation.last_message_at & enforce message rate limit (Max 45 msgs / minute)
CREATE OR REPLACE FUNCTION public.handle_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_burst_count INTEGER;
BEGIN
    SELECT COUNT(*)::int INTO v_burst_count
    FROM public.messages
    WHERE sender_id = NEW.sender_id
      AND created_at > (NOW() - INTERVAL '1 minute');

    IF v_burst_count >= 45 THEN
        RAISE EXCEPTION 'Message rate limit exceeded. Please slow down.';
    END IF;

    UPDATE public.conversations
    SET last_message_at = NOW(),
        updated_at = NOW()
    WHERE id = NEW.conversation_id;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_handle_new_message ON public.messages;
CREATE TRIGGER trg_handle_new_message
BEFORE INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.handle_new_message();

-- 6. Data Retention & Account Purge Procedure (GDPR / Privacy Compliance)
CREATE OR REPLACE FUNCTION public.run_data_retention_cleanup()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_expired_notifications INTEGER;
    v_expired_requests INTEGER;
    v_expired_messages INTEGER;
BEGIN
    DELETE FROM public.notifications
    WHERE retention_expires_at < NOW();
    GET DIAGNOSTICS v_expired_notifications = ROW_COUNT;

    DELETE FROM public.conversation_requests
    WHERE status IN ('rejected', 'cancelled')
      AND expires_at < NOW();
    GET DIAGNOSTICS v_expired_requests = ROW_COUNT;

    DELETE FROM public.messages
    WHERE retention_expires_at < NOW()
       OR (deleted_at IS NOT NULL AND deleted_at < (NOW() - INTERVAL '30 days'));
    GET DIAGNOSTICS v_expired_messages = ROW_COUNT;

    RETURN jsonb_build_object(
        'purged_notifications', v_expired_notifications,
        'purged_requests', v_expired_requests,
        'purged_messages', v_expired_messages,
        'executed_at', NOW()
    );
END;
$$;

COMMIT;
