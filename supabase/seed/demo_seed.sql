-- =============================================================================
-- LINGUACONNECT - DEMO SEED DATA (SEPARATED FROM MIGRATIONS)
-- WARNING: Use ONLY in local development / demo environments.
-- Contains the public catalog of languages, interests, platform settings,
-- and clearly marked fictitious adult profiles for testing matching & chat.
-- =============================================================================

BEGIN;

-- 1. Official Language Catalog
INSERT INTO public.languages (code, name_es, name_en, native_name, flag_emoji, is_active)
VALUES
    ('es', 'Español', 'Spanish', 'Español', '🇪🇸', TRUE),
    ('en', 'Inglés', 'English', 'English', '🇬🇧', TRUE),
    ('fr', 'Francés', 'French', 'Français', '🇫🇷', TRUE),
    ('de', 'Alemán', 'German', 'Deutsch', '🇩🇪', TRUE),
    ('pt', 'Portugués', 'Portuguese', 'Português', '🇧🇷', TRUE),
    ('it', 'Italiano', 'Italian', 'Italiano', '🇮🇹', TRUE),
    ('ja', 'Japonés', 'Japanese', '日本語', '🇯🇵', TRUE),
    ('ko', 'Coreano', 'Korean', '한국어', '🇰🇷', TRUE),
    ('zh', 'Chino Mandarín', 'Mandarin Chinese', '中文', '🇨🇳', TRUE),
    ('ar', 'Árabe', 'Arabic', 'العربية', '🇸🇦', TRUE)
ON CONFLICT (code) DO UPDATE SET
    name_es = EXCLUDED.name_es,
    name_en = EXCLUDED.name_en,
    native_name = EXCLUDED.native_name,
    flag_emoji = EXCLUDED.flag_emoji,
    is_active = EXCLUDED.is_active;

-- 2. Official Interests Catalog
INSERT INTO public.interests (id, slug, name_es, name_en, category, icon_name, is_active)
VALUES
    ('11111111-1111-4111-8111-111111111101', 'technology', 'Tecnología y Software', 'Technology & Software', 'career', 'Cpu', TRUE),
    ('11111111-1111-4111-8111-111111111102', 'travel-culture', 'Viajes y Cultura', 'Travel & Culture', 'lifestyle', 'Globe', TRUE),
    ('11111111-1111-4111-8111-111111111103', 'cinema-series', 'Cine y Series', 'Cinema & Series', 'arts', 'Film', TRUE),
    ('11111111-1111-4111-8111-111111111104', 'gastronomy', 'Gastronomía y Cocina', 'Gastronomy & Cooking', 'lifestyle', 'Utensils', TRUE),
    ('11111111-1111-4111-8111-111111111105', 'literature', 'Literatura y Escritura', 'Literature & Writing', 'arts', 'BookOpen', TRUE),
    ('11111111-1111-4111-8111-111111111106', 'science', 'Ciencia y Naturaleza', 'Science & Nature', 'academic', 'FlaskConical', TRUE),
    ('11111111-1111-4111-8111-111111111107', 'business', 'Negocios y Emprendimiento', 'Business & Entrepreneurship', 'career', 'Briefcase', TRUE),
    ('11111111-1111-4111-8111-111111111108', 'music', 'Música e Instrumentos', 'Music & Instruments', 'arts', 'Music', TRUE)
ON CONFLICT (slug) DO NOTHING;

-- 3. Default Platform Settings (Ads disabled unless publisher ID is configured)
INSERT INTO public.platform_settings (key, value)
VALUES
    ('ads_config', '{"enabled": true, "provider": "google_adsense", "require_consent": true, "disable_on_flagged_pages": true}'::jsonb),
    ('rate_limits', '{"max_daily_requests": 20, "max_messages_per_minute": 45, "max_calls_per_hour": 12, "max_voice_note_mb": 5}'::jsonb),
    ('learning_config', '{"translation_enabled": true, "daily_translation_quota": 50, "guided_prompts_enabled": true}'::jsonb)
ON CONFLICT (key) DO NOTHING;

COMMIT;
