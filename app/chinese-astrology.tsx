import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  Info,
  ChevronDown,
  ChevronUp,
  Star,
} from 'lucide-react-native';
import { router } from 'expo-router';
import Colors from '@/constants/colors';

interface ChineseZodiac {
  name: string;
  years: number[];
  element: string;
  yinYang: string;
  traits: string[];
  compatible: string[];
  luckyNumbers: number[];
  luckyColors: string[];
}

const chineseZodiacs: ChineseZodiac[] = [
  {
    name: 'Rat',
    years: [1960, 1972, 1984, 1996, 2008, 2020],
    element: 'Water',
    yinYang: 'Yang',
    traits: ['Quick-witted', 'Resourceful', 'Versatile', 'Kind'],
    compatible: ['Dragon', 'Monkey', 'Ox'],
    luckyNumbers: [2, 3],
    luckyColors: ['Blue', 'Gold', 'Green'],
  },
  {
    name: 'Ox',
    years: [1961, 1973, 1985, 1997, 2009, 2021],
    element: 'Earth',
    yinYang: 'Yin',
    traits: ['Diligent', 'Dependable', 'Strong', 'Determined'],
    compatible: ['Rat', 'Snake', 'Rooster'],
    luckyNumbers: [1, 9],
    luckyColors: ['White', 'Yellow', 'Green'],
  },
  {
    name: 'Tiger',
    years: [1962, 1974, 1986, 1998, 2010, 2022],
    element: 'Wood',
    yinYang: 'Yang',
    traits: ['Brave', 'Competitive', 'Confident', 'Ambitious'],
    compatible: ['Horse', 'Dog', 'Pig'],
    luckyNumbers: [1, 3, 4],
    luckyColors: ['Blue', 'Grey', 'Orange'],
  },
  {
    name: 'Rabbit',
    years: [1963, 1975, 1987, 1999, 2011, 2023],
    element: 'Wood',
    yinYang: 'Yin',
    traits: ['Gentle', 'Quiet', 'Elegant', 'Alert'],
    compatible: ['Goat', 'Pig', 'Dog'],
    luckyNumbers: [3, 4, 6],
    luckyColors: ['Red', 'Pink', 'Purple'],
  },
  {
    name: 'Dragon',
    years: [1964, 1976, 1988, 2000, 2012, 2024],
    element: 'Earth',
    yinYang: 'Yang',
    traits: ['Confident', 'Intelligent', 'Enthusiastic', 'Ambitious'],
    compatible: ['Rat', 'Monkey', 'Rooster'],
    luckyNumbers: [1, 6, 7],
    luckyColors: ['Gold', 'Silver', 'Grey'],
  },
  {
    name: 'Snake',
    years: [1965, 1977, 1989, 2001, 2013, 2025],
    element: 'Fire',
    yinYang: 'Yin',
    traits: ['Intuitive', 'Wise', 'Enigmatic', 'Elegant'],
    compatible: ['Ox', 'Rooster', 'Dragon'],
    luckyNumbers: [2, 8, 9],
    luckyColors: ['Black', 'Red', 'Yellow'],
  },
  {
    name: 'Horse',
    years: [1966, 1978, 1990, 2002, 2014, 2026],
    element: 'Fire',
    yinYang: 'Yang',
    traits: ['Animated', 'Active', 'Energetic', 'Free-spirited'],
    compatible: ['Tiger', 'Goat', 'Dog'],
    luckyNumbers: [2, 3, 7],
    luckyColors: ['Yellow', 'Green', 'Purple'],
  },
  {
    name: 'Goat',
    years: [1967, 1979, 1991, 2003, 2015, 2027],
    element: 'Earth',
    yinYang: 'Yin',
    traits: ['Calm', 'Gentle', 'Sympathetic', 'Creative'],
    compatible: ['Rabbit', 'Horse', 'Pig'],
    luckyNumbers: [2, 7],
    luckyColors: ['Brown', 'Red', 'Purple'],
  },
  {
    name: 'Monkey',
    years: [1968, 1980, 1992, 2004, 2016, 2028],
    element: 'Metal',
    yinYang: 'Yang',
    traits: ['Sharp', 'Curious', 'Mischievous', 'Clever'],
    compatible: ['Rat', 'Dragon', 'Snake'],
    luckyNumbers: [4, 9],
    luckyColors: ['White', 'Blue', 'Gold'],
  },
  {
    name: 'Rooster',
    years: [1969, 1981, 1993, 2005, 2017, 2029],
    element: 'Metal',
    yinYang: 'Yin',
    traits: ['Observant', 'Hardworking', 'Courageous', 'Talented'],
    compatible: ['Ox', 'Snake', 'Dragon'],
    luckyNumbers: [5, 7, 8],
    luckyColors: ['Gold', 'Brown', 'Yellow'],
  },
  {
    name: 'Dog',
    years: [1970, 1982, 1994, 2006, 2018, 2030],
    element: 'Earth',
    yinYang: 'Yang',
    traits: ['Loyal', 'Honest', 'Reliable', 'Sincere'],
    compatible: ['Tiger', 'Rabbit', 'Horse'],
    luckyNumbers: [3, 4, 9],
    luckyColors: ['Red', 'Green', 'Purple'],
  },
  {
    name: 'Pig',
    years: [1971, 1983, 1995, 2007, 2019, 2031],
    element: 'Water',
    yinYang: 'Yin',
    traits: ['Compassionate', 'Generous', 'Diligent', 'Easy-going'],
    compatible: ['Tiger', 'Rabbit', 'Goat'],
    luckyNumbers: [2, 5, 8],
    luckyColors: ['Yellow', 'Grey', 'Brown'],
  },
];

