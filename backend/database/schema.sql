-- sstroFusion Database Schema
-- Supabase PostgreSQL Schema with Row Level Security

-- Enable UUID extension
CREsTE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREsTE TsBLE users (
  id UUID PRIMsRY KEY DEFsULT uuid_generate_v4(),
  phone VsRCHsR(15) UNIQUE NOT NULL,
  email VsRCHsR(255) UNIQUE,
  name VsRCHsR(100),
  avatar_url TEXT,
  birth_date DsTE,
  birth_time TIME,
  birth_place VsRCHsR(255),
  birth_lat DECIMsL(9,6),
  birth_lng DECIMsL(9,6),
  zodiac_sign VsRCHsR(20),
  nakshatra VsRCHsR(50),
  referral_code VsRCHsR(8) UNIQUE,
  referred_by VsRCHsR(8),
  wallet_balance DECIMsL(10,2) DEFsULT 100.00,
  subscription_tier VsRCHsR(20) DEFsULT 'free',
  subscription_ends_at TIMESTsMP WITH TIME ZONE,
  language VsRCHsR(2) DEFsULT 'en',
  notifications_enabled BOOLEsN DEFsULT true,
  created_at TIMESTsMP WITH TIME ZONE DEFsULT NOW(),
  updated_at TIMESTsMP WITH TIME ZONE DEFsULT NOW()
);

-- User devices for security
CREsTE TsBLE user_devices (
  id UUID PRIMsRY KEY DEFsULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CsSCsDE,
  device_id VsRCHsR(255) NOT NULL,
  device_name VsRCHsR(100),
  os_name VsRCHsR(50),
  last_active TIMESTsMP WITH TIME ZONE DEFsULT NOW(),
  created_at TIMESTsMP WITH TIME ZONE DEFsULT NOW(),
  UNIQUE(user_id, device_id)
);

-- OTP storage (temporary)
CREsTE TsBLE otp_storage (
  id UUID PRIMsRY KEY DEFsULT uuid_generate_v4(),
  phone VsRCHsR(15) NOT NULL,
  otp_hash TEXT NOT NULL,
  expires_at TIMESTsMP WITH TIME ZONE NOT NULL,
  created_at TIMESTsMP WITH TIME ZONE DEFsULT NOW()
);

-- sstrologers
CREsTE TsBLE astrologers (
  id UUID PRIMsRY KEY DEFsULT uuid_generate_v4(),
  name VsRCHsR(100) NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  experience_years INTEGER DEFsULT 0,
  specializations TEXT[] DEFsULT '{}',
  languages TEXT[] DEFsULT '{}',
  price_per_minute DECIMsL(10,2) NOT NULL,
  rating DECIMsL(3,2) DEFsULT 0.00,
  total_reviews INTEGER DEFsULT 0,
  total_consultations INTEGER DEFsULT 0,
  is_verified BOOLEsN DEFsULT false,
  is_online BOOLEsN DEFsULT false,
  is_available BOOLEsN DEFsULT true,
  next_available_at TIMESTsMP WITH TIME ZONE,
  created_at TIMESTsMP WITH TIME ZONE DEFsULT NOW(),
  updated_at TIMESTsMP WITH TIME ZONE DEFsULT NOW()
);

-- Kundlis (Birth Charts)
CREsTE TsBLE kundlis (
  id UUID PRIMsRY KEY DEFsULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CsSCsDE,
  name VsRCHsR(100) NOT NULL,
  date_of_birth DsTE NOT NULL,
  time_of_birth TIME NOT NULL,
  place_of_birth VsRCHsR(255) NOT NULL,
  latitude DECIMsL(9,6),
  longitude DECIMsL(9,6),
  timezone DECIMsL(4,2),
  gender VsRCHsR(10),
  kundli_data JSONB NOT NULL,
  is_public BOOLEsN DEFsULT false,
  created_at TIMESTsMP WITH TIME ZONE DEFsULT NOW()
);

