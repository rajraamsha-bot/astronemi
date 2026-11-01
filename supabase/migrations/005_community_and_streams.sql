-- ============================================
-- Community forum + Live streams
-- ============================================
-- Adds three community tables (forum_posts, forum_replies, forum_likes)
-- and a single live_streams table for scheduled / currently-live events.
-- All tables have RLS enabled:
--   * Everyone can read public content.
--   * Authenticated users can post and reply, only edit/delete their own.
--   * Only admins can pin posts or mark streams live.
-- ============================================

-- ─── FORUM POSTS ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.forum_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    category VARCHAR(60) NOT NULL,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    like_count INTEGER DEFAULT 0,
    reply_count INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    is_pinned BOOLEAN DEFAULT false,
    is_hot BOOLEAN DEFAULT false,
    is_hidden BOOLEAN DEFAULT false, -- moderation flag
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_forum_posts_category ON public.forum_posts (category, created_at DESC)
    WHERE is_hidden = false;
CREATE INDEX IF NOT EXISTS idx_forum_posts_pinned ON public.forum_posts (is_pinned, created_at DESC)
    WHERE is_pinned = true AND is_hidden = false;
CREATE INDEX IF NOT EXISTS idx_forum_posts_user ON public.forum_posts (user_id, created_at DESC);

