-- ============================================
-- ASTROFUSION MIGRATION 002: NEW BUSINESS TABLES
-- ============================================
-- Adds tables for astrologer onboarding, consultation quality,
-- and dispute resolution. Also extends consultations table.

-- ============================================
-- NEW ENUMS
-- ============================================
DO $$ BEGIN
    CREATE TYPE public.onboarding_status AS ENUM (
        'draft', 'profile_complete', 'kyc_pending', 'kyc_verified',
        'test_pending', 'test_passed', 'test_failed', 'pricing_pending',
        'payout_pending', 'under_review', 'approved', 'rejected'
    );
    CREATE TYPE public.dispute_status AS ENUM ('open', 'under_review', 'resolved', 'rejected');
    CREATE TYPE public.dispute_reason AS ENUM (
        'astrologer_not_available', 'poor_connection', 'unsatisfactory_service',
        'wrong_predictions', 'rude_behavior', 'billed_incorrectly',
        'technical_issue', 'other'
    );
    CREATE TYPE public.payout_status AS ENUM ('pending', 'processing', 'paid', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- ASTROLOGER ONBOARDING
-- ============================================
CREATE TABLE IF NOT EXISTS public.astrologer_onboarding (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    status onboarding_status DEFAULT 'draft',
    profile_data JSONB,
    kyc_documents JSONB DEFAULT '[]',
    kyc_verified BOOLEAN DEFAULT false,
    test_result JSONB,
    pricing_tier JSONB,
    payout_details JSONB,
    submitted_at TIMESTAMP WITH TIME ZONE,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewer_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- CONSULTATION REVIEWS
-- ============================================
CREATE TABLE IF NOT EXISTS public.consultation_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    consultation_id UUID REFERENCES public.consultations(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    astrologer_id UUID REFERENCES public.astrologers(id) ON DELETE CASCADE NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
    review TEXT,
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- CONSULTATION DISPUTES
-- ============================================
CREATE TABLE IF NOT EXISTS public.consultation_disputes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    consultation_id UUID REFERENCES public.consultations(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    astrologer_id UUID REFERENCES public.astrologers(id) ON DELETE CASCADE NOT NULL,
    reason dispute_reason NOT NULL,
    description TEXT NOT NULL,
    status dispute_status DEFAULT 'open',
    resolution TEXT,
    refund_amount DECIMAL(12, 2),
    resolved_by UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- ============================================
-- EXTEND CONSULTATIONS TABLE
-- ============================================
DO $$ BEGIN
    ALTER TABLE public.consultations
        ADD COLUMN IF NOT EXISTS astrologer_payout_status payout_status DEFAULT 'pending',
        ADD COLUMN IF NOT EXISTS recording_consent BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}',
        ADD COLUMN IF NOT EXISTS duration INTEGER, -- seconds
        ADD COLUMN IF NOT EXISTS amount DECIMAL(12, 2),
        ADD COLUMN IF NOT EXISTS start_time TIMESTAMP WITH TIME ZONE,
        ADD COLUMN IF NOT EXISTS end_time TIMESTAMP WITH TIME ZONE;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- ============================================
-- HOROSCOPE SUBSCRIPTIONS (for daily push)
-- ============================================
CREATE TABLE IF NOT EXISTS public.horoscope_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    zodiac_sign VARCHAR(20) NOT NULL,
    push_token TEXT NOT NULL,
    platform VARCHAR(10) NOT NULL, -- 'ios' or 'android'
    timezone VARCHAR(50) DEFAULT 'Asia/Kolkata',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, zodiac_sign)
);

-- ============================================
-- TRIGGERS
-- ============================================
CREATE TRIGGER update_astrologer_onboarding_updated_at
    BEFORE UPDATE ON public.astrologer_onboarding
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_astrologer_onboarding_user ON public.astrologer_onboarding(user_id);
CREATE INDEX IF NOT EXISTS idx_consultation_reviews_astrologer ON public.consultation_reviews(astrologer_id);
CREATE INDEX IF NOT EXISTS idx_consultation_disputes_status ON public.consultation_disputes(status);
CREATE INDEX IF NOT EXISTS idx_consultations_astrologer_payout ON public.consultations(astrologer_id, astrologer_payout_status);
CREATE INDEX IF NOT EXISTS idx_horoscope_subscriptions_active ON public.horoscope_subscriptions(is_active);

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE public.astrologer_onboarding ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultation_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultation_disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.horoscope_subscriptions ENABLE ROW LEVEL SECURITY;

-- Astrologer onboarding
CREATE POLICY "Users view own onboarding" ON public.astrologer_onboarding FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own onboarding" ON public.astrologer_onboarding FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own onboarding" ON public.astrologer_onboarding FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admin view all onboarding" ON public.astrologer_onboarding FOR SELECT USING (is_admin(auth.uid()));

-- Reviews
CREATE POLICY "Public view reviews" ON public.consultation_reviews FOR SELECT USING (true);
CREATE POLICY "Users create reviews" ON public.consultation_reviews FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Disputes
CREATE POLICY "Users view own disputes" ON public.consultation_disputes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users create disputes" ON public.consultation_disputes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admin view all disputes" ON public.consultation_disputes FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "Admin update disputes" ON public.consultation_disputes FOR UPDATE USING (is_admin(auth.uid()));

-- Horoscope subscriptions
CREATE POLICY "Users manage own subscriptions" ON public.horoscope_subscriptions FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Get astrologer earnings summary
CREATE OR REPLACE FUNCTION get_astrologer_earnings(p_astrologer_id UUID)
RETURNS TABLE(
    today DECIMAL,
    this_week DECIMAL,
    this_month DECIMAL,
    total DECIMAL,
    pending_payout DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(SUM(CASE WHEN c.start_time >= DATE_TRUNC('day', NOW()) THEN c.amount ELSE 0 END), 0)::DECIMAL * 0.7 as today,
        COALESCE(SUM(CASE WHEN c.start_time >= NOW() - INTERVAL '7 days' THEN c.amount ELSE 0 END), 0)::DECIMAL * 0.7 as this_week,
        COALESCE(SUM(CASE WHEN c.start_time >= DATE_TRUNC('month', NOW()) THEN c.amount ELSE 0 END), 0)::DECIMAL * 0.7 as this_month,
        COALESCE(SUM(c.amount), 0)::DECIMAL * 0.7 as total,
        COALESCE(SUM(CASE WHEN c.astrologer_payout_status = 'pending' THEN c.amount ELSE 0 END), 0)::DECIMAL * 0.7 as pending_payout
    FROM public.consultations c
    WHERE c.astrologer_id = p_astrologer_id
    AND c.status = 'completed';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update astrologer rating from reviews
CREATE OR REPLACE FUNCTION update_astrologer_rating_from_reviews()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.astrologers
    SET rating = (
        SELECT ROUND(AVG(rating)::DECIMAL, 2)
        FROM public.consultation_reviews
        WHERE astrologer_id = NEW.astrologer_id
    ),
    total_reviews = (
        SELECT COUNT(*)
        FROM public.consultation_reviews
        WHERE astrologer_id = NEW.astrologer_id
    )
    WHERE id = NEW.astrologer_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_update_astrologer_rating
    AFTER INSERT OR UPDATE ON public.consultation_reviews
    FOR EACH ROW EXECUTE FUNCTION update_astrologer_rating_from_reviews();

-- ============================================
-- PERMISSIONS
-- ============================================
GRANT ALL ON public.astrologer_onboarding TO authenticated;
GRANT ALL ON public.consultation_reviews TO authenticated;
GRANT ALL ON public.consultation_disputes TO authenticated;
GRANT ALL ON public.horoscope_subscriptions TO authenticated;

-- ============================================
-- REFERRALS
-- ============================================
CREATE TABLE IF NOT EXISTS public.referrals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    referrer_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    referred_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    referral_code VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    reward_amount DECIMAL(12, 2) DEFAULT 100,
    credited_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(referred_id)
);

-- ============================================
-- ASTROLOGER AVAILABILITY
-- ============================================
CREATE TABLE IF NOT EXISTS public.astrologer_availability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    astrologer_id UUID REFERENCES public.astrologers(id) ON DELETE CASCADE NOT NULL,
    day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(astrologer_id, day_of_week)
);

