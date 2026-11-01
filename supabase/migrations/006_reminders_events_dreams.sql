-- ============================================
-- User reminders, astro events calendar, dream entries
-- ============================================
-- Three feature-specific tables with strict RLS. Reminders and dream
-- entries are per-user (hidden from everyone else). Events are a public
-- read-only calendar that admins maintain.
-- ============================================

-- ─── USER REMINDERS ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_reminders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    title VARCHAR(120) NOT NULL,
    category VARCHAR(40) NOT NULL DEFAULT 'custom',
    -- 'daily' | 'weekly' | 'monthly' | 'once'
    repeat_kind VARCHAR(16) NOT NULL DEFAULT 'daily',
    -- Local HH:MM in the user's timezone; stored as text so we don't lose minutes to UTC conversion.
    local_time VARCHAR(5) NOT NULL DEFAULT '08:00',
    -- Weekday abbreviations ("Mon","Tue",...) or month-days ("1","15") depending on repeat_kind.
    days TEXT[] DEFAULT ARRAY[]::TEXT[],
    sound_enabled BOOLEAN DEFAULT true,
    vibration_enabled BOOLEAN DEFAULT true,
    enabled BOOLEAN DEFAULT true,
    -- expo-notifications identifier so we can cancel / reschedule the local trigger.
    local_notification_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_reminders_user ON public.user_reminders (user_id, created_at DESC);

-- ─── ASTRO EVENTS ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.astro_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(120) UNIQUE NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    -- 'transit' | 'festival' | 'eclipse' | 'retrograde' | 'workshop'
    kind VARCHAR(20) NOT NULL,
    occurs_at TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER,
    location VARCHAR(120),
    image_url TEXT,
    expected_participants INTEGER DEFAULT 0,
    is_published BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_astro_events_kind ON public.astro_events (kind, occurs_at ASC);
CREATE INDEX IF NOT EXISTS idx_astro_events_time ON public.astro_events (occurs_at ASC)
    WHERE is_published = true;

-- Users bookmark events they care about.
CREATE TABLE IF NOT EXISTS public.astro_event_bookmarks (
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    event_id UUID REFERENCES public.astro_events(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, event_id)
);

-- ─── DREAM ENTRIES ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.dream_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    description TEXT NOT NULL,
    -- Full structured interpretation from the AI (symbols, meanings, guidance, etc.)
    interpretation JSONB,
    mood VARCHAR(40),
    is_private BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dream_entries_user ON public.dream_entries (user_id, created_at DESC);

-- ─── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.user_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.astro_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.astro_event_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dream_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own reminders" ON public.user_reminders
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone reads published events" ON public.astro_events
    FOR SELECT USING (is_published = true);
CREATE POLICY "Admins manage events" ON public.astro_events
    FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Users manage own bookmarks" ON public.astro_event_bookmarks
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own dreams" ON public.dream_entries
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

GRANT SELECT ON public.astro_events TO anon, authenticated;
GRANT ALL ON public.user_reminders, public.astro_event_bookmarks, public.dream_entries TO authenticated;
GRANT ALL ON public.user_reminders, public.astro_events, public.astro_event_bookmarks, public.dream_entries TO service_role;

-- ─── Seed: a handful of upcoming astro events ────────────────────────────────
INSERT INTO public.astro_events
    (id, slug, title, description, kind, occurs_at, duration_minutes, location, image_url, expected_participants, is_published)
VALUES
    ('33333333-3333-3333-3333-333333333301', 'jupiter-enters-gemini-2026',
     'Jupiter enters Gemini',
     'Major planetary transit: Jupiter moves into Gemini. Significant for Sagittarius and Pisces moon signs. Expect shifts in learning, communication, and relationships.',
     'transit',
     '2026-03-15 10:30:00+00', 1440, 'Global',
     'https://images.unsplash.com/photo-1532968962696-88d2f689f9ca?w=800', 1250, true),

    ('33333333-3333-3333-3333-333333333302', 'total-solar-eclipse-2026-08',
     'Total Solar Eclipse',
     'Total solar eclipse visible from Spain, Iceland, and Greenland. Effects felt globally on natal charts. Avoid new undertakings within 12 hours either side.',
     'eclipse',
     '2026-08-12 18:00:00+00', 180, 'Visible: Europe & N. Atlantic',
     'https://images.unsplash.com/photo-1462331942527-6083dba50915?w=800', 450, true),

    ('33333333-3333-3333-3333-333333333303', 'mercury-retrograde-2026-04',
     'Mercury Retrograde begins',
     'Mercury goes retrograde in Aries. Communication, travel, and technology disruptions are common. Re-check contracts before signing.',
     'retrograde',
     '2026-04-01 00:00:00+00', 21600, 'Global',
     'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800', 0, true),

    ('33333333-3333-3333-3333-333333333304', 'chaitra-navratri-2026',
     'Chaitra Navratri begins',
     'Nine nights of Goddess Durga worship. Chaitra Navratri begins March 19; Ram Navami falls on March 26.',
     'festival',
     '2026-03-19 06:00:00+00', 12960, 'Temples nationwide',
     'https://images.unsplash.com/photo-1604608670478-5e3c8b6c3b3e?w=800', 0, true),

    ('33333333-3333-3333-3333-333333333305', 'sharad-navratri-2026',
     'Sharad Navratri begins',
     'The grand Sharad Navratri begins October 11, culminating with Dussehra / Vijayadashami on October 20.',
     'festival',
     '2026-10-11 06:00:00+00', 14400, 'Temples nationwide',
     'https://images.unsplash.com/photo-1604608670478-5e3c8b6c3b3e?w=800', 0, true),

    ('33333333-3333-3333-3333-333333333306', 'kp-astrology-workshop-apr-2026',
     'KP Astrology Workshop',
     'Hands-on session on Krishnamurti Paddhati: sub-lords, cuspal interlinks, and event timing with our expert astrologers.',
     'workshop',
     '2026-04-20 15:00:00+00', 180, 'Online (Zoom)',
     'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800', 75, true)
ON CONFLICT (id) DO NOTHING;
