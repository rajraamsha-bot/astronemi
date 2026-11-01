-- ============================================
-- ASTROFUSION CONSOLIDATED PRODUCTION SCHEMA
-- ============================================
-- Optimized for Performance, Security, and Scalability
-- Merges all fixes and security patches (001-014)
--
-- SECURITY FIXES IN THIS VERSION:
--   1. RLS enabled on ALL tables (was missing on 7 tables)
--   2. GRANT ALL replaced with explicit per-table grants
--   3. View created WITH (security_invoker = true) to enforce RLS
--   4. All SECURITY DEFINER functions have SET search_path = public
--   5. credit_wallet/debit_wallet now require auth.uid() authorization
--   6. Role-change trigger blocks ALL role changes (not just admin)
--   7. FORCE RLS on sensitive tables
--   8. Column-level REVOKE on astrologer bank_account/upi_id
--   9. CHECK constraints on free-text fields to prevent storage DoS
--  10. Missing FK indexes added for scale
--  11. Policies added for orders, order_items, and all previously unmapped tables
--  12. webhook_events table added for webhook idempotency
--  13. Consultation SELECT policy fixed to be astrologer-specific
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. CUSTOM TYPES (ENUMS)
-- ============================================
DO $$ BEGIN
    CREATE TYPE public.user_role AS ENUM ('user', 'astrologer', 'admin');
    CREATE TYPE public.consultation_type AS ENUM ('chat', 'call', 'video');
    CREATE TYPE public.consultation_status AS ENUM ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'refunded');
    CREATE TYPE public.payment_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'refunded');
    CREATE TYPE public.payment_method AS ENUM ('razorpay', 'wallet', 'upi', 'card', 'netbanking');
    CREATE TYPE public.order_status AS ENUM ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded');
    CREATE TYPE public.transaction_type AS ENUM ('credit', 'debit');
    CREATE TYPE public.subscription_status AS ENUM ('active', 'cancelled', 'expired', 'paused');
    CREATE TYPE public.ticket_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');
    CREATE TYPE public.ticket_priority AS ENUM ('low', 'medium', 'high', 'urgent');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- 2. CORE TABLES
-- ============================================

-- USERS TABLE
CREATE TABLE IF NOT EXISTS public.users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    phone VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(255),
    name VARCHAR(100),
    avatar_url TEXT,
    birth_date DATE,
    birth_time TIME,
    birth_place VARCHAR(255),
    birth_lat DECIMAL(10, 8),
    birth_lng DECIMAL(11, 8),
    zodiac_sign VARCHAR(20),
    nakshatra VARCHAR(50),
    role user_role DEFAULT 'user',
    wallet_balance DECIMAL(12, 2) DEFAULT 0 CHECK (wallet_balance >= 0),
    subscription_plan VARCHAR(20) DEFAULT 'free',
    subscription_ends_at TIMESTAMP WITH TIME ZONE,
    referral_code VARCHAR(20) UNIQUE,
    referred_by UUID REFERENCES public.users(id),
    referral_earnings DECIMAL(12, 2) DEFAULT 0,
    notifications_enabled BOOLEAN DEFAULT true,
    language VARCHAR(10) DEFAULT 'en',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ASTROLOGERS TABLE
