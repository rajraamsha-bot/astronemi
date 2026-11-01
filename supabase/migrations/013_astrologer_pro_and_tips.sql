-- Migration 013: AstroPro subscriptions + in-app tips/donations
-- Addresses the two missing revenue streams from the competitive review:
--   1. AstroPro: astrologers pay for visibility/boost in the marketplace
--   2. In-app tips: users can tip their astrologer (100% to astrologer,
--      engagement driver, ZERO platform commission)

-- =====================================================================
-- 1. Astrologer subscription plans (AstroPro)
-- =====================================================================

CREATE TABLE IF NOT EXISTS astrologer_subscription_plans (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug                  TEXT NOT NULL UNIQUE,   -- 'free' | 'pro' | 'elite'
  display_name          TEXT NOT NULL,
  monthly_price_inr     NUMERIC NOT NULL DEFAULT 0,
  yearly_price_inr      NUMERIC NOT NULL DEFAULT 0,
  rank_boost            INTEGER NOT NULL DEFAULT 0,    -- additive boost to ranking score
  visibility_multiplier NUMERIC NOT NULL DEFAULT 1.0,  -- multiplier on profile views
  badge_color           TEXT,
  max_profile_photos    INTEGER NOT NULL DEFAULT 3,
  can_set_custom_rate   BOOLEAN NOT NULL DEFAULT false,
  can_livestream        BOOLEAN NOT NULL DEFAULT false,
  priority_support      BOOLEAN NOT NULL DEFAULT false,
  features_json         JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active             BOOLEAN NOT NULL DEFAULT true,
  display_order         INTEGER NOT NULL DEFAULT 0,
  created_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed the three default plans.
INSERT INTO astrologer_subscription_plans
  (slug, display_name, monthly_price_inr, yearly_price_inr, rank_boost, visibility_multiplier, badge_color, max_profile_photos, can_set_custom_rate, can_livestream, priority_support, features_json, display_order)
VALUES
  ('free', 'Free', 0, 0, 0, 1.0, '#9CA3AF', 3, false, false, false,
   '["Standard marketplace visibility","Up to 3 profile photos","Default commission rate","Basic chat and call"]'::jsonb, 0),
  ('pro', 'AstroPro', 1999, 19999, 50, 2.5, '#6B46C1', 8, true, true, true,
   '["5x higher visibility in search","Up to 8 profile photos","Custom per-minute rate","Livestream enabled","Priority customer support","Featured in category pages","Pro badge on profile"]'::jsonb, 1),
  ('elite', 'AstroElite', 4999, 49999, 200, 5.0, '#D97706', 15, true, true, true,
   '["10x highest visibility","Up to 15 profile photos","Custom per-minute rate","Livestream + monetization","24/7 priority support","Homepage featured slot","Top-of-category placement","Elite gold badge","Verified trust seal"]'::jsonb, 2)
ON CONFLICT (slug) DO UPDATE SET
  display_name          = EXCLUDED.display_name,
  monthly_price_inr     = EXCLUDED.monthly_price_inr,
  yearly_price_inr      = EXCLUDED.yearly_price_inr,
  rank_boost            = EXCLUDED.rank_boost,
  visibility_multiplier = EXCLUDED.visibility_multiplier,
  badge_color           = EXCLUDED.badge_color,
  max_profile_photos    = EXCLUDED.max_profile_photos,
  can_set_custom_rate   = EXCLUDED.can_set_custom_rate,
  can_livestream        = EXCLUDED.can_livestream,
  priority_support      = EXCLUDED.priority_support,
  features_json         = EXCLUDED.features_json,
  display_order         = EXCLUDED.display_order,
  updated_at            = NOW();

-- =====================================================================
-- 2. Astrologer active subscriptions
-- =====================================================================

CREATE TABLE IF NOT EXISTS astrologer_subscriptions (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  astrologer_id        UUID NOT NULL REFERENCES astrologers(id) ON DELETE CASCADE,
  plan_id              UUID NOT NULL REFERENCES astrologer_subscription_plans(id),
  status               TEXT NOT NULL DEFAULT 'active',  -- 'active' | 'cancelled' | 'expired' | 'pending'
  billing_cycle        TEXT NOT NULL DEFAULT 'monthly', -- 'monthly' | 'yearly'
  started_at           TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  current_period_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  current_period_end   TIMESTAMP WITH TIME ZONE NOT NULL,
  cancelled_at         TIMESTAMP WITH TIME ZONE,
  cancelled_reason     TEXT,
  razorpay_order_id    TEXT,
  razorpay_payment_id  TEXT,
  amount_paid_inr      NUMERIC NOT NULL DEFAULT 0,
  auto_renew           BOOLEAN NOT NULL DEFAULT true,
  created_at           TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at           TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_astrologer_subs_astrologer
  ON astrologer_subscriptions(astrologer_id);
CREATE INDEX IF NOT EXISTS idx_astrologer_subs_status
  ON astrologer_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_astrologer_subs_period_end
  ON astrologer_subscriptions(current_period_end);

-- Only one active subscription per astrologer.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_active_astrologer_subscription
  ON astrologer_subscriptions(astrologer_id)
  WHERE status = 'active';

ALTER TABLE astrologer_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Astrologers can view own subscription"
  ON astrologer_subscriptions FOR SELECT
  TO authenticated
  USING (astrologer_id IN (
    SELECT id FROM astrologers WHERE user_id = auth.uid()
  ));

CREATE POLICY "Service role manages subscriptions"
  ON astrologer_subscriptions FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);

-- =====================================================================
-- 3. In-app tips / donations
-- =====================================================================

CREATE TABLE IF NOT EXISTS tips (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id              UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  astrologer_id        UUID NOT NULL REFERENCES astrologers(id) ON DELETE CASCADE,
  consultation_id      UUID REFERENCES consultations(id) ON DELETE SET NULL,
  amount_inr           NUMERIC NOT NULL CHECK (amount_inr > 0),
  message              TEXT,
  payment_id           TEXT,
  status               TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'completed' | 'failed' | 'refunded'
  created_at           TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at         TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_tips_user_id       ON tips(user_id);
CREATE INDEX IF NOT EXISTS idx_tips_astrologer_id ON tips(astrologer_id);
CREATE INDEX IF NOT EXISTS idx_tips_consultation  ON tips(consultation_id);
CREATE INDEX IF NOT EXISTS idx_tips_created_at    ON tips(created_at DESC);

ALTER TABLE tips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tips"
  ON tips FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Astrologers can view tips received"
  ON tips FOR SELECT
  TO authenticated
  USING (astrologer_id IN (
    SELECT id FROM astrologers WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own tips"
  ON tips FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- =====================================================================
-- 4. Tip presets (e.g., ₹51, ₹101, ₹501, ₹1001)
-- =====================================================================

CREATE TABLE IF NOT EXISTS tip_presets (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  amount_inr  NUMERIC NOT NULL UNIQUE,
  emoji       TEXT NOT NULL DEFAULT '✨',
  label       TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO tip_presets (amount_inr, emoji, label, display_order) VALUES
  (51,   '☕',  'Buy a coffee',    0),
  (101,  '🌸',  'Thank you',       1),
  (251,  '🌟',  'You''re amazing', 2),
  (501,  '💫',  'Brilliant reading', 3),
  (1001, '🙏',  'Life-changing',   4),
  (2001, '🎁',  'Royal blessing',  5)
ON CONFLICT (amount_inr) DO NOTHING;

-- =====================================================================
-- 5. Tip RPC
--    Charges the user's wallet and credits the astrologer.
--    100% of the tip goes to the astrologer — ZERO platform commission.
--    Tips do NOT count against the astrologer's consultation commission
--    split; they are pure earnings.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.send_tip(
  p_user_id          UUID,
  p_astrologer_id    UUID,
  p_amount_inr       NUMERIC,
  p_consultation_id  UUID DEFAULT NULL,
  p_message          TEXT DEFAULT NULL
)
RETURNS TABLE(success BOOLEAN, message TEXT, tip_id UUID, new_balance NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tip_id        UUID;
  v_astrologer_user_id UUID;
  v_user_balance  NUMERIC;
BEGIN
  -- SECURITY FIX: Verify caller owns the wallet being debited
  -- This prevents any user from draining another user's wallet
  IF auth.uid() != p_user_id THEN
    RETURN QUERY SELECT 
      false, 
      'Unauthorized: You can only send tips from your own wallet'::TEXT, 
      NULL::UUID, 
      NULL::NUMERIC;
    RETURN;
  END IF;

  IF p_amount_inr IS NULL OR p_amount_inr <= 0 THEN
    RETURN QUERY SELECT false, 'Tip amount must be positive'::TEXT, NULL::UUID, NULL::NUMERIC;
    RETURN;
  END IF;

  IF p_amount_inr > 100000 THEN
    RETURN QUERY SELECT false, 'Tip amount exceeds maximum (₹1,00,000)'::TEXT, NULL::UUID, NULL::NUMERIC;
    RETURN;
  END IF;

  -- Get the astrologer's user id (the one who will receive the funds).
  SELECT user_id INTO v_astrologer_user_id
  FROM astrologers
  WHERE id = p_astrologer_id;

  IF v_astrologer_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'Astrologer not found'::TEXT, NULL::UUID, NULL::NUMERIC;
    RETURN;
  END IF;

  -- Atomic wallet debit (will fail with insufficient_balance if low).
  BEGIN
    v_user_balance := public.debit_wallet(
      p_user_id,
      p_amount_inr,
      COALESCE(p_consultation_id::TEXT, 'tip_' || gen_random_uuid()::TEXT),
      'Tip to astrologer: ₹' || p_amount_inr::TEXT,
      'tip'
    );
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT false, 'Insufficient wallet balance'::TEXT, NULL::UUID, NULL::NUMERIC;
    RETURN;
  END;

  -- Create tip record.
  INSERT INTO tips (user_id, astrologer_id, consultation_id, amount_inr, message, status, completed_at)
  VALUES (p_user_id, p_astrologer_id, p_consultation_id, p_amount_inr, p_message, 'completed', NOW())
  RETURNING id INTO v_tip_id;

  -- 100% credit to astrologer's wallet. Use the existing credit_wallet
  -- RPC so the audit trail and balance math stay consistent.
  PERFORM public.credit_wallet(
    v_astrologer_user_id,
    p_amount_inr,
    'tip',
    'Tip from user: ₹' || p_amount_inr::TEXT,
    v_tip_id::TEXT
  );

  PERFORM public.log_audit(
    'TIP_SENT',
    'tip',
    true,
    jsonb_build_object(
      'user_id', p_user_id,
      'astrologer_id', p_astrologer_id,
      'amount', p_amount_inr,
      'tip_id', v_tip_id
    )
  );

  RETURN QUERY SELECT true, 'Tip sent successfully'::TEXT, v_tip_id, v_user_balance;
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_tip(UUID, UUID, NUMERIC, UUID, TEXT) TO authenticated;

-- =====================================================================
-- 6. Astrologer subscription RPCs
-- =====================================================================

CREATE OR REPLACE FUNCTION public.subscribe_astrologer(
  p_astrologer_id   UUID,
  p_plan_slug       TEXT,
  p_billing_cycle   TEXT DEFAULT 'monthly',
  p_payment_id      TEXT DEFAULT NULL
)
RETURNS TABLE(success BOOLEAN, message TEXT, subscription_id UUID, ends_at TIMESTAMP WITH TIME ZONE)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan           astrologer_subscription_plans%ROWTYPE;
  v_subscription   astrologer_subscriptions%ROWTYPE;
  v_amount_inr     NUMERIC;
  v_period_end     TIMESTAMP WITH TIME ZONE;
BEGIN
  -- SECURITY FIX: Verify caller owns the astrologer profile
  -- This prevents any user from upgrading other astrologers
  IF NOT EXISTS (
    SELECT 1 FROM astrologers 
    WHERE id = p_astrologer_id AND user_id = auth.uid()
  ) THEN
    RETURN QUERY SELECT 
      false, 
      'Unauthorized: You can only subscribe your own astrologer profile'::TEXT, 
      NULL::UUID, 
      NULL::TIMESTAMP WITH TIME ZONE;
    RETURN;
  END IF;

  SELECT * INTO v_plan
  FROM astrologer_subscription_plans
  WHERE slug = p_plan_slug AND is_active = true;

  IF v_plan.id IS NULL THEN
    RETURN QUERY SELECT false, 'Plan not found'::TEXT, NULL::UUID, NULL::TIMESTAMP WITH TIME ZONE;
    RETURN;
  END IF;

  IF p_plan_slug = 'free' THEN
    RETURN QUERY SELECT false, 'Free plan is the default; no subscription needed'::TEXT, NULL::UUID, NULL::TIMESTAMP WITH TIME ZONE;
    RETURN;
  END IF;

  IF p_billing_cycle NOT IN ('monthly', 'yearly') THEN
    RETURN QUERY SELECT false, 'Invalid billing cycle'::TEXT, NULL::UUID, NULL::TIMESTAMP WITH TIME ZONE;
    RETURN;
  END IF;

  v_amount_inr := CASE WHEN p_billing_cycle = 'yearly' THEN v_plan.yearly_price_inr ELSE v_plan.monthly_price_inr END;
  v_period_end := CASE
    WHEN p_billing_cycle = 'yearly' THEN NOW() + INTERVAL '365 days'
    ELSE NOW() + INTERVAL '30 days'
  END;

  -- Cancel any existing active subscription for this astrologer.
  UPDATE astrologer_subscriptions
  SET status = 'cancelled', cancelled_at = NOW(), updated_at = NOW()
  WHERE astrologer_id = p_astrologer_id AND status = 'active';

  INSERT INTO astrologer_subscriptions (
    astrologer_id, plan_id, status, billing_cycle,
    current_period_start, current_period_end,
    razorpay_payment_id, amount_paid_inr, auto_renew
  ) VALUES (
    p_astrologer_id, v_plan.id, 'active', p_billing_cycle,
    NOW(), v_period_end,
    p_payment_id, v_amount_inr, true
  )
  RETURNING * INTO v_subscription;

  PERFORM public.log_audit(
    'ASTROLOGER_SUBSCRIBED',
    'astrologer_subscription',
    true,
    jsonb_build_object(
      'astrologer_id', p_astrologer_id,
      'plan_slug', p_plan_slug,
      'billing_cycle', p_billing_cycle,
      'amount', v_amount_inr,
      'ends_at', v_period_end
    )
  );

  RETURN QUERY SELECT true, 'Subscription activated'::TEXT, v_subscription.id, v_period_end;
END;
$$;

GRANT EXECUTE ON FUNCTION public.subscribe_astrologer(UUID, TEXT, TEXT, TEXT) TO authenticated;

-- Cancel astrologer subscription
CREATE OR REPLACE FUNCTION public.cancel_astrologer_subscription(
  p_astrologer_id   UUID,
  p_reason          TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_owner_user_id UUID;
BEGIN
  SELECT user_id INTO v_owner_user_id FROM astrologers WHERE id = p_astrologer_id;
  IF v_owner_user_id IS NULL OR v_owner_user_id != v_caller_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE astrologer_subscriptions
  SET status = 'cancelled', cancelled_at = NOW(), cancelled_reason = p_reason, auto_renew = false, updated_at = NOW()
  WHERE astrologer_id = p_astrologer_id AND status = 'active';

  PERFORM public.log_audit(
    'ASTROLOGER_SUBSCRIPTION_CANCELLED',
    'astrologer_subscription',
    true,
    jsonb_build_object('astrologer_id', p_astrologer_id, 'reason', p_reason)
  );

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_astrologer_subscription(UUID, TEXT) TO authenticated;

-- =====================================================================
-- 7. Astrologer marketplace ranking view
--    Combines rating, popularity, and active subscription boost
--    so Pro/Elite astrologers surface higher in the marketplace.
-- =====================================================================

-- FIX: this view referenced columns that never existed on astrologers
-- (specialties, chat/voice/video_price_per_minute, last_active_at), so a
-- fresh `supabase db push` failed at this CREATE VIEW (view columns are
-- validated at creation). The app queries this view via
-- services/astrologer-pro.ts (select('*'), order ranking_score, contains
-- specialties/languages), so output column NAMES are kept and sourced from
-- the real columns. DROP + CREATE (not OR REPLACE) so it can also repair
-- databases that already carry the broken view.
DROP VIEW IF EXISTS astrologer_marketplace_ranking;

CREATE VIEW astrologer_marketplace_ranking AS
SELECT
  a.id                                                              AS astrologer_id,
  a.user_id                                                         AS user_id,
  a.name,
  a.avatar_url,
  a.specializations                                                 AS specialties,
  a.languages,
  a.experience_years,
  a.rating,
  a.total_consultations,
  a.price_per_minute                                                AS chat_price_per_minute,
  a.price_per_minute                                                AS voice_price_per_minute,
  a.price_per_minute                                                AS video_price_per_minute,
  a.is_online,
  a.is_verified,
  a.bio,
  COALESCE(sp.rank_boost, 0)                                         AS rank_boost,
  COALESCE(sp.visibility_multiplier, 1.0)                           AS visibility_multiplier,
  COALESCE(sp.slug, 'free')                                          AS plan_slug,
  COALESCE(sp.display_name, 'Free')                                  AS plan_display_name,
  COALESCE(sp.badge_color, '#9CA3AF')                                AS plan_badge_color,
  COALESCE(sp.can_livestream, false)                                 AS can_livestream,
  COALESCE(sp.can_set_custom_rate, false)                            AS can_set_custom_rate,
  sub.current_period_end                                             AS subscription_ends_at,
  (
    -- Base score: weighted combination of rating and popularity.
    COALESCE(a.rating, 0) * 20
    + LOG(GREATEST(COALESCE(a.total_consultations, 0), 1)) * 5
    -- Active subscription boost (this is the AstroPro ranking effect).
    + COALESCE(sp.rank_boost, 0)
    -- Slight recency boost for astrologers active in the last 7 days.
    + CASE WHEN a.updated_at > NOW() - INTERVAL '7 days' THEN 10 ELSE 0 END
  )                                                                 AS ranking_score
FROM astrologers a
LEFT JOIN astrologer_subscriptions sub
       ON sub.astrologer_id = a.id
      AND sub.status = 'active'
      AND sub.current_period_end > NOW()
LEFT JOIN astrologer_subscription_plans sp
       ON sp.id = sub.plan_id;

GRANT SELECT ON astrologer_marketplace_ranking TO anon, authenticated;

-- =====================================================================
-- 8. Expiry sweeper (call from a pg_cron job, or a Supabase Edge Function
--    scheduled every hour). Marks expired subscriptions.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.expire_astrologer_subscriptions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE astrologer_subscriptions
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'active' AND current_period_end < NOW();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.expire_astrologer_subscriptions() TO service_role;

-- =====================================================================
-- 9. Helpful views for analytics / admin dashboards
-- =====================================================================

CREATE OR REPLACE VIEW astrologer_pro_metrics AS
SELECT
  COUNT(*) FILTER (WHERE sp.slug = 'pro' AND s.status = 'active')   AS pro_subscribers,
  COUNT(*) FILTER (WHERE sp.slug = 'elite' AND s.status = 'active') AS elite_subscribers,
  COALESCE(SUM(s.amount_paid_inr) FILTER (WHERE s.created_at > NOW() - INTERVAL '30 days'), 0) AS mrr_inr
FROM astrologer_subscriptions s
JOIN astrologer_subscription_plans sp ON sp.id = s.plan_id;

GRANT SELECT ON astrologer_pro_metrics TO authenticated;

CREATE OR REPLACE VIEW tip_metrics AS
SELECT
  COUNT(*)                                                          AS total_tips,
  COALESCE(SUM(amount_inr), 0)                                       AS total_amount_inr,
  COALESCE(AVG(amount_inr), 0)                                       AS avg_tip_inr,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days')    AS tips_7d,
  COALESCE(SUM(amount_inr) FILTER (WHERE created_at > NOW() - INTERVAL '7 days'), 0) AS amount_7d
FROM tips
WHERE status = 'completed';

GRANT SELECT ON tip_metrics TO authenticated;

-- =====================================================================
-- 10. Comments
-- =====================================================================

COMMENT ON TABLE astrologer_subscription_plans IS 'AstroPro plan catalog. Seeded with free/pro/elite in this migration.';
COMMENT ON TABLE astrologer_subscriptions      IS 'Active and historical astrologer subscriptions to AstroPro plans.';
COMMENT ON TABLE tips                          IS 'In-app tips from users to astrologers. 100% to astrologer, 0% commission. Engagement driver.';
COMMENT ON TABLE tip_presets                   IS 'Preset tip amounts (₹51, ₹101, etc.) shown in the tip modal.';
COMMENT ON VIEW  astrologer_marketplace_ranking IS 'Marketplace ranking with subscription boost baked in. Use this view for astrologer listings.';
COMMENT ON FUNCTION public.send_tip(UUID, UUID, NUMERIC, UUID, TEXT) IS 'Send a tip from user to astrologer. 100% to astrologer.';
COMMENT ON FUNCTION public.subscribe_astrologer(UUID, TEXT, TEXT, TEXT) IS 'Activate an AstroPro subscription for an astrologer.';
 