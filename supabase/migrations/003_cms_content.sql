-- ============================================
-- AstroFusion CMS content table
-- ============================================
-- Single table backing blog, news, videos, podcasts, courses, meditations,
-- mantras. Per-kind fields live in `metadata` (JSONB) so we don't fragment
-- the schema. Row Level Security: published rows are world-readable; only
-- admins can insert / update / delete.
-- ============================================

CREATE TABLE IF NOT EXISTS public.cms_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    kind VARCHAR(20) NOT NULL CHECK (
        kind IN ('blog', 'news', 'video', 'podcast', 'course', 'meditation', 'mantra')
    ),
    slug VARCHAR(140) UNIQUE NOT NULL,

    title VARCHAR(200) NOT NULL,
    summary TEXT,
    body TEXT,

    image_url TEXT,
    media_url TEXT, -- audio/video source (YouTube, MP3, HLS, etc.)

    author_name VARCHAR(120),
    author_avatar TEXT,
    channel_name VARCHAR(120),   -- videos
    host_name VARCHAR(120),      -- podcasts
    instructor_name VARCHAR(120),-- courses

    category VARCHAR(60),
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    level VARCHAR(20),           -- Beginner / Intermediate / Advanced

    duration_seconds INTEGER,
    lessons_count INTEGER,
    episode_number INTEGER,

    price_inr INTEGER DEFAULT 0,
    is_premium BOOLEAN DEFAULT false,

    view_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    student_count INTEGER DEFAULT 0,

    rating NUMERIC(3, 2),
    metadata JSONB DEFAULT '{}'::jsonb,

    is_published BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    is_trending BOOLEAN DEFAULT false,

    published_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cms_entries_kind_published
    ON public.cms_entries (kind, is_published, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_cms_entries_category
    ON public.cms_entries (kind, category);
CREATE INDEX IF NOT EXISTS idx_cms_entries_featured
    ON public.cms_entries (is_featured) WHERE is_featured = true;

-- ─── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE public.cms_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read published CMS entries"
    ON public.cms_entries FOR SELECT
    USING (is_published = true);

-- Assumes an `is_admin(uuid)` function exists (added in 002_new_business_tables).
-- If it doesn't exist in a given environment, admins can still manage rows
-- via the Supabase dashboard / service-role key.
DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_proc WHERE proname = 'is_admin'
    ) THEN
        EXECUTE $policies$
            CREATE POLICY "Admins manage CMS entries"
                ON public.cms_entries FOR ALL
                USING (is_admin(auth.uid()))
                WITH CHECK (is_admin(auth.uid()));
        $policies$;
    END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

GRANT SELECT ON public.cms_entries TO anon, authenticated;
GRANT ALL ON public.cms_entries TO service_role;

-- ─── Seed data ───────────────────────────────────────────────────────────────
-- Minimal published content so the app feels alive on fresh installs.
-- Replace / extend through the admin dashboard or direct SQL.

INSERT INTO public.cms_entries
    (kind, slug, title, summary, image_url, media_url, author_name, author_avatar, channel_name, host_name, instructor_name,
     category, level, duration_seconds, lessons_count, episode_number, price_inr, is_premium, is_trending,
     view_count, like_count, student_count, rating, metadata)
VALUES
-- ─── BLOG ─────────────────────────────────────────────────────────────────────
('blog', 'understanding-your-birth-chart', 'Understanding Your Birth Chart: A Complete Guide',
 'How the 12 houses, nine grahas, and nakshatras combine to describe every area of your life.',
 'https://images.unsplash.com/photo-1532968969614-9d7dcf2cd4a0?w=800',
 NULL, 'Pt. Rajesh Kumar', NULL, NULL, NULL, NULL,
 'Kundli', NULL, 480, NULL, NULL, 0, false, false,
 0, 0, 0, NULL, '{}'::jsonb),

('blog', 'sade-sati-myths-vs-reality', 'Sade Sati: Myths vs Reality',
 'A grounded look at Saturn''s 7.5-year transit and why most of its reputation is overblown.',
 'https://images.unsplash.com/photo-1419242905603-8f5e8a8a3b9f?w=800',
 NULL, 'Dr. Anita Sharma', NULL, NULL, NULL, NULL,
 'Transit', NULL, 360, NULL, NULL, 0, false, true,
 0, 0, 0, NULL, '{}'::jsonb),

('blog', 'gemstones-in-vedic-astrology', 'The Power of Gemstones in Vedic Astrology',
 'Which stones actually strengthen benefic planets, and the filters that should stop you from wearing the wrong one.',
 'https://images.unsplash.com/photo-1551751299-1b1ada0e7e23?w=800',
 NULL, 'Gem Expert Vikram', NULL, NULL, NULL, NULL,
 'Remedies', NULL, 300, NULL, NULL, 0, false, false,
 0, 0, 0, NULL, '{}'::jsonb),

