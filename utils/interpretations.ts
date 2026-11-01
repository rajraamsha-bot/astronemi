/**
 * Astrology Interpretation Database
 *
 * 100% local — no AI API needed.
 * Covers:
 *   - Planet in Sign (9 planets × 12 signs)
 *   - Planet in House (9 planets × 12 houses)
 *   - Ascendant in Sign (12 signs)
 *   - Nakshatra meanings (27 nakshatras)
 *   - KP Sub-Lord significations (9 planets)
 *   - Jaimini Karaka meanings (8 karakas)
 *   - Yoga interpretations (common yogas)
 */

// ─── Planet in Sign ───────────────────────────────────────────────────────────

const PLANET_IN_SIGN: Record<string, Record<string, string>> = {
  Sun: {
    Aries:       'Sun in Aries — natural dignity. Strong leadership, pioneering spirit, and bold self-expression. You lead by example and thrive in competitive environments.',
    Taurus:      'Sun in Taurus — steady and determined. You build lasting things and value security, beauty, and material comfort. Stubborn but deeply reliable.',
    Gemini:      'Sun in Gemini — curious and communicative. Your identity is tied to ideas, learning, and connection. Versatile but may scatter energy.',
    Cancer:      'Sun in Cancer — deeply emotional and nurturing. Home and family define you. Intuitive, protective, and deeply attached to your roots.',
    Leo:         'Sun in Leo — exalted expression. Natural charisma, creativity, and leadership. You shine brightest when given a stage. Generous but needs recognition.',
    Virgo:       'Sun in Virgo — analytical and service-oriented. You find purpose in perfecting systems and helping others. Detail-focused, sometimes self-critical.',
    Libra:       'Sun in Libra — debilitated. Identity seeks balance through relationships. Diplomatic and fair-minded, but may struggle with decisiveness.',
    Scorpio:     'Sun in Scorpio — intense and transformative. You seek depth in all things. Powerful will, magnetic presence, and capacity for profound change.',
    Sagittarius: 'Sun in Sagittarius — philosophical and expansive. You seek truth, wisdom, and freedom. Optimistic, adventurous, and drawn to higher knowledge.',
    Capricorn:   'Sun in Capricorn — ambitious and disciplined. Career and status are central to identity. Patient, strategic, and built for long-term success.',
    Aquarius:    'Sun in Aquarius — humanitarian and unconventional. You identify with ideas and communities rather than personal ego. Innovative and forward-thinking.',
    Pisces:      'Sun in Pisces — spiritual and compassionate. Boundaries between self and others are fluid. Creative, empathetic, and drawn to the mystical.',
  },
  Moon: {
    Aries:       'Moon in Aries — emotions are quick, intense, and action-oriented. You react fast and recover fast. Passionate but impulsive in emotional responses.',
    Taurus:      'Moon in Taurus — exalted. Emotional security comes through stability, comfort, and sensory pleasure. Calm, patient, and deeply loyal.',
    Gemini:      'Moon in Gemini — emotionally restless and intellectually stimulated. You process feelings through talking and thinking. Adaptable but changeable.',
    Cancer:      'Moon in Cancer — own sign, very strong. Deep emotional intelligence, strong intuition, and powerful nurturing instincts. Home is sanctuary.',
    Leo:         'Moon in Leo — emotions are dramatic and generous. You need to feel special and appreciated. Warm-hearted, creative, and protective of loved ones.',
    Virgo:       'Moon in Virgo — emotions are processed analytically. You feel better when things are organized. Caring but may worry excessively.',
    Libra:       'Moon in Libra — emotional harmony through relationships. You need balance and beauty around you. Charming, fair, and conflict-averse.',
    Scorpio:     'Moon in Scorpio — debilitated. Emotions run deep and intense. Powerful intuition, but prone to jealousy and emotional extremes.',
    Sagittarius: 'Moon in Sagittarius — emotionally optimistic and freedom-loving. You need space and adventure. Philosophy and travel feed the soul.',
    Capricorn:   'Moon in Capricorn — emotions are controlled and practical. You show love through responsibility. Reserved but deeply loyal.',
    Aquarius:    'Moon in Aquarius — emotionally detached but humanitarian. You care about humanity more than individuals. Unique emotional needs.',
    Pisces:      'Moon in Pisces — deeply empathetic and psychic. Emotions are boundless. Creative, spiritual, and easily absorbs others\' feelings.',
  },
  Mars: {
    Aries:       'Mars in Aries — own sign. Maximum energy, courage, and drive. You act first and think later. Natural warrior energy, excellent for sports and leadership.',
    Taurus:      'Mars in Taurus — slow but unstoppable. Determined, sensual, and stubborn. Energy builds slowly but once committed, nothing stops you.',
    Gemini:      'Mars in Gemini — energy goes into communication and ideas. Quick-witted, argumentative, and mentally combative. Many simultaneous projects.',
    Cancer:      'Mars in Cancer — debilitated. Energy is directed through emotions and home. Protective of family, but may be indirect or moody in conflict.',
    Leo:         'Mars in Leo — dramatic and passionate energy. You fight for recognition and pride. Courageous, generous, and theatrical in action.',
    Virgo:       'Mars in Virgo — precise and methodical energy. You work hard on details. Excellent for technical fields, health, and service.',
    Libra:       'Mars in Libra — energy goes into relationships and fairness. Diplomatic in conflict but can be indecisive. Fights for justice.',
    Scorpio:     'Mars in Scorpio — own sign. Intense, strategic, and relentless. You pursue goals with laser focus. Magnetic and transformative energy.',
    Sagittarius: 'Mars in Sagittarius — adventurous and philosophical energy. You fight for beliefs and freedom. Enthusiastic, direct, and sometimes reckless.',
    Capricorn:   'Mars in Capricorn — exalted. Disciplined, ambitious, and strategic. You channel energy into long-term goals with remarkable patience.',
    Aquarius:    'Mars in Aquarius — energy goes into innovation and social causes. Unconventional in approach, fights for collective ideals.',
    Pisces:      'Mars in Pisces — diffuse and spiritual energy. Compassionate action, artistic drive, and intuitive decision-making.',
  },
  Mercury: {
    Aries:       'Mercury in Aries — quick, direct, and assertive communication. You think fast and speak boldly. Pioneering ideas but may lack patience.',
    Taurus:      'Mercury in Taurus — practical and deliberate thinking. You process slowly but thoroughly. Excellent memory and appreciation for beauty.',
    Gemini:      'Mercury in Gemini — own sign. Brilliant, versatile, and communicative. Natural writer, speaker, and networker. Curious about everything.',
    Cancer:      'Mercury in Cancer — intuitive and emotionally colored thinking. You remember feelings more than facts. Excellent memory for personal history.',
    Leo:         'Mercury in Leo — confident and creative communication. You speak with authority and drama. Natural storyteller and performer.',
    Virgo:       'Mercury in Virgo — exalted and own sign. Analytical perfection. Exceptional attention to detail, critical thinking, and practical intelligence.',
    Libra:       'Mercury in Libra — balanced and diplomatic communication. You see all sides. Excellent mediator, writer, and debater.',
    Scorpio:     'Mercury in Scorpio — penetrating and investigative mind. You seek hidden truths. Excellent for research, psychology, and strategy.',
    Sagittarius: 'Mercury in Sagittarius — philosophical and expansive thinking. You see the big picture. Enthusiastic communicator, sometimes blunt.',
    Capricorn:   'Mercury in Capricorn — structured and practical thinking. You communicate with authority and precision. Excellent for business and management.',
    Aquarius:    'Mercury in Aquarius — innovative and unconventional thinking. You think ahead of your time. Excellent for technology and social reform.',
    Pisces:      'Mercury in Pisces — debilitated. Intuitive and imaginative thinking, but may lack logical precision. Excellent for art, poetry, and spirituality.',
  },
  Jupiter: {
    Aries:       'Jupiter in Aries — expansive and pioneering wisdom. Growth comes through bold action and leadership. Generous and enthusiastic teacher.',
    Taurus:      'Jupiter in Taurus — abundance through material and sensory realms. Financial luck, love of beauty, and generous with resources.',
    Gemini:      'Jupiter in Gemini — wisdom through communication and learning. Many teachers, many subjects. Excellent writer and networker.',
    Cancer:      'Jupiter in Cancer — exalted. Exceptional emotional wisdom, nurturing abundance, and strong family blessings. Deeply intuitive and generous.',
    Leo:         'Jupiter in Leo — royal generosity and creative expansion. Natural leader and teacher. Luck through creativity, children, and performance.',
    Virgo:       'Jupiter in Virgo — wisdom through service and analysis. Growth through health, work, and helping others. Practical and discerning.',
    Libra:       'Jupiter in Libra — expansion through relationships and justice. Luck in partnerships and legal matters. Fair and diplomatic wisdom.',
    Scorpio:     'Jupiter in Scorpio — deep transformative wisdom. Growth through crisis and rebirth. Excellent for occult, research, and healing.',
    Sagittarius: 'Jupiter in Sagittarius — own sign. Maximum wisdom, philosophy, and spiritual growth. Natural guru, traveler, and truth-seeker.',
    Capricorn:   'Jupiter in Capricorn — debilitated. Wisdom is practical and structured. Growth through discipline and long-term planning.',
    Aquarius:    'Jupiter in Aquarius — humanitarian wisdom. Growth through community, innovation, and social causes. Visionary and progressive.',
    Pisces:      'Jupiter in Pisces — own sign. Spiritual abundance, compassion, and mystical wisdom. Deeply intuitive and connected to the divine.',
  },
  Venus: {
    Aries:       'Venus in Aries — passionate and impulsive in love. You pursue what you want boldly. Exciting but may lack patience in relationships.',
    Taurus:      'Venus in Taurus — own sign. Sensual, loyal, and deeply appreciative of beauty and comfort. Excellent taste and strong romantic nature.',
    Gemini:      'Venus in Gemini — love through communication and variety. Charming, witty, and socially versatile. May struggle with commitment.',
    Cancer:      'Venus in Cancer — deeply nurturing in love. You express affection through care and home-making. Emotionally sensitive and devoted.',
    Leo:         'Venus in Leo — dramatic and generous in love. You love grand gestures and need to feel special. Loyal and passionate partner.',
    Virgo:       'Venus in Virgo — debilitated. Love expressed through service and attention to detail. May be overly critical or shy in romance.',
    Libra:       'Venus in Libra — own sign. Natural charm, grace, and love of beauty. Excellent partnerships, artistic talent, and social harmony.',
    Scorpio:     'Venus in Scorpio — intense and transformative love. Deep emotional bonds, magnetic attraction, and all-or-nothing relationships.',
    Sagittarius: 'Venus in Sagittarius — love of freedom and adventure. You need a partner who shares your philosophical and adventurous spirit.',
    Capricorn:   'Venus in Capricorn — love expressed through loyalty and responsibility. Slow to open up but deeply committed once you do.',
    Aquarius:    'Venus in Aquarius — unconventional love and friendship. You value intellectual connection and freedom in relationships.',
    Pisces:      'Venus in Pisces — exalted. Unconditional love, artistic genius, and spiritual devotion. Deeply romantic and compassionate.',
  },
  Saturn: {
    Aries:       'Saturn in Aries — lessons in patience and restraint. Impulsive energy is disciplined over time. Leadership earned through hard work.',
    Taurus:      'Saturn in Taurus — lessons in material security. Slow but steady financial growth. Discipline in pleasures leads to lasting abundance.',
    Gemini:      'Saturn in Gemini — lessons in communication and learning. Serious thinker, methodical writer. May feel mentally burdened early in life.',
    Cancer:      'Saturn in Cancer — lessons in emotional security and family. May experience early emotional restriction. Builds strong foundations over time.',
    Leo:         'Saturn in Leo — lessons in ego and recognition. Leadership earned through discipline, not birthright. Serious and responsible creativity.',
    Virgo:       'Saturn in Virgo — lessons in service and health. Perfectionism can become a burden. Excellent for medicine, research, and technical fields.',
    Libra:       'Saturn in Libra — exalted. Exceptional sense of justice, fairness, and discipline in relationships. Natural judge and mediator.',
    Scorpio:     'Saturn in Scorpio — lessons in transformation and control. Deep psychological work leads to mastery. Intense and strategic.',
    Sagittarius: 'Saturn in Sagittarius — lessons in philosophy and freedom. Structured approach to spirituality and higher learning. Serious teacher.',
    Capricorn:   'Saturn in Capricorn — own sign. Maximum discipline, ambition, and long-term planning. Slow rise but lasting success.',
    Aquarius:    'Saturn in Aquarius — own sign. Disciplined innovation and social responsibility. Builds systems that benefit communities.',
    Pisces:      'Saturn in Pisces — lessons in boundaries and spirituality. Structured approach to compassion. May feel isolated or spiritually burdened.',
  },
  Rahu: {
    Aries:       'Rahu in Aries — obsessive desire for independence and pioneering. Past life of dependence; this life pushes toward bold self-assertion.',
    Taurus:      'Rahu in Taurus — obsessive desire for material security and beauty. Strong drive for wealth and sensory pleasure.',
    Gemini:      'Rahu in Gemini — obsessive curiosity and communication. Excellent for media, technology, and networking. Information hunger.',
    Cancer:      'Rahu in Cancer — obsessive need for emotional security and belonging. Strong family karma and psychic sensitivity.',
    Leo:         'Rahu in Leo — obsessive desire for recognition and power. Magnetic personality, drawn to fame and creative expression.',
    Virgo:       'Rahu in Virgo — obsessive perfectionism and service. Excellent for health, technology, and analytical fields.',
    Libra:       'Rahu in Libra — obsessive desire for partnership and balance. Strong relationship karma and diplomatic skills.',
    Scorpio:     'Rahu in Scorpio — obsessive desire for transformation and hidden knowledge. Powerful occult abilities and research skills.',
    Sagittarius: 'Rahu in Sagittarius — obsessive quest for truth and freedom. Strong philosophical and spiritual hunger.',
    Capricorn:   'Rahu in Capricorn — obsessive ambition and desire for status. Exceptional drive for career success and authority.',
    Aquarius:    'Rahu in Aquarius — obsessive desire for innovation and social change. Visionary, unconventional, and community-oriented.',
    Pisces:      'Rahu in Pisces — obsessive spiritual seeking and dissolution of ego. Strong psychic abilities and artistic sensitivity.',
  },
  Ketu: {
    Aries:       'Ketu in Aries — past life of independence and aggression. Natural warrior instincts that need spiritual direction.',
    Taurus:      'Ketu in Taurus — past life of material accumulation. Natural detachment from wealth; spiritual values over material ones.',
    Gemini:      'Ketu in Gemini — past life of communication and intellect. Natural analytical ability; seeks deeper meaning beyond words.',
    Cancer:      'Ketu in Cancer — past life of emotional attachment. Natural psychic ability; learning to detach from family and past.',
    Leo:         'Ketu in Leo — past life of power and recognition. Natural leadership that is now being surrendered for spiritual growth.',
    Virgo:       'Ketu in Virgo — past life of service and analysis. Natural healing abilities; learning to trust intuition over logic.',
    Libra:       'Ketu in Libra — past life of relationships and diplomacy. Natural artistic sense; learning to stand alone.',
    Scorpio:     'Ketu in Scorpio — exalted. Past life of deep transformation. Natural occult abilities and spiritual insight.',
    Sagittarius: 'Ketu in Sagittarius — past life of philosophy and religion. Natural wisdom; learning to live truth rather than preach it.',
    Capricorn:   'Ketu in Capricorn — past life of ambition and structure. Natural discipline; learning to release attachment to status.',
    Aquarius:    'Ketu in Aquarius — past life of innovation and community. Natural humanitarian instincts; learning to balance individual and collective.',
    Pisces:      'Ketu in Pisces — debilitated. Past life of spiritual dissolution. Natural compassion; learning to maintain boundaries.',
  },
};

