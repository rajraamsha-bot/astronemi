-- 065_content_reports.sql
-- Store-compliance moderation anchor: users can report an astrologer/profile
-- or a consultation message; admins can review and resolve reports.
--
-- Name is content_reports (not reports) to avoid colliding with any legacy
-- manually-created table that was never part of the migration chain.

CREATE TABLE IF NOT EXISTS public.content_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL DEFAULT auth.uid()
    REFERENCES public.users(id) ON DELETE CASCADE,
  reported_astrologer_id UUID
    REFERENCES public.astrologers(id) ON DELETE CASCADE,
  reported_user_id UUID
    REFERENCES public.users(id) ON DELETE CASCADE,
  reported_message_id UUID
    REFERENCES public.chat_messages(id) ON DELETE SET NULL,
  context TEXT NOT NULL DEFAULT 'profile'
    CHECK (context IN ('profile', 'chat', 'review', 'community', 'other')),
  reason TEXT NOT NULL CHECK (char_length(reason) BETWEEN 3 AND 1000),
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'reviewing', 'resolved', 'dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  CHECK (
    reported_astrologer_id IS NOT NULL
    OR reported_user_id IS NOT NULL
    OR reported_message_id IS NOT NULL
  )
);

ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users create own content reports" ON public.content_reports;
CREATE POLICY "Users create own content reports" ON public.content_reports
  FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid());

DROP POLICY IF EXISTS "Users view own content reports" ON public.content_reports;
CREATE POLICY "Users view own content reports" ON public.content_reports
  FOR SELECT TO authenticated
  USING (reporter_id = auth.uid());

DROP POLICY IF EXISTS "Admins view all content reports" ON public.content_reports;
CREATE POLICY "Admins view all content reports" ON public.content_reports
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins update content reports" ON public.content_reports;
CREATE POLICY "Admins update content reports" ON public.content_reports
  FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

REVOKE ALL ON public.content_reports FROM anon, authenticated;
GRANT SELECT, INSERT ON public.content_reports TO authenticated;
GRANT UPDATE ON public.content_reports TO authenticated;

CREATE INDEX IF NOT EXISTS idx_content_reports_status_created
  ON public.content_reports (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_reports_astrologer
  ON public.content_reports (reported_astrologer_id, created_at DESC);

DROP TRIGGER IF EXISTS update_content_reports_updated_at ON public.content_reports;
CREATE TRIGGER update_content_reports_updated_at
  BEFORE UPDATE ON public.content_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
