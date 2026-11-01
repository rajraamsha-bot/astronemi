/**
 * Gem Recommendation — powered by `utils/astrology-remedies.ts`.
 * Uses the user's natal chart (Lagna + lords of 1/5/9 + Yoga Karaka) to
 * recommend life, wisdom, and fortune gemstones. Planets in dusthana
 * houses (6, 8, 12) are filtered out by the engine per standard BPHS.
 */

import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  ChevronRight,
  Diamond,
  Heart,
  Info,
  Shield,
  ShoppingCart,
  Sparkles,
  Star,
} from 'lucide-react-native';
import { router } from 'expo-router';
import Colors from '@/constants/colors';
import { useKundliData } from '@/hooks/useKundliData';
import type { GemstoneRecommendation } from '@/utils/astrology-remedies';
import { FeatureErrorBoundary } from '@/components/FeatureErrorBoundary';

// Planets that can act as functional malefics for any ascendant; users who
// see them as a recommended gemstone should double-check with an astrologer.
const CAUTION_PLANETS = new Set(['Saturn', 'Rahu', 'Ketu']);

const DAYS_BY_PLANET: Record<string, string> = {
  Sun: 'Sunday', Moon: 'Monday', Mars: 'Tuesday', Mercury: 'Wednesday',
  Jupiter: 'Thursday', Venus: 'Friday', Saturn: 'Saturday',
};

function mantraFor(planet: string): string {
  const map: Record<string, string> = {
    Sun: 'Om Hrim Hrim Suryaya Namah',
    Moon: 'Om Som Somaya Namah',
    Mars: 'Om Ang Angarkaya Namah',
    Mercury: 'Om Aim Bum Budhaya Namah',
    Jupiter: 'Om Brim Brihaspataye Namah',
    Venus: 'Om Shum Shukraya Namah',
    Saturn: 'Om Sham Shanaishcharaya Namah',
  };
  return map[planet] ?? '';
}

function priceRangeFor(purpose: GemstoneRecommendation['purpose']): string {
  switch (purpose) {
    case 'Life':
      return '₹5,000 – ₹50,000';
    case 'Fortuna':
      return '₹10,000 – ₹1,00,000';
    case 'Wisdom':
      return '₹8,000 – ₹80,000';
  }
}

function GemCard({
  gem,
  favorite,
  onToggleFavorite,
  onPress,
}: {
  gem: GemstoneRecommendation;
  favorite: boolean;
  onToggleFavorite: () => void;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.gemCard} onPress={onPress} accessibilityRole="button">
      <View style={[styles.gemImagePlaceholder, { backgroundColor: `${gem.color}20` }]}>
        <Diamond color={gem.color} size={36} />
      </View>
      <View style={styles.gemInfo}>
        <View style={styles.gemHeader}>
          <View>
            <Text style={styles.gemName}>{gem.name}</Text>
            <Text style={styles.gemHindiName}>{gem.hindiName}</Text>
          </View>
          <TouchableOpacity
            onPress={onToggleFavorite}
            style={styles.favoriteButton}
            accessibilityLabel={favorite ? 'Remove from favourites' : 'Add to favourites'}
          >
            <Heart
              size={20}
              color={favorite ? '#E91E63' : Colors.textLight}
              fill={favorite ? '#E91E63' : 'transparent'}
            />
          </TouchableOpacity>
        </View>
        <Text style={styles.gemPlanet}>
          Planet: {gem.planet} · {gem.purpose} stone
        </Text>
        <View style={styles.gemFooter}>
          <Text style={styles.gemPrice}>{priceRangeFor(gem.purpose)}</Text>
          {CAUTION_PLANETS.has(gem.planet) ? (
            <View style={styles.cautionBadge}>
              <Text style={styles.cautionText}>Consult first</Text>
            </View>
          ) : (
            <View style={styles.inStockBadge}>
              <Text style={styles.inStockText}>Recommended</Text>
            </View>
          )}
        </View>
      </View>
      <ChevronRight color={Colors.textLight} size={20} />
    </TouchableOpacity>
  );
}