// ─── Planet in House ──────────────────────────────────────────────────────────

const PLANET_IN_HOUSE: Record<string, Record<number, string>> = {
  Sun: {
    1: 'Sun in 1st house — powerful self-expression, strong constitution, and natural leadership. You radiate confidence and draw attention effortlessly.',
    2: 'Sun in 2nd house — identity tied to wealth and family. Strong voice, financial ambition, and pride in lineage.',
    3: 'Sun in 3rd house — confident communicator and courageous in short journeys. Strong relationship with siblings.',
    4: 'Sun in 4th house — identity connected to home and mother. Strong domestic pride, possible tension with father.',
    5: 'Sun in 5th house — creative, romantic, and proud of children. Natural performer and speculator.',
    6: 'Sun in 6th house — strong in competition and overcoming enemies. Health-conscious and service-oriented.',
    7: 'Sun in 7th house — identity through partnerships. Strong, sometimes dominating spouse. Business acumen.',
    8: 'Sun in 8th house — transformation through crisis. Interest in occult, inheritance, and hidden matters.',
    9: 'Sun in 9th house — philosophical and spiritual identity. Strong father figure, love of travel and higher learning.',
    10: 'Sun in 10th house — career prominence and public recognition. Natural authority and ambition for status.',
    11: 'Sun in 11th house — gains through networks and influential friends. Social ambitions and large income potential.',
    12: 'Sun in 12th house — spiritual identity, foreign connections, and hidden power. May feel isolated but has inner strength.',
  },
  Moon: {
    1: 'Moon in 1st house — highly sensitive, intuitive, and emotionally expressive. Appearance changes with mood. Strong public appeal.',
    2: 'Moon in 2nd house — emotional relationship with money and family. Fluctuating finances, nurturing speech.',
    3: 'Moon in 3rd house — emotionally driven communication. Close bond with siblings, love of writing and travel.',
    4: 'Moon in 4th house — own house. Deep connection to home, mother, and roots. Excellent for real estate.',
    5: 'Moon in 5th house — creative and romantic emotions. Strong bond with children. Intuitive intelligence.',
    6: 'Moon in 6th house — emotional health challenges, service to others. Fluctuating work environment.',
    7: 'Moon in 7th house — emotional fulfillment through partnerships. Nurturing spouse, public-facing career.',
    8: 'Moon in 8th house — deep emotional transformation. Psychic abilities, interest in occult and inheritance.',
    9: 'Moon in 9th house — emotional connection to philosophy and spirituality. Devoted to guru and higher learning.',
    10: 'Moon in 10th house — public career, emotional connection to work. Mother may influence career significantly.',
    11: 'Moon in 11th house — emotional fulfillment through social networks and gains. Many female friends.',
    12: 'Moon in 12th house — emotional isolation, spiritual depth, and foreign connections. Strong dream life.',
  },
  Jupiter: {
    1: 'Jupiter in 1st house — blessed constitution, wisdom, and natural optimism. Generous personality and spiritual inclination.',
    2: 'Jupiter in 2nd house — financial abundance, eloquent speech, and large family blessings.',
    3: 'Jupiter in 3rd house — wisdom through communication and travel. Philosophical siblings.',
    4: 'Jupiter in 4th house — happy home, educated mother, and real estate blessings.',
    5: 'Jupiter in 5th house — blessed with children, creative intelligence, and speculative gains.',
    6: 'Jupiter in 6th house — overcomes enemies through wisdom. Health through moderation.',
    7: 'Jupiter in 7th house — wise and generous spouse. Blessed partnerships and legal matters.',
    8: 'Jupiter in 8th house — longevity, occult wisdom, and inheritance blessings.',
    9: 'Jupiter in 9th house — own house. Maximum spiritual wisdom, guru blessings, and fortune.',
    10: 'Jupiter in 10th house — career in education, law, or spirituality. Respected authority figure.',
    11: 'Jupiter in 11th house — abundant gains, influential network, and fulfilled desires.',
    12: 'Jupiter in 12th house — spiritual liberation, foreign blessings, and charitable nature.',
  },
  Saturn: {
    1: 'Saturn in 1st house — serious, disciplined, and slow to mature. Life improves significantly after 30. Strong endurance.',
    2: 'Saturn in 2nd house — delayed financial gains, disciplined speech. Hard work brings lasting wealth.',
    3: 'Saturn in 3rd house — disciplined communication, serious siblings. Determined in short journeys.',
    4: 'Saturn in 4th house — restricted early home life. Real estate gains through hard work.',
    5: 'Saturn in 5th house — delayed children, serious creativity. Disciplined approach to romance.',
    6: 'Saturn in 6th house — excellent for overcoming enemies and disease through persistence.',
    7: 'Saturn in 7th house — delayed or serious marriage. Spouse may be older or more disciplined.',
    8: 'Saturn in 8th house — longevity, slow transformation, and inheritance through hard work.',
    9: 'Saturn in 9th house — serious approach to philosophy and religion. Disciplined spiritual practice.',
    10: 'Saturn in 10th house — career success through hard work and patience. Lasting professional reputation.',
    11: 'Saturn in 11th house — gains through persistent effort. Older or serious friends and networks.',
    12: 'Saturn in 12th house — spiritual discipline, foreign residence, and service to institutions.',
  },
  Mars: {
    1: 'Mars in 1st house — energetic, courageous, and competitive. Strong physical constitution. Prone to accidents if unchecked.',
    2: 'Mars in 2nd house — aggressive in financial matters. Sharp speech, possible family conflicts.',
    3: 'Mars in 3rd house — courageous and action-oriented. Competitive siblings, love of sports.',
    4: 'Mars in 4th house — property gains but domestic conflicts. Energetic home environment.',
    5: 'Mars in 5th house — passionate creativity and romance. Competitive in sports and speculation.',
    6: 'Mars in 6th house — excellent for defeating enemies and disease. Strong in competitive fields.',
    7: 'Mars in 7th house — Mangal Dosha indicator. Passionate but potentially conflicted partnerships.',
    8: 'Mars in 8th house — interest in occult and surgery. Sudden events and transformative energy.',
    9: 'Mars in 9th house — courageous in philosophy and religion. Active spiritual practice.',
    10: 'Mars in 10th house — ambitious career, leadership in competitive fields. Engineering, military, sports.',
    11: 'Mars in 11th house — gains through competitive efforts. Energetic social network.',
    12: 'Mars in 12th house — energy spent in isolation or foreign lands. Interest in spiritual combat.',
  },
  Venus: {
    1: 'Venus in 1st house — charming, beautiful, and naturally artistic. Strong social appeal and love of luxury.',
    2: 'Venus in 2nd house — wealth through beauty and art. Sweet speech, beautiful family.',
    3: 'Venus in 3rd house — artistic communication, love of music and writing. Charming siblings.',
    4: 'Venus in 4th house — beautiful home, loving mother, and real estate through beauty.',
    5: 'Venus in 5th house — romantic creativity, artistic children, and speculative gains through beauty.',
    6: 'Venus in 6th house — service through beauty. Health through pleasure. Possible relationship conflicts.',
    7: 'Venus in 7th house — own house. Beautiful and harmonious partnerships. Excellent for marriage.',
    8: 'Venus in 8th house — occult beauty, inheritance through spouse, and transformative relationships.',
    9: 'Venus in 9th house — love of philosophy and travel. Beautiful guru and spiritual aesthetics.',
    10: 'Venus in 10th house — career in arts, beauty, or entertainment. Public charm and recognition.',
    11: 'Venus in 11th house — gains through beauty and social networks. Artistic and wealthy friends.',
    12: 'Venus in 12th house — spiritual love, foreign romance, and hidden artistic talents.',
  },
  Mercury: {
    1: 'Mercury in 1st house — intelligent, communicative, and youthful. Quick mind and versatile personality.',
    2: 'Mercury in 2nd house — eloquent speech, financial intelligence, and business acumen.',
    3: 'Mercury in 3rd house — own house. Excellent communication, writing, and short travel. Clever siblings.',
    4: 'Mercury in 4th house — intellectual home environment. Education through mother. Real estate intelligence.',
    5: 'Mercury in 5th house — creative intelligence, witty romance, and intellectual children.',
    6: 'Mercury in 6th house — analytical approach to health and service. Excellent for medicine and law.',
    7: 'Mercury in 7th house — intelligent and communicative partnerships. Business through communication.',
    8: 'Mercury in 8th house — research mind, occult intelligence, and analytical approach to transformation.',
    9: 'Mercury in 9th house — philosophical intelligence and love of higher learning. Excellent teacher.',
    10: 'Mercury in 10th house — career in communication, writing, or business. Intellectual authority.',
    11: 'Mercury in 11th house — gains through communication and networks. Intelligent social circle.',
    12: 'Mercury in 12th house — hidden intelligence, foreign communication, and spiritual writing.',
  },
  Rahu: {
    1: 'Rahu in 1st house — unusual personality, foreign influences, and unconventional self-expression. Magnetic and mysterious.',
    2: 'Rahu in 2nd house — unconventional wealth and speech. Foreign income and unusual family dynamics.',
    3: 'Rahu in 3rd house — unconventional communication and courage. Media, technology, and foreign travel.',
    4: 'Rahu in 4th house — unusual home environment. Foreign residence and unconventional mother.',
    5: 'Rahu in 5th house — unconventional creativity and romance. Unusual children and speculative nature.',
    6: 'Rahu in 6th house — excellent for defeating enemies through unconventional means. Foreign service.',
    7: 'Rahu in 7th house — unconventional partnerships. Foreign or unusual spouse. Business with foreigners.',
    8: 'Rahu in 8th house — occult obsession, sudden transformations, and unusual inheritance.',
    9: 'Rahu in 9th house — unconventional philosophy and foreign guru. Unusual spiritual path.',
    10: 'Rahu in 10th house — unconventional career, foreign recognition, and sudden rise to prominence.',
    11: 'Rahu in 11th house — unusual gains and foreign networks. Unconventional social circle.',
    12: 'Rahu in 12th house — foreign residence, spiritual obsession, and hidden desires.',
  },
  Ketu: {
    1: 'Ketu in 1st house — spiritual detachment from ego. Unusual appearance, psychic sensitivity, and past-life wisdom.',
    2: 'Ketu in 2nd house — detachment from wealth and family. Spiritual speech and past-life financial karma.',
    3: 'Ketu in 3rd house — detachment from communication. Spiritual courage and past-life sibling karma.',
    4: 'Ketu in 4th house — detachment from home and mother. Spiritual roots and past-life domestic karma.',
    5: 'Ketu in 5th house — detachment from children and romance. Spiritual creativity and past-life intelligence.',
    6: 'Ketu in 6th house — spiritual approach to service and health. Past-life karma with enemies.',
    7: 'Ketu in 7th house — detachment from partnerships. Spiritual spouse and past-life relationship karma.',
    8: 'Ketu in 8th house — exalted. Deep occult wisdom, spiritual transformation, and past-life mystical knowledge.',
    9: 'Ketu in 9th house — detachment from religion and guru. Spiritual wisdom beyond tradition.',
    10: 'Ketu in 10th house — detachment from career and status. Spiritual work and past-life professional karma.',
    11: 'Ketu in 11th house — detachment from gains and social networks. Spiritual fulfillment over material gains.',
    12: 'Ketu in 12th house — spiritual liberation, moksha potential, and past-life foreign connections.',
  },
};

