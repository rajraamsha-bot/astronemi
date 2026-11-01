-- ============================================
-- Seed astrologer directory
-- ============================================
-- Populates `public.astrologers` with a realistic starter roster so the
-- directory is not empty on a fresh install. These are placeholder
-- profiles for demo / staging data only. Replace avatars and UPI IDs
-- with real values once you onboard actual practitioners.
--
-- Every row has `user_id = NULL` so it cannot be confused with an
-- authenticated astrologer account. When a real astrologer onboards,
-- create their `users` row first and then UPDATE the matching seed row
-- (match on `name`) to set `user_id`.
-- ============================================

INSERT INTO public.astrologers (
    id, user_id, name, avatar, bio,
    experience_years, specializations, languages,
    price_per_minute, discount_price,
    rating, total_reviews, total_consultations,
    is_verified, is_online, is_available,
    skills, certifications
) VALUES
-- ─── Tier 1: Premier / most expensive ────────────────────────────────────────
('11111111-1111-1111-1111-111111111101', NULL,
 'Pt. Rajesh Sharma',
 'https://randomuser.me/api/portraits/men/21.jpg',
 'Third-generation Vedic astrologer from Varanasi. Specialises in life-path analysis through Parashari and Jaimini systems with a clear, no-nonsense style.',
 28, ARRAY['Vedic', 'Kundli Matching', 'Career', 'Marriage'],
 ARRAY['English', 'Hindi', 'Sanskrit'],
 95.00, 75.00,
 4.9, 2341, 8100,
 true, true, true,
 ARRAY['Parashari', 'Jaimini', 'Shadbala'],
 ARRAY['Jyotish Acharya — Kashi Vidyapeeth', 'Post-graduate in Sanskrit']),

('11111111-1111-1111-1111-111111111102', NULL,
 'Dr. Meera Iyer',
 'https://randomuser.me/api/portraits/women/44.jpg',
 'PhD in Vedic astrology with a psychological counselling practice. Known for compassionate readings on relationships and family dynamics.',
 22, ARRAY['Relationships', 'Kundli Matching', 'Love', 'Psychology'],
 ARRAY['English', 'Tamil', 'Hindi'],
 85.00, NULL,
 4.9, 1987, 6540,
 true, true, true,
 ARRAY['Synastry', 'Composite charts', 'Counselling'],
 ARRAY['PhD Jyotish — Sri Venkateswara University']),

-- ─── Tier 2: Experienced specialists ─────────────────────────────────────────
('11111111-1111-1111-1111-111111111103', NULL,
 'Acharya Anand Kumar',
 'https://randomuser.me/api/portraits/men/34.jpg',
 'KP astrologer focused on precise event timing using sub-lord theory and cuspal interlinks. Publishes a weekly transit newsletter.',
 18, ARRAY['KP Astrology', 'Prashna', 'Career', 'Finance'],
 ARRAY['English', 'Hindi', 'Telugu'],
 65.00, 55.00,
 4.8, 1456, 5120,
 true, true, true,
 ARRAY['KP System', 'Horary', 'Financial astrology'],
 ARRAY['Advanced KP Certification — ICAS']),

('11111111-1111-1111-1111-111111111104', NULL,
 'Sunita Devi',
 'https://randomuser.me/api/portraits/women/22.jpg',
 'Traditional Vedic astrologer from Rishikesh. Emphasises remedial measures — mantras, gemstones, and rituals — grounded in scripture.',
 20, ARRAY['Vedic', 'Remedies', 'Gemstones', 'Mantras'],
 ARRAY['Hindi', 'English'],
 55.00, 45.00,
 4.7, 1820, 6000,
 true, false, true,
 ARRAY['Muhurta', 'Remedial astrology', 'Mantra shastra'],
 ARRAY['Jyotish Visharad — BVB']),

('11111111-1111-1111-1111-111111111105', NULL,
 'Prof. Vikram Joshi',
 'https://randomuser.me/api/portraits/men/51.jpg',
 'Astro-economist who maps Jupiter–Saturn cycles to market moves. Business owners and traders form most of his clientele.',
 25, ARRAY['Financial Astrology', 'Business', 'Muhurat', 'Career'],
 ARRAY['English', 'Hindi', 'Marathi'],
 120.00, 99.00,
 4.8, 980, 2980,
 true, true, true,
 ARRAY['Financial cycles', 'Business muhurta', 'Mundane astrology'],
 ARRAY['ICAS Fellow', 'Certified Vedic Astrologer (CVA)']),

