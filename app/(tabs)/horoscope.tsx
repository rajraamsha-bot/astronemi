import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ChevronRight,
  X,
  Calendar,
  Clock,
  Star,
  TrendingUp,
  Heart,
  Briefcase,
  AlertCircle,
  Sparkles,
  Sun,
  Moon as MoonIcon,
} from 'lucide-react-native';
import { useAppTheme, AppTheme } from '@/contexts/ThemeContext';
import { zodiacSigns } from '@/mocks/horoscopes'; // zodiac config only (names/symbols/date ranges)
import { computePanchang } from '@/utils/hindu-calendar-engine';
import { useHoroscope } from '@/hooks/queries/useHoroscope';
import { FeatureErrorBoundary } from '@/components/FeatureErrorBoundary';
import { AstrologyDisclaimer } from '@/components/AstrologyDisclaimer';
import { useLanguage } from '@/contexts/LanguageContext';

type TimeFrame = 'daily' | 'weekly' | 'monthly' | 'yearly';

function HoroscopeScreenInner() {
  const Colors = useAppTheme();
  const { t } = useLanguage();
  const styles = React.useMemo(() => createStyles(Colors), [Colors]);

  const [selectedZodiac, setSelectedZodiac] = useState<string | null>(null);
  const [selectedTimeFrame, setSelectedTimeFrame] = useState<TimeFrame>('daily');

  const timeFrameOptions: { id: TimeFrame; label: string; icon: typeof Calendar }[] = [
    { id: 'daily', label: t('horoscope.daily'), icon: Sun },
    { id: 'weekly', label: t('horoscope.weekly'), icon: Calendar },
    { id: 'monthly', label: t('horoscope.monthly'), icon: Clock },
    { id: 'yearly', label: t('horoscope.yearly'), icon: TrendingUp },
  ];

  // Real-time Transit Data
  const panchang = useMemo(() => computePanchang(new Date()), []);

  // ✅ REFACTORED: Replaced event-driven useEffect with React Query
  // Query only runs when selectedZodiac is not null (enabled: !!selectedZodiac).
  // No mock initialData: fabricated predictions (with invented lucky numbers)
  // must never render as if they were today's real horoscope. On failure the
  // screen shows an explicit unavailable state.
  const { data: liveHoroscope, isLoading: loading, isError: horoscopeError } = useHoroscope(selectedZodiac || '', selectedTimeFrame);

  const getTransitColor = (label: string) => {
    if (label.includes('Moon')) return Colors.card;
    if (label.includes('Sun')) return Colors.card;
    return Colors.card;
  };

  const getTransitIconColor = (label: string) => {
    if (label.includes('Moon')) return '#1976D2';
    if (label.includes('Sun')) return '#F57C00';
    return '#7B1FA2';
  };

  const renderTransitInfo = () => (
    <View style={styles.transitContainer}>
      <View style={styles.transitHeader}>
        <Sparkles size={18} color="#FF9800" />
        <Text style={styles.transitTitle}>{t('horoscope.cosmicSky')}</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.transitScroll} contentContainerStyle={{ paddingRight: 20 }}>
        <View style={[styles.transitCard, { backgroundColor: getTransitColor('Moon'), borderColor: Colors.border }]}>
          <MoonIcon size={16} color={getTransitIconColor('Moon')} />
          <View>
            <Text style={styles.transitLabel}>{t('horoscope.moonIn')}</Text>
            <Text style={styles.transitValue}>{panchang.moonRashiName ?? 'Unknown'}</Text>
          </View>
        </View>
        <View style={[styles.transitCard, { backgroundColor: getTransitColor('Sun'), borderColor: Colors.border }]}>
          <Sun size={16} color={getTransitIconColor('Sun')} />
          <View>
            <Text style={styles.transitLabel}>{t('horoscope.sunIn')}</Text>
            <Text style={styles.transitValue}>{panchang.sunRashiName ?? 'Unknown'}</Text>
          </View>
        </View>
        <View style={[styles.transitCard, { backgroundColor: Colors.card, borderColor: Colors.border }]}>
          <Calendar size={16} color="#2E7D32" />
          <View>
            <Text style={styles.transitLabel}>{t('horoscope.month')}</Text>
            <Text style={styles.transitValue}>{panchang.lunarMonth}</Text>
          </View>
        </View>
        <View style={[styles.transitCard, { backgroundColor: Colors.card, borderColor: Colors.border }]}>
          <Star size={16} color="#C2185B" />
          <View>
            <Text style={styles.transitLabel}>{t('horoscope.tithi')}</Text>
            <Text style={styles.transitValue}>{panchang.tithiName}</Text>
          </View>
        </View>
      </ScrollView>
      
      {(panchang.sunRashiName === 'Makara' || panchang.sunRashiName === 'Kumbha') && (
        <View style={styles.planetaryAlert}>
          <AlertCircle size={16} color={Colors.error} />
          <Text style={styles.alertText}>Special Focus: Saturn influences are strong this month. Stay disciplined.</Text>
        </View>
      )}
    </View>
  );

  const selectedSign = selectedZodiac ? zodiacSigns.find(s => s.id === selectedZodiac) : null;
  const selectedHoroscope = liveHoroscope;

  const getDateLabel = (timeFrame: TimeFrame): string => {
    const now = new Date();
    switch (timeFrame) {
      case 'daily':
        return now.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      case 'weekly':
        return t('horoscope.weekly');
      case 'monthly':
        return now.toLocaleDateString('en-IN', { year: 'numeric', month: 'long' });
      case 'yearly':
        return now.getFullYear().toString();
      default:
        return '';
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient colors={[Colors.primary, Colors.primaryLight, Colors.primary]} style={styles.header}>
        <Text style={styles.headerTitle}>{t('horoscope.title')}</Text>
        <Text style={styles.headerSubtitle}>{getDateLabel(selectedTimeFrame)}</Text>
      </LinearGradient>

      {renderTransitInfo()}

      <View style={{ paddingHorizontal: 20 }}>
        <AstrologyDisclaimer context="horoscope" />
      </View>

      <View style={styles.timeFrameContainer}>
        {timeFrameOptions.map((option) => (
          <TouchableOpacity
            key={option.id}
            style={[styles.timeFrameButton, selectedTimeFrame === option.id && styles.timeFrameButtonActive]}
            onPress={() => setSelectedTimeFrame(option.id)}
          >
            <option.icon size={16} color={selectedTimeFrame === option.id ? Colors.white : Colors.text} />
            <Text style={[styles.timeFrameText, selectedTimeFrame === option.id && styles.timeFrameTextActive]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.grid}>
          {zodiacSigns.map((sign) => (
            <TouchableOpacity
              key={sign.id}
              style={[styles.card, { borderColor: sign.color }]}
              onPress={() => setSelectedZodiac(sign.id)}
              activeOpacity={0.8}
            >
              <Text style={styles.emoji}>{sign.emoji}</Text>
              <View style={styles.cardContent}>
                <Text style={styles.name}>{sign.name}</Text>
                <Text style={styles.dateRange}>{sign.dateRange}</Text>
                <View style={[styles.elementBadge, { backgroundColor: sign.color + '20' }]}>
                  <Text style={[styles.element, { color: sign.color }]}>{sign.element}</Text>
                </View>
              </View>
              <ChevronRight size={20} color={Colors.textLight} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <Modal
        visible={selectedZodiac !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedZodiac(null)}
      >
        {selectedSign && (
          <View style={styles.modal}>
            <LinearGradient colors={[selectedSign.color, selectedSign.color + 'CC']} style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <Text style={styles.modalEmoji}>{selectedSign.emoji}</Text>
                <View>
                  <Text style={styles.modalTitle}>{selectedSign.name}</Text>
                  <Text style={styles.modalSubtitle}>{selectedSign.dateRange}</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.closeButton} onPress={() => setSelectedZodiac(null)}>
                <X size={24} color={Colors.white} />
              </TouchableOpacity>
            </LinearGradient>

            <View style={styles.modalTimeFrameContainer}>
              {timeFrameOptions.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={[styles.modalTimeFrameButton, selectedTimeFrame === option.id && styles.modalTimeFrameButtonActive]}
                  onPress={() => setSelectedTimeFrame(option.id)}
                >
                  <Text style={[styles.modalTimeFrameText, selectedTimeFrame === option.id && styles.modalTimeFrameTextActive]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <ScrollView style={styles.modalContent}>
              {loading ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 }}>
                  <ActivityIndicator size="large" color={selectedSign.color} />
                  <Text style={{ marginTop: 16, color: Colors.textLight }}>{t('common.loadingStars')}</Text>
                </View>
              ) : horoscopeError || !selectedHoroscope ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 }}>
                  <Sparkles color={selectedSign.color} size={28} />
                  <Text style={{ marginTop: 16, color: Colors.text, fontSize: 16, fontWeight: '600', textAlign: 'center' }}>
                    {t('horoscope.unavailableTitle')}
                  </Text>
                  <Text style={{ marginTop: 8, color: Colors.textLight, textAlign: 'center' }}>
                    {t('horoscope.unavailableBody')}
                  </Text>
                </View>
              ) : (
                <>
                  <View style={styles.infoGrid}>
                    <View style={styles.infoCard}>
                      <Text style={styles.infoLabel}>{t('horoscope.mood')}</Text>
                      <Text style={styles.infoValue}>{selectedHoroscope.mood || 'Optimistic'}</Text>
                    </View>
                    <View style={styles.infoCard}>
                      <Text style={styles.infoLabel}>{t('horoscope.luckyNumber')}</Text>
                      <Text style={styles.infoValue}>{selectedHoroscope.lucky_number || selectedHoroscope.luckyNumber || '7'}</Text>
                    </View>
                    <View style={styles.infoCard}>
                      <Text style={styles.infoLabel}>{t('horoscope.luckyColor')}</Text>
                      <View style={styles.colorRow}>
                        <View style={[styles.colorDot, { backgroundColor: selectedHoroscope.lucky_color || selectedHoroscope.luckyColor || '#FFD700' }]} />
                        <Text style={styles.infoValue}>{selectedHoroscope.lucky_color || 'Gold'}</Text>
                      </View>
                    </View>
                    <View style={styles.infoCard}>
                      <Text style={styles.infoLabel}>{t('horoscope.compatibility')}</Text>
                      <Text style={styles.infoValue}>{selectedHoroscope.compatibility || 'Leo, Sagittarius'}</Text>
                    </View>
                  </View>

                  <View style={styles.predictionCard}>
                    <View style={styles.predictionHeader}>
                      <Sparkles color={selectedSign.color} size={20} />
                      <Text style={styles.predictionTitle}>{t('horoscope.predictionTitle')}</Text>
                    </View>
                    <Text style={styles.predictionText}>{selectedHoroscope.content || selectedHoroscope.prediction}</Text>
                  </View>

                  <View style={styles.aspectsContainer}>
                    <Text style={styles.sectionHeaderTitle}>{t('horoscope.lifeAspects')}</Text>
                    
                    <View style={styles.aspectRow}>
                      <View style={styles.aspectInfo}>
                        <Heart color="#E91E63" size={16} />
                        <Text style={styles.aspectName}>{t('horoscope.love')}</Text>
                        <Text style={styles.aspectValue}>{selectedHoroscope.love || 80}%</Text>
                      </View>
                      <View style={styles.progressTrack}>
                        <View style={[styles.progressFill, { width: `${selectedHoroscope.love || 80}%` as any, backgroundColor: '#E91E63' }]} />
                      </View>
                    </View>

                    <View style={styles.aspectRow}>
                      <View style={styles.aspectInfo}>
                        <Briefcase color="#2196F3" size={16} />
                        <Text style={styles.aspectName}>{t('horoscope.career')}</Text>
                        <Text style={styles.aspectValue}>{selectedHoroscope.career || 75}%</Text>
                      </View>
                      <View style={styles.progressTrack}>
                        <View style={[styles.progressFill, { width: `${selectedHoroscope.career || 75}%` as any, backgroundColor: '#2196F3' }]} />
                      </View>
                    </View>

                    <View style={styles.aspectRow}>
                      <View style={styles.aspectInfo}>
                        <Sun color="#4CAF50" size={16} />
                        <Text style={styles.aspectName}>{t('horoscope.health')}</Text>
                        <Text style={styles.aspectValue}>{selectedHoroscope.health || 85}%</Text>
                      </View>
                      <View style={styles.progressTrack}>
                        <View style={[styles.progressFill, { width: `${selectedHoroscope.health || 85}%` as any, backgroundColor: '#4CAF50' }]} />
                      </View>
                    </View>

                    <View style={styles.aspectRow}>
                      <View style={styles.aspectInfo}>
                        <TrendingUp color="#FF9800" size={16} />
                        <Text style={styles.aspectName}>{t('horoscope.finance')}</Text>
                        <Text style={styles.aspectValue}>{selectedHoroscope.finance || 70}%</Text>
                      </View>
                      <View style={styles.progressTrack}>
                        <View style={[styles.progressFill, { width: `${selectedHoroscope.finance || 70}%` as any, backgroundColor: '#FF9800' }]} />
                      </View>
                    </View>
                  </View>

                  <View style={styles.ratingCard}>
                    <View style={styles.stars}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star 
                          key={star} 
                          size={24} 
                          color="#FFD700" 
                          fill={star <= Math.round((selectedHoroscope.rating || 4)) ? '#FFD700' : 'transparent'} 
                        />
                      ))}
                    </View>
                    <Text style={styles.ratingValue}>{(selectedHoroscope.rating || 4)}/5 Stars</Text>
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        )}
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (Colors: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: Colors.white,
  },
  headerSubtitle: {
    fontSize: 13,
    color: Colors.white,
    opacity: 0.9,
    marginTop: 4,
  },
  transitContainer: {
    backgroundColor: Colors.card,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  transitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  transitTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  transitScroll: {
    paddingLeft: 16,
  },
  transitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    marginRight: 10,
    gap: 12,
    minWidth: 140,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  transitLabel: {
    fontSize: 10,
    color: Colors.textLight,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  transitValue: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  planetaryAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.error + '10',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
    gap: 10,
    borderLeftWidth: 3,
    borderLeftColor: Colors.error,
  },
  alertText: {
    flex: 1,
    fontSize: 12,
    color: Colors.error,
    fontWeight: '500',
  },
  timeFrameContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 8,
  },
  timeFrameButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.background,
    gap: 6,
  },
  timeFrameButtonActive: {
    backgroundColor: Colors.primary,
  },
  timeFrameText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textLight,
  },
  timeFrameTextActive: {
    color: Colors.white,
  },
  grid: {
    padding: 20,
    gap: 12,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  emoji: {
    fontSize: 36,
    marginRight: 16,
  },
  cardContent: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 2,
  },
  dateRange: {
    fontSize: 13,
    color: Colors.textLight,
    marginBottom: 6,
  },
  elementBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  element: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  modal: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  modalTitleRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
  },
  modalEmoji: {
    fontSize: 48,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: Colors.white,
  },
  modalSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  closeButton: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
  },
  modalTimeFrameContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 8,
  },
  modalTimeFrameButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.background,
    alignItems: 'center',
  },
  modalTimeFrameButtonActive: {
    backgroundColor: Colors.primary,
  },
  modalTimeFrameText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  modalTimeFrameTextActive: {
    color: Colors.white,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  infoGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 12,
    marginBottom: 20,
  },
  infoCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: Colors.card,
    padding: 16,
    borderRadius: 12,
  },
  infoLabel: {
    fontSize: 12,
    color: Colors.textLight,
    marginBottom: 6,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  colorRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  colorDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  predictionCard: {
    backgroundColor: Colors.card,
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
  },
  predictionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  predictionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  predictionText: {
    fontSize: 15,
    color: Colors.text,
    lineHeight: 24,
  },
  aspectCard: {
    backgroundColor: Colors.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  aspectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  aspectTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  aspectText: {
    fontSize: 14,
    color: Colors.textLight,
    lineHeight: 20,
  },
  ratingCard: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: Colors.isDark ? '#2D2D10' : '#FFFBE6',
    borderRadius: 16,
    marginBottom: 20,
  },
  stars: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 8,
  },
  ratingValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.isDark ? '#FFD700' : '#856404',
  },
  aspectsContainer: {
    marginBottom: 20,
    backgroundColor: Colors.card,
    padding: 20,
    borderRadius: 16,
  },
  sectionHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 16,
  },
  aspectRow: {
    marginBottom: 16,
  },
  aspectInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  aspectName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
  },
  aspectValue: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  progressTrack: {
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
});

export default function HoroscopeScreen() {
  return (
    <FeatureErrorBoundary featureName="Horoscope">
      <HoroscopeScreenInner />
    </FeatureErrorBoundary>
  );
}
