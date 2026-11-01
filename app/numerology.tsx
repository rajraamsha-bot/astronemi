import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  Hash, User, Calendar, Star, ChevronRight, X, Sparkles,
  Heart, Briefcase, Users, AlertCircle, ArrowLeft
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { FeatureErrorBoundary } from '@/components/FeatureErrorBoundary';

interface NumerologyResult {
  name: string;
  destinyNumber: number;
  soulUrgeNumber: number;
  personalityNumber: number;
  lifePathNumber: number;
  birthDayNumber: number;
  attitudeNumber: number;
  luckyNumbers: number[];
  luckyColors: string[];
  luckyDays: string[];
  compatibleNumbers: number[];
  personality: string;
  career: string;
  love: string;
  challenges: string[];
  strengths: string[];
}

const numberMeanings: Record<number, { planet: string; meaning: string; traits: string[] }> = {
  1: { 
    planet: 'Sun', 
    meaning: 'Leadership, Independence, Innovation',
    traits: ['Born leader', 'Ambitious', 'Independent', 'Creative', 'Determined']
  },
  2: { 
    planet: 'Moon', 
    meaning: 'Partnership, Balance, Sensitivity',
    traits: ['Diplomatic', 'Intuitive', 'Cooperative', 'Peacemaker', 'Sensitive']
  },
  3: { 
    planet: 'Jupiter', 
    meaning: 'Expression, Creativity, Communication',
    traits: ['Creative', 'Expressive', 'Optimistic', 'Social', 'Artistic']
  },
  4: { 
    planet: 'Rahu', 
    meaning: 'Stability, Hard Work, Foundation',
    traits: ['Practical', 'Hardworking', 'Organized', 'Reliable', 'Disciplined']
  },
  5: { 
    planet: 'Mercury', 
    meaning: 'Freedom, Change, Adventure',
    traits: ['Adventurous', 'Versatile', 'Dynamic', 'Curious', 'Flexible']
  },
  6: { 
    planet: 'Venus', 
    meaning: 'Love, Harmony, Responsibility',
    traits: ['Nurturing', 'Responsible', 'Loving', 'Harmonious', 'Family-oriented']
  },
  7: { 
    planet: 'Ketu', 
    meaning: 'Spirituality, Analysis, Wisdom',
    traits: ['Analytical', 'Spiritual', 'Wise', 'Introspective', 'Mystical']
  },
  8: { 
    planet: 'Saturn', 
    meaning: 'Power, Achievement, Material Success',
    traits: ['Ambitious', 'Authoritative', 'Successful', 'Practical', 'Business-minded']
  },
  9: { 
    planet: 'Mars', 
    meaning: 'Humanitarian, Compassion, Completion',
    traits: ['Compassionate', 'Humanitarian', 'Generous', 'Artistic', 'Universal']
  },
};

const letterValues: Record<string, number> = {
  a: 1, b: 2, c: 3, d: 4, e: 5, f: 6, g: 7, h: 8, i: 9,
  j: 1, k: 2, l: 3, m: 4, n: 5, o: 6, p: 7, q: 8, r: 9,
  s: 1, t: 2, u: 3, v: 4, w: 5, x: 6, y: 7, z: 8
};

const vowels = ['a', 'e', 'i', 'o', 'u'];

const reduceToSingleDigit = (num: number, keepMasterNumbers = false): number => {
  if (keepMasterNumbers && (num === 11 || num === 22 || num === 33)) {
    return num;
  }
  while (num > 9) {
    num = Math.floor(num / 10) + (num % 10);
  }
  return num;
};