-- ─── Tier 3: Rising practitioners ─────────────────────────────────────────────
('11111111-1111-1111-1111-111111111106', NULL,
 'Priya Menon',
 'https://randomuser.me/api/portraits/women/30.jpg',
 'Holistic astrologer integrating Vedic and Western traditions. Calm, structured readings focused on personal growth.',
 10, ARRAY['Vedic', 'Western', 'Career', 'Spiritual'],
 ARRAY['English', 'Malayalam', 'Hindi'],
 40.00, NULL,
 4.7, 1245, 3890,
 true, true, true,
 ARRAY['Tropical zodiac', 'Lahiri sidereal', 'Dasha analysis'],
 ARRAY['Diploma — Bharatiya Vidya Bhavan']),

('11111111-1111-1111-1111-111111111107', NULL,
 'Rakesh Nair',
 'https://randomuser.me/api/portraits/men/12.jpg',
 'Nadi and Jaimini specialist. Reads palm-leaf traditions with Chara karakas for a soul-purpose perspective.',
 15, ARRAY['Nadi', 'Jaimini', 'Spiritual', 'Past life'],
 ARRAY['Tamil', 'English', 'Malayalam'],
 50.00, 42.00,
 4.6, 860, 2640,
 true, true, true,
 ARRAY['Nadi reading', 'Jaimini dashas', 'Arudha padas'],
 ARRAY['Certified Nadi Guru — Vaitheeswaran Koil']),

('11111111-1111-1111-1111-111111111108', NULL,
 'Nisha Patel',
 'https://randomuser.me/api/portraits/women/55.jpg',
 'Tarot and numerology guide with a Vedic foundation. Quick, intuitive readings for yes/no decisions.',
 8, ARRAY['Tarot', 'Numerology', 'Love', 'Decision-making'],
 ARRAY['English', 'Gujarati', 'Hindi'],
 30.00, 25.00,
 4.6, 2100, 4980,
 true, true, true,
 ARRAY['Rider–Waite', 'Chaldean numerology', 'Celtic cross'],
 ARRAY['Certified Tarot Reader — Tarot Grand Master']),

('11111111-1111-1111-1111-111111111109', NULL,
 'Amit Deshmukh',
 'https://randomuser.me/api/portraits/men/43.jpg',
 'Muhurta specialist who builds precise electional charts for weddings, business launches, and property purchases.',
 12, ARRAY['Muhurat', 'Electional', 'Marriage', 'Business'],
 ARRAY['Marathi', 'Hindi', 'English'],
 45.00, 38.00,
 4.7, 720, 2100,
 true, false, true,
 ARRAY['Electional charts', 'Panchanga', 'Rectification'],
 ARRAY['Vedic Panchang Certification']),

('11111111-1111-1111-1111-111111111110', NULL,
 'Kavitha Reddy',
 'https://randomuser.me/api/portraits/women/68.jpg',
 'Child and family astrologer. Specialises in timing for school, career pivots for young adults, and parenting guidance.',
 9, ARRAY['Child Astrology', 'Career', 'Family', 'Education'],
 ARRAY['Telugu', 'English', 'Hindi'],
 35.00, 28.00,
 4.7, 1480, 3670,
 true, true, true,
 ARRAY['Child charts', 'Vocational timing', 'Dasha for minors'],
 ARRAY['Diploma — Indian Council of Astrological Sciences']),

-- ─── Tier 4: Budget-friendly ─────────────────────────────────────────────────
('11111111-1111-1111-1111-111111111111', NULL,
 'Harish Chandra',
 'https://randomuser.me/api/portraits/men/65.jpg',
 'Daily horoscope and transit-focused reader. Quick ten-minute consultations on today''s most pressing question.',
 6, ARRAY['Daily Horoscope', 'Transit', 'General'],
 ARRAY['Hindi', 'Punjabi', 'English'],
 20.00, NULL,
 4.5, 3120, 9400,
 true, true, true,
 ARRAY['Transit analysis', 'Panchanga readings'],
 ARRAY['Jyotish Shastri']),

('11111111-1111-1111-1111-111111111112', NULL,
 'Leela Krishnan',
 'https://randomuser.me/api/portraits/women/71.jpg',
 'Chinese astrology and Vedic comparison specialist. Best for cross-cultural couples and expats.',
 11, ARRAY['Chinese Astrology', 'Vedic', 'Relationships', 'Cultural'],
 ARRAY['English', 'Tamil', 'Mandarin'],
 38.00, 30.00,
 4.6, 560, 1540,
 true, false, true,
 ARRAY['Ba Zi', 'Four pillars', 'Comparative systems'],
 ARRAY['Feng Shui Practitioner'])
ON CONFLICT (id) DO NOTHING;

-- Quick sanity check (run manually): expected row count = 12
-- SELECT COUNT(*) FROM public.astrologers;