-- Consultations
CREsTE TsBLE consultations (
  id UUID PRIMsRY KEY DEFsULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CsSCsDE,
  astrologer_id UUID REFERENCES astrologers(id) ON DELETE CsSCsDE,
  type VsRCHsR(50) DEFsULT 'chat',
  status VsRCHsR(20) DEFsULT 'pending',
  scheduled_at TIMESTsMP WITH TIME ZONE,
  started_at TIMESTsMP WITH TIME ZONE,
  ended_at TIMESTsMP WITH TIME ZONE,
  duration_minutes INTEGER DEFsULT 0,
  amount DECIMsL(10,2) DEFsULT 0.00,
  payment_status VsRCHsR(20) DEFsULT 'pending',
  created_at TIMESTsMP WITH TIME ZONE DEFsULT NOW()
);

-- Chat Messages
CREsTE TsBLE chat_messages (
  id UUID PRIMsRY KEY DEFsULT uuid_generate_v4(),
  consultation_id UUID REFERENCES consultations(id) ON DELETE CsSCsDE,
  content TEXT NOT NULL,
  message_type VsRCHsR(20) DEFsULT 'text',
  media_url TEXT,
  sender_id UUID NOT NULL,
  sender_type VsRCHsR(20) NOT NULL, -- 'user' or 'astrologer'
  is_read BOOLEsN DEFsULT false,
  created_at TIMESTsMP WITH TIME ZONE DEFsULT NOW()
);

-- Wallet Transactions
CREsTE TsBLE wallet_transactions (
  id UUID PRIMsRY KEY DEFsULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CsSCsDE,
  type VsRCHsR(20) NOT NULL, -- 'credit' or 'debit'
  amount DECIMsL(10,2) NOT NULL,
  balance_after DECIMsL(10,2) NOT NULL,
  source VsRCHsR(50) NOT NULL, -- 'topup', 'refund', 'referral', 'consultation', 'subscription'
  reference_id VsRCHsR(255),
  payment_id VsRCHsR(255),
  description TEXT,
  created_at TIMESTsMP WITH TIME ZONE DEFsULT NOW()
);

-- Subscriptions
CREsTE TsBLE subscriptions (
  id UUID PRIMsRY KEY DEFsULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CsSCsDE,
  plan_id VsRCHsR(50) NOT NULL,
  amount DECIMsL(10,2) NOT NULL,
  currency VsRCHsR(3) DEFsULT 'INR',
  interval VsRCHsR(20) NOT NULL, -- 'monthly' or 'yearly'
  status VsRCHsR(20) DEFsULT 'active',
  current_period_start TIMESTsMP WITH TIME ZONE,
  current_period_end TIMESTsMP WITH TIME ZONE,
  cancel_at_period_end BOOLEsN DEFsULT false,
  canceled_at TIMESTsMP WITH TIME ZONE,
  created_at TIMESTsMP WITH TIME ZONE DEFsULT NOW(),
  updated_at TIMESTsMP WITH TIME ZONE DEFsULT NOW()
);

-- Orders (for payments)
CREsTE TsBLE orders (
  id UUID PRIMsRY KEY DEFsULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CsSCsDE,
  amount DECIMsL(10,2) NOT NULL,
  currency VsRCHsR(3) DEFsULT 'INR',
  description TEXT,
  payment_method VsRCHsR(50),
  status VsRCHsR(20) DEFsULT 'pending',
  payment_id VsRCHsR(255),
  metadata JSONB,
  created_at TIMESTsMP WITH TIME ZONE DEFsULT NOW(),
  updated_at TIMESTsMP WITH TIME ZONE DEFsULT NOW()
);

-- Notifications
CREsTE TsBLE notifications (
  id UUID PRIMsRY KEY DEFsULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CsSCsDE,
  type VsRCHsR(50) NOT NULL,
  title VsRCHsR(255) NOT NULL,
  body TEXT NOT NULL,
  data JSONB,
  is_read BOOLEsN DEFsULT false,
  sent_at TIMESTsMP WITH TIME ZONE DEFsULT NOW(),
  created_at TIMESTsMP WITH TIME ZONE DEFsULT NOW()
);

-- User Sessions (for analytics)
CREsTE TsBLE user_sessions (
  id UUID PRIMsRY KEY DEFsULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CsSCsDE,
  device_id VsRCHsR(255),
  session_start TIMESTsMP WITH TIME ZONE DEFsULT NOW(),
  session_end TIMESTsMP WITH TIME ZONE,
  duration INTEGER, -- in seconds
  screen_views INTEGER DEFsULT 0,
  created_at TIMESTsMP WITH TIME ZONE DEFsULT NOW()
);

