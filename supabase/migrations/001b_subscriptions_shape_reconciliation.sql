-- Migration 001b: Reconcile subscriptions table with the client contract
--
-- WHY THIS IS NEEDED:
--   Migration 001 created subscriptions with a legacy shape
--   (plan / status / started_at / ends_at / auto_renew / price). Every other
--   consumer uses a different shape:
--     * migrations 008/009 mark_payment_completed_v2 INSERT
--       plan_id, plan_name, amount, currency, start_date, end_date,
--       is_active, payment_status (inside function bodies — plpgsql defers
--       column validation to RUNTIME, so the chain applies cleanly but every
--       call throws 'column does not exist')
--     * lib/database.types.ts and services/api.ts + services/subscription.ts
--       read the same plan_id/... shape
--   No migration ever created the client-shaped table, so on a database built
--   from the migrations, subscription activation and the subscription API
--   are broken at runtime.
--
-- THIS MIGRATION:
--   Detects the legacy shape (presence of the `plan` column) and rebuilds the
--   table to the client shape, migrating existing rows across. Runs right
--   after 001 (before anything consumes the new shape).
--
-- SAFE: no-op when the table is already in the client shape; preserves data.

DO $$
DECLARE
  v_has_legacy BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'subscriptions' AND column_name = 'plan'
  ) INTO v_has_legacy;

  IF v_has_legacy THEN
    ALTER TABLE public.subscriptions RENAME TO subscriptions_legacy;

    -- Client shape. payment_status is TEXT to avoid depending on the
    -- payment_status enum (created later in migration 001's DO block).
    CREATE TABLE public.subscriptions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      plan_id VARCHAR(50),
      plan_name VARCHAR(100),
      amount DECIMAL(10, 2),
      currency VARCHAR(3) DEFAULT 'INR',
      payment_id UUID REFERENCES public.payments(id),
      payment_status TEXT DEFAULT 'pending'
        CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
      start_date TIMESTAMP WITH TIME ZONE,
      end_date TIMESTAMP WITH TIME ZONE,
      is_active BOOLEAN DEFAULT true,
      razorpay_subscription_id TEXT,
      cancelled_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Migrate existing rows: legacy 'active' status becomes a completed
    -- payment; plan/price map to plan_id/plan_name/amount.
    INSERT INTO public.subscriptions (
      id, user_id, plan_id, plan_name, amount, currency,
      payment_id, payment_status, start_date, end_date, is_active, created_at
    )
    SELECT
      id, user_id, plan, plan, price, 'INR',
      payment_id,
      CASE WHEN status = 'active' THEN 'completed' ELSE 'pending' END,
      started_at, ends_at, COALESCE(auto_renew, false), created_at
    FROM public.subscriptions_legacy;

    DROP TABLE public.subscriptions_legacy;

    -- Re-apply RLS + grants (001's statements targeted the old table object
    -- and were consumed when it was renamed/dropped).
    ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Users view own subscriptions" ON public.subscriptions;
    CREATE POLICY "Users view own subscriptions" ON public.subscriptions
      FOR SELECT USING (auth.uid() = user_id);

    DROP POLICY IF EXISTS "Users insert own subscriptions" ON public.subscriptions;
    CREATE POLICY "Users insert own subscriptions" ON public.subscriptions
      FOR INSERT WITH CHECK (auth.uid() = user_id);

    -- 001 created idx_subscriptions_user_id on the legacy table; the index
    -- moved with the rename and died with the DROP TABLE above. Recreate it
    -- (001's own index statement ran before this migration on the old table).
    CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id
      ON public.subscriptions (user_id);

    GRANT SELECT, INSERT ON public.subscriptions TO authenticated;
  END IF;
END $$;