// ─── Ascendant Interpretations ────────────────────────────────────────────────

const ASCENDANT: Record<string, string> = {
  Aries:       'Aries Ascendant (Mesha Lagna) — You are ruled by Mars. Bold, energetic, and pioneering. You approach life head-on with courage and enthusiasm. Physical vitality is strong, and you lead naturally. Life lessons involve patience and completing what you start.',
  Taurus:      'Taurus Ascendant (Vrishabha Lagna) — You are ruled by Venus. Steady, sensual, and determined. You build lasting things and value beauty, comfort, and security. Reliable and loyal, but resistant to change. Life lessons involve flexibility and releasing attachment.',
  Gemini:      'Gemini Ascendant (Mithuna Lagna) — You are ruled by Mercury. Curious, communicative, and versatile. You thrive on information and connection. Youthful energy throughout life. Life lessons involve depth and follow-through.',
  Cancer:      'Cancer Ascendant (Karka Lagna) — You are ruled by Moon. Intuitive, nurturing, and deeply emotional. Home and family are central to your identity. Strong psychic sensitivity and memory. Life lessons involve emotional boundaries.',
  Leo:         'Leo Ascendant (Simha Lagna) — You are ruled by Sun. Charismatic, generous, and naturally commanding. You were born to lead and inspire. Creative expression is vital. Life lessons involve humility and sharing the spotlight.',
  Virgo:       'Virgo Ascendant (Kanya Lagna) — You are ruled by Mercury. Analytical, service-oriented, and detail-focused. You improve everything you touch. Health-conscious and practical. Life lessons involve self-acceptance and trusting intuition.',
  Libra:       'Libra Ascendant (Tula Lagna) — You are ruled by Venus. Charming, diplomatic, and relationship-oriented. You seek balance and beauty in all things. Natural mediator and aesthete. Life lessons involve decisiveness and self-reliance.',
  Scorpio:     'Scorpio Ascendant (Vrishchika Lagna) — You are ruled by Mars (and Ketu). Intense, magnetic, and transformative. You see through surfaces to hidden truths. Powerful will and regenerative capacity. Life lessons involve trust and releasing control.',
  Sagittarius: 'Sagittarius Ascendant (Dhanu Lagna) — You are ruled by Jupiter. Philosophical, optimistic, and freedom-loving. You seek truth and wisdom across cultures. Natural teacher and explorer. Life lessons involve commitment and attention to detail.',
  Capricorn:   'Capricorn Ascendant (Makara Lagna) — You are ruled by Saturn. Disciplined, ambitious, and patient. You build lasting structures and earn respect through hard work. Life improves significantly after 30. Life lessons involve joy and spontaneity.',
  Aquarius:    'Aquarius Ascendant (Kumbha Lagna) — You are ruled by Saturn (and Rahu). Innovative, humanitarian, and unconventional. You think ahead of your time and care deeply about collective progress. Life lessons involve emotional connection and personal relationships.',
  Pisces:      'Pisces Ascendant (Meena Lagna) — You are ruled by Jupiter. Compassionate, spiritual, and deeply intuitive. You absorb the emotions of those around you. Creative and mystical. Life lessons involve boundaries and practical grounding.',
};

