-- =============================================================================
-- LINGUACONNECT - MIGRATION 0001: EXTENSIONS AND ENUMS
-- Description: Enables core PostgreSQL extensions and defines domain ENUM types
-- Compatible with Supabase PostgreSQL 15+ and Flutter/Next.js clients
-- =============================================================================

BEGIN;

-- 1. Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";

-- 2. Domain Enums
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE public.user_role AS ENUM ('user', 'moderator', 'admin');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'language_relation_type') THEN
        CREATE TYPE public.language_relation_type AS ENUM ('native', 'learning');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cefr_level') THEN
        CREATE TYPE public.cefr_level AS ENUM ('A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'native');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'request_status') THEN
        CREATE TYPE public.request_status AS ENUM ('pending', 'accepted', 'rejected', 'cancelled');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'conversation_mode') THEN
        CREATE TYPE public.conversation_mode AS ENUM ('free', 'guided');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'message_content_type') THEN
        CREATE TYPE public.message_content_type AS ENUM ('text', 'voice', 'correction', 'system_prompt');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'message_delivery_status') THEN
        CREATE TYPE public.message_delivery_status AS ENUM ('sent', 'delivered', 'read');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'report_reason_category') THEN
        CREATE TYPE public.report_reason_category AS ENUM (
            'spam',
            'harassment',
            'inappropriate_content',
            'underage_suspicion',
            'scam_or_commercial',
            'hate_speech',
            'other'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'report_status') THEN
        CREATE TYPE public.report_status AS ENUM ('pending', 'investigating', 'resolved', 'dismissed');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'call_type') THEN
        CREATE TYPE public.call_type AS ENUM ('audio', 'video');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'call_status') THEN
        CREATE TYPE public.call_status AS ENUM ('ringing', 'accepted', 'rejected', 'ended', 'missed', 'failed');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
        CREATE TYPE public.notification_type AS ENUM (
            'conversation_request',
            'request_accepted',
            'new_message',
            'incoming_call',
            'missed_call',
            'grammar_correction',
            'moderation_notice',
            'system'
        );
    END IF;
END$$;

COMMIT;