function GemDetailOverlay({ gem, onClose }: { gem: GemstoneRecommendation; onClose: () => void }) {
  return (
    <View style={styles.gemDetailOverlay}>
      <View style={styles.gemDetailCard}>
        <View style={styles.gemDetailHeader}>
          <View style={[styles.gemDetailImage, { backgroundColor: `${gem.color}20` }]}>
            <Diamond color={gem.color} size={60} />
          </View>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            accessibilityLabel="Close detail"
          >
            <Text style={styles.closeButtonText}>×</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.gemDetailName}>{gem.name}</Text>
        <Text style={styles.gemDetailHindi}>
          {gem.hindiName} · {gem.planet}
        </Text>

        <View style={styles.benefitsSection}>
          <Text style={styles.benefitsTitle}>Benefits</Text>
          {gem.benefits.map((benefit, i) => (
            <View key={`${benefit}-${i}`} style={styles.benefitItem}>
              <Star color="#FFD700" size={14} fill="#FFD700" />
              <Text style={styles.benefitText}>{benefit}</Text>
            </View>
          ))}
        </View>

        <View style={styles.instructionsSection}>
          <Text style={styles.instructionsTitle}>Wearing Instructions</Text>
          <View style={styles.instructionRow}>
            <Text style={styles.instructionLabel}>Finger</Text>
            <Text style={styles.instructionValue}>{gem.instructions.finger}</Text>
          </View>
          <View style={styles.instructionRow}>
            <Text style={styles.instructionLabel}>Metal</Text>
            <Text style={styles.instructionValue}>{gem.instructions.metal}</Text>
          </View>
          <View style={styles.instructionRow}>
            <Text style={styles.instructionLabel}>Day</Text>
            <Text style={styles.instructionValue}>
              {gem.instructions.day || DAYS_BY_PLANET[gem.planet] || '—'}
            </Text>
          </View>
          <View style={styles.instructionRow}>
            <Text style={styles.instructionLabel}>Weight</Text>
            <Text style={styles.instructionValue}>{gem.instructions.weight}</Text>
          </View>
          {mantraFor(gem.planet) && (
            <View style={styles.mantraBox}>
              <Text style={styles.mantraLabel}>Mantra</Text>
              <Text style={styles.mantraText}>{mantraFor(gem.planet)}</Text>
            </View>
          )}
        </View>

        <View style={styles.priceSection}>
          <Text style={styles.priceLabel}>Typical price range</Text>
          <Text style={styles.priceValue}>{priceRangeFor(gem.purpose)}</Text>
        </View>

        <TouchableOpacity
          style={styles.buyButton}
          onPress={() => {
            onClose();
            router.push('/shop');
          }}
          accessibilityRole="button"
        >
          <ShoppingCart color="#FFF" size={20} />
          <Text style={styles.buyButtonText}>Shop certified gems</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

function GemRecommendationInner() {
  const { data: kundli, isLoading, error, noBirthDetails } = useKundliData();
  const [selectedGem, setSelectedGem] = useState<GemstoneRecommendation | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);

  const recommended: GemstoneRecommendation[] = useMemo(() => kundli?.gemstones ?? [], [kundli]);

  const toggleFavorite = (name: string) => {
    setFavorites(prev => (prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]));
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#9C27B0', '#AB47BC', '#BA68C8']} style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerContent}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <ArrowLeft color="#FFF" size={24} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Gem Recommendation</Text>
            <View style={styles.infoButton}>
              <Info color="#FFF" size={22} />
            </View>
          </View>
        </SafeAreaView>

        <View style={styles.headerInfo}>
          <Text style={styles.headerSubtitle}>Ratna Suggestion</Text>
          <Text style={styles.headerDescription}>
            Personalised gemstones based on your birth chart
          </Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {noBirthDetails && <NoBirthDetailsPrompt />}
        {isLoading && <LoadingState />}
        {error && !noBirthDetails && (
          <ErrorState message="Couldn't compute gem recommendations. Check your birth details." />
        )}

        {kundli && !isLoading && (
          <View style={styles.resultSection}>
            <View style={styles.chartSummary}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Lagna</Text>
                <Text style={styles.summaryValue}>{kundli.ascendant.sign}</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Moon Sign</Text>
                <Text style={styles.summaryValue}>
                  {kundli.planets.find(p => p.name === 'Moon')?.sign ?? '—'}
                </Text>
              </View>
            </View>

            <View style={styles.adviceCard}>
              <Text style={styles.adviceTitle}>How this is calculated</Text>
              <Text style={styles.adviceText}>
                Gemstones are recommended for the lords of your 1st (Life stone),
                5th (Wisdom), and 9th (Fortune) houses, plus any Yoga Karaka for
                your ascendant. Planets placed in dusthana houses (6, 8, 12) are
                filtered out. Always consult a qualified astrologer before
                wearing a stone.
              </Text>
            </View>

            {recommended.length > 0 ? (
              <>
                <Text style={styles.sectionTitle}>Recommended Gemstones</Text>
                {recommended.map(gem => (
                  <GemCard
                    key={`${gem.planet}-${gem.purpose}`}
                    gem={gem}
                    favorite={favorites.includes(gem.name)}
                    onToggleFavorite={() => toggleFavorite(gem.name)}
                    onPress={() => setSelectedGem(gem)}
                  />
                ))}
              </>
            ) : (
              <View style={styles.emptyCard}>
                <Shield color="#F44336" size={20} />
                <Text style={styles.emptyText}>
                  No gemstones are clearly indicated by this chart right now.
                  Strong planets in dusthana houses (6, 8, 12) are intentionally
                  excluded. Consider consulting an astrologer for nuanced advice.
                </Text>
              </View>
            )}

            <View style={styles.warningCard}>
              <Sparkles color="#FF9800" size={18} />
              <Text style={styles.warningCardText}>
                Gemstones are powerful. Always buy natural, untreated stones from
                a certified source and energise them on the correct day before
                wearing.
              </Text>
            </View>
          </View>
        )}

        {selectedGem && (
          <GemDetailOverlay gem={selectedGem} onClose={() => setSelectedGem(null)} />
        )}

        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>About Gemstone Therapy</Text>
          <Text style={styles.infoText}>
            In Vedic astrology, gemstones are prescribed to strengthen benefic
            planets in your chart. Each stone resonates with a specific planet
            and, when worn correctly, channels that planet&apos;s energy.
          </Text>
          <Text style={styles.warningText}>
            Always consult a qualified astrologer before wearing any gemstone.
            Wearing the wrong stone can intensify unwanted planetary effects.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function NoBirthDetailsPrompt() {
  return (
    <View style={styles.promptCard}>
      <Text style={styles.promptTitle}>Enter your birth details first</Text>
      <Text style={styles.promptText}>
        Gemstone recommendations are personalised to your natal chart. Add your
        date, time, and place of birth to continue.
      </Text>
      <TouchableOpacity
        style={styles.promptButton}
        onPress={() => router.push('/(tabs)/kundli' as never)}
      >
        <Text style={styles.promptButtonText}>Open Kundli</Text>
      </TouchableOpacity>
    </View>
  );
}

function LoadingState() {
  return (
    <View style={styles.centeredState}>
      <ActivityIndicator size="large" color="#9C27B0" />
      <Text style={styles.centeredStateText}>Analysing your chart…</Text>
    </View>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <View style={styles.centeredState}>
      <Text style={[styles.centeredStateText, { color: '#F44336' }]}>{message}</Text>
    </View>
  );
}

export default function GemRecommendationScreen() {
  return (
    <FeatureErrorBoundary featureName="GemRecommendation">
      <GemRecommendationInner />
    </FeatureErrorBoundary>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingBottom: 20 },
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
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#FFF' },
  infoButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerInfo: { paddingHorizontal: 20, paddingTop: 16 },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginBottom: 4 },
  headerDescription: { fontSize: 16, color: '#FFF', fontWeight: '500' },
  content: { flex: 1 },
  resultSection: { padding: 20 },
  chartSummary: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryLabel: { fontSize: 12, color: Colors.textLight, marginBottom: 4 },
  summaryValue: { fontSize: 18, fontWeight: '600', color: Colors.text },
  summaryDivider: { width: 1, backgroundColor: Colors.border },
  adviceCard: {
    backgroundColor: '#F3E5F5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  adviceTitle: { fontSize: 16, fontWeight: '600', color: '#9C27B0', marginBottom: 8 },
  adviceText: { fontSize: 14, color: Colors.text, lineHeight: 22 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
    marginTop: 8,
  },
  gemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  gemImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  gemInfo: { flex: 1 },
  gemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  gemName: { fontSize: 16, fontWeight: '600', color: Colors.text },
  gemHindiName: { fontSize: 12, color: Colors.textLight },
  favoriteButton: { padding: 4 },
  gemPlanet: { fontSize: 13, color: Colors.textLight, marginTop: 4 },
  gemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  gemPrice: { fontSize: 14, fontWeight: '600', color: Colors.primary },
  inStockBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  inStockText: { fontSize: 11, color: '#4CAF50', fontWeight: '500' },
  cautionBadge: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  cautionText: { fontSize: 11, color: '#FF9800', fontWeight: '500' },
  emptyCard: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    backgroundColor: '#FFEBEE',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  emptyText: { flex: 1, color: Colors.text, fontSize: 13, lineHeight: 20 },
  warningCard: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    backgroundColor: '#FFF8E1',
    padding: 14,
    borderRadius: 12,
    marginTop: 16,
  },
  warningCardText: { flex: 1, fontSize: 12, color: '#795548', lineHeight: 18 },
  gemDetailOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  gemDetailCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 20,
    maxHeight: '90%',
  },
  gemDetailHeader: { alignItems: 'center', marginBottom: 16 },
  gemDetailImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButton: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: { fontSize: 24, color: Colors.textLight },
  gemDetailName: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
  },
  gemDetailHindi: {
    fontSize: 14,
    color: Colors.textLight,
    textAlign: 'center',
    marginBottom: 16,
  },
  benefitsSection: { marginBottom: 16 },
  benefitsTitle: { fontSize: 16, fontWeight: '600', color: Colors.text, marginBottom: 8 },
  benefitItem: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  benefitText: { fontSize: 14, color: Colors.text, flex: 1 },
  instructionsSection: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  instructionsTitle: { fontSize: 16, fontWeight: '600', color: Colors.text, marginBottom: 12 },
  instructionRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  instructionLabel: { fontSize: 14, color: Colors.textLight },
  instructionValue: { fontSize: 14, fontWeight: '500', color: Colors.text },
  mantraBox: { backgroundColor: Colors.white, borderRadius: 8, padding: 12, marginTop: 8 },
  mantraLabel: { fontSize: 12, color: Colors.textLight, marginBottom: 4 },
  mantraText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.primary,
    textAlign: 'center',
  },
  priceSection: { alignItems: 'center', marginBottom: 16 },
  priceLabel: { fontSize: 12, color: Colors.textLight },
  priceValue: { fontSize: 20, fontWeight: '700', color: Colors.primary },
  buyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  buyButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  infoSection: { padding: 20, paddingTop: 0, paddingBottom: 40 },
  infoTitle: { fontSize: 16, fontWeight: '600', color: Colors.text, marginBottom: 8 },
  infoText: { fontSize: 14, color: Colors.textLight, lineHeight: 22, marginBottom: 8 },
  warningText: { fontSize: 13, color: '#F44336', lineHeight: 20, fontStyle: 'italic', marginTop: 8 },
  promptCard: {
    margin: 16,
    padding: 20,
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  promptTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  promptText: {
    fontSize: 14,
    color: Colors.textLight,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 16,
  },
  promptButton: {
    backgroundColor: '#9C27B0',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
  },
  promptButtonText: { color: '#FFF', fontWeight: '600' },
  centeredState: { padding: 32, alignItems: 'center', gap: 12 },
  centeredStateText: { fontSize: 14, color: Colors.textLight },
});