// ─── Nakshatra Interpretations ────────────────────────────────────────────────

const NAKSHATRA: Record<string, string> = {
  'Ashwini':           'Ashwini — The Healer. Ruled by Ketu. Swift, energetic, and pioneering. Natural healing abilities and love of speed. Excellent for medicine and sports.',
  'Bharani':           'Bharani — The Bearer. Ruled by Venus. Intense, creative, and transformative. Strong will and capacity for bearing burdens. Connected to birth, death, and rebirth.',
  'Krittika':          'Krittika — The Cutter. Ruled by Sun. Sharp, critical, and purifying. Natural leadership and ability to cut through illusion. Connected to fire and transformation.',
  'Rohini':            'Rohini — The Red One. Ruled by Moon. Creative, sensual, and growth-oriented. Excellent for arts, agriculture, and beauty. Moon\'s favorite nakshatra.',
  'Mrigashira':        'Mrigashira — The Deer\'s Head. Ruled by Mars. Curious, gentle, and searching. Always seeking something beyond the horizon. Excellent for research and travel.',
  'Ardra':             'Ardra — The Moist One. Ruled by Rahu. Stormy, transformative, and intellectually sharp. Brings destruction before renewal. Connected to Shiva.',
  'Punarvasu':         'Punarvasu — The Return of Light. Ruled by Jupiter. Optimistic, philosophical, and returning to goodness. Excellent for spiritual growth and teaching.',
  'Pushya':            'Pushya — The Nourisher. Ruled by Saturn. Nurturing, disciplined, and protective. Most auspicious nakshatra. Excellent for all beginnings.',
  'Ashlesha':          'Ashlesha — The Embracer. Ruled by Mercury. Penetrating, mystical, and serpentine. Sharp intelligence and occult abilities. Can be manipulative if unbalanced.',
  'Magha':             'Magha — The Mighty One. Ruled by Ketu. Royal, ancestral, and authoritative. Connected to ancestors and past-life karma. Natural leadership and pride.',
  'Purva Phalguni':    'Purva Phalguni — The Former Red One. Ruled by Venus. Pleasure-loving, creative, and social. Excellent for arts, romance, and entertainment.',
  'Uttara Phalguni':   'Uttara Phalguni — The Latter Red One. Ruled by Sun. Service-oriented, generous, and socially responsible. Excellent for partnerships and public service.',
  'Hasta':             'Hasta — The Hand. Ruled by Moon. Skillful, crafty, and humorous. Excellent manual dexterity and healing hands. Connected to crafts and healing.',
  'Chitra':            'Chitra — The Brilliant. Ruled by Mars. Creative, artistic, and technically skilled. Excellent for architecture, design, and craftsmanship.',
  'Swati':             'Swati — The Independent One. Ruled by Rahu. Independent, flexible, and business-minded. Like a young plant in the wind — adaptable and resilient.',
  'Vishakha':          'Vishakha — The Forked Branch. Ruled by Jupiter. Goal-oriented, determined, and transformative. Excellent for achieving long-term ambitions.',
  'Anuradha':          'Anuradha — The Star of Success. Ruled by Saturn. Devoted, disciplined, and socially adept. Excellent for friendships and spiritual organizations.',
  'Jyeshtha':          'Jyeshtha — The Eldest. Ruled by Mercury. Protective, authoritative, and sometimes arrogant. Natural chief and protector of the vulnerable.',
  'Mula':              'Mula — The Root. Ruled by Ketu. Investigative, philosophical, and root-seeking. Destroys to rebuild. Connected to Kali and transformation.',
  'Purva Ashadha':     'Purva Ashadha — The Invincible Star. Ruled by Venus. Proud, philosophical, and purifying. Connected to water and cleansing. Excellent for debate.',
  'Uttara Ashadha':    'Uttara Ashadha — The Universal Star. Ruled by Sun. Victorious, responsible, and universally beneficial. Excellent for long-term success.',
  'Shravana':          'Shravana — The Ear. Ruled by Moon. Listening, learning, and connecting. Excellent for education, media, and spiritual learning.',
  'Dhanishtha':        'Dhanishtha — The Wealthiest. Ruled by Mars. Wealthy, musical, and ambitious. Excellent for music, wealth accumulation, and group activities.',
  'Shatabhisha':       'Shatabhisha — The Hundred Healers. Ruled by Rahu. Healing, secretive, and philosophical. Excellent for medicine, research, and mysticism.',
  'Purva Bhadrapada':  'Purva Bhadrapada — The Former Lucky Feet. Ruled by Jupiter. Intense, transformative, and spiritually powerful. Connected to fire and purification.',
  'Uttara Bhadrapada': 'Uttara Bhadrapada — The Latter Lucky Feet. Ruled by Saturn. Wise, disciplined, and deeply spiritual. Connected to the cosmic serpent Ahir Budhnya.',
  'Revati':            'Revati — The Wealthy. Ruled by Mercury. Nurturing, protective, and spiritually advanced. The last nakshatra — completion, closure, and new beginnings.',
};

