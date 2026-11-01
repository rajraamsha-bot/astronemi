-- ============================================================================
-- REVIEW-ONLY ASTROLOGER SEED
-- ============================================================================
-- Run this ONLY against the staging/review Supabase project, never production.
-- The profiles are explicitly marked "REVIEW DEMO" in the bio, have zero
-- reviews/consultations, and are not verified. They exist so a store reviewer
-- can see a populated marketplace.
--
-- Run with:
--   psql "$SUPABASE_DB_URL" -f scripts/seed-review-data.sql
--
-- Cleanup:
--   psql "$SUPABASE_DB_URL" -f scripts/remove-review-data.sql
-- ============================================================================

BEGIN;

INSERT INTO public.astrologers (
  id, user_id, name, avatar, avatar_url, expertise, bio,
  experience_years, specializations, languages,
  price_per_minute, discount_price,
  rating, total_reviews, total_consultations,
  is_verified, is_online, is_available, is_ai
) VALUES
(
  '99999999-9999-4999-8999-999999999901', NULL,
  'Demo Acharya (Review)',
  'https://ui-avatars.com/api/?name=Demo+Acharya&background=6B46C1&color=fff&size=256',
  'https://ui-avatars.com/api/?name=Demo+Acharya&background=6B46C1&color=fff&size=256',
  'Vedic Astrology',
  'REVIEW DEMO PROFILE — not a real astrologer. This profile exists only in the store-review environment so reviewers can browse the marketplace and start a consultation.',
  8,
  ARRAY['Vedic', 'Career', 'Marriage'],
  ARRAY['English', 'Hindi'],
  10.00, NULL,
  0, 0, 0,
  false, true, true, false
),
(
  '99999999-9999-4999-8999-999999999902', NULL,
  'Demo Jyotishi (Review)',
  'https://ui-avatars.com/api/?name=Demo+Jyotishi&background=2E7D32&color=fff&size=256',
  'https://ui-avatars.com/api/?name=Demo+Jyotishi&background=2E7D32&color=fff&size=256',
  'Kundli & Panchang',
  'REVIEW DEMO PROFILE — not a real astrologer. Used only for store-review testing of the astrologer list, profile, and booking screens.',
  6,
  ARRAY['Kundli', 'Panchang', 'Remedies'],
  ARRAY['English', 'Hindi'],
  12.00, 10.00,
  0, 0, 0,
  false, true, true, false
),
(
  '99999999-9999-4999-8999-999999999903', NULL,
  'Demo Tarot Reader (Review)',
  'https://ui-avatars.com/api/?name=Demo+Tarot&background=9C27B0&color=fff&size=256',
  'https://ui-avatars.com/api/?name=Demo+Tarot&background=9C27B0&color=fff&size=256',
  'Tarot & Numerology',
  'REVIEW DEMO PROFILE — not a real astrologer. Used only for store-review testing of the profile and consultation UI.',
  4,
  ARRAY['Tarot', 'Numerology', 'Love'],
  ARRAY['English'],
  8.00, NULL,
  0, 0, 0,
  false, false, true, false
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  avatar = EXCLUDED.avatar,
  avatar_url = EXCLUDED.avatar_url,
  expertise = EXCLUDED.expertise,
  bio = EXCLUDED.bio,
  experience_years = EXCLUDED.experience_years,
  specializations = EXCLUDED.specializations,
  languages = EXCLUDED.languages,
  price_per_minute = EXCLUDED.price_per_minute,
  discount_price = EXCLUDED.discount_price,
  rating = EXCLUDED.rating,
  total_reviews = EXCLUDED.total_reviews,
  total_consultations = EXCLUDED.total_consultations,
  is_verified = EXCLUDED.is_verified,
  is_online = EXCLUDED.is_online,
  is_available = EXCLUDED.is_available,
  is_ai = EXCLUDED.is_ai,
  updated_at = now();

-- ----------------------------------------------------------------------------
-- OPTIONAL: give the review account 500 credits so the reviewer can start a
-- consultation. Replace the phone number with the Supabase test-OTP number.
-- This is idempotent: it only credits once per review account.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_user_id UUID;
  v_phone TEXT := '+919999999999';
BEGIN
  SELECT id INTO v_user_id
    FROM public.users
   WHERE phone = v_phone
   LIMIT 1;

  IF v_user_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
      FROM public.wallet_transactions
     WHERE user_id = v_user_id
       AND reference_type = 'review_seed'
  ) THEN
    PERFORM public.credit_wallet(
      v_user_id,
      500,
      'review_seed',
      'Review demo credits',
      NULL,
      NULL
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- The optional credit grant must not roll back the review profiles.
  RAISE NOTICE 'Review credit grant skipped: %', SQLERRM;
END $$;

COMMIT;
