-- Migration 018: Push tokens table and additional indexes
--
-- BACKFILLED from a never-deployed migration that lived under
-- backend/database/migrations/ (CI deploys only from supabase/migrations/).
-- That legacy tree has since been removed; this file is the only copy.
-- Run after 017_enforce_user_flag_protection.sql.

-- Push notification tokens
CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform VARCHAR(20) NOT NULL DEFAULT 'expo', -- 'expo', 'fcm', 'apns'
  device_id VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, token)
);

-- Enable RLS
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

-- RLS policies for push_tokens
CREATE POLICY "Users can view own push tokens" ON push_tokens
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own push tokens" ON push_tokens
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own push tokens" ON push_tokens
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own push tokens" ON push_tokens
  FOR DELETE USING (auth.uid() = user_id);

-- Index for push token lookups
CREATE INDEX idx_push_tokens_user_id ON push_tokens(user_id);
CREATE INDEX idx_push_tokens_active ON push_tokens(is_active) WHERE is_active = true;

-- Updated_at trigger for push_tokens
CREATE TRIGGER update_push_tokens_updated_at BEFORE UPDATE ON push_tokens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Additional performance indexes for existing tables
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
-- FIX: subscriptions no longer has a `status` column (the table was rebuilt
-- to the client shape in 001b — plan_id/plan_name/.../payment_status). The
-- index now targets the payment_status column so this statement applies on a
-- fresh database instead of failing with "column status does not exist".
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(payment_status);
CREATE INDEX IF NOT EXISTS idx_consultations_status ON consultations(status);
CREATE INDEX IF NOT EXISTS idx_chat_messages_is_read ON chat_messages(is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_type ON wallet_transactions(type);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created_at ON wallet_transactions(created_at DESC);

-- RLS policy for subscriptions
CREATE POLICY "Users can view own subscriptions" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- FIX: user_sessions / user_events are not created by any migration in this
-- chain, so a fresh `supabase db push` failed at these two CREATE POLICY
-- statements (policies are validated at creation and the tables do not
-- exist). Guard both with an existence check; if the tables are ever added,
-- their owning migration should re-create the policies.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_sessions') THEN
    EXECUTE 'CREATE POLICY "Users can view own sessions" ON user_sessions FOR SELECT USING (auth.uid() = user_id)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_events') THEN
    EXECUTE 'CREATE POLICY "Users can view own events" ON user_events FOR SELECT USING (auth.uid() = user_id)';
  END IF;
END $$;