const calculateNumerology = (name: string, birthDate: string): NumerologyResult => {
  const cleanName = name.toLowerCase().replace(/[^a-z]/g, '');
  
  // Destiny Number (Full Name)
  let destinySum = 0;
  for (const letter of cleanName) {
    destinySum += letterValues[letter] || 0;
  }
  const destinyNumber = reduceToSingleDigit(destinySum, true);

  // Soul Urge Number (Vowels only)
  let soulUrgeSum = 0;
  for (const letter of cleanName) {
    if (vowels.includes(letter)) {
      soulUrgeSum += letterValues[letter] || 0;
    }
  }
  const soulUrgeNumber = reduceToSingleDigit(soulUrgeSum);

  // Personality Number (Consonants only)
  let personalitySum = 0;
  for (const letter of cleanName) {
    if (!vowels.includes(letter)) {
      personalitySum += letterValues[letter] || 0;
    }
  }
  const personalityNumber = reduceToSingleDigit(personalitySum);

  // Life Path Number (Birth Date) - with validation
  const dateParts = birthDate.split('/');
  if (dateParts.length !== 3) {
    throw new Error('Invalid date format. Please use DD/MM/YYYY format.');
  }
  const [dayStr, monthStr, yearStr] = dateParts as [string, string, string];
  const day = parseInt(dayStr, 10);
  const month = parseInt(monthStr, 10);
  const year = parseInt(yearStr, 10);
  
  if (isNaN(day) || isNaN(month) || isNaN(year)) {
    throw new Error('Invalid date values. Please enter valid numbers.');
  }
  if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900 || year > 2100) {
    throw new Error('Date values out of range. Please enter a valid date.');
  }
  
  const lifePathSum = reduceToSingleDigit(day) + reduceToSingleDigit(month) + reduceToSingleDigit(year);
  const lifePathNumber = reduceToSingleDigit(lifePathSum, true);

  // Birth Day Number
  const birthDayNumber = reduceToSingleDigit(day);

  // Attitude Number
  const attitudeNumber = reduceToSingleDigit(day + month);

  // Lucky Numbers
  const luckyNumbers = [
    destinyNumber,
    lifePathNumber,
    birthDayNumber,
    reduceToSingleDigit(destinyNumber + lifePathNumber),
    reduceToSingleDigit(lifePathNumber + birthDayNumber)
  ].filter((v, i, a) => a.indexOf(v) === i).slice(0, 5);

  // Lucky Colors based on destiny number
  const colorMap: Record<number, string[]> = {
    1: ['Gold', 'Orange', 'Yellow'],
    2: ['White', 'Silver', 'Light Green'],
    3: ['Purple', 'Yellow', 'Pink'],
    4: ['Grey', 'Dark Blue', 'Khaki'],
    5: ['Green', 'Turquoise', 'Light Blue'],
    6: ['Pink', 'Blue', 'White'],
    7: ['Light Grey', 'White', 'Purple'],
    8: ['Dark Blue', 'Black', 'Dark Green'],
    9: ['Red', 'Maroon', 'Pink'],
  };

  // Compatible Numbers
  const compatibilityMap: Record<number, number[]> = {
    1: [3, 5, 6, 9],
    2: [1, 4, 7, 8],
    3: [1, 5, 6, 9],
    4: [2, 6, 8],
    5: [1, 3, 7, 9],
    6: [1, 3, 4, 9],
    7: [2, 5, 8],
    8: [2, 4, 6],
    9: [1, 3, 5, 6],
  };

  const meaning = numberMeanings[destinyNumber] || numberMeanings[1]!;

  return {
    name,
    destinyNumber,
    soulUrgeNumber,
    personalityNumber,
    lifePathNumber,
    birthDayNumber,
    attitudeNumber,
    luckyNumbers,
    luckyColors: colorMap[destinyNumber] || colorMap[1] || [],
    luckyDays: ['Monday', 'Wednesday', 'Friday'],
    compatibleNumbers: compatibilityMap[destinyNumber] || compatibilityMap[1] || [],
    personality: meaning.meaning,
    career: getCareerAdvice(destinyNumber),
    love: getLoveAdvice(soulUrgeNumber),
    challenges: getChallenges(destinyNumber),
    strengths: meaning.traits,
  };
};

const getCareerAdvice = (num: number): string => {
  const careers: Record<number, string> = {
    1: 'Leadership roles, entrepreneurship, management, politics, creative fields where you can be independent.',
    2: 'Diplomacy, counseling, mediation, healthcare, teaching, partnership-based businesses.',
    3: 'Creative arts, writing, entertainment, communication, marketing, public speaking.',
    4: 'Engineering, construction, finance, administration, project management, technical fields.',
    5: 'Travel, sales, communication, media, adventure sports, anything involving change and variety.',
    6: 'Teaching, healthcare, hospitality, interior design, counseling, family businesses.',
    7: 'Research, science, spirituality, philosophy, analysis, specialized consulting.',
    8: 'Business, finance, management, real estate, law, executive positions.',
    9: 'Humanitarian work, healing arts, creative fields, teaching, philanthropy.',
  };
  return careers[num] || careers[1] || 'Successful career in various fields.';
};