('blog', 'kundli-matching-beyond-gun-milan', 'Kundli Matching: Beyond Gun Milan',
 'Why the 36-point Guna score is only the opening chapter of real compatibility analysis.',
 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800',
 NULL, 'Pt. Sanjay Joshi', NULL, NULL, NULL, NULL,
 'Matching', NULL, 600, NULL, NULL, 0, false, false,
 0, 0, 0, NULL, '{}'::jsonb),

-- ─── NEWS ─────────────────────────────────────────────────────────────────────
('news', 'saturn-transit-2026', 'Saturn''s 2026 Transit and What It Means for Each Sign',
 'Saturn shifts sign mid-year. Here''s a clear, sign-by-sign take on where you''ll feel the pressure.',
 'https://images.unsplash.com/photo-1532968962696-88d2f689f9ca?w=800',
 NULL, 'Dr. Ramesh Sharma', NULL, NULL, NULL, NULL,
 'Transit', NULL, 300, NULL, NULL, 0, false, true,
 0, 0, 0, NULL, '{}'::jsonb),

('news', 'jupiter-rahu-conjunction', 'Jupiter-Rahu Conjunction: What to Expect',
 'The rare Guru-Chandal Yoga returns. Opportunities and confusion arrive together.',
 'https://images.unsplash.com/photo-1462331942527-6083dba50915?w=800',
 NULL, 'Pt. Anand Kumar', NULL, NULL, NULL, NULL,
 'Planetary', NULL, 420, NULL, NULL, 0, false, true,
 0, 0, 0, NULL, '{}'::jsonb),

('news', 'makar-sankranti-2026', 'Makar Sankranti 2026: Auspicious Timings',
 'Sun enters Capricorn. Muhurta windows, rituals, and the astrological significance of the day.',
 'https://images.unsplash.com/photo-1604608670478-5e3c8b6c3b3e?w=800',
 NULL, 'Sunita Devi', NULL, NULL, NULL, NULL,
 'Festival', NULL, 240, NULL, NULL, 0, false, false,
 0, 0, 0, NULL, '{}'::jsonb),

-- ─── VIDEOS ───────────────────────────────────────────────────────────────────
('video', 'birth-chart-complete-guide', 'Understanding Your Birth Chart — Complete Guide',
 'An end-to-end walkthrough from ascendant to dasha.',
 'https://images.unsplash.com/photo-1532968962696-88d2f689f9ca?w=800',
 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
 NULL, 'https://randomuser.me/api/portraits/men/32.jpg',
 'AstroGuru', NULL, NULL,
 'Education', NULL, 2730, NULL, NULL, 0, false, false,
 125000, 8500, 0, NULL, '{}'::jsonb),

('video', 'saturn-transit-2026-all-signs', 'Saturn Transit 2026 — Impact on All Signs',
 'Sign-by-sign Sade Sati and Dhaiya analysis with remedies.',
 'https://images.unsplash.com/photo-1462331942527-6083dba50915?w=800',
 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
 NULL, 'https://randomuser.me/api/portraits/women/44.jpg',
 'Vedic Wisdom', NULL, NULL,
 'Transit', NULL, 1935, NULL, NULL, 0, false, true,
 89000, 6200, 0, NULL, '{}'::jsonb),

('video', 'daily-horoscope-january', 'Daily Horoscope Reading — January',
 'Day-by-day predictions for every moon sign.',
 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800',
 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
 NULL, 'https://randomuser.me/api/portraits/men/67.jpg',
 'Daily Stars', NULL, NULL,
 'Horoscope', NULL, 1125, NULL, NULL, 0, false, false,
 45000, 3100, 0, NULL, '{}'::jsonb),

-- ─── PODCASTS ─────────────────────────────────────────────────────────────────
('podcast', 'daily-planetary-movements-145', 'Daily Planetary Movements — Episode 145',
 'Today''s planetary positions and what they mean for your week.',
 'https://images.unsplash.com/photo-1532968962696-88d2f689f9ca?w=800',
 NULL, NULL, NULL, NULL, 'Pt. Ramesh Sharma', NULL,
 'Daily', NULL, 1530, NULL, 145, 0, false, false,
 0, 1200, 0, NULL, '{}'::jsonb),

('podcast', 'vedic-astrology-deep-dive-89', 'Vedic Astrology Deep Dive — Episode 89',
 'A long-form conversation on Parashari vs Jaimini interpretation.',
 'https://images.unsplash.com/photo-1462331942527-6083dba50915?w=800',
 NULL, NULL, NULL, NULL, 'Dr. Priya Menon', NULL,
 'Education', NULL, 2700, NULL, 89, 0, false, false,
 0, 890, 0, NULL, '{}'::jsonb),

('podcast', 'love-and-relationships-67', 'Love and Relationships — Episode 67',
 'Using synastry and the 7th house to understand compatibility.',
 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800',
 NULL, NULL, NULL, NULL, 'Sunita Devi', NULL,
 'Relationships', NULL, 1935, NULL, 67, 0, false, false,
 0, 1450, 0, NULL, '{}'::jsonb),

