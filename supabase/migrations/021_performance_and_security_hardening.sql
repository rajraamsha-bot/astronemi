-- Migration 021: Performance and security hardening

-- 1. Add missing indexes for foreign keys and RLS performance
CREATE INDEX IF NOT EXISTS idx_horoscope_subscriptions_user_id ON public.horoscope_subscriptions(user_id);

-- 2. Add check constraints to text columns to prevent storage bloat
ALTER TABLE public.consultations 
  ADD CONSTRAINT chk_consultation_user_review_length CHECK (user_review IS NULL OR char_length(user_review) <= 1000);

ALTER TABLE public.consultation_reviews 
  ADD CONSTRAINT chk_consultation_review_text_length CHECK (review IS NULL OR char_length(review) <= 1000);

ALTER TABLE public.forum_posts 
  ADD CONSTRAINT chk_forum_post_content_length CHECK (content IS NULL OR char_length(content) <= 10000);

ALTER TABLE public.forum_replies 
  ADD CONSTRAINT chk_forum_reply_content_length CHECK (content IS NULL OR char_length(content) <= 5000);

ALTER TABLE public.dream_entries 
  ADD CONSTRAINT chk_dream_entry_description_length CHECK (description IS NULL OR char_length(description) <= 4000);