const getLoveAdvice = (num: number): string => {
  const love: Record<number, string> = {
    1: 'You need a partner who respects your independence. Best matches: 3, 5, 6, 9.',
    2: 'You seek harmony and partnership. Best matches: 1, 4, 7, 8.',
    3: 'You need intellectual and creative connection. Best matches: 1, 5, 6, 9.',
    4: 'You value stability and commitment. Best matches: 2, 6, 8.',
    5: 'You need freedom and adventure in love. Best matches: 1, 3, 7, 9.',
    6: 'You seek nurturing and family-oriented love. Best matches: 1, 3, 4, 9.',
    7: 'You need deep spiritual connection. Best matches: 2, 5, 8.',
    8: 'You value power and success in relationships. Best matches: 2, 4, 6.',
    9: 'You seek universal love and compassion. Best matches: 1, 3, 5, 6.',
  };
  return love[num] || love[1] || 'Nurturing and balanced relationships.';
};

const getChallenges = (num: number): string[] => {
  const challenges: Record<number, string[]> = {
    1: ['Can be too dominating', 'May struggle with teamwork', 'Impatience with others'],
    2: ['Over-sensitivity', 'Difficulty making decisions', 'Tendency to be dependent'],
    3: ['Scattered energy', 'Difficulty finishing projects', 'Over-emotional'],
    4: ['Stubbornness', 'Resistance to change', 'Workaholic tendencies'],
    5: ['Restlessness', 'Difficulty committing', 'Scattered focus'],
    6: ['Self-sacrifice to excess', 'Controlling behavior', 'Difficulty receiving'],
    7: ['Isolation tendencies', 'Skepticism', 'Difficulty expressing emotions'],
    8: ['Material focus', 'Workaholic nature', 'Controlling behavior'],
    9: ['Difficulty letting go', 'Over-giving', 'Unrealistic expectations'],
  };
  return challenges[num] || challenges[1] || ['Managing expectations'];
};

