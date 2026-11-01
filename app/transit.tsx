import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { 
  Sun, Moon, Mars, Heart, Circle, Star, TrendingUp, 
  ArrowUpRight, ArrowDownRight, AlertTriangle, 
  X, Sparkles, ArrowLeft
} from 'lucide-react-native';
import Colors from '@/constants/colors';

// Planet icon mappings (using available lucide icons)
const Venus = Heart;
const Jupiter = Star;
const Saturn = Circle;
const Mercury = TrendingUp;

interface TransitInfo {
  planet: string;
  sanskritName: string;
  icon: React.ComponentType<{size?: number; color?: string}>;
  color: string;
  currentSign: string;
  previousSign: string;
  nextSign: string;
  transitDate: Date;
  nextTransitDate: Date;
  retrograde: boolean;
  impact: 'positive' | 'neutral' | 'challenging';
  description: string;
  affectedSigns: string[];
}

interface SadeSatiInfo {
  isActive: boolean;
  phase: 1 | 2 | 3 | null;
  startDate: Date | null;
  endDate: Date | null;
  remainingDays: number;
  effects: string[];
  remedies: string[];
  moonSign: string;
}

const zodiacSigns = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
];

const transitData: TransitInfo[] = [
  {
    planet: 'Saturn',
    sanskritName: 'शनि',
    icon: Saturn,
    color: '#1a237e',
    currentSign: 'Aquarius',
    previousSign: 'Capricorn',
    nextSign: 'Pisces',
    transitDate: new Date(2026, 0, 17), // January 17, 2026
    nextTransitDate: new Date(2028, 2, 29), // March 29, 2028
    retrograde: false,
    impact: 'challenging',
    description: 'Saturn is currently in its own sign Aquarius, bringing focus to social causes, technology, and long-term goals.',
    affectedSigns: ['Aquarius', 'Scorpio', 'Pisces', 'Taurus', 'Cancer', 'Leo'],
  },
  {
    planet: 'Jupiter',
    sanskritName: 'गुरु',
    icon: Jupiter,
    color: '#ffc107',
    currentSign: 'Gemini',
    previousSign: 'Taurus',
    nextSign: 'Cancer',
    transitDate: new Date(2026, 4, 14), // May 14, 2026
    nextTransitDate: new Date(2027, 5, 2), // June 2, 2027
    retrograde: false,
    impact: 'positive',
    description: 'Jupiter in Gemini brings intellectual growth, communication skills, and learning opportunities.',
    affectedSigns: ['Gemini', 'Sagittarius', 'Pisces', 'Virgo', 'Cancer'],
  },
  {
    planet: 'Rahu',
    sanskritName: 'राहु',
    icon: TrendingUp,
    color: '#4a148c',
    currentSign: 'Aquarius',
    previousSign: 'Pisces',
    nextSign: 'Capricorn',
    transitDate: new Date(2025, 4, 18), // May 18, 2025
    nextTransitDate: new Date(2027, 2, 15), // March 15, 2027
    retrograde: true,
    impact: 'neutral',
    description: 'Rahu in Aquarius brings innovation, technology focus, and unconventional thinking.',
    affectedSigns: ['Aquarius', 'Leo', 'Taurus', 'Scorpio'],
  },
  {
    planet: 'Ketu',
    sanskritName: 'केतु',
    icon: Moon,
    color: '#795548',
    currentSign: 'Leo',
    previousSign: 'Virgo',
    nextSign: 'Cancer',
    transitDate: new Date(2025, 4, 18), // May 18, 2025
    nextTransitDate: new Date(2027, 2, 15), // March 15, 2027
    retrograde: true,
    impact: 'neutral',
    description: 'Ketu in Leo brings detachment from ego and focus on spiritual growth.',
    affectedSigns: ['Leo', 'Aquarius', 'Taurus', 'Scorpio'],
  },
  {
    planet: 'Mars',
    sanskritName: 'मंगल',
    icon: Mars,
    color: '#d32f2f',
    currentSign: 'Cancer',
    previousSign: 'Gemini',
    nextSign: 'Leo',
    transitDate: new Date(2026, 1, 18), // February 18, 2026
    nextTransitDate: new Date(2026, 3, 2), // April 2, 2026
    retrograde: false,
    impact: 'challenging',
    description: 'Mars in Cancer is debilitated, requiring careful handling of emotions and domestic matters.',
    affectedSigns: ['Cancer', 'Aries', 'Scorpio', 'Capricorn'],
  },
  {
    planet: 'Venus',
    sanskritName: 'शुक्र',
    icon: Venus,
    color: '#e91e63',
    currentSign: 'Pisces',
    previousSign: 'Aquarius',
    nextSign: 'Aries',
    transitDate: new Date(2026, 1, 12), // February 12, 2026
    nextTransitDate: new Date(2026, 2, 8), // March 8, 2026
    retrograde: false,
    impact: 'positive',
    description: 'Venus in Pisces is exalted, bringing divine love, creativity, and spiritual romance.',
    affectedSigns: ['Pisces', 'Taurus', 'Libra', 'Virgo'],
  },
  {
    planet: 'Mercury',
    sanskritName: 'बुध',
    icon: Mercury,
    color: '#00bcd4',
    currentSign: 'Aquarius',
    previousSign: 'Capricorn',
    nextSign: 'Pisces',
    transitDate: new Date(2026, 1, 3), // February 3, 2026
    nextTransitDate: new Date(2026, 1, 20), // February 20, 2026
    retrograde: false,
    impact: 'neutral',
    description: 'Mercury in Aquarius brings innovative thinking and good communication in groups.',
    affectedSigns: ['Aquarius', 'Gemini', 'Virgo'],
  },
  {
    planet: 'Sun',
    sanskritName: 'सूर्य',
    icon: Sun,
    color: '#ff9800',
    currentSign: 'Aquarius',
    previousSign: 'Capricorn',
    nextSign: 'Pisces',
    transitDate: new Date(2026, 1, 13), // February 13, 2026
    nextTransitDate: new Date(2026, 2, 14), // March 14, 2026
    retrograde: false,
    impact: 'positive',
    description: 'Sun in Aquarius brings focus on social causes, friendships, and innovative ideas.',
    affectedSigns: ['Aquarius', 'Leo', 'Aries', 'Cancer'],
  },
  {
    planet: 'Moon',
    sanskritName: 'चंद्र',
    icon: Moon,
    color: '#9c27b0',
    currentSign: 'Cancer',
    previousSign: 'Gemini',
    nextSign: 'Leo',
    transitDate: new Date(),
    nextTransitDate: new Date(Date.now() + 2.5 * 24 * 60 * 60 * 1000),
    retrograde: false,
    impact: 'neutral',
    description: 'Moon changes signs every 2.5 days, affecting emotions and mind.',
    affectedSigns: ['Cancer', 'All Signs'],
  },
];