// ─── KP Sub-Lord Significations ───────────────────────────────────────────────

const KP_SUB_LORD: Record<string, string> = {
  Sun:     'Sub-Lord Sun: Government, authority, father, soul, vitality, career recognition, and leadership. Events related to this sub-lord involve authority figures and public recognition.',
  Moon:    'Sub-Lord Moon: Mind, mother, emotions, home, public, liquids, and fluctuations. Events involve emotional matters, domestic life, and public dealings.',
  Mars:    'Sub-Lord Mars: Energy, siblings, property, surgery, accidents, and courage. Events involve action, conflict, real estate, and physical matters.',
  Mercury: 'Sub-Lord Mercury: Communication, business, education, siblings, and intellect. Events involve contracts, writing, trade, and analytical matters.',
  Jupiter: 'Sub-Lord Jupiter: Wisdom, children, wealth, guru, law, and expansion. Events involve blessings, growth, legal matters, and spiritual development.',
  Venus:   'Sub-Lord Venus: Love, marriage, beauty, luxury, arts, and partnerships. Events involve relationships, aesthetics, and material pleasures.',
  Saturn:  'Sub-Lord Saturn: Delays, discipline, karma, longevity, service, and obstacles. Events involve hard work, patience, and long-term matters.',
  Rahu:    'Sub-Lord Rahu: Foreign matters, technology, unconventional events, and sudden changes. Events involve the unusual, foreign connections, and amplification.',
  Ketu:    'Sub-Lord Ketu: Spirituality, past karma, liberation, and sudden separations. Events involve endings, spiritual matters, and karmic resolution.',
};