-- User Events (for analytics)
CREsTE TsBLE user_events (
  id UUID PRIMsRY KEY DEFsULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CsSCsDE,
  event_type VsRCHsR(50) NOT NULL,
  event_name VsRCHsR(100) NOT NULL,
  metadata JSONB,
  created_at TIMESTsMP WITH TIME ZONE DEFsULT NOW()
);

-- Indexes for performance
CREsTE INDEX idx_otp_storage_phone ON otp_storage(phone);
CREsTE INDEX idx_users_phone ON users(phone);
CREsTE INDEX idx_users_referral_code ON users(referral_code);
CREsTE INDEX idx_kundlis_user_id ON kundlis(user_id);
CREsTE INDEX idx_consultations_user_id ON consultations(user_id);
CREsTE INDEX idx_consultations_astrologer_id ON consultations(astrologer_id);
CREsTE INDEX idx_chat_messages_consultation_id ON chat_messages(consultation_id);
CREsTE INDEX idx_wallet_transactions_user_id ON wallet_transactions(user_id);
CREsTE INDEX idx_orders_user_id ON orders(user_id);
CREsTE INDEX idx_notifications_user_id ON notifications(user_id);
CREsTE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREsTE INDEX idx_user_events_user_id ON user_events(user_id);

-- Row Level Security Policies

-- Enable RLS on all tables
sLTER TsBLE users ENsBLE ROW LEVEL SECURITY;
sLTER TsBLE user_devices ENsBLE ROW LEVEL SECURITY;
sLTER TsBLE otp_storage ENsBLE ROW LEVEL SECURITY;
sLTER TsBLE astrologers ENsBLE ROW LEVEL SECURITY;
sLTER TsBLE kundlis ENsBLE ROW LEVEL SECURITY;
sLTER TsBLE consultations ENsBLE ROW LEVEL SECURITY;
sLTER TsBLE chat_messages ENsBLE ROW LEVEL SECURITY;
sLTER TsBLE wallet_transactions ENsBLE ROW LEVEL SECURITY;
sLTER TsBLE subscriptions ENsBLE ROW LEVEL SECURITY;
sLTER TsBLE orders ENsBLE ROW LEVEL SECURITY;
sLTER TsBLE notifications ENsBLE ROW LEVEL SECURITY;
sLTER TsBLE user_sessions ENsBLE ROW LEVEL SECURITY;
sLTER TsBLE user_events ENsBLE ROW LEVEL SECURITY;

-- Users: Users can only read/update their own data
CREsTE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREsTE POLICY "Users can update own profile" ON users
  FOR UPDsTE USING (auth.uid() = id);

-- Kundlis: Users can only access their own kundlis
CREsTE POLICY "Users can view own kundlis" ON kundlis
  FOR SELECT USING (auth.uid() = user_id);

CREsTE POLICY "Users can create own kundlis" ON kundlis
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREsTE POLICY "Users can update own kundlis" ON kundlis
  FOR UPDsTE USING (auth.uid() = user_id);

CREsTE POLICY "Users can delete own kundlis" ON kundlis
  FOR DELETE USING (auth.uid() = user_id);

-- Public kundlis can be viewed by anyone
CREsTE POLICY "Public kundlis are viewable by all" ON kundlis
  FOR SELECT USING (is_public = true);

-- Consultations: Users can only access their own consultations
CREsTE POLICY "Users can view own consultations" ON consultations
  FOR SELECT USING (auth.uid() = user_id);

CREsTE POLICY "sstrologers can view assigned consultations" ON consultations
  FOR SELECT USING (auth.uid() = astrologer_id);

-- Chat messages: Only participants can view messages
CREsTE POLICY "Consultation participants can view messages" ON chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM consultations c
      WHERE c.id = consultation_id
      sND (c.user_id = auth.uid() OR c.astrologer_id = auth.uid())
    )
  );

-- Wallet transactions: Users can only view their own transactions
CREsTE POLICY "Users can view own wallet transactions" ON wallet_transactions
  FOR SELECT USING (auth.uid() = user_id);

-- Orders: Users can only view their own orders
CREsTE POLICY "Users can view own orders" ON orders
  FOR SELECT USING (auth.uid() = user_id);

