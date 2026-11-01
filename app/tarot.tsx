import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Sparkles, Star, Moon, RefreshCw, X, ChevronRight, ArrowLeft } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import Colors from '@/constants/colors';
import { secureShuffle, secureRandomBool } from '@/utils/secure-random';

interface TarotCard {
  id: number;
  name: string;
  arcana: 'major' | 'minor';
  suit?: string;
  upright: string;
  reversed: string;
  keywords: string[];
  element?: string;
  zodiac?: string;
  image: string;
}

const majorArcana: TarotCard[] = [
  { id: 0, name: 'The Fool', arcana: 'major', upright: 'New beginnings, innocence, spontaneity, free spirit', reversed: 'Recklessness, risk-taking, inconsideration', keywords: ['Beginnings', 'Innocence', 'Spontaneity'], image: '0' },
  { id: 1, name: 'The Magician', arcana: 'major', upright: 'Manifestation, resourcefulness, power, inspired action', reversed: 'Manipulation, poor planning, untapped talents', keywords: ['Willpower', 'Creation', 'Manifestation'], image: '1' },
  { id: 2, name: 'The High Priestess', arcana: 'major', upright: 'Intuition, sacred knowledge, divine feminine, subconscious mind', reversed: 'Secrets, disconnection from intuition, withdrawal', keywords: ['Intuition', 'Mystery', 'Wisdom'], image: '2' },
  { id: 3, name: 'The Empress', arcana: 'major', upright: 'Femininity, beauty, nature, nurturing, abundance', reversed: 'Creative block, dependence on others', keywords: ['Fertility', 'Nature', 'Abundance'], image: '3' },
  { id: 4, name: 'The Emperor', arcana: 'major', upright: 'Authority, structure, control, fatherhood', reversed: 'Tyranny, rigidity, coldness', keywords: ['Authority', 'Structure', 'Control'], image: '4' },
  { id: 5, name: 'The Hierophant', arcana: 'major', upright: 'Spiritual wisdom, religious beliefs, conformity, tradition', reversed: 'Personal beliefs, freedom, challenging status quo', keywords: ['Tradition', 'Conformity', 'Morality'], image: '5' },
  { id: 6, name: 'The Lovers', arcana: 'major', upright: 'Love, harmony, relationships, values alignment, choices', reversed: 'Self-love, disharmony, imbalance, misalignment', keywords: ['Love', 'Harmony', 'Relationships'], image: '6' },
  { id: 7, name: 'The Chariot', arcana: 'major', upright: 'Control, willpower, success, determination, action', reversed: 'Self-discipline, opposition, lack of direction', keywords: ['Determination', 'Success', 'Action'], image: '7' },
  { id: 8, name: 'Strength', arcana: 'major', upright: 'Strength, courage, persuasion, influence, compassion', reversed: 'Inner strength, self-doubt, raw emotion', keywords: ['Courage', 'Patience', 'Control'], image: '8' },
  { id: 9, name: 'The Hermit', arcana: 'major', upright: 'Soul-searching, introspection, being alone, inner guidance', reversed: 'Isolation, loneliness, withdrawal', keywords: ['Solitude', 'Guidance', 'Truth'], image: '9' },
  { id: 10, name: 'Wheel of Fortune', arcana: 'major', upright: 'Good luck, karma, life cycles, destiny, turning point', reversed: 'Bad luck, resistance to change, breaking cycles', keywords: ['Change', 'Cycles', 'Fate'], image: '10' },
  { id: 11, name: 'Justice', arcana: 'major', upright: 'Justice, fairness, truth, cause and effect, law', reversed: 'Unfairness, lack of accountability, dishonesty', keywords: ['Fairness', 'Truth', 'Law'], image: '11' },
  { id: 12, name: 'The Hanged Man', arcana: 'major', upright: 'Pause, surrender, letting go, new perspectives', reversed: 'Delays, resistance, stalling', keywords: ['Sacrifice', 'Release', 'Perspective'], image: '12' },
  { id: 13, name: 'Death', arcana: 'major', upright: 'Endings, change, transformation, transition', reversed: 'Resistance to change, personal transformation, inner purging', keywords: ['Transformation', 'Endings', 'Change'], image: '13' },
  { id: 14, name: 'Temperance', arcana: 'major', upright: 'Balance, moderation, patience, purpose', reversed: 'Imbalance, excess, self-healing, realignment', keywords: ['Balance', 'Patience', 'Purpose'], image: '14' },
  { id: 15, name: 'The Devil', arcana: 'major', upright: 'Shadow self, attachment, addiction, restriction, sexuality', reversed: 'Releasing limiting beliefs, exploring dark thoughts', keywords: ['Bondage', 'Materialism', 'Shadow'], image: '15' },
  { id: 16, name: 'The Tower', arcana: 'major', upright: 'Sudden change, upheaval, chaos, revelation, awakening', reversed: 'Personal transformation, fear of change, averting disaster', keywords: ['Destruction', 'Change', 'Revelation'], image: '16' },
  { id: 17, name: 'The Star', arcana: 'major', upright: 'Hope, faith, purpose, renewal, spirituality', reversed: 'Lack of faith, despair, self-trust, disconnection', keywords: ['Hope', 'Faith', 'Renewal'], image: '17' },
  { id: 18, name: 'The Moon', arcana: 'major', upright: 'Illusion, fear, anxiety, subconscious, intuition', reversed: 'Release of fear, repressed emotions, inner confusion', keywords: ['Illusion', 'Fear', 'Subconscious'], image: '18' },
  { id: 19, name: 'The Sun', arcana: 'major', upright: 'Positivity, fun, warmth, success, vitality', reversed: 'Inner child, feeling down, overly optimistic', keywords: ['Joy', 'Success', 'Vitality'], image: '19' },
  { id: 20, name: 'Judgement', arcana: 'major', upright: 'Judgement, rebirth, inner calling, absolution', reversed: 'Self-doubt, inner critic, ignoring the call', keywords: ['Rebirth', 'Reflection', 'Awakening'], image: '20' },
  { id: 21, name: 'The World', arcana: 'major', upright: 'Completion, integration, accomplishment, travel', reversed: 'Seeking personal closure, short-cuts, delays', keywords: ['Completion', 'Achievement', 'Travel'], image: '21' },
];