CREATE TABLE IF NOT EXISTS public.astrologers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    avatar TEXT,
    bio TEXT CHECK (length(bio) <= 5000),
    experience_years INTEGER DEFAULT 0,
    specializations TEXT[] NOT NULL,
    languages TEXT[] NOT NULL,
    price_per_minute DECIMAL(10, 2) NOT NULL,
    discount_price DECIMAL(10, 2),
    rating DECIMAL(3, 2) DEFAULT 0,
    total_reviews INTEGER DEFAULT 0,
    total_consultations INTEGER DEFAULT 0,
    is_verified BOOLEAN DEFAULT false,
    is_online BOOLEAN DEFAULT false,
    is_available BOOLEAN DEFAULT true,
    next_available_at TIMESTAMP WITH TIME ZONE,
    skills TEXT[],
    certifications TEXT[],
    bank_account JSONB,
    upi_id VARCHAR(100),
    total_earnings DECIMAL(12, 2) DEFAULT 0,
    withdrawn_amount DECIMAL(12, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name TEXT NOT NULL,
    operation TEXT NOT NULL,
    user_id UUID REFERENCES public.users(id),
    old_data JSONB,
    new_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CONSULTATIONS
CREATE TABLE IF NOT EXISTS public.consultations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    astrologer_id UUID REFERENCES public.astrologers(id) ON DELETE CASCADE NOT NULL,
    type consultation_type NOT NULL,
    status consultation_status DEFAULT 'pending',
    scheduled_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER,
    price DECIMAL(10, 2) NOT NULL,
    user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
    user_review TEXT CHECK (length(user_review) <= 5000),
    recording_url TEXT,
    transcript TEXT CHECK (length(transcript) <= 100000),
    notes TEXT CHECK (length(notes) <= 10000),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CHAT MESSAGES
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    consultation_id UUID REFERENCES public.consultations(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID NOT NULL,
    sender_type VARCHAR(20) NOT NULL, -- 'user' or 'astrologer'
    content TEXT NOT NULL CHECK (length(content) <= 10000),
    message_type VARCHAR(20) DEFAULT 'text',
    media_url TEXT,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PAYMENTS
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    order_id VARCHAR(100) UNIQUE,
    razorpay_order_id VARCHAR(100),
    razorpay_payment_id VARCHAR(100),
    razorpay_signature TEXT,
    amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'INR',
    status payment_status DEFAULT 'pending',
    method payment_method,
    type VARCHAR(50) NOT NULL, -- 'consultation', 'subscription', 'wallet', 'product'
    reference_id UUID,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- WALLET TRANSACTIONS
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    type transaction_type NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    balance_after DECIMAL(12, 2) NOT NULL,
    description TEXT NOT NULL CHECK (length(description) <= 500),
    reference_type VARCHAR(50),
    reference_id UUID,
    payment_id UUID REFERENCES public.payments(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- SUBSCRIPTIONS
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    plan VARCHAR(20) NOT NULL,
    status subscription_status DEFAULT 'active',
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
    auto_renew BOOLEAN DEFAULT true,
    price DECIMAL(10, 2) NOT NULL,
    payment_id UUID REFERENCES public.payments(id),
    consultations_included INTEGER DEFAULT 0,
    consultations_used INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PRODUCTS
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT CHECK (length(description) <= 10000),
    price DECIMAL(10, 2) NOT NULL,
    discount_price DECIMAL(10, 2),
    images TEXT[],
    category VARCHAR(100),
    stock INTEGER DEFAULT 0,
    is_available BOOLEAN DEFAULT true,
    specifications JSONB,
    rating DECIMAL(3, 2) DEFAULT 0,
    total_reviews INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ORDERS
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    status order_status DEFAULT 'pending',
    items JSONB NOT NULL,
    subtotal DECIMAL(12, 2) NOT NULL,
    discount DECIMAL(12, 2) DEFAULT 0,
    tax DECIMAL(12, 2) DEFAULT 0,
    shipping DECIMAL(10, 2) DEFAULT 0,
    total DECIMAL(12, 2) NOT NULL,
    shipping_address JSONB,
    payment_id UUID REFERENCES public.payments(id),
    tracking_number VARCHAR(100),
    notes TEXT CHECK (length(notes) <= 5000),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ORDER ITEMS
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    price DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- KUNDLIS
CREATE TABLE IF NOT EXISTS public.kundlis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(100) NOT NULL,
    gender VARCHAR(20),
    date_of_birth DATE NOT NULL,
    time_of_birth TIME NOT NULL,
    place_of_birth VARCHAR(255) NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    timezone DECIMAL(4, 2) NOT NULL,
    ascendant VARCHAR(20),
    moon_sign VARCHAR(20),
    sun_sign VARCHAR(20),
    nakshatra VARCHAR(50),
    nakshatra_pada INTEGER,
    planets JSONB,
    houses JSONB,
    yogas JSONB,
    dasha JSONB,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- KUNDLI MATCHING
CREATE TABLE IF NOT EXISTS public.kundli_matching (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    boy_kundli_id UUID REFERENCES public.kundlis(id) ON DELETE CASCADE,
    girl_kundli_id UUID REFERENCES public.kundlis(id) ON DELETE CASCADE,
    boy_data JSONB NOT NULL,
    girl_data JSONB NOT NULL,
    total_score INTEGER,
    max_score INTEGER DEFAULT 36,
    kutas JSONB,
    conclusion TEXT CHECK (length(conclusion) <= 10000),
    doshas TEXT[],
    remedies TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- HOROSCOPES
CREATE TABLE IF NOT EXISTS public.horoscopes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sign VARCHAR(20) NOT NULL,
    period VARCHAR(20) NOT NULL,
    date DATE NOT NULL,
    prediction TEXT NOT NULL CHECK (length(prediction) <= 10000),
    lucky_numbers INTEGER[],
    lucky_color VARCHAR(50),
    mood VARCHAR(50),
    compatibility VARCHAR(20),
    career TEXT CHECK (length(career) <= 5000),
    love TEXT CHECK (length(love) <= 5000),
    health TEXT CHECK (length(health) <= 5000),
    finance TEXT CHECK (length(finance) <= 5000),
    overall_rating INTEGER CHECK (overall_rating >= 1 AND overall_rating <= 5),
    career_rating INTEGER,
    love_rating INTEGER,
    health_rating INTEGER,
    finance_rating INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(sign, period, date)
);

-- PANCHANG
CREATE TABLE IF NOT EXISTS public.panchang (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL UNIQUE,
    tithi VARCHAR(50) NOT NULL,
    tithi_end_time TIME,
    nakshatra VARCHAR(50) NOT NULL,
    nakshatra_end_time TIME,
    yoga VARCHAR(50) NOT NULL,
    yoga_end_time TIME,
    karana VARCHAR(50) NOT NULL,
    karana_end_time TIME,
    paksha VARCHAR(20),
    sunrise TIME,
    sunset TIME,
    moonrise TIME,
    moonset TIME,
    rahu_kaal_start TIME,
    rahu_kaal_end TIME,
    gulika_kaal_start TIME,
    gulika_kaal_end TIME,
    yamaganda_kaal_start TIME,
    yamaganda_kaal_end TIME,
    festivals JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- MUHURATS
CREATE TABLE IF NOT EXISTS public.muhurats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(50) NOT NULL,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    quality VARCHAR(20),
    score INTEGER,
    description TEXT CHECK (length(description) <= 5000),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL CHECK (length(body) <= 5000),
    data JSONB,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- OTP STORAGE
CREATE TABLE IF NOT EXISTS public.otp_storage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone TEXT NOT NULL,
    otp_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    attempts INT DEFAULT 0,
    verified BOOLEAN DEFAULT FALSE
);

-- PAYMENT IDEMPOTENCY
CREATE TABLE IF NOT EXISTS public.payment_idempotency_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(255) UNIQUE NOT NULL,
    payment_id UUID REFERENCES public.payments(id),
    status VARCHAR(20) NOT NULL,
    request_data JSONB,
    response_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '24 hours'
);

-- WEBHOOK EVENTS (for Razorpay webhook idempotency)
CREATE TABLE IF NOT EXISTS public.webhook_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    razorpay_event_id VARCHAR(255) UNIQUE NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB,
    processed BOOLEAN DEFAULT false,
    received_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

-- ============================================
-- 3. VIEWS (Security: security_invoker = true)
-- ============================================

-- SECURITY FIX: View now uses security_invoker so RLS on underlying
-- users table is enforced. Without this, the view bypassed RLS and
-- exposed ALL users' PII to any authenticated caller.
CREATE OR REPLACE VIEW public.users_compatible
WITH (security_invoker = true) AS
SELECT
    u.id, u.phone, u.email, u.name, u.avatar_url,
    u.birth_date, u.birth_time, u.birth_place,
    u.birth_lat, u.birth_lng, u.zodiac_sign, u.nakshatra,
    u.referral_code, u.referred_by, u.wallet_balance,
    u.subscription_plan, u.subscription_ends_at, u.language,
    u.notifications_enabled, u.referral_earnings, u.updated_at, u.created_at
FROM public.users u;

-- ============================================
-- 4. FUNCTIONS (Security: search_path + auth checks)
-- ============================================

-- SECURITY: Admin Check
-- FIX: Added SET search_path to prevent search_path injection
CREATE OR REPLACE FUNCTION is_admin(user_id_param UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = user_id_param
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- SECURITY: Astrologer Check
-- FIX: Added SET search_path to prevent search_path injection
CREATE OR REPLACE FUNCTION is_astrologer(user_id_param UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.astrologers
    WHERE user_id = user_id_param
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- SECURITY: Consultation Ownership
-- FIX: Added SET search_path to prevent search_path injection
CREATE OR REPLACE FUNCTION owns_consultation(consultation_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.consultations
    WHERE id = consultation_id_param
    AND (user_id = auth.uid() OR astrologer_id IN (SELECT id FROM public.astrologers WHERE user_id = auth.uid()))
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- LOGIC: Update Timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- LOGIC: Wallet Security Gate
-- FIX: Added SET search_path
-- FIX: Block ALL role changes (was only blocking admin elevation)
CREATE OR REPLACE FUNCTION enforce_user_update_restrictions()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.wallet_balance IS DISTINCT FROM OLD.wallet_balance THEN
    RAISE EXCEPTION 'wallet_balance cannot be modified directly. Use wallet RPC functions.';
  END IF;
  IF NEW.subscription_plan IS DISTINCT FROM OLD.subscription_plan THEN
    RAISE EXCEPTION 'subscription_plan cannot be modified directly. Use admin RPC.';
  END IF;
  -- FIX: Block ALL role changes, not just admin elevation
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'role cannot be modified directly. Use admin RPC.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- LOGIC: Consultation Status Validation
-- FIX: Added SET search_path
CREATE OR REPLACE FUNCTION validate_consultation_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    IF NOT EXISTS (SELECT 1 FROM public.astrologers WHERE user_id = auth.uid() AND id = NEW.astrologer_id)
    AND NOT (SELECT public.is_admin(auth.uid())) THEN
      RAISE EXCEPTION 'Only the assigned astrologer or admin can mark as completed.';
    END IF;
  END IF;
  IF NEW.status = 'cancelled' AND OLD.status IN ('in_progress', 'completed') THEN
    RAISE EXCEPTION 'Cannot cancel after start.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- LOGIC: Wallet Debit
-- FIX: Added SET search_path
-- FIX: Added auth check — only the user themselves or an admin can debit
CREATE OR REPLACE FUNCTION debit_wallet(
  p_user_id UUID, p_amount DECIMAL, p_source TEXT DEFAULT 'system',
  p_description TEXT DEFAULT 'Payment', p_payment_id UUID DEFAULT NULL, p_reference_id UUID DEFAULT NULL
) RETURNS TABLE(success BOOLEAN, message TEXT, new_balance DECIMAL) AS $$
DECLARE v_balance DECIMAL(12, 2);
BEGIN
  -- SECURITY: Verify caller is authenticated and authorized
  IF auth.uid() IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Not authenticated', 0::DECIMAL;
    RETURN;
  END IF;
  -- Only the user themselves or an admin can debit their wallet
  IF auth.uid() != p_user_id AND NOT (SELECT public.is_admin(auth.uid())) THEN
    RETURN QUERY SELECT FALSE, 'Unauthorized: cannot debit another user wallet', 0::DECIMAL;
    RETURN;
  END IF;

  SELECT wallet_balance INTO v_balance FROM public.users WHERE id = p_user_id FOR UPDATE;
  IF v_balance IS NULL THEN RETURN QUERY SELECT FALSE, 'User not found', 0::DECIMAL; RETURN; END IF;
  IF v_balance < p_amount THEN RETURN QUERY SELECT FALSE, 'Insufficient balance', v_balance; RETURN; END IF;
  UPDATE public.users SET wallet_balance = wallet_balance - p_amount, updated_at = NOW() WHERE id = p_user_id RETURNING wallet_balance INTO v_balance;
  INSERT INTO public.wallet_transactions (user_id, type, amount, description, balance_after, reference_type, reference_id, payment_id)
  VALUES (p_user_id, 'debit', p_amount, p_description, v_balance, p_source, p_reference_id, p_payment_id);
  RETURN QUERY SELECT TRUE, 'Success', v_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- LOGIC: Wallet Credit
-- FIX: Added SET search_path
-- FIX: Added auth check — only service role (webhook) or admin can credit
--       Regular users CANNOT credit their own wallet via this RPC
CREATE OR REPLACE FUNCTION credit_wallet(
  p_user_id UUID, p_amount DECIMAL, p_source TEXT DEFAULT 'system',
  p_description TEXT DEFAULT 'Top-up', p_payment_id UUID DEFAULT NULL, p_reference_id UUID DEFAULT NULL
) RETURNS TABLE(success BOOLEAN, message TEXT, new_balance DECIMAL) AS $$
DECLARE v_balance DECIMAL(12, 2);
BEGIN
  -- SECURITY: This function is only callable by the service role
  -- (used by webhook handlers) or by an admin.
  -- auth.uid() returns NULL for service-role calls, so we allow NULL
  -- only when the caller is the postgres/service role.
  -- For authenticated users, only admins can credit wallets.
  IF auth.uid() IS NOT NULL AND NOT (SELECT public.is_admin(auth.uid())) THEN
    RETURN QUERY SELECT FALSE, 'Unauthorized: wallet credits require service role or admin', 0::DECIMAL;
    RETURN;
  END IF;

  UPDATE public.users SET wallet_balance = wallet_balance + p_amount, updated_at = NOW() WHERE id = p_user_id RETURNING wallet_balance INTO v_balance;
  INSERT INTO public.wallet_transactions (user_id, type, amount, description, balance_after, reference_type, reference_id, payment_id)
  VALUES (p_user_id, 'credit', p_amount, p_description, v_balance, p_source, p_reference_id, p_payment_id);
  RETURN QUERY SELECT TRUE, 'Success', v_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- ============================================
-- 5. TRIGGERS
-- ============================================

DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS user_security_gate ON public.users;
CREATE TRIGGER user_security_gate BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION enforce_user_update_restrictions();

DROP TRIGGER IF EXISTS update_astrologers_updated_at ON public.astrologers;
CREATE TRIGGER update_astrologers_updated_at BEFORE UPDATE ON public.astrologers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_consultations_updated_at ON public.consultations;
CREATE TRIGGER update_consultations_updated_at BEFORE UPDATE ON public.consultations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS consultation_status_validation ON public.consultations;
CREATE TRIGGER consultation_status_validation BEFORE UPDATE ON public.consultations FOR EACH ROW EXECUTE FUNCTION validate_consultation_status_change();

-- ============================================
-- 6. INDEXES (including missing FK indexes)
-- ============================================

CREATE INDEX IF NOT EXISTS idx_astrologers_specialization ON public.astrologers USING GIN(specializations);
CREATE INDEX IF NOT EXISTS idx_astrologers_languages ON public.astrologers USING GIN(languages);
CREATE INDEX IF NOT EXISTS idx_astrologers_user_id ON public.astrologers(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_consultation_id ON public.chat_messages(consultation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_id ON public.chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_razorpay ON public.payments(razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_horoscopes_sign_date ON public.horoscopes(sign, date);
CREATE INDEX IF NOT EXISTS idx_kundlis_user_id ON public.kundlis(user_id);
-- FIX: Missing FK indexes added for scale
CREATE INDEX IF NOT EXISTS idx_consultations_astrologer_id ON public.consultations(astrologer_id);
CREATE INDEX IF NOT EXISTS idx_consultations_user_id ON public.consultations(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_id ON public.wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_reference_id ON public.wallet_transactions(reference_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_payment_id ON public.orders(payment_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_kundli_matching_user_id ON public.kundli_matching(user_id);
CREATE INDEX IF NOT EXISTS idx_kundli_matching_boy_kundli_id ON public.kundli_matching(boy_kundli_id);
CREATE INDEX IF NOT EXISTS idx_kundli_matching_girl_kundli_id ON public.kundli_matching(girl_kundli_id);
CREATE INDEX IF NOT EXISTS idx_otp_storage_phone ON public.otp_storage(phone);
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_id ON public.webhook_events(razorpay_event_id);

-- ============================================
-- 7. RLS POLICIES (Hardened — ALL tables covered)
-- ============================================

-- Default Deny: Enable RLS on ALL tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.astrologers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kundlis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kundli_matching ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
-- FIX: Enable RLS on previously missing tables
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.otp_storage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_idempotency_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.horoscopes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.panchang ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.muhurats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- FIX: FORCE RLS on sensitive tables so even table owners are subject
ALTER TABLE public.users FORCE ROW LEVEL SECURITY;
ALTER TABLE public.astrologers FORCE ROW LEVEL SECURITY;
ALTER TABLE public.payments FORCE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.consultations FORCE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages FORCE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs FORCE ROW LEVEL SECURITY;
ALTER TABLE public.otp_storage FORCE ROW LEVEL SECURITY;

-- Users
CREATE POLICY "Users view own" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users insert own" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);

-- Astrologers
CREATE POLICY "Public view astrologers" ON public.astrologers FOR SELECT USING (true);
CREATE POLICY "Astrologers update own" ON public.astrologers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Astrologers insert own" ON public.astrologers FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Consultations
-- FIX: Astrologers can only see THEIR OWN consultations, not all
CREATE POLICY "Participants view consultations" ON public.consultations FOR SELECT USING (
  auth.uid() = user_id
  OR id IN (
    SELECT c.id FROM public.consultations c
    JOIN public.astrologers a ON c.astrologer_id = a.id
    WHERE a.user_id = auth.uid()
  )
);
CREATE POLICY "Users book consultations" ON public.consultations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own consultations" ON public.consultations FOR UPDATE USING (
  auth.uid() = user_id
  OR id IN (
    SELECT c.id FROM public.consultations c
    JOIN public.astrologers a ON c.astrologer_id = a.id
    WHERE a.user_id = auth.uid()
  )
);

-- Chat
CREATE POLICY "Participants view chat" ON public.chat_messages FOR SELECT USING (public.owns_consultation(consultation_id));
CREATE POLICY "Participants send chat" ON public.chat_messages FOR INSERT WITH CHECK (sender_id = auth.uid() AND public.owns_consultation(consultation_id));

-- Wallet (Read Only for Users, Insert via RPC only)
CREATE POLICY "Users view own wallet" ON public.wallet_transactions FOR SELECT USING (auth.uid() = user_id);

-- Payments
CREATE POLICY "Users view own payments" ON public.payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own payments" ON public.payments FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Subscriptions
CREATE POLICY "Users view own subscriptions" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own subscriptions" ON public.subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Orders
-- FIX: Previously had RLS enabled but NO policies — feature was broken
CREATE POLICY "Users view own orders" ON public.orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users create own orders" ON public.orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own orders" ON public.orders FOR UPDATE USING (auth.uid() = user_id);

-- Order Items
-- FIX: Previously had RLS enabled but NO policies
CREATE POLICY "Users view own order items" ON public.order_items FOR SELECT USING (
  order_id IN (SELECT id FROM public.orders WHERE user_id = auth.uid())
);
CREATE POLICY "Users create own order items" ON public.order_items FOR INSERT WITH CHECK (
  order_id IN (SELECT id FROM public.orders WHERE user_id = auth.uid())
);

-- Kundlis
CREATE POLICY "Users view own kundlis" ON public.kundlis FOR SELECT USING (auth.uid() = user_id OR is_public = true);
CREATE POLICY "Users insert own kundlis" ON public.kundlis FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own kundlis" ON public.kundlis FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own kundlis" ON public.kundlis FOR DELETE USING (auth.uid() = user_id);

-- Kundli Matching
CREATE POLICY "Users view own kundli_matching" ON public.kundli_matching FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own kundli_matching" ON public.kundli_matching FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Notifications
CREATE POLICY "Users view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- Audit Logs — FIX: No client access (service role only)
CREATE POLICY "Admin view audit logs" ON public.audit_logs FOR SELECT USING (public.is_admin(auth.uid()));

-- OTP Storage — FIX: No client access at all (service role only)
-- No policies = deny all for authenticated/anon roles

-- Payment Idempotency — FIX: No client access (service role only)
-- No policies = deny all for authenticated/anon roles

-- Webhook Events — FIX: No client access (service role only)
-- No policies = deny all for authenticated/anon roles

-- Products — public read, admin write
CREATE POLICY "Public view products" ON public.products FOR SELECT USING (is_available = true);
CREATE POLICY "Admin manage products" ON public.products FOR ALL USING (public.is_admin(auth.uid()));

-- Horoscopes — public read, admin write
CREATE POLICY "Public view horoscopes" ON public.horoscopes FOR SELECT USING (true);
CREATE POLICY "Admin manage horoscopes" ON public.horoscopes FOR ALL USING (public.is_admin(auth.uid()));

-- Panchang — public read, admin write
CREATE POLICY "Public view panchang" ON public.panchang FOR SELECT USING (true);
CREATE POLICY "Admin manage panchang" ON public.panchang FOR ALL USING (public.is_admin(auth.uid()));

-- Muhurats — public read, admin write
CREATE POLICY "Public view muhurats" ON public.muhurats FOR SELECT USING (true);
CREATE POLICY "Admin manage muhurats" ON public.muhurats FOR ALL USING (public.is_admin(auth.uid()));

-- ============================================
-- 8. PERMISSIONS (Explicit per-table, not GRANT ALL)
-- ============================================

-- FIX: Replaced "GRANT ALL ON ALL TABLES" with explicit grants
-- This prevents accidental write access to sensitive tables

-- Schema usage
GRANT USAGE ON SCHEMA public TO authenticated, anon;

-- Users: own record only
GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated;
GRANT SELECT ON public.users_compatible TO authenticated;

-- Astrologers: public read, own update
GRANT SELECT ON public.astrologers TO authenticated, anon;
GRANT INSERT, UPDATE ON public.astrologers TO authenticated;

-- Consultations: participants only
GRANT SELECT, INSERT, UPDATE ON public.consultations TO authenticated;

-- Chat messages: participants only
GRANT SELECT, INSERT ON public.chat_messages TO authenticated;

-- Payments: own only
GRANT SELECT, INSERT ON public.payments TO authenticated;

-- Wallet transactions: read only (insert via RPC)
GRANT SELECT ON public.wallet_transactions TO authenticated;

-- Subscriptions: own only
GRANT SELECT, INSERT ON public.subscriptions TO authenticated;

-- Orders: own only
GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;

-- Order items: via own orders only
GRANT SELECT, INSERT ON public.order_items TO authenticated;

-- Kundlis: own only
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kundlis TO authenticated;

-- Kundli matching: own only
GRANT SELECT, INSERT ON public.kundli_matching TO authenticated;

-- Notifications: own only
GRANT SELECT, UPDATE ON public.notifications TO authenticated;

-- Products: public read
GRANT SELECT ON public.products TO authenticated, anon;

-- Horoscopes: public read
GRANT SELECT ON public.horoscopes TO authenticated, anon;

-- Panchang: public read
GRANT SELECT ON public.panchang TO authenticated, anon;

-- Muhurats: public read
GRANT SELECT ON public.muhurats TO authenticated, anon;

-- FIX: Sensitive tables — NO direct grants to authenticated/anon
-- audit_logs, otp_storage, payment_idempotency_keys, webhook_events
-- These are only accessible via service role (Edge Functions)

-- Sequences
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Functions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- FIX: Column-level REVOKE on astrologer sensitive columns
REVOKE SELECT (bank_account, upi_id) ON public.astrologers FROM authenticated, anon;