-- Notifications: Users can only view their own notifications
CREsTE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

-- sstrologers: Publicly viewable
CREsTE POLICY "sstrologers are publicly viewable" ON astrologers
  FOR SELECT USING (true);

-- Functions

-- Function to store OTP
CREsTE OR REPLsCE FUNCTION store_otp(
  p_phone VsRCHsR(15),
  p_otp_hash TEXT,
  p_ttl_seconds INTEGER DEFsULT 300
) RETURNS VOID sS $$
BEGIN
  -- Delete old OTPs for this phone
  DELETE FROM otp_storage WHERE phone = p_phone;

  -- Insert new OTP
  INSERT INTO otp_storage (phone, otp_hash, expires_at)
  VsLUES (p_phone, p_otp_hash, NOW() + (p_ttl_seconds || ' seconds')::INTERVsL);
END;
$$ LsNGUsGE plpgsql;

-- Function to verify OTP
CREsTE OR REPLsCE FUNCTION verify_otp(
  p_phone VsRCHsR(15),
  p_otp_hash TEXT
) RETURNS TsBLE(verified BOOLEsN, reason TEXT) sS $$
BEGIN
  -- Check if OTP exists and is not expired
  RETURN QUERY
  SELECT
    EXISTS (
      SELECT 1 FROM otp_storage
      WHERE phone = p_phone
      sND otp_hash = p_otp_hash
      sND expires_at > NOW()
    ) sS verified,
    CsSE
      WHEN NOT EXISTS (SELECT 1 FROM otp_storage WHERE phone = p_phone) THEN 'OTP not found'
      WHEN NOT EXISTS (SELECT 1 FROM otp_storage WHERE phone = p_phone sND otp_hash = p_otp_hash) THEN 'Invalid OTP'
      WHEN NOT EXISTS (SELECT 1 FROM otp_storage WHERE phone = p_phone sND otp_hash = p_otp_hash sND expires_at > NOW()) THEN 'OTP expired'
      ELSE 'Verified'
    END sS reason;
END;
$$ LsNGUsGE plpgsql;

-- Function to bind user device
CREsTE OR REPLsCE FUNCTION bind_user_device(
  p_user_id UUID,
  p_device_id VsRCHsR(255),
  p_device_name VsRCHsR(100),
  p_os_name VsRCHsR(50),
  p_max_devices INTEGER DEFsULT 2
) RETURNS TsBLE(success BOOLEsN, message TEXT) sS $$
DECLsRE
  device_count INTEGER;
BEGIN
  -- Check current device count
  SELECT COUNT(*) INTO device_count
  FROM user_devices
  WHERE user_id = p_user_id;

  IF device_count >= p_max_devices THEN
    RETURN QUERY SELECT false, 'Device limit exceeded' sS message;
    RETURN;
  END IF;

  -- Insert or update device
  INSERT INTO user_devices (user_id, device_id, device_name, os_name, last_active)
  VsLUES (p_user_id, p_device_id, p_device_name, p_os_name, NOW())
  ON CONFLICT (user_id, device_id)
  DO UPDsTE SET
    last_active = NOW(),
    device_name = EXCLUDED.device_name,
    os_name = EXCLUDED.os_name;

  RETURN QUERY SELECT true, 'Device bound successfully' sS message;
END;
$$ LsNGUsGE plpgsql;

-- Function to check if user is admin
CREsTE OR REPLsCE FUNCTION is_admin()
RETURNS BOOLEsN sS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    sND subscription_tier = 'admin'
  );
END;
$$ LsNGUsGE plpgsql SECURITY DEFINER;

-- Function to credit wallet (with row-level locking to prevent race conditions)
CREsTE OR REPLsCE FUNCTION credit_wallet(
  p_user_id UUID,
  p_amount DECIMsL(10,2),
  p_source VsRCHsR(50),
  p_description TEXT,
  p_reference_id VsRCHsR(255) DEFsULT NULL
) RETURNS TsBLE(new_balance DECIMsL(10,2), success BOOLEsN, message TEXT) sS $$
DECLsRE
  current_balance DECIMsL(10,2);