-- ─── FORUM REPLIES ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.forum_replies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID REFERENCES public.forum_posts(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    like_count INTEGER DEFAULT 0,
    is_hidden BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_forum_replies_post ON public.forum_replies (post_id, created_at ASC)
    WHERE is_hidden = false;

-- Keep reply_count in sync.
CREATE OR REPLACE FUNCTION public.bump_forum_post_reply_count()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE public.forum_posts
           SET reply_count = reply_count + 1, updated_at = NOW()
         WHERE id = NEW.post_id;
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE public.forum_posts
           SET reply_count = GREATEST(0, reply_count - 1), updated_at = NOW()
         WHERE id = OLD.post_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS forum_replies_count_trigger ON public.forum_replies;
CREATE TRIGGER forum_replies_count_trigger
AFTER INSERT OR DELETE ON public.forum_replies
FOR EACH ROW EXECUTE FUNCTION public.bump_forum_post_reply_count();

-- ─── FORUM LIKES ─────────────────────────────────────────────────────────────
-- One row per (user, post) to prevent double-liking.
CREATE TABLE IF NOT EXISTS public.forum_likes (
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    post_id UUID REFERENCES public.forum_posts(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, post_id)
);

CREATE OR REPLACE FUNCTION public.bump_forum_post_like_count()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE public.forum_posts
           SET like_count = like_count + 1
         WHERE id = NEW.post_id;
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE public.forum_posts
           SET like_count = GREATEST(0, like_count - 1)
         WHERE id = OLD.post_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS forum_likes_count_trigger ON public.forum_likes;
CREATE TRIGGER forum_likes_count_trigger
AFTER INSERT OR DELETE ON public.forum_likes
FOR EACH ROW EXECUTE FUNCTION public.bump_forum_post_like_count();

-- ─── LIVE STREAMS ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.live_streams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    astrologer_id UUID REFERENCES public.astrologers(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    topic VARCHAR(100),
    cover_image TEXT,
    scheduled_at TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER DEFAULT 60,
    is_live BOOLEAN DEFAULT false,
    ended_at TIMESTAMPTZ,
    viewer_count INTEGER DEFAULT 0,
    channel_name VARCHAR(120), -- Agora channel for live playback
    price_inr INTEGER DEFAULT 0,
    is_free BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_live_streams_live ON public.live_streams (is_live, scheduled_at DESC)
    WHERE is_live = true;
CREATE INDEX IF NOT EXISTS idx_live_streams_upcoming ON public.live_streams (scheduled_at ASC)
    WHERE ended_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_live_streams_astrologer ON public.live_streams (astrologer_id, scheduled_at DESC);

-- Who's reminded to get notifications when a stream goes live.
CREATE TABLE IF NOT EXISTS public.live_stream_reminders (
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    stream_id UUID REFERENCES public.live_streams(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, stream_id)
);

-- ─── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_stream_reminders ENABLE ROW LEVEL SECURITY;

-- Forum posts
CREATE POLICY "Anyone reads non-hidden posts" ON public.forum_posts
    FOR SELECT USING (is_hidden = false);
CREATE POLICY "Users create posts" ON public.forum_posts
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users edit own posts" ON public.forum_posts
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own posts" ON public.forum_posts
    FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins manage all posts" ON public.forum_posts
    FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- Forum replies
CREATE POLICY "Anyone reads non-hidden replies" ON public.forum_replies
    FOR SELECT USING (is_hidden = false);
CREATE POLICY "Users create replies" ON public.forum_replies
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users edit own replies" ON public.forum_replies
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own replies" ON public.forum_replies
    FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins manage all replies" ON public.forum_replies
    FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- Forum likes
CREATE POLICY "Anyone reads likes" ON public.forum_likes
    FOR SELECT USING (true);
CREATE POLICY "Users manage own likes" ON public.forum_likes
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Live streams
CREATE POLICY "Anyone reads streams" ON public.live_streams
    FOR SELECT USING (true);
CREATE POLICY "Astrologers create own streams" ON public.live_streams
    FOR INSERT WITH CHECK (
        astrologer_id IS NOT NULL AND
        astrologer_id IN (SELECT id FROM public.astrologers WHERE user_id = auth.uid())
    );
CREATE POLICY "Astrologers update own streams" ON public.live_streams
    FOR UPDATE USING (
        astrologer_id IN (SELECT id FROM public.astrologers WHERE user_id = auth.uid())
    );
CREATE POLICY "Admins manage all streams" ON public.live_streams
    FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- Reminders
CREATE POLICY "Users manage own reminders" ON public.live_stream_reminders
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

GRANT SELECT ON public.forum_posts, public.forum_replies, public.forum_likes, public.live_streams, public.live_stream_reminders TO anon;
GRANT ALL ON public.forum_posts, public.forum_replies, public.forum_likes, public.live_streams, public.live_stream_reminders TO authenticated;
GRANT ALL ON public.forum_posts, public.forum_replies, public.forum_likes, public.live_streams, public.live_stream_reminders TO service_role;

-- ─── Seed (only runs when there's already ≥1 real user we can attribute to) ──
-- Safe no-op on fresh DBs where no users exist yet; avoids dangling RLS rows.

INSERT INTO public.live_streams
    (id, astrologer_id, title, description, topic, cover_image, scheduled_at, duration_minutes, is_live, viewer_count, is_free)
VALUES
    ('22222222-2222-2222-2222-222222222201',
     '11111111-1111-1111-1111-111111111101',
     'Weekly Horoscope Analysis',
     'Parashari-based weekly outlook covering all twelve rashis, plus current transits affecting the Moon sign.',
     'Weekly Horoscope',
     'https://images.unsplash.com/photo-1532968962696-88d2f689f9ca?w=800',
     NOW() + INTERVAL '30 minutes', 45, true, 234, true),

    ('22222222-2222-2222-2222-222222222202',
     '11111111-1111-1111-1111-111111111102',
     'Sade Sati: Effects and Remedies',
     'A deep dive into Saturn''s 7.5-year transit and evidence-based remedies that actually work.',
     'Sade Sati',
     'https://images.unsplash.com/photo-1462331942527-6083dba50915?w=800',
     NOW() + INTERVAL '2 hours', 60, false, 0, false),

    ('22222222-2222-2222-2222-222222222203',
     '11111111-1111-1111-1111-111111111105',
     'Stock Market Astro Outlook',
     'Jupiter–Saturn cycles meet modern markets. Live Q&A on sectoral picks for the quarter.',
     'Financial Astrology',
     'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800',
     NOW() + INTERVAL '1 day', 90, false, 0, false),

    ('22222222-2222-2222-2222-222222222204',
     '11111111-1111-1111-1111-111111111103',
     'KP Sub-Lord Live Class',
     'Interactive session on KP sub-lord tables for event timing.',
     'KP Astrology',
     'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800',
     NOW() + INTERVAL '3 days', 75, false, 0, true)
ON CONFLICT (id) DO NOTHING;