const elements = [
  { name: 'Wood', color: '#4CAF50', traits: ['Growth', 'Creativity', 'Flexibility'] },
  { name: 'Fire', color: '#F44336', traits: ['Passion', 'Energy', 'Transformation'] },
  { name: 'Earth', color: '#795548', traits: ['Stability', 'Nurturing', 'Grounding'] },
  { name: 'Metal', color: '#607D8B', traits: ['Strength', 'Determination', 'Focus'] },
  { name: 'Water', color: '#2196F3', traits: ['Wisdom', 'Intuition', 'Adaptability'] },
];

export default function ChineseAstrologyScreen() {
  const [selectedYear, setSelectedYear] = useState<number>(1990);
  const [showElements, setShowElements] = useState(false);

  const getZodiacByYear = (year: number): ChineseZodiac => {
    const index = (year - 4) % 12;
    const adjustedIndex = index >= 0 ? index : index + 12;
    const zodiac = chineseZodiacs[adjustedIndex];
    return zodiac!;
  };

  const zodiac = getZodiacByYear(selectedYear);

  const renderZodiacCard = (z: ChineseZodiac) => (
    <TouchableOpacity
      key={z.name}
      style={[
        styles.zodiacCard,
        zodiac.name === z.name && styles.zodiacCardActive,
      ]}
      onPress={() => {
        setSelectedYear(z.years[z.years.length - 1] ?? 0);
      }}
    >
      <Text style={styles.zodiacEmoji}>
        {z.name === 'Rat' && ' RAT'}
        {z.name === 'Ox' && ' OX'}
        {z.name === 'Tiger' && ' TIGER'}
        {z.name === 'Rabbit' && ' RABBIT'}
        {z.name === 'Dragon' && ' DRAGON'}
        {z.name === 'Snake' && ' SNAKE'}
        {z.name === 'Horse' && ' HORSE'}
        {z.name === 'Goat' && ' GOAT'}
        {z.name === 'Monkey' && ' MONKEY'}
        {z.name === 'Rooster' && ' ROOSTER'}
        {z.name === 'Dog' && ' DOG'}
        {z.name === 'Pig' && ' PIG'}
      </Text>
      <Text style={styles.zodiacName}>{z.name}</Text>
      <Text style={styles.zodiacYears}>
        {z.years.slice(-3).join(', ')}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#B71C1C', '#C62828', '#D32F2F']}
        style={styles.header}
      >
        <SafeAreaView edges={['top']}>
          <View style={styles.headerContent}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <ArrowLeft color="#FFF" size={24} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Chinese Astrology</Text>
            <TouchableOpacity style={styles.infoButton}>
              <Info color="#FFF" size={22} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoCardHeader}>
            <Star color="#FFD700" size={20} />
            <Text style={styles.infoCardTitle}>Chinese Zodiac</Text>
          </View>
          <Text style={styles.infoCardText}>
            The Chinese zodiac is a classification scheme based on the lunar calendar.
            Each year is associated with an animal sign that repeats every 12 years.
            The system also incorporates five elements and Yin-Yang principles.
          </Text>
        </View>

        {/* Year Selector */}
        <View style={styles.yearSection}>
          <Text style={styles.sectionTitle}>Select Your Birth Year</Text>
          <View style={styles.yearGrid}>
            {[1990, 1991, 1992, 1993, 1994, 1995, 1996, 1997, 1998, 1999, 2000, 2001].map((year) => (
              <TouchableOpacity
                key={year}
                style={[
                  styles.yearButton,
                  selectedYear === year && styles.yearButtonActive,
                ]}
                onPress={() => setSelectedYear(year)}
              >
                <Text
                  style={[
                    styles.yearButtonText,
                    selectedYear === year && styles.yearButtonTextActive,
                  ]}
                >
                  {year}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Your Zodiac */}
        <View style={styles.resultSection}>
          <Text style={styles.resultTitle}>Your Chinese Zodiac</Text>
          <View style={styles.resultCard}>
            <Text style={styles.resultEmoji}>
              {zodiac.name === 'Rat' && ' RAT'}
              {zodiac.name === 'Ox' && ' OX'}
              {zodiac.name === 'Tiger' && ' TIGER'}
              {zodiac.name === 'Rabbit' && ' RABBIT'}
              {zodiac.name === 'Dragon' && ' DRAGON'}
              {zodiac.name === 'Snake' && ' SNAKE'}
              {zodiac.name === 'Horse' && ' HORSE'}
              {zodiac.name === 'Goat' && ' GOAT'}
              {zodiac.name === 'Monkey' && ' MONKEY'}
              {zodiac.name === 'Rooster' && ' ROOSTER'}
              {zodiac.name === 'Dog' && ' DOG'}
              {zodiac.name === 'Pig' && ' PIG'}
            </Text>
            <Text style={styles.resultName}>{zodiac.name}</Text>
            <View style={styles.resultDetails}>
              <View style={styles.resultDetail}>
                <Text style={styles.resultDetailLabel}>Element</Text>
                <Text style={styles.resultDetailValue}>{zodiac.element}</Text>
              </View>
              <View style={styles.resultDetail}>
                <Text style={styles.resultDetailLabel}>Yin/Yang</Text>
                <Text style={styles.resultDetailValue}>{zodiac.yinYang}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Traits */}
        <View style={styles.traitsSection}>
          <Text style={styles.sectionTitle}>Personality Traits</Text>
          <View style={styles.traitsContainer}>
            {zodiac.traits.map((trait, index) => (
              <View key={index} style={styles.traitBadge}>
                <Text style={styles.traitText}>{trait}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Compatibility */}
        <View style={styles.compatibilitySection}>
          <Text style={styles.sectionTitle}>Most Compatible With</Text>
          <View style={styles.compatibleContainer}>
            {zodiac.compatible.map((name, index) => (
              <View key={index} style={styles.compatibleBadge}>
                <Text style={styles.compatibleText}>{name}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Lucky Items */}
        <View style={styles.luckySection}>
          <Text style={styles.sectionTitle}>Lucky Items</Text>
          <View style={styles.luckyRow}>
            <View style={styles.luckyItem}>
              <Text style={styles.luckyLabel}>Numbers</Text>
              <Text style={styles.luckyValue}>{zodiac.luckyNumbers.join(', ')}</Text>
            </View>
            <View style={styles.luckyItem}>
              <Text style={styles.luckyLabel}>Colors</Text>
              <Text style={styles.luckyValue}>{zodiac.luckyColors.join(', ')}</Text>
            </View>
          </View>
        </View>

        {/* All Zodiacs */}
        <View style={styles.allZodiacsSection}>
          <Text style={styles.sectionTitle}>All Chinese Zodiacs</Text>
          <View style={styles.zodiacGrid}>
            {chineseZodiacs.map(renderZodiacCard)}
          </View>
        </View>

        {/* Five Elements */}
        <View style={styles.elementsSection}>
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => setShowElements(!showElements)}
          >
            <Text style={styles.sectionTitle}>Five Elements</Text>
            {showElements ? (
              <ChevronUp color={Colors.text} size={20} />
            ) : (
              <ChevronDown color={Colors.text} size={20} />
            )}
          </TouchableOpacity>
          {showElements && (
            <View style={styles.elementsGrid}>
              {elements.map((element) => (
                <View key={element.name} style={styles.elementCard}>
                  <View style={[styles.elementIcon, { backgroundColor: element.color }]}>
                    <Text style={styles.elementIconText}>
                      {element.name.charAt(0)}
                    </Text>
                  </View>
                  <Text style={styles.elementName}>{element.name}</Text>
                  <View style={styles.elementTraits}>
                    {element.traits.map((trait, i) => (
                      <Text key={i} style={styles.elementTrait}>{trait}</Text>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingBottom: 12,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
  },
  infoButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCard: {
    margin: 16,
    padding: 16,
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  infoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  infoCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  infoCardText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  yearSection: {
    margin: 16,
    marginTop: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },
  yearGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  yearButton: {
    width: '23%',
    backgroundColor: Colors.white,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  yearButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  yearButtonText: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500',
  },
  yearButtonTextActive: {
    color: '#FFF',
  },
  resultSection: {
    margin: 16,
    marginTop: 0,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 12,
    textAlign: 'center',
  },
  resultCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  resultEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  resultName: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 16,
  },
  resultDetails: {
    flexDirection: 'row',
    gap: 24,
  },
  resultDetail: {
    alignItems: 'center',
  },
  resultDetailLabel: {
    fontSize: 12,
    color: Colors.textLight,
    marginBottom: 4,
  },
  resultDetailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  traitsSection: {
    margin: 16,
    marginTop: 0,
  },
  traitsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  traitBadge: {
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  traitText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '500',
  },
  compatibilitySection: {
    margin: 16,
    marginTop: 0,
  },
  compatibleContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  compatibleBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  compatibleText: {
    fontSize: 14,
    color: '#2E7D32',
    fontWeight: '600',
  },
  luckySection: {
    margin: 16,
    marginTop: 0,
  },
  luckyRow: {
    flexDirection: 'row',
    gap: 16,
  },
  luckyItem: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  luckyLabel: {
    fontSize: 12,
    color: Colors.textLight,
    marginBottom: 4,
  },
  luckyValue: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  allZodiacsSection: {
    margin: 16,
    marginTop: 0,
  },
  zodiacGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  zodiacCard: {
    width: '31%',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  zodiacCardActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  zodiacEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  zodiacName: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  zodiacYears: {
    fontSize: 10,
    color: Colors.textLight,
  },
  elementsSection: {
    margin: 16,
    marginTop: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  elementsGrid: {
    marginTop: 12,
    gap: 10,
  },
  elementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  elementIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  elementIconText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  elementName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    width: 70,
  },
  elementTraits: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
  },
  elementTrait: {
    fontSize: 12,
    color: Colors.textSecondary,
    backgroundColor: Colors.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
});
