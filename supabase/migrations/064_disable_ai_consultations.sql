-- 064_disable_ai_consultations.sql
-- v1 launch: AI code stays in the repository, but an AI astrologer that has
-- been taken offline (is_available = false) must not receive new
-- consultations. Production runs scripts/disable-ai-production.sql after
-- migrations to take the AI row offline; dev/staging leave it online so the
-- AI features can still be tested.
--
-- This trigger is defense-in-depth: the client also hides AI astrologers and
-- the AI routes redirect home, but a crafted direct RPC/table call must not
-- create a billable AI session.

CREATE OR REPLACE FUNCTION public.block_offline_ai_consultation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_ai BOOLEAN;
  v_is_available BOOLEAN;
BEGIN
  -- Cancellations/completions must always be allowed, otherwise the
  -- production cleanup could not close existing AI sessions.
  IF NEW.status NOT IN ('pending', 'active') THEN
    RETURN NEW;
  END IF;

  IF NEW.astrologer_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT is_ai, COALESCE(is_available, false)
    INTO v_is_ai, v_is_available
  FROM public.astrologers
  WHERE id = NEW.astrologer_id;

  IF COALESCE(v_is_ai, false) AND NOT COALESCE(v_is_available, false) THEN
    RAISE EXCEPTION 'AI consultations are disabled';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_block_offline_ai_consultation ON public.consultations;
CREATE TRIGGER trg_block_offline_ai_consultation
  BEFORE INSERT OR UPDATE OF status ON public.consultations
  FOR EACH ROW
  EXECUTE FUNCTION public.block_offline_ai_consultation();

REVOKE ALL ON FUNCTION public.block_offline_ai_consultation() FROM PUBLIC, anon, authenticated;