// ─── Jaimini Karaka Meanings ──────────────────────────────────────────────────

const KARAKA_MEANING: Record<string, string> = {
  AK:  'Atmakaraka — The planet with the highest degree in your chart. It represents your soul\'s deepest desire and the primary lesson of this lifetime. All major life events are colored by this planet\'s energy.',
  AmK: 'Amatyakaraka — Your career and mind indicator. This planet shows the nature of your professional life, your relationship with authority, and how you achieve your ambitions.',
  BK:  'Bhratrukaraka — Your siblings and courage indicator. This planet shows the nature of your relationship with siblings, your courage in facing challenges, and your communication style.',
  MK:  'Matrukaraka — Your mother and emotions indicator. This planet shows your relationship with your mother, your emotional nature, and your connection to home and roots.',
  PiK: 'Pitrukaraka — Your father and dharma indicator. This planet shows your relationship with your father, your sense of duty, and your approach to authority and tradition.',
  PuK: 'Putrakaraka — Your children and creativity indicator. This planet shows your relationship with children, your creative expression, and your capacity for joy and speculation.',
  GK:  'Gnatikaraka — Your obstacles and enemies indicator. This planet shows the nature of your challenges, health issues, and the lessons that come through conflict and disease.',
  DK:  'Darakaraka — Your spouse and partnerships indicator. The planet with the lowest degree shows the nature of your spouse, your approach to relationships, and your business partnerships.',
};