export default function NumerologyScreen() {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [result, setResult] = useState<NumerologyResult | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);

  const handleCalculate = () => {
    if (name.trim() && birthDate.trim()) {
      try {
        const numerologyResult = calculateNumerology(name, birthDate);
        setResult(numerologyResult);
      } catch (error) {
        Alert.alert('Invalid Date', error instanceof Error ? error.message : 'Please enter a valid date in DD/MM/YYYY format.');
      }
    }
  };

  const isFormValid = name.trim().length >= 2 && birthDate.match(/^\d{2}\/\d{2}\/\d{4}$/);

  return (
    <FeatureErrorBoundary featureName="Numerology">
    <>
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft color={Colors.text} size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('nav.kundli')}</Text>
          <View style={styles.backButton} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <Hash size={32} color={Colors.white} />
            <Text style={styles.headerTitle}>{t('numerology.title')}</Text>
            <Text style={styles.headerSubtitle}>
              {t('numerology.subtitle')}
            </Text>
          </View>

          {/* Input Form */}
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('numerology.fullName')}</Text>
              <View style={styles.inputContainer}>
                <User size={20} color={Colors.textLight} />
                <TextInput
                  style={styles.input}
                  placeholder={t('numerology.fullName')}
                  value={name}
                  onChangeText={setName}
                  placeholderTextColor={Colors.textLight}
                  autoCapitalize="words"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('numerology.dateOfBirth')}</Text>
              <View style={styles.inputContainer}>
                <Calendar size={20} color={Colors.textLight} />
                <TextInput
                  style={styles.input}
                  placeholder={t('numerology.dateFormat')}
                  value={birthDate}
                  onChangeText={setBirthDate}
                  placeholderTextColor={Colors.textLight}
                  keyboardType="numeric"
                  maxLength={10}
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.calculateButton, !isFormValid && styles.calculateButtonDisabled]}
              onPress={handleCalculate}
              disabled={!isFormValid}
            >
              <Sparkles size={20} color={Colors.white} />
              <Text style={styles.calculateButtonText}>{t('numerology.calculate')}</Text>
            </TouchableOpacity>
          </View>

          {/* Results */}
          {result && (
            <View style={styles.results}>
              {/* Main Numbers Grid */}
              <Text style={styles.sectionTitle}>{t('numerology.coreNumbers')}</Text>
              <View style={styles.numbersGrid}>
                <TouchableOpacity
                  style={styles.numberCard}
                  onPress={() => { setSelectedNumber(result.destinyNumber); setShowDetail(true); }}
                >
                  <View style={[styles.numberCircle, { backgroundColor: Colors.primary }]}>
                    <Text style={styles.numberText}>{result.destinyNumber}</Text>
                  </View>
                  <Text style={styles.numberLabel}>{t('numerology.destiny')}</Text>
                  <Text style={styles.numberSubtext}>{t('numerology.expression')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.numberCard}
                  onPress={() => { setSelectedNumber(result.lifePathNumber); setShowDetail(true); }}
                >
                  <View style={[styles.numberCircle, { backgroundColor: Colors.purple }]}>
                    <Text style={styles.numberText}>{result.lifePathNumber}</Text>
                  </View>
                  <Text style={styles.numberLabel}>{t('numerology.lifePath')}</Text>
                  <Text style={styles.numberSubtext}>{t('numerology.purpose')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.numberCard}
                  onPress={() => { setSelectedNumber(result.soulUrgeNumber); setShowDetail(true); }}
                >
                  <View style={[styles.numberCircle, { backgroundColor: Colors.success }]}>
                    <Text style={styles.numberText}>{result.soulUrgeNumber}</Text>
                  </View>
                  <Text style={styles.numberLabel}>{t('numerology.soulUrge')}</Text>
                  <Text style={styles.numberSubtext}>{t('numerology.desires')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.numberCard}
                  onPress={() => { setSelectedNumber(result.personalityNumber); setShowDetail(true); }}
                >
                  <View style={[styles.numberCircle, { backgroundColor: Colors.gold }]}>
                    <Text style={styles.numberText}>{result.personalityNumber}</Text>
                  </View>
                  <Text style={styles.numberLabel}>{t('numerology.personality')}</Text>
                  <Text style={styles.numberSubtext}>{t('numerology.outerSelf')}</Text>
                </TouchableOpacity>
              </View>

              {/* Lucky Section */}
              <View style={styles.luckySection}>
                <View style={styles.luckyCard}>
                  <Star size={20} color={Colors.gold} fill={Colors.gold} />
                  <Text style={styles.luckyTitle}>{t('numerology.luckyNumbers')}</Text>
                  <View style={styles.luckyList}>
                    {result.luckyNumbers.map((num, idx) => (
                      <View key={idx} style={styles.luckyChip}>
                        <Text style={styles.luckyChipText}>{num}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                <View style={styles.luckyCard}>
                  <Star size={20} color={Colors.purple} />
                  <Text style={styles.luckyTitle}>{t('numerology.luckyColors')}</Text>
                  <View style={styles.luckyList}>
                    {result.luckyColors.map((color, idx) => (
                      <View key={idx} style={styles.luckyChip}>
                        <Text style={styles.luckyChipText}>{color}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>

              {/* Personality Traits */}
              <View style={styles.traitsCard}>
                <Text style={styles.traitsTitle}>{t('numerology.personalityTraits')}</Text>
                <View style={styles.traitsList}>
                  {result.strengths.map((trait, idx) => (
                    <View key={idx} style={styles.traitItem}>
                      <ChevronRight size={14} color={Colors.primary} />
                      <Text style={styles.traitText}>{trait}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Career & Love */}
              <View style={styles.adviceSection}>
                <View style={styles.adviceCard}>
                  <Briefcase size={20} color={Colors.primary} />
                  <Text style={styles.adviceTitle}>{t('numerology.careerGuidance')}</Text>
                  <Text style={styles.adviceText}>{result.career}</Text>
                </View>

                <View style={styles.adviceCard}>
                  <Heart size={20} color={Colors.error} />
                  <Text style={styles.adviceTitle}>{t('numerology.loveRelationships')}</Text>
                  <Text style={styles.adviceText}>{result.love}</Text>
                </View>
              </View>

              {/* Challenges */}
              <View style={styles.challengesCard}>
                <AlertCircle size={20} color={Colors.gold} />
                <Text style={styles.challengesTitle}>{t('numerology.areasToWorkOn')}</Text>
                {result.challenges.map((challenge, idx) => (
                  <Text key={idx} style={styles.challengeText}>· {challenge}</Text>
                ))}
              </View>

              {/* Compatibility */}
              <View style={styles.compatibilityCard}>
                <Users size={20} color={Colors.success} />
                <Text style={styles.compatibilityTitle}>{t('numerology.compatibleNumbers')}</Text>
                <View style={styles.compatibleList}>
                  {result.compatibleNumbers.map((num, idx) => (
                    <View key={idx} style={styles.compatibleChip}>
                      <Text style={styles.compatibleText}>{num}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          )}

          {/* Number Meanings Reference */}
          <View style={styles.referenceSection}>
            <Text style={styles.sectionTitle}>{t('numerology.numberMeanings')}</Text>
            {Object.entries(numberMeanings).map(([num, data]) => (
              <TouchableOpacity
                key={num}
                style={styles.meaningCard}
                onPress={() => { setSelectedNumber(Number(num)); setShowDetail(true); }}
              >
                <View style={styles.meaningNumber}>
                  <Text style={styles.meaningNumberText}>{num}</Text>
                </View>
                <View style={styles.meaningInfo}>
                  <Text style={styles.meaningPlanet}>{t('numerology.planet')}: {data.planet}</Text>
                  <Text style={styles.meaningText}>{t('numerology.meaning')}: {data.meaning}</Text>
                </View>
                <ChevronRight size={20} color={Colors.textLight} />
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ height: 20 }} />
        </ScrollView>

        {/* Number Detail Modal */}
        <Modal
          visible={showDetail}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowDetail(false)}
        >
          {selectedNumber && (
            <SafeAreaView style={styles.modal}>
              <View style={styles.modalHeader}>
                <View style={styles.modalTitleRow}>
                  <View style={[styles.modalNumberCircle, { backgroundColor: Colors.primary }]}>
                    <Text style={styles.modalNumberText}>{selectedNumber}</Text>
                  </View>
                  <View>
                    <Text style={styles.modalTitle}>{t('numerology.number')} {selectedNumber}</Text>
                    <Text style={styles.modalSubtitle}>{t('numerology.planet')}: {numberMeanings[selectedNumber]?.planet}</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => setShowDetail(false)}>
                  <X size={24} color={Colors.text} />
                </TouchableOpacity>
              </View>

               <ScrollView style={styles.modalContent}>
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>{t('numerology.meaning')}</Text>
                  <Text style={styles.modalDescription}>
                    {numberMeanings[selectedNumber]?.meaning}
                  </Text>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>{t('numerology.keyTraits')}</Text>
                  <View style={styles.modalTraitsList}>
                    {numberMeanings[selectedNumber]?.traits.map((trait, idx) => (
                      <View key={idx} style={styles.modalTraitItem}>
                        <Star size={14} color={Colors.gold} fill={Colors.gold} />
                        <Text style={styles.modalTraitText}>{trait}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>{t('numerology.rulingPlanet')}</Text>
                  <Text style={styles.modalDescription}>
                    {numberMeanings[selectedNumber]?.planet}
                  </Text>
                </View>
              </ScrollView>
            </SafeAreaView>
          )}
        </Modal>
      </SafeAreaView>
    </>
    </FeatureErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.white,
    opacity: 0.9,
    marginTop: 4,
    textAlign: 'center',
  },
  form: {
    padding: 16,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
  },
  calculateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  calculateButtonDisabled: {
    opacity: 0.5,
  },
  calculateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
  results: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },
  numbersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 20,
  },
  numberCard: {
    width: '48%',
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  numberCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  numberText: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.white,
  },
  numberLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  numberSubtext: {
    fontSize: 11,
    color: Colors.textLight,
    marginTop: 2,
  },
  luckySection: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  luckyCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  luckyTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 6,
    marginBottom: 8,
  },
  luckyList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
  },
  luckyChip: {
    backgroundColor: Colors.background,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  luckyChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.text,
  },
  traitsCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  traitsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  traitsList: {
    gap: 8,
  },
  traitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  traitText: {
    fontSize: 14,
    color: Colors.text,
  },
  adviceSection: {
    gap: 12,
    marginBottom: 16,
  },
  adviceCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
  },
  adviceTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 8,
    marginBottom: 6,
  },
  adviceText: {
    fontSize: 13,
    color: Colors.textLight,
    lineHeight: 20,
  },
  challengesCard: {
    backgroundColor: '#FFF8E1',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  challengesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 8,
    marginBottom: 8,
  },
  challengeText: {
    fontSize: 13,
    color: Colors.text,
    marginBottom: 4,
  },
  compatibilityCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  compatibilityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 8,
    marginBottom: 12,
  },
  compatibleList: {
    flexDirection: 'row',
    gap: 8,
  },
  compatibleChip: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.success,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compatibleText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
  referenceSection: {
    padding: 16,
    paddingTop: 0,
  },
  meaningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  meaningNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  meaningNumberText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.white,
  },
  meaningInfo: {
    flex: 1,
  },
  meaningPlanet: {
    fontSize: 12,
    color: Colors.textLight,
  },
  meaningText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },
  modal: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalNumberCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalNumberText: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.white,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  modalSubtitle: {
    fontSize: 13,
    color: Colors.textLight,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  modalSection: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },
  modalDescription: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 22,
  },
  modalTraitsList: {
    gap: 8,
  },
  modalTraitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTraitText: {
    fontSize: 14,
    color: Colors.text,
  },
});