-- ============================================
-- TRIGGERS FOR NEW TABLES
-- ============================================
CREATE TRIGGER update_astrologer_availability_updated_at
    BEFORE UPDATE ON public.astrologer_availability
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- INDEXES FOR NEW TABLES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON public.referrals(status);
CREATE INDEX IF NOT EXISTS idx_astrologer_availability_astrologer ON public.astrologer_availability(astrologer_id);

-- ============================================
-- RLS POLICIES FOR NEW TABLES
-- ============================================
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.astrologer_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own referrals" ON public.referrals FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referred_id);
CREATE POLICY "Public view astrologer availability" ON public.astrologer_availability FOR SELECT USING (true);
CREATE POLICY "Astrologers manage own availability" ON public.astrologer_availability FOR ALL USING (auth.uid() IN (SELECT user_id FROM public.astrologers WHERE id = astrologer_id));

-- ============================================
-- EXTEND HOROSCOPES TABLE FOR TRANSIT-BASED CONTENT
-- ============================================
DO $$ BEGIN
    ALTER TABLE public.horoscopes
        ADD COLUMN IF NOT EXISTS focus_area VARCHAR(20),
        ADD COLUMN IF NOT EXISTS intensity VARCHAR(20),
        ADD COLUMN IF NOT EXISTS transit_data JSONB,
        ADD COLUMN IF NOT EXISTS lucky_number INTEGER;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Update unique constraint for daily horoscopes (period = 'daily')
-- Note: existing UNIQUE(sign, period, date) already covers this

-- ============================================
-- PERMISSIONS FOR NEW TABLES
-- ============================================
GRANT ALL ON public.referrals TO authenticated;
GRANT ALL ON public.astrologer_availability TO authenticated;
