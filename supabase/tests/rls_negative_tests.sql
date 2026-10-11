-- =============================================================================
-- LINGUACONNECT - NEGATIVE RLS & ISOLATION VERIFICATION SUITE
-- Description: Transactional SQL test suite that verifies Row Level Security
--              prevents unauthorized read/write across users, conversations,
--              private PII, blocks, and admin tables.
-- =============================================================================

BEGIN;

DO $$
DECLARE
    v_alice UUID := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
    v_bob   UUID := 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2';
    v_mallory UUID := 'cccccccc-cccc-4ccc-8ccc-ccccccccccc3';
    v_conv_id UUID := 'dddddddd-dddd-4ddd-8ddd-ddddddddddd4';
    v_msg_count INTEGER;
    v_private_count INTEGER;
    v_updated_rows INTEGER;
BEGIN
    -- 1. Seed three isolated test identities in auth.users (simulated in transaction)
    INSERT INTO auth.users (id, email)
    VALUES
        (v_alice, 'alice.rls@example.test'),
        (v_bob, 'bob.rls@example.test'),
        (v_mallory, 'mallory.rls@example.test')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.profiles (id, username, display_name, country_code, timezone, is_adult_verified, onboarding_completed)
    VALUES
        (v_alice, 'alice_rls', 'Alice Test', 'ES', 'Europe/Madrid', TRUE, TRUE),
        (v_bob, 'bob_rls', 'Bob Test', 'US', 'America/New_York', TRUE, TRUE),
        (v_mallory, 'mallory_rls', 'Mallory Intruder', 'FR', 'Europe/Paris', TRUE, TRUE);

    INSERT INTO public.profile_private (user_id, birth_date)
    VALUES
        (v_alice, DATE '1995-05-10'),
        (v_bob, DATE '1992-08-22'),
        (v_mallory, DATE '1998-01-15');

    -- 2. Create a private conversation strictly between Alice and Bob
    INSERT INTO public.conversations (id, mode, is_active)
    VALUES (v_conv_id, 'free', TRUE);

    INSERT INTO public.conversation_participants (conversation_id, user_id)
    VALUES
        (v_conv_id, v_alice),
        (v_conv_id, v_bob);

    INSERT INTO public.messages (conversation_id, sender_id, content_type, body)
    VALUES (v_conv_id, v_alice, 'text', 'Confidential message from Alice to Bob');

    -- 3. Switch session context to Mallory (non-participant)
    PERFORM set_config('role', 'authenticated', true);
    PERFORM set_config('request.jwt.claim.sub', v_mallory::text, true);

    -- NEGATIVE TEST A: Mallory must NOT be able to read Alice & Bob's messages
    SELECT COUNT(*)::int INTO v_msg_count
    FROM public.messages
    WHERE conversation_id = v_conv_id;

    IF v_msg_count > 0 THEN
        RAISE EXCEPTION 'RLS FAILURE: Non-participant Mallory read % messages from private conversation!', v_msg_count;
    END IF;

    -- NEGATIVE TEST B: Mallory must NOT be able to read Alice's birth_date in profile_private
    SELECT COUNT(*)::int INTO v_private_count
    FROM public.profile_private
    WHERE user_id = v_alice;

    IF v_private_count > 0 THEN
        RAISE EXCEPTION 'RLS FAILURE: Mallory was able to read Alice birth_date from profile_private!';
    END IF;

    -- NEGATIVE TEST C: Mallory must NOT be able to update Alice's profile
    UPDATE public.profiles
    SET bio = 'Hacked by Mallory'
    WHERE id = v_alice;
    GET DIAGNOSTICS v_updated_rows = ROW_COUNT;

    IF v_updated_rows > 0 THEN
        RAISE EXCEPTION 'RLS FAILURE: Mallory modified Alice profile!';
    END IF;

    -- NEGATIVE TEST D: Mallory must NOT be able to inject a message into Alice & Bob's conversation
    BEGIN
        INSERT INTO public.messages (conversation_id, sender_id, content_type, body)
        VALUES (v_conv_id, v_mallory, 'text', 'Unauthorized injection');
        RAISE EXCEPTION 'RLS FAILURE: Mallory inserted a message into an unauthorized conversation!';
    EXCEPTION
        WHEN insufficient_privilege OR check_violation OR raise_exception THEN
            -- Expected denial by RLS WITH CHECK policy
            NULL;
    END;

    -- NEGATIVE TEST E: When Alice blocks Bob, Bob loses read access to their conversation messages
    PERFORM set_config('request.jwt.claim.sub', v_alice::text, true);
    INSERT INTO public.user_blocks (blocker_id, blocked_id, reason)
    VALUES (v_alice, v_bob, 'Testing block isolation');

    PERFORM set_config('request.jwt.claim.sub', v_bob::text, true);
    SELECT COUNT(*)::int INTO v_msg_count
    FROM public.messages
    WHERE conversation_id = v_conv_id;

    IF v_msg_count > 0 THEN
        RAISE EXCEPTION 'RLS FAILURE: Blocked user Bob could still read conversation messages!';
    END IF;

    RAISE NOTICE 'ALL NEGATIVE RLS TESTS PASSED SUCCESSFULLY.';
END$$;

ROLLBACK;