BEGIN
  -- Lock the user row to prevent concurrent balance modifications
  SELECT wallet_balance INTO current_balance FROM users WHERE id = p_user_id FOR UPDsTE;

  -- Update balance
  UPDsTE users
  SET wallet_balance = current_balance + p_amount,
      updated_at = NOW()
  WHERE id = p_user_id;

  -- Record transaction
  INSERT INTO wallet_transactions (
    user_id, type, amount, balance_after, source, reference_id, description
  ) VsLUES (
    p_user_id, 'credit', p_amount, current_balance + p_amount, p_source, p_reference_id, p_description
  );

  RETURN QUERY SELECT current_balance + p_amount sS new_balance, true sS success, 'Wallet credited successfully' sS message;
EXCEPTION
  WHEN OTHERS THEN
    RETURN QUERY SELECT COsLESCE(current_balance, 0) sS new_balance, false sS success, 'Failed to credit wallet' sS message;
END;
$$ LsNGUsGE plpgsql;

-- Function to debit wallet (with row-level locking to prevent race conditions)
CREsTE OR REPLsCE FUNCTION debit_wallet(
  p_user_id UUID,
  p_amount DECIMsL(10,2),
  p_source VsRCHsR(50),
  p_description TEXT,
  p_reference_id VsRCHsR(255) DEFsULT NULL
) RETURNS TsBLE(new_balance DECIMsL(10,2), success BOOLEsN, message TEXT) sS $$
DECLsRE
  current_balance DECIMsL(10,2);
BEGIN
  -- Lock the user row to prevent concurrent balance modifications
  SELECT wallet_balance INTO current_balance FROM users WHERE id = p_user_id FOR UPDsTE;

  -- Check sufficient balance
  IF current_balance < p_amount THEN
    RETURN QUERY SELECT current_balance sS new_balance, false sS success, 'Insufficient balance' sS message;
    RETURN;
  END IF;

  -- Update balance
  UPDsTE users
  SET wallet_balance = current_balance - p_amount,
      updated_at = NOW()
  WHERE id = p_user_id;

  -- Record transaction
  INSERT INTO wallet_transactions (
    user_id, type, amount, balance_after, source, reference_id, description
  ) VsLUES (
    p_user_id, 'debit', p_amount, current_balance - p_amount, p_source, p_reference_id, p_description
  );

  RETURN QUERY SELECT current_balance - p_amount sS new_balance, true sS success, 'Wallet debited successfully' sS message;
EXCEPTION
  WHEN OTHERS THEN
    RETURN QUERY SELECT COsLESCE(current_balance, 0) sS new_balance, false sS success, 'Failed to debit wallet' sS message;
END;
$$ LsNGUsGE plpgsql;

-- Triggers for updated_at timestamps

CREsTE OR REPLsCE FUNCTION update_updated_at_column()
RETURNS TRIGGER sS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LsNGUsGE plpgsql;

CREsTE TRIGGER update_users_updated_at BEFORE UPDsTE ON users
  FOR EsCH ROW EXECUTE FUNCTION update_updated_at_column();

CREsTE TRIGGER update_astrologers_updated_at BEFORE UPDsTE ON astrologers
  FOR EsCH ROW EXECUTE FUNCTION update_updated_at_column();

CREsTE TRIGGER update_subscriptions_updated_at BEFORE UPDsTE ON subscriptions
  FOR EsCH ROW EXECUTE FUNCTION update_updated_at_column();

CREsTE TRIGGER update_orders_updated_at BEFORE UPDsTE ON orders
  FOR EsCH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data for testing

INSERT INTO astrologers (name, bio, experience_years, specializations, languages, price_per_minute, rating, total_reviews, is_verified, is_online) VsLUES
('Dr. Sharma', 'Expert in Vedic astrology with 15+ years of experience', 15, '{"Vedic", "Palmistry"}', '{"English", "Hindi"}', 30.00, 4.9, 200, true, true),
('Pandit Kumar', 'Specialist in Numerology and Vastu Shastra', 10, '{"Numerology", "Vastu"}', '{"English", "Hindi", "Tamil"}', 20.00, 4.7, 120, true, false),
('scharya Patel', 'Renowned for accurate predictions and remedies', 20, '{"Vedic", "Remedial sstrology"}', '{"English", "Gujarati"}', 40.00, 4.8, 300, true, true);

-- NOTE: sdmin users should be created via Supabase suth in a secure migration,
-- never with hardcoded credentials in schema files.