// ─── Public API ───────────────────────────────────────────────────────────────

export function getPlanetInSignInterpretation(planet: string, sign: string): string {
  return PLANET_IN_SIGN[planet]?.[sign] ?? `${planet} in ${sign} — a unique placement that blends ${planet}'s energy with ${sign}'s qualities.`;
}

export function getPlanetInHouseInterpretation(planet: string, house: number): string {
  return PLANET_IN_HOUSE[planet]?.[house] ?? `${planet} in the ${house}th house — this placement channels ${planet}'s energy into the matters of the ${house}th house.`;
}

export function getAscendantInterpretation(sign: string): string {
  return ASCENDANT[sign] ?? `${sign} Ascendant — your rising sign shapes your personality, appearance, and approach to life through ${sign}'s qualities.`;
}

export function getNakshatraInterpretation(nakshatra: string): string {
  return NAKSHATRA[nakshatra] ?? `${nakshatra} nakshatra — a unique lunar mansion with its own deity, symbol, and life themes.`;
}

export function getKPSubLordInterpretation(planet: string): string {
  return KP_SUB_LORD[planet] ?? `Sub-Lord ${planet} — this planet's energy determines the final outcome of the house it sub-lords.`;
}

export function getKarakaInterpretation(karakaShort: string): string {
  return KARAKA_MEANING[karakaShort] ?? `${karakaShort} — a Jaimini karaka planet indicating specific life themes.`;
}