const sadeSatiPhases = {
  1: { name: 'Rising Phase', description: 'First phase - Challenges begin', effects: ['Financial pressure', 'Career obstacles', 'Health concerns'] },
  2: { name: 'Peak Phase', description: 'Middle phase - Most intense period', effects: ['Major life changes', 'Relationship stress', 'Spiritual growth'] },
  3: { name: 'Setting Phase', description: 'Final phase - Relief begins', effects: ['Improvement in situations', 'Lessons learned', 'New opportunities'] },
};

export default function TransitScreen() {
  const [selectedTransit, setSelectedTransit] = useState<TransitInfo | null>(null);
  const [selectedMoonSign, setSelectedMoonSign] = useState<string | null>(null);
  const [showSadeSati, setShowSadeSati] = useState(false);
  const [sadeSatiResult, setSadeSatiResult] = useState<SadeSatiInfo | null>(null);

  const calculateSadeSati = (moonSign: string) => {
    const saturnSign = 'Aquarius';
    const saturnIndex = zodiacSigns.indexOf(saturnSign);
    const moonIndex = zodiacSigns.indexOf(moonSign);
    
    // Calculate if moon sign is affected by Sade Sati
    const diff = (moonIndex - saturnIndex + 12) % 12;
    
    if (diff === 11 || diff === 0 || diff === 1) {
      let phase: 1 | 2 | 3;
      if (diff === 11) phase = 1;
      else if (diff === 0) phase = 2;
      else phase = 3;

      const result: SadeSatiInfo = {
        isActive: true,
        phase,
        startDate: new Date(2026, 0, 17), // January 17, 2026
        endDate: new Date(2028, 2, 29), // March 29, 2028
        remainingDays: Math.max(0, Math.ceil((new Date(2028, 2, 29).getTime() - Date.now()) / (1000 * 60 * 60 * 24))),
        effects: sadeSatiPhases[phase].effects,
        remedies: [
          'Worship Lord Hanuman on Saturdays',
          'Recite Hanuman Chalisa daily',
          'Donate to the needy on Saturdays',
          'Feed crows and stray animals',
          'Wear black or blue on Saturdays',
          'Light a mustard oil lamp at Shani temple',
        ],
        moonSign,
      };
      setSadeSatiResult(result);
    } else {
      setSadeSatiResult({
        isActive: false,
        phase: null,
        startDate: null,
        endDate: null,
        remainingDays: 0,
        effects: [],
        remedies: [],
        moonSign,
      });
    }
    setShowSadeSati(true);
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'positive': return Colors.success;
      case 'challenging': return Colors.error;
      default: return Colors.gold;
    }
  };

  const getImpactIcon = (impact: string) => {
    switch (impact) {
      case 'positive': return <ArrowUpRight size={16} color={Colors.success} />;
      case 'challenging': return <ArrowDownRight size={16} color={Colors.error} />;
      default: return <Star size={16} color={Colors.gold} />;
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <>
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft color={Colors.text} size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Planetary Transits</Text>
          <View style={styles.backButton} />
        </View>
        
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Sade Sati Calculator */}
          <View style={styles.sadeSatiBanner}>
            <Saturn size={32} color={Colors.white} />
            <View style={styles.sadeSatiInfo}>
              <Text style={styles.sadeSatiTitle}>Sade Sati Calculator</Text>
              <Text style={styles.sadeSatiSubtitle}>Check Saturn&apos;s 7.5 year transit impact</Text>
            </View>
            <TouchableOpacity 
              style={styles.checkButton}
              onPress={() => setSelectedMoonSign('')}
            >
              <Text style={styles.checkButtonText}>Check</Text>
            </TouchableOpacity>
          </View>

          {/* Moon Sign Selector for Sade Sati */}
          {!selectedMoonSign && (
            <View style={styles.moonSignSelector}>
              <Text style={styles.selectorTitle}>Select Your Moon Sign</Text>
              <View style={styles.signGrid}>
                {zodiacSigns.map((sign) => (
                  <TouchableOpacity
                    key={sign}
                    style={styles.signButton}
                    onPress={() => {
                      setSelectedMoonSign(sign);
                      calculateSadeSati(sign);
                    }}
                  >
                    <Text style={styles.signButtonText}>{sign}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Current Transits */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Current Planetary Transits</Text>
            <Text style={styles.sectionSubtitle}>
              Major planetary movements and their effects
            </Text>

            {transitData.map((transit, index) => {
              const IconComponent = transit.icon;
              return (
                <TouchableOpacity
                  key={index}
                  style={styles.transitCard}
                  onPress={() => setSelectedTransit(transit)}
                >
                  <View style={[styles.planetIcon, { backgroundColor: transit.color + '20' }]}>
                    <IconComponent size={28} color={transit.color} />
                  </View>
                  
                  <View style={styles.transitInfo}>
                    <View style={styles.transitHeader}>
                      <View style={styles.planetNameRow}>
                        <Text style={styles.planetName}>{transit.planet}</Text>
                        <Text style={styles.sanskritName}>({transit.sanskritName})</Text>
                      </View>
                      <View style={[styles.impactBadge, { backgroundColor: getImpactColor(transit.impact) + '20' }]}>
                        {getImpactIcon(transit.impact)}
                        <Text style={[styles.impactText, { color: getImpactColor(transit.impact) }]}>
                          {transit.impact}
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.transitDetails}>
                      <View style={styles.signRow}>
                        <Text style={styles.signLabel}>Current:</Text>
                        <Text style={styles.signValue}>{transit.currentSign}</Text>
                      </View>
                      {transit.retrograde && (
                        <View style={styles.retroBadge}>
                          <Text style={styles.retroText}>Retrograde</Text>
                        </View>
                      )}
                    </View>
                    
                    <Text style={styles.nextTransit}>
                      Next transit: {formatDate(transit.nextTransitDate)}
                    </Text>
                  </View>
                  
                  <View style={styles.affectedSigns}>
                    <Text style={styles.affectedLabel}>Affects:</Text>
                    <Text style={styles.affectedText} numberOfLines={1}>
                      {transit.affectedSigns.slice(0, 3).join(', ')}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Transit Calendar */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Upcoming Major Transits</Text>
            
            <View style={styles.calendarCard}>
              <View style={styles.calendarItem}>
                <Jupiter size={24} color="#ffc107" />
                <View style={styles.calendarInfo}>
                  <Text style={styles.calendarPlanet}>Jupiter Transit</Text>
                  <Text style={styles.calendarDate}>May 14, 2026</Text>
                </View>
                <Text style={styles.calendarSign}>Taurus {'>'} Gemini</Text>
              </View>
              
              <View style={styles.calendarItem}>
                <Saturn size={24} color="#1a237e" />
                <View style={styles.calendarInfo}>
                  <Text style={styles.calendarPlanet}>Saturn Transit</Text>
                  <Text style={styles.calendarDate}>March 29, 2028</Text>
                </View>
                <Text style={styles.calendarSign}>Aquarius {'>'} Pisces</Text>
              </View>
              
              <View style={styles.calendarItem}>
                <TrendingUp size={24} color="#4a148c" />
                <View style={styles.calendarInfo}>
                  <Text style={styles.calendarPlanet}>Rahu-Ketu Transit</Text>
                  <Text style={styles.calendarDate}>March 15, 2027</Text>
                </View>
                <Text style={styles.calendarSign}>Pisces/Virgo {'>'} Aquarius/Leo</Text>
              </View>
            </View>
          </View>

          <View style={{ height: 20 }} />
        </ScrollView>

        {/* Transit Detail Modal */}
        <Modal
          visible={!!selectedTransit}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setSelectedTransit(null)}
        >
          {selectedTransit && (
            <SafeAreaView style={styles.modal}>
              <View style={styles.modalHeader}>
                <View style={styles.modalTitleRow}>
                  <View style={[styles.modalPlanetIcon, { backgroundColor: selectedTransit.color }]}>
                    <selectedTransit.icon size={28} color={Colors.white} />
                  </View>
                  <View>
                    <Text style={styles.modalTitle}>{selectedTransit.planet}</Text>
                    <Text style={styles.modalSubtitle}>{selectedTransit.sanskritName}</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => setSelectedTransit(null)}>
                  <X size={24} color={Colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalContent}>
                <View style={styles.modalStatusCard}>
                  <View style={styles.statusRow}>
                    <Text style={styles.statusLabel}>Current Position</Text>
                    <Text style={styles.statusValue}>{selectedTransit.currentSign}</Text>
                  </View>
                  <View style={styles.statusRow}>
                    <Text style={styles.statusLabel}>Impact</Text>
                    <View style={[styles.impactBadge, { backgroundColor: getImpactColor(selectedTransit.impact) + '20' }]}>
                      {getImpactIcon(selectedTransit.impact)}
                      <Text style={[styles.impactText, { color: getImpactColor(selectedTransit.impact) }]}>
                        {selectedTransit.impact}
                      </Text>
                    </View>
                  </View>
                  {selectedTransit.retrograde && (
                    <View style={styles.retroAlert}>
                      <AlertTriangle size={16} color={Colors.gold} />
                      <Text style={styles.retroAlertText}>Currently in Retrograde Motion</Text>
                    </View>
                  )}
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Transit Description</Text>
                  <Text style={styles.modalDescription}>{selectedTransit.description}</Text>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Transit Timeline</Text>
                  <View style={styles.timeline}>
                    <View style={styles.timelineItem}>
                      <Text style={styles.timelineLabel}>Previous</Text>
                      <Text style={styles.timelineValue}>{selectedTransit.previousSign}</Text>
                      <Text style={styles.timelineDate}>{formatDate(selectedTransit.transitDate)}</Text>
                    </View>
                    <View style={[styles.timelineItem, styles.timelineCurrent]}>
                      <Text style={styles.timelineLabel}>Current</Text>
                      <Text style={styles.timelineValue}>{selectedTransit.currentSign}</Text>
                      <Text style={styles.timelineDate}>Now</Text>
                    </View>
                    <View style={styles.timelineItem}>
                      <Text style={styles.timelineLabel}>Next</Text>
                      <Text style={styles.timelineValue}>{selectedTransit.nextSign}</Text>
                      <Text style={styles.timelineDate}>{formatDate(selectedTransit.nextTransitDate)}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Affected Moon Signs</Text>
                  <View style={styles.affectedGrid}>
                    {selectedTransit.affectedSigns.map((sign, idx) => (
                      <View key={idx} style={styles.affectedChip}>
                        <Text style={styles.affectedChipText}>{sign}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </ScrollView>
            </SafeAreaView>
          )}
        </Modal>

        {/* Sade Sati Result Modal */}
        <Modal
          visible={showSadeSati}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowSadeSati(false)}
        >
          <SafeAreaView style={styles.modal}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <Saturn size={32} color="#1a237e" />
                <View>
                  <Text style={styles.modalTitle}>Sade Sati Analysis</Text>
                  <Text style={styles.modalSubtitle}>Moon Sign: {sadeSatiResult?.moonSign}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setShowSadeSati(false)}>
                <X size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              {sadeSatiResult?.isActive ? (
                <>
                  <View style={styles.sadeSatiStatusCard}>
                    <AlertTriangle size={32} color={Colors.error} />
                    <Text style={styles.sadeSatiStatusTitle}>Sade Sati is Active</Text>
                    <Text style={styles.sadeSatiPhase}>
                      Phase {sadeSatiResult.phase}: {sadeSatiPhases[sadeSatiResult.phase!].name}
                    </Text>
                    <Text style={styles.sadeSatiDays}>
                      {sadeSatiResult.remainingDays} days remaining
                    </Text>
                  </View>

                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Current Effects</Text>
                    {sadeSatiResult.effects.map((effect, idx) => (
                      <View key={idx} style={styles.effectItem}>
                        <ArrowDownRight size={16} color={Colors.error} />
                        <Text style={styles.effectText}>{effect}</Text>
                      </View>
                    ))}
                  </View>

                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Recommended Remedies</Text>
                    {sadeSatiResult.remedies.map((remedy, idx) => (
                      <View key={idx} style={styles.remedyItem}>
                        <Sparkles size={16} color={Colors.success} />
                        <Text style={styles.remedyText}>{remedy}</Text>
                      </View>
                    ))}
                  </View>
                </>
              ) : (
                <View style={styles.noSadeSatiCard}>
                  <Star size={48} color={Colors.success} fill={Colors.success} />
                  <Text style={styles.noSadeSatiTitle}>Good News!</Text>
                  <Text style={styles.noSadeSatiText}>
                    You are not currently under Sade Sati influence. Saturn&apos;s position is favorable for your moon sign.
                  </Text>
                </View>
              )}
            </ScrollView>
          </SafeAreaView>
        </Modal>
      </SafeAreaView>
    </>
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
  sadeSatiBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a237e',
    padding: 16,
    gap: 12,
  },
  sadeSatiInfo: {
    flex: 1,
  },
  sadeSatiTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.white,
  },
  sadeSatiSubtitle: {
    fontSize: 12,
    color: Colors.white,
    opacity: 0.9,
    marginTop: 2,
  },
  checkButton: {
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  checkButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a237e',
  },
  moonSignSelector: {
    backgroundColor: Colors.white,
    margin: 16,
    borderRadius: 16,
    padding: 16,
  },
  selectorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  signGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  signButton: {
    width: '30%',
    backgroundColor: Colors.background,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  signButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.text,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: Colors.textLight,
    marginBottom: 16,
  },
  transitCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  planetIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    left: 16,
    top: 16,
  },
  transitInfo: {
    marginLeft: 72,
  },
  transitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  planetNameRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  planetName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  sanskritName: {
    fontSize: 12,
    color: Colors.textLight,
  },
  impactBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  impactText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  transitDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  signRow: {
    flexDirection: 'row',
    gap: 4,
  },
  signLabel: {
    fontSize: 12,
    color: Colors.textLight,
  },
  signValue: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
  },
  retroBadge: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  retroText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#F57C00',
  },
  nextTransit: {
    fontSize: 11,
    color: Colors.textLight,
  },
  affectedSigns: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginLeft: 72,
    gap: 4,
  },
  affectedLabel: {
    fontSize: 11,
    color: Colors.textLight,
  },
  affectedText: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.primary,
    flex: 1,
  },
  calendarCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    gap: 16,
  },
  calendarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  calendarInfo: {
    flex: 1,
  },
  calendarPlanet: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  calendarDate: {
    fontSize: 12,
    color: Colors.textLight,
  },
  calendarSign: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.primary,
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
  modalPlanetIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
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
  modalStatusCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusLabel: {
    fontSize: 14,
    color: Colors.textLight,
  },
  statusValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  retroAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  retroAlertText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#F57C00',
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
  timeline: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timelineItem: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: Colors.background,
    marginHorizontal: 4,
  },
  timelineCurrent: {
    backgroundColor: Colors.primary,
  },
  timelineLabel: {
    fontSize: 11,
    color: Colors.textLight,
  },
  timelineValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginVertical: 4,
  },
  timelineDate: {
    fontSize: 10,
    color: Colors.textLight,
  },
  affectedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  affectedChip: {
    backgroundColor: Colors.background,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  affectedChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.primary,
  },
  sadeSatiStatusCard: {
    backgroundColor: '#FFEBEE',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  sadeSatiStatusTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.error,
    marginTop: 12,
  },
  sadeSatiPhase: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 8,
  },
  sadeSatiDays: {
    fontSize: 14,
    color: Colors.textLight,
    marginTop: 4,
  },
  effectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  effectText: {
    fontSize: 14,
    color: Colors.text,
    flex: 1,
  },
  remedyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  remedyText: {
    fontSize: 14,
    color: Colors.text,
    flex: 1,
  },
  noSadeSatiCard: {
    backgroundColor: '#E8F5E9',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
  },
  noSadeSatiTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.success,
    marginTop: 16,
  },
  noSadeSatiText: {
    fontSize: 14,
    color: Colors.text,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
});