-- ─── COURSES ─────────────────────────────────────────────────────────────────
('course', 'vedic-fundamentals', 'Vedic Astrology Fundamentals',
 'Planets, signs, houses, and nakshatras — the groundwork every learner needs.',
 'https://images.unsplash.com/photo-1532968962696-88d2f689f9ca?w=800',
 NULL, NULL, NULL, NULL, NULL, 'Pt. Ramesh Sharma',
 'Beginner', 'Beginner', 43200, 24, NULL, 0, false, false,
 0, 0, 2345, 4.8, '{}'::jsonb),

('course', 'birth-chart-interpretation', 'Birth Chart Interpretation',
 'Go from blank chart to detailed life reading in 36 structured lessons.',
 'https://images.unsplash.com/photo-1462331942527-6083dba50915?w=800',
 NULL, NULL, NULL, NULL, NULL, 'Dr. Priya Menon',
 'Intermediate', 'Intermediate', 72000, 36, NULL, 999, true, false,
 0, 0, 1567, 4.9, '{}'::jsonb),

('course', 'kp-astrology-mastery', 'KP Astrology Mastery',
 'Sub-lord theory, cuspal interlinks, and event timing the KP way.',
 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800',
 NULL, NULL, NULL, NULL, NULL, 'Prof. Anand Kumar',
 'Advanced', 'Advanced', 54000, 28, NULL, 1499, true, false,
 0, 0, 987, 4.7, '{}'::jsonb),

-- ─── MEDITATIONS ─────────────────────────────────────────────────────────────
('meditation', 'morning-sun-meditation', 'Morning Sun Meditation',
 'Start your day aligned with solar energy.',
 'https://images.unsplash.com/photo-1506905925346-21bda4c6d1a8?w=800',
 NULL, NULL, NULL, NULL, NULL, NULL,
 'Morning', 'Beginner', 900, NULL, NULL, 0, false, false,
 0, 0, 0, NULL, '{}'::jsonb),

('meditation', 'moon-phase-alignment', 'Moon Phase Alignment',
 'A guided session that tracks the current tithi.',
 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=800',
 NULL, NULL, NULL, NULL, NULL, NULL,
 'Night', 'Intermediate', 1200, NULL, NULL, 0, false, false,
 0, 0, 0, NULL, '{}'::jsonb),

('meditation', 'planetary-healing', 'Planetary Healing',
 'Work with the nine grahas to release the tightest placements in your chart.',
 'https://images.unsplash.com/photo-1462331942527-6083dba50915?w=800',
 NULL, NULL, NULL, NULL, NULL, NULL,
 'Healing', 'Advanced', 1800, NULL, NULL, 0, false, false,
 0, 0, 0, NULL, '{}'::jsonb),

-- ─── MANTRAS ─────────────────────────────────────────────────────────────────
('mantra', 'gayatri-mantra', 'Gayatri Mantra',
 'From the Rig Veda — the most universally recommended mantra for clarity and protection.',
 'https://images.unsplash.com/photo-1545459720-aac8509eb02c?w=800',
 NULL, NULL, NULL, NULL, NULL, NULL,
 'Spiritual', NULL, 630, NULL, NULL, 0, false, false,
 0, 0, 0, NULL,
 jsonb_build_object(
   'sanskrit', E'\u0913\u0902 \u092D\u0942\u0930\u094D\u092D\u0941\u0935\u0903 \u0938\u094D\u0935\u0903 \u0924\u0924\u094D\u0938\u0935\u093F\u0924\u0941\u0930\u094D\u0935\u0930\u0947\u0923\u094D\u092F\u0902...',
   'benefits', ARRAY['Clarity', 'Mental discipline', 'Protection from negativity']
 )),

('mantra', 'mahamrityunjaya-mantra', 'Mahamrityunjaya Mantra',
 'Shiva''s great mantra for healing and resilience in difficult planetary periods.',
 'https://images.unsplash.com/photo-1609766857041-ed402ea8069a?w=800',
 NULL, NULL, NULL, NULL, NULL, NULL,
 'Health', NULL, 900, NULL, NULL, 0, false, false,
 0, 0, 0, NULL,
 jsonb_build_object(
   'sanskrit', E'\u0913\u0902 \u0924\u094D\u0930\u094D\u092F\u092E\u094D\u092C\u0915\u0902 \u092F\u091C\u093E\u092E\u0939\u0947 \u0938\u0941\u0917\u0928\u094D\u0927\u093F\u0902...',
   'benefits', ARRAY['Healing', 'Longevity', 'Courage']
 )),

('mantra', 'om-namah-shivaya', 'Om Namah Shivaya',
 'Five-syllable mantra for meditative focus and removal of obstacles.',
 'https://images.unsplash.com/photo-1567591370504-80a7d8e4ae8d?w=800',
 NULL, NULL, NULL, NULL, NULL, NULL,
 'Meditation', NULL, 1200, NULL, NULL, 0, false, false,
 0, 0, 0, NULL,
 jsonb_build_object(
   'sanskrit', E'\u0913\u0902 \u0928\u092E\u0903 \u0936\u093F\u0935\u093E\u092F',
   'benefits', ARRAY['Inner peace', 'Focus', 'Removal of obstacles']
 ))
ON CONFLICT (slug) DO NOTHING;