/**
 * Generate a complete personalized reading for a planet placement.
 */
export function generatePlanetReading(planet: string, sign: string, house: number, isRetrograde: boolean): string {
  const signText = getPlanetInSignInterpretation(planet, sign);
  const houseText = getPlanetInHouseInterpretation(planet, house);
  const retro = isRetrograde ? ` ${planet} is retrograde — its energy turns inward, intensifying past-life themes and requiring deeper introspection before external results manifest.` : '';
  return `${signText}\n\n${houseText}${retro}`;
}

/**
 * Generate a complete Kundli summary reading.
 */
export function generateKundliSummary(
  ascendantSign: string,
  moonSign: string,
  moonNakshatra: string,
  sunSign: string,
  atmakaraka: string,
  darakaraka: string
): string {
  return [
    `🌅 Your ${ascendantSign} Ascendant shapes your personality and physical appearance.`,
    `🌙 Moon in ${moonSign} (${moonNakshatra}) — your emotional nature and mind.`,
    `☀️ Sun in ${sunSign} — your core identity and life purpose.`,
    `🔮 Atmakaraka: ${atmakaraka} — the planet that guides your soul's journey this lifetime.`,
    `💑 Darakaraka: ${darakaraka} — the planet that describes your spouse and partnerships.`,
  ].join('\n');
}
