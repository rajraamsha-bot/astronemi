import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  Home,
  Compass,
  Sun,
  Droplets,
  Flower2,
  Wallet,
  Heart,
  Briefcase,
  Users,
  BookOpen,
  ChevronRight,
  Check,
  X,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import Colors from '@/constants/colors';

interface VastuTip {
  id: string;
  category: 'entrance' | 'bedroom' | 'kitchen' | 'puja' | 'bathroom' | 'living' | 'office' | 'garden';
  title: string;
  description: string;
  direction: string;
  benefits: string[];
  remedies?: string[];
  icon: string;
}

interface VastuCategory {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  tips: VastuTip[];
}

const vastuCategories: VastuCategory[] = [
  {
    id: 'entrance',
    name: 'Main Entrance',
    icon: <Home size={24} color="#FF9800" />,
    color: '#FFF3E0',
    tips: [
      {
        id: 'e1',
        category: 'entrance',
        title: 'Ideal Direction for Main Door',
        description: 'The main entrance should ideally face North, Northeast, or East direction. These directions attract positive energy and prosperity.',
        direction: 'North, Northeast, East',
        benefits: ['Attracts prosperity', 'Brings positive energy', 'Enhances opportunities'],
        icon: '🚪',
      },
      {
        id: 'e2',
        category: 'entrance',
        title: 'Door Size & Material',
        description: 'The main door should be the largest door in the house. Use quality wood like teak. Avoid metal doors for the main entrance.',
        direction: 'All directions',
        benefits: ['Creates authority', 'Ensures durability', 'Attracts abundance'],
        icon: '🪵',
      },
    ],
  },
  {
    id: 'bedroom',
    name: 'Bedroom',
    icon: <Heart size={24} color="#E91E63" />,
    color: '#FCE4EC',
    tips: [
      {
        id: 'b1',
        category: 'bedroom',
        title: 'Master Bedroom Location',
        description: 'The master bedroom should be in the Southwest direction. This ensures stability, good health, and harmonious relationships.',
        direction: 'Southwest',
        benefits: ['Better sleep quality', 'Marital harmony', 'Financial stability'],
        remedies: ['Use heavy furniture in SW corner', 'Sleep with head towards South'],
        icon: '🛏️',
      },
      {
        id: 'b2',
        category: 'bedroom',
        title: 'Bed Placement',
        description: 'Place the bed in the Southwest corner of the bedroom. Avoid placing the bed under a beam or directly in front of the door.',
        direction: 'Southwest',
        benefits: ['Peaceful sleep', 'Good health', 'Mental peace'],
        icon: '🛋️',
      },
    ],
  },
  {
    id: 'kitchen',
    name: 'Kitchen',
    icon: <Flower2 size={24} color="#F44336" />,
    color: '#FFEBEE',
    tips: [
      {
        id: 'k1',
        category: 'kitchen',
        title: 'Kitchen Location',
        description: 'The kitchen should be in the Southeast direction (Agni corner). Alternative location is Northwest. Avoid Northeast kitchen.',
        direction: 'Southeast',
        benefits: ['Good health', 'Prosperity', 'Family harmony'],
        remedies: ['Keep gas stove in SE corner', 'Store heavy items in SW'],
        icon: '🍳',
      },
      {
        id: 'k2',
        category: 'kitchen',
        title: 'Cooking Direction',
        description: 'While cooking, face East or Southeast. This brings positive energy to the food and ensures good health for the family.',
        direction: 'East',
        benefits: ['Healthier food', 'Positive energy', 'Better digestion'],
        icon: '🔥',
      },
    ],
  },
  {
    id: 'puja',
    name: 'Puja Room',
    icon: <Sun size={24} color="#FFD700" />,
    color: '#FFF8E1',
    tips: [
      {
        id: 'p1',
        category: 'puja',
        title: 'Puja Room Location',
        description: 'The ideal location for the puja room is Northeast (Ishan corner). This is the most sacred direction and attracts divine blessings.',
        direction: 'Northeast',
        benefits: ['Spiritual growth', 'Mental peace', 'Divine blessings'],
        remedies: ['Keep the area clean', 'Use white or light yellow colors'],
        icon: '🛕',
      },
      {
        id: 'p2',
        category: 'puja',
        title: 'Idol Placement',
        description: 'Place idols in the Northeast corner. The deity should face West while you pray facing East. Avoid North-facing idols.',
        direction: 'Northeast',
        benefits: ['Enhanced devotion', 'Positive vibrations', 'Spiritual progress'],
        icon: '🙏',
      },
    ],
  },
  {
    id: 'bathroom',
    name: 'Bathroom',
    icon: <Droplets size={24} color="#2196F3" />,
    color: '#E3F2FD',
    tips: [
      {
        id: 'ba1',
        category: 'bathroom',
        title: 'Bathroom Location',
        description: 'Bathrooms should be in the Northwest or West-Southwest direction. Never construct bathrooms in the Northeast corner.',
        direction: 'Northwest',
        benefits: ['Health protection', 'Removes negativity', 'Better hygiene'],
        remedies: ['Keep bathroom door closed', 'Use sea salt for cleansing'],
        icon: '🚿',
      },
    ],
  },
  {
    id: 'living',
    name: 'Living Room',
    icon: <Users size={24} color="#4CAF50" />,
    color: '#E8F5E9',
    tips: [
      {
        id: 'l1',
        category: 'living',
        title: 'Living Room Location',
        description: 'The living room should be in the North or East direction. This attracts guests and positive social interactions.',
        direction: 'North, East',
        benefits: ['Good social life', 'Business opportunities', 'Family bonding'],
        icon: '🛋️',
      },
      {
        id: 'l2',
        category: 'living',
        title: 'Furniture Arrangement',
        description: 'Place heavy furniture in the South or West. Keep the North and East areas light and open for positive energy flow.',
        direction: 'South, West',
        benefits: ['Stability', 'Prosperity', 'Clear thinking'],
        icon: '🪑',
      },
    ],
  },
  {
    id: 'office',
    name: 'Home Office',
    icon: <Briefcase size={24} color="#9C27B0" />,
    color: '#F3E5F5',
    tips: [
      {
        id: 'o1',
        category: 'office',
        title: 'Study/Office Location',
        description: 'The study or home office should be in the West or Southwest direction. Face East or North while working.',
        direction: 'West, Southwest',
        benefits: ['Better concentration', 'Career growth', 'Financial success'],
        remedies: ['Place a pyramid on desk', 'Keep the area clutter-free'],
        icon: '📚',
      },
    ],
  },
  {
    id: 'garden',
    name: 'Garden',
    icon: <Flower2 size={24} color="#8BC34A" />,
    color: '#F1F8E9',
    tips: [
      {
        id: 'g1',
        category: 'garden',
        title: 'Garden Location',
        description: 'The garden should be in the North or East direction. Plant tall trees in the South or West.',
        direction: 'North, East',
        benefits: ['Fresh air', 'Positive energy', 'Natural beauty'],
        remedies: ['Tulsi plant in North', 'Avoid thorny plants near entrance'],
        icon: '🌳',
      },
    ],
  },
];