const spreadTypes = [
  { id: 'single', nameKey: 'tarot.singleCard', descriptionKey: 'tarot.singleCardDesc', cards: 1 },
  { id: 'three', nameKey: 'tarot.pastPresentFuture', descriptionKey: 'tarot.pastPresentFutureDesc', cards: 3 },
  { id: 'love', nameKey: 'tarot.loveSpread', descriptionKey: 'tarot.loveSpreadDesc', cards: 5 },
  { id: 'career', nameKey: 'tarot.careerSpread', descriptionKey: 'tarot.careerSpreadDesc', cards: 4 },
];

interface ReadingResult {
  cards: { card: TarotCard; isReversed: boolean; position: string }[];
  spreadType: string;
  date: Date;
}

export default function TarotScreen() {
  const { t } = useTranslation();
  const [selectedSpread, setSelectedSpread] = useState<string | null>(null);
  const [isReading, setIsReading] = useState(false);
  const [reading, setReading] = useState<ReadingResult | null>(null);
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null);
  const [showCardDetail, setShowCardDetail] = useState(false);
  const [shuffleAnim] = useState(new Animated.Value(0));

  const startReading = (spreadId: string) => {
    setSelectedSpread(spreadId);
    setIsReading(true);
    setReading(null);
    
    // Shuffle animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(shuffleAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(shuffleAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
      { iterations: 3 }
    ).start();

    // Simulate card selection
    setTimeout(() => {
      const spread = spreadTypes.find(s => s.id === spreadId);
      if (!spread) return;

      const positions = getPositions(spread.cards, spreadId);
      const selectedCards: { card: TarotCard; isReversed: boolean; position: string }[] = [];
      
      // Unbiased, unpredictable draw: crypto-backed Fisher–Yates. The old
      // `.sort(() => Math.random() - 0.5)` produced a non-uniform permutation.
      const shuffled = secureShuffle(majorArcana);

      
      for (let i = 0; i < spread.cards; i++) {
        if (shuffled[i] && positions[i]) {
          selectedCards.push({
            card: shuffled[i]!,
            // ~30% chance reversed, statistically fair via CSPRNG
            isReversed: secureRandomBool(0.3),

            position: positions[i]!,
          });
        }
      }

      setReading({ cards: selectedCards, spreadType: spreadId, date: new Date() });
      setIsReading(false);
    }, 3000);
  };

  const getPositions = (count: number, spreadId: string): string[] => {
    switch (spreadId) {
      case 'single':
        return [t('tarot.yourCard')];
      case 'three':
        return [t('tarot.past'), t('tarot.present'), t('tarot.future')];
      case 'love':
        return [t('tarot.you'), t('tarot.partner'), t('tarot.relationship'), t('tarot.strengths'), t('tarot.advice')];
      case 'career':
        return [t('tarot.currentSituation'), t('tarot.challenge'), t('tarot.opportunity'), t('tarot.outcome')];
      default:
        return Array(count).fill('').map((_, i) => `${t('tarot.position')} ${i + 1}`);
    }
  };

  const resetReading = () => {
    setSelectedSpread(null);
    setReading(null);
    setIsReading(false);
    setSelectedCardIndex(null);
  };

  const getCardColor = (card: TarotCard) => {
    if (card.id <= 7) return Colors.primary;
    if (card.id <= 14) return Colors.purple;
    return Colors.gold;
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
          <Text style={styles.headerTitle}>{t('tarot.title')}</Text>
          <View style={styles.backButton} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <Sparkles size={32} color={Colors.white} />
            <Text style={styles.headerTitle}>{t('tarot.title')}</Text>
            <Text style={styles.headerSubtitle}>
              {t('tarot.subtitle')}
            </Text>
          </View>

          {/* Spread Selection */}
          {!selectedSpread && (
            <View style={styles.spreadSection}>
              <Text style={styles.sectionTitle}>{t('tarot.chooseSpread')}</Text>
              {spreadTypes.map((spread) => (
                <TouchableOpacity
                  key={spread.id}
                  style={styles.spreadCard}
                  onPress={() => startReading(spread.id)}
                >
                  <View style={styles.spreadIcon}>
                    <Star size={24} color={Colors.primary} fill={Colors.primary} />
                  </View>
                  <View style={styles.spreadInfo}>
                    <Text style={styles.spreadName}>{t(spread.nameKey)}</Text>
                    <Text style={styles.spreadDesc}>{t(spread.descriptionKey)}</Text>
                    <Text style={styles.spreadCards}>{spread.cards} {t('tarot.cards')}</Text>
                  </View>
                  <ChevronRight size={20} color={Colors.textLight} />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Shuffling Animation */}
          {isReading && (
            <View style={styles.shufflingContainer}>
              <Animated.View style={[
                styles.shufflingCards,
                {
                  transform: [{
                    rotate: shuffleAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['-5deg', '5deg'],
                    })
                  }]
                }
              ]}>
                <View style={styles.cardBack}>
                  <Moon size={40} color={Colors.white} />
                </View>
              </Animated.View>
              <Text style={styles.shufflingText}>{t('tarot.shuffling')}</Text>
              <Text style={styles.shufflingSubtext}>{t('tarot.focus')}</Text>
            </View>
          )}

          {/* Reading Results */}
          {reading && !isReading && (
            <View style={styles.readingSection}>
              <View style={styles.readingHeader}>
                <Text style={styles.readingTitle}>
                  {spreadTypes.find(s => s.id === reading.spreadType) ? t(spreadTypes.find(s => s.id === reading.spreadType)!.nameKey) : ''}
                </Text>
                <Text style={styles.readingDate}>
                  {reading.date.toLocaleDateString('en-IN', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long'
                  })}
                </Text>
              </View>

              <View style={styles.cardsContainer}>
                {reading.cards.map((cardData, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.cardItem,
                      cardData.isReversed && styles.cardReversed,
                      selectedCardIndex === index && styles.cardSelected
                    ]}
                    onPress={() => {
                      setSelectedCardIndex(index);
                      setShowCardDetail(true);
                    }}
                  >
                    <View style={[styles.cardFront, { backgroundColor: getCardColor(cardData.card) }]}>
                      <Text style={styles.cardNumber}>{cardData.card.id}</Text>
                      <Text style={styles.cardName}>{cardData.card.name}</Text>
                      {cardData.isReversed && (
                        <View style={styles.reversedBadge}>
                          <Text style={styles.reversedText}>Reversed</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.cardPosition}>{cardData.position}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Quick Interpretation */}
              <View style={styles.interpretationCard}>
                <Text style={styles.interpretationTitle}>{t('tarot.quickInterpretation')}</Text>
                {reading.cards.slice(0, 3).map((cardData, index) => (
                  <View key={index} style={styles.interpretationItem}>
                    <Text style={styles.interpretationPosition}>{cardData.position}:</Text>
                    <Text style={styles.interpretationText}>
                      {cardData.isReversed ? cardData.card.reversed : cardData.card.upright}
                    </Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                style={styles.newReadingButton}
                onPress={resetReading}
              >
                <RefreshCw size={20} color={Colors.primary} />
                <Text style={styles.newReadingText}>{t('tarot.newReading')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Card Meanings Reference */}
          {!selectedSpread && (
            <View style={styles.referenceSection}>
              <Text style={styles.sectionTitle}>{t('tarot.majorArcana')}</Text>
              <Text style={styles.sectionSubtitle}>
                {t('tarot.majorArcanaDesc')}
              </Text>
              <View style={styles.cardGrid}>
                {majorArcana.slice(0, 11).map((card) => (
                  <TouchableOpacity
                    key={card.id}
                    style={styles.miniCard}
                    onPress={() => {
                      setSelectedCardIndex(majorArcana.findIndex(c => c.id === card.id));
                      setShowCardDetail(true);
                    }}
                  >
                    <View style={[styles.miniCardInner, { backgroundColor: getCardColor(card) }]}>
                      <Text style={styles.miniCardNumber}>{card.id}</Text>
                    </View>
                    <Text style={styles.miniCardName} numberOfLines={1}>{card.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <View style={{ height: 20 }} />
        </ScrollView>

        {/* Card Detail Modal */}
        <Modal
          visible={showCardDetail}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowCardDetail(false)}
        >
          <SafeAreaView style={styles.modal}>
            {selectedCardIndex !== null && (
              <>
                <View style={styles.modalHeader}>
                  <View style={styles.modalTitleRow}>
                     <View style={[styles.modalCardIcon, { backgroundColor: getCardColor(reading?.cards[selectedCardIndex]?.card || majorArcana[selectedCardIndex] || majorArcana[0]!) }]}>
                       <Text style={styles.modalCardNumber}>
                         {reading?.cards[selectedCardIndex]?.card.id ?? majorArcana[selectedCardIndex]?.id}
                      </Text>
                    </View>
                    <View>
                      <Text style={styles.modalTitle}>
                        {reading?.cards[selectedCardIndex]?.card.name ?? majorArcana[selectedCardIndex]?.name}
                      </Text>
                      {reading?.cards[selectedCardIndex]?.position && (
                        <Text style={styles.modalSubtitle}>
                          {reading.cards[selectedCardIndex].position}
                        </Text>
                      )}
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => setShowCardDetail(false)}>
                    <X size={24} color={Colors.text} />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalContent}>
                  {reading?.cards[selectedCardIndex]?.isReversed && (
                    <View style={styles.reversedAlert}>
                      <RefreshCw size={16} color={Colors.gold} />
                      <Text style={styles.reversedAlertText}>This card is reversed</Text>
                    </View>
                  )}

                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>{t('tarot.keywords')}</Text>
                    <View style={styles.keywordsList}>
                      {(reading?.cards[selectedCardIndex]?.card.keywords ?? majorArcana[selectedCardIndex]?.keywords ?? []).map((keyword, idx) => (
                        <View key={idx} style={styles.keywordChip}>
                          <Text style={styles.keywordText}>{keyword}</Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>
                      {reading?.cards[selectedCardIndex]?.isReversed ? t('tarot.reversed') : t('tarot.upright')}
                    </Text>
                    <Text style={styles.modalDescription}>
                      {reading?.cards[selectedCardIndex]?.isReversed 
                        ? reading.cards[selectedCardIndex].card.reversed 
                        : reading?.cards[selectedCardIndex]?.card.upright ?? majorArcana[selectedCardIndex]?.upright
                      }
                    </Text>
                  </View>

                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>{t('tarot.fullInterpretation')}</Text>
                    <Text style={styles.modalDescription}>
                      {t('tarot.cardRepresents', { cardName: reading?.cards[selectedCardIndex]?.card.name ?? majorArcana[selectedCardIndex]?.name })}
                      {reading?.cards[selectedCardIndex]?.isReversed
                        ? t('tarot.reversedAdvice')
                        : ' '
                      }
                      {(reading?.cards[selectedCardIndex]?.card.keywords ?? majorArcana[selectedCardIndex]?.keywords ?? []).join(', ').toLowerCase()}.
                      {reading?.cards[selectedCardIndex]?.isReversed
                        ? t('tarot.reversedAdvice2')
                        : t('tarot.uprightAdvice')
                      }
                    </Text>
                  </View>
                </ScrollView>
              </>
            )}
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
  headerBanner: {
    backgroundColor: Colors.purple,
    padding: 20,
    alignItems: 'center',
  },
  bannerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.white,
    marginTop: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.white,
    opacity: 0.9,
    marginTop: 4,
    textAlign: 'center',
  },
  spreadSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: Colors.textLight,
    marginBottom: 16,
  },
  spreadCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  spreadIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFF3EF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  spreadInfo: {
    flex: 1,
  },
  spreadName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  spreadDesc: {
    fontSize: 13,
    color: Colors.textLight,
    marginTop: 2,
  },
  spreadCards: {
    fontSize: 12,
    color: Colors.primary,
    marginTop: 4,
    fontWeight: '500',
  },
  shufflingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  shufflingCards: {
    width: 120,
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardBack: {
    width: 120,
    height: 180,
    borderRadius: 12,
    backgroundColor: Colors.purple,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.gold,
  },
  shufflingText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 24,
  },
  shufflingSubtext: {
    fontSize: 14,
    color: Colors.textLight,
    marginTop: 8,
  },
  readingSection: {
    padding: 16,
  },
  readingHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  readingTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  readingDate: {
    fontSize: 13,
    color: Colors.textLight,
    marginTop: 4,
  },
  cardsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 20,
  },
  cardItem: {
    alignItems: 'center',
  },
  cardReversed: {
    transform: [{ rotate: '180deg' }],
  },
  cardSelected: {
    opacity: 0.8,
  },
  cardFront: {
    width: 80,
    height: 120,
    borderRadius: 8,
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.white,
  },
  cardName: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.white,
    textAlign: 'center',
    marginTop: 4,
  },
  reversedBadge: {
    position: 'absolute',
    bottom: 8,
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  reversedText: {
    fontSize: 8,
    color: Colors.white,
    fontWeight: '600',
  },
  cardPosition: {
    fontSize: 11,
    color: Colors.textLight,
    marginTop: 8,
    textAlign: 'center',
  },
  interpretationCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  interpretationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  interpretationItem: {
    marginBottom: 12,
  },
  interpretationPosition: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: 2,
  },
  interpretationText: {
    fontSize: 13,
    color: Colors.text,
    lineHeight: 20,
  },
  newReadingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  newReadingText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  referenceSection: {
    padding: 16,
    paddingTop: 0,
  },
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  miniCard: {
    width: '30%',
    alignItems: 'center',
  },
  miniCardInner: {
    width: 60,
    height: 80,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniCardNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.white,
  },
  miniCardName: {
    fontSize: 10,
    color: Colors.text,
    marginTop: 4,
    textAlign: 'center',
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
  modalCardIcon: {
    width: 48,
    height: 64,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCardNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.white,
  },
  modalTitle: {
    fontSize: 18,
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
  reversedAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    padding: 12,
    borderRadius: 12,
    gap: 8,
    marginBottom: 16,
  },
  reversedAlertText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.gold,
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
  keywordsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  keywordChip: {
    backgroundColor: Colors.background,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  keywordText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.primary,
  },
});