export default function VastuScreen() {
  const { t } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTip, setSelectedTip] = useState<VastuTip | null>(null);
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<{ [key: string]: string }>({});
  const [showResults, setShowResults] = useState(false);

  const handleQuizSubmit = () => {
    setShowResults(true);
  };

  const renderCategoryCard = (category: VastuCategory) => (
    <TouchableOpacity
      key={category.id}
      style={styles.categoryCard}
      onPress={() => setSelectedCategory(category.id)}
    >
      <View style={[styles.categoryIcon, { backgroundColor: category.color }]}>
        {category.icon}
      </View>
      <View style={styles.categoryInfo}>
        <Text style={styles.categoryName}>{category.name}</Text>
        <Text style={styles.categoryTips}>{category.tips.length} tips</Text>
      </View>
      <ChevronRight color={Colors.textLight} size={20} />
    </TouchableOpacity>
  );

  const renderTipCard = (tip: VastuTip) => (
    <TouchableOpacity
      key={tip.id}
      style={styles.tipCard}
      onPress={() => setSelectedTip(tip)}
    >
      <Text style={styles.tipIcon}>{tip.icon}</Text>
      <View style={styles.tipInfo}>
        <Text style={styles.tipTitle}>{tip.title}</Text>
        <Text style={styles.tipDirection}>Direction: {tip.direction}</Text>
      </View>
      <ChevronRight color={Colors.textLight} size={18} />
    </TouchableOpacity>
  );

  const currentCategory = vastuCategories.find((c) => c.id === selectedCategory);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#FF9800', '#FFA726', '#FFB74D']}
        style={styles.header}
      >
        <SafeAreaView edges={['top']}>
          <View style={styles.headerContent}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => selectedCategory ? setSelectedCategory(null) : router.back()}
            >
              <ArrowLeft color="#FFF" size={24} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Vastu Tips</Text>
            <TouchableOpacity
              style={styles.quizButton}
              onPress={() => setShowQuizModal(true)}
            >
              <BookOpen color="#FFF" size={22} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        <View style={styles.headerInfo}>
          <Text style={styles.headerSubtitle}>{t('vastu.title')}</Text>
          <Text style={styles.headerDescription}>
            {t('vastu.subtitle')}
          </Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {!selectedCategory ? (
          <>
            {/* Quick Tips */}
            <View style={styles.quickTipsSection}>
              <Text style={styles.sectionTitle}>{t('vastu.quickTips')}</Text>
              <View style={styles.quickTipCard}>
                <Compass color="#FF9800" size={24} />
                <Text style={styles.quickTipText}>
                  {t('vastu.centerFree')}
                </Text>
              </View>
              <View style={styles.quickTipCard}>
                <Sun color="#FFD700" size={24} />
                <Text style={styles.quickTipText}>
                  {t('vastu.sunlightAir')}
                </Text>
              </View>
              <View style={styles.quickTipCard}>
                <Wallet color="#4CAF50" size={24} />
                <Text style={styles.quickTipText}>
                  {t('vastu.waterFountain')}
                </Text>
              </View>
            </View>

            {/* Categories */}
            <Text style={styles.sectionTitle}>{t('vastu.browseByRoom')}</Text>
            {vastuCategories.map(renderCategoryCard)}

            {/* Vastu Compass */}
            <View style={styles.compassSection}>
              <Text style={styles.sectionTitle}>{t('vastu.directionGuide')}</Text>
              <View style={styles.compassCard}>
                <View style={styles.compassRow}>
                  <View style={styles.compassDirection}>
                    <Text style={styles.directionLabel}>N</Text>
                    <Text style={styles.directionName}>{t('vastu.north')}</Text>
                    <Text style={styles.directionTip}>{t('vastu.wealth')}</Text>
                  </View>
                </View>
                <View style={styles.compassRow}>
                  <View style={styles.compassDirection}>
                    <Text style={styles.directionLabel}>W</Text>
                    <Text style={styles.directionName}>{t('vastu.west')}</Text>
                    <Text style={styles.directionTip}>{t('vastu.success')}</Text>
                  </View>
                  <View style={styles.compassCenter}>
                    <Compass color="#FF9800" size={40} />
                  </View>
                  <View style={styles.compassDirection}>
                    <Text style={styles.directionLabel}>E</Text>
                    <Text style={styles.directionName}>{t('vastu.east')}</Text>
                    <Text style={styles.directionTip}>{t('vastu.growth')}</Text>
                  </View>
                </View>
                <View style={styles.compassRow}>
                  <View style={styles.compassDirection}>
                    <Text style={styles.directionLabel}>S</Text>
                    <Text style={styles.directionName}>{t('vastu.south')}</Text>
                    <Text style={styles.directionTip}>{t('vastu.fame')}</Text>
                  </View>
                </View>
              </View>
            </View>
          </>
        ) : (
          <>
            {/* Category Tips */}
            <View style={styles.categoryHeader}>
              <Text style={styles.categoryTitle}>{currentCategory?.name}</Text>
              <Text style={styles.categoryDescription}>
                Follow these Vastu principles for optimal energy flow
              </Text>
            </View>
            {currentCategory?.tips.map(renderTipCard)}
          </>
        )}

        {/* Info Section */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>{t('vastu.aboutVastu')}</Text>
          <Text style={styles.infoText}>
            {t('vastu.aboutDesc')}
          </Text>
          <Text style={styles.infoText}>
            {t('vastu.benefitsDesc')}
          </Text>
        </View>
      </ScrollView>

      {/* Tip Detail Modal */}
      <Modal
        visible={!!selectedTip}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedTip(null)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{selectedTip?.title}</Text>
            <TouchableOpacity onPress={() => setSelectedTip(null)}>
              <X size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalIcon}>{selectedTip?.icon}</Text>
            <Text style={styles.modalDescription}>{selectedTip?.description}</Text>

            <View style={styles.directionBox}>
              <Compass color="#FF9800" size={20} />
              <Text style={styles.directionText}>
                {t('vastu.recommendedDirection')}: {selectedTip?.direction}
              </Text>
            </View>

            <Text style={styles.benefitsTitle}>{t('vastu.benefits')}</Text>
            {selectedTip?.benefits.map((benefit, index) => (
              <View key={index} style={styles.benefitItem}>
                <Check color="#4CAF50" size={18} />
                <Text style={styles.benefitText}>{benefit}</Text>
              </View>
            ))}

            {selectedTip?.remedies && selectedTip.remedies.length > 0 && (
              <>
                <Text style={styles.remediesTitle}>{t('vastu.remedies')}</Text>
                {selectedTip.remedies.map((remedy, index) => (
                  <View key={index} style={styles.remedyItem}>
                    <Check color="#FF9800" size={18} />
                    <Text style={styles.remedyText}>{remedy}</Text>
                  </View>
                ))}
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Quiz Modal */}
      <Modal
        visible={showQuizModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setShowQuizModal(false);
          setShowResults(false);
          setQuizAnswers({});
        }}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('vastu.vastuQuiz')}</Text>
            <TouchableOpacity
              onPress={() => {
                setShowQuizModal(false);
                setShowResults(false);
                setQuizAnswers({});
              }}
            >
              <X size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.quizIntro}>
              {t('vastu.testKnowledge')}
            </Text>

            <View style={styles.quizQuestion}>
              <Text style={styles.quizQuestionText}>
                1. {t('vastu.mainEntrance')}
              </Text>
              {[
                t('vastu.north'),
                t('vastu.south'),
                t('vastu.west'),
                t('vastu.anyDirection')
              ].map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.quizOption,
                    quizAnswers['q1'] === option && styles.quizOptionSelected,
                  ]}
                  onPress={() => setQuizAnswers({ ...quizAnswers, q1: option })}
                >
                  <Text
                    style={[
                      styles.quizOptionText,
                      quizAnswers['q1'] === option && styles.quizOptionTextSelected,
                    ]}
                  >
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.quizQuestion}>
              <Text style={styles.quizQuestionText}>
                2. {t('vastu.kitchenLocation')}
              </Text>
              {[
                t('vastu.northeast'),
                t('vastu.southeast'),
                t('vastu.northwest'),
                t('vastu.southwest')
              ].map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.quizOption,
                    quizAnswers['q2'] === option && styles.quizOptionSelected,
                  ]}
                  onPress={() => setQuizAnswers({ ...quizAnswers, q2: option })}
                >
                  <Text
                    style={[
                      styles.quizOptionText,
                      quizAnswers['q2'] === option && styles.quizOptionTextSelected,
                    ]}
                  >
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.quizQuestion}>
              <Text style={styles.quizQuestionText}>
                3. {t('vastu.masterBedroom')}
              </Text>
              {[
                t('vastu.northeast'),
                t('vastu.southeast'),
                t('vastu.southwest'),
                t('vastu.northwest')
              ].map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.quizOption,
                    quizAnswers['q3'] === option && styles.quizOptionSelected,
                  ]}
                  onPress={() => setQuizAnswers({ ...quizAnswers, q3: option })}
                >
                  <Text
                    style={[
                      styles.quizOptionText,
                      quizAnswers['q3'] === option && styles.quizOptionTextSelected,
                    ]}
                  >
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[
                styles.submitButton,
                Object.keys(quizAnswers).length < 3 && styles.submitButtonDisabled,
              ]}
              onPress={handleQuizSubmit}
              disabled={Object.keys(quizAnswers).length < 3}
            >
              <Text style={styles.submitButtonText}>{t('vastu.checkAnswers')}</Text>
            </TouchableOpacity>

            {showResults && (
              <View style={styles.resultsSection}>
                <Text style={styles.resultsTitle}>{t('vastu.results')}</Text>
                <View style={styles.resultItem}>
                  {quizAnswers['q1'] === t('vastu.north') ? (
                    <Check color="#4CAF50" size={20} />
                  ) : (
                    <X color="#F44336" size={20} />
                  )}
                  <Text style={styles.resultText}>
                    {t('vastu.q1')}
                  </Text>
                </View>
                <View style={styles.resultItem}>
                  {quizAnswers['q2'] === t('vastu.southeast') ? (
                    <Check color="#4CAF50" size={20} />
                  ) : (
                    <X color="#F44336" size={20} />
                  )}
                  <Text style={styles.resultText}>
                    {t('vastu.q2')}
                  </Text>
                </View>
                <View style={styles.resultItem}>
                  {quizAnswers['q3'] === t('vastu.southwest') ? (
                    <Check color="#4CAF50" size={20} />
                  ) : (
                    <X color="#F44336" size={20} />
                  )}
                  <Text style={styles.resultText}>
                    {t('vastu.q3')}
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingBottom: 20,
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
  quizButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  headerDescription: {
    fontSize: 16,
    color: '#FFF',
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  quickTipsSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },
  quickTipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  quickTipText: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 20,
    marginBottom: 10,
  },
  categoryIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  categoryTips: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 2,
  },
  compassSection: {
    padding: 20,
  },
  compassCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  compassRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  compassDirection: {
    alignItems: 'center',
    padding: 10,
    minWidth: 80,
  },
  directionLabel: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.primary,
  },
  directionName: {
    fontSize: 12,
    color: Colors.text,
    marginTop: 2,
  },
  directionTip: {
    fontSize: 10,
    color: Colors.textLight,
    marginTop: 2,
  },
  compassCenter: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryHeader: {
    padding: 20,
  },
  categoryTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
  },
  categoryDescription: {
    fontSize: 14,
    color: Colors.textLight,
    marginTop: 4,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 20,
    marginBottom: 10,
  },
  tipIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  tipInfo: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  tipDirection: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 2,
  },
  infoSection: {
    padding: 20,
    paddingBottom: 40,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: Colors.textLight,
    lineHeight: 22,
    marginBottom: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  modalIcon: {
    fontSize: 48,
    textAlign: 'center',
    marginBottom: 16,
  },
  modalDescription: {
    fontSize: 16,
    color: Colors.text,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 20,
  },
  directionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    gap: 8,
  },
  directionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF9800',
  },
  benefitsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  benefitText: {
    fontSize: 14,
    color: Colors.text,
  },
  remediesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 16,
    marginBottom: 12,
  },
  remedyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  remedyText: {
    fontSize: 14,
    color: Colors.text,
  },
  quizIntro: {
    fontSize: 14,
    color: Colors.textLight,
    textAlign: 'center',
    marginBottom: 24,
  },
  quizQuestion: {
    marginBottom: 20,
  },
  quizQuestionText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  quizOption: {
    backgroundColor: Colors.white,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quizOptionSelected: {
    backgroundColor: Colors.primary + '10',
    borderColor: Colors.primary,
  },
  quizOptionText: {
    fontSize: 14,
    color: Colors.text,
  },
  quizOptionTextSelected: {
    color: Colors.primary,
    fontWeight: '500',
  },
  submitButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  submitButtonDisabled: {
    backgroundColor: Colors.textLight,
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  resultsSection: {
    marginTop: 24,
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 8,
  },
  resultText: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
  },
});
