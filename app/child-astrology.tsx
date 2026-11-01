import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  Baby,
  GraduationCap,
  Sparkles,
  Brain,
  Palette,
  Music,
  Calculator,
  BookOpen,
  Star,
  AlertCircle,
  CheckCircle,
} from 'lucide-react-native';
import { router } from 'expo-router';
import Colors from '@/constants/colors';

interface TalentArea {
  name: string;
  icon: React.ReactNode;
  score: number;
  description: string;
}

interface LifePhase {
  age: string;
  title: string;
  description: string;
  focus: string[];
}

const talentAreas: TalentArea[] = [
  {
    name: 'Academic',
    icon: <GraduationCap color="#3F51B5" size={20} />,
    score: 85,
    description: 'Strong Mercury indicates excellent learning abilities.',
  },
  {
    name: 'Creative Arts',
    icon: <Palette color="#E91E63" size={20} />,
    score: 72,
    description: 'Venus in 5th house supports artistic talents.',
  },
  {
    name: 'Music',
    icon: <Music color="#9C27B0" size={20} />,
    score: 68,
    description: 'Good Venus placement supports musical abilities.',
  },
  {
    name: 'Mathematics',
    icon: <Calculator color="#4CAF50" size={20} />,
    score: 90,
    description: 'Strong Mars and Mercury favor logical thinking.',
  },
  {
    name: 'Sports',
    icon: <Star color="#FF9800" size={20} />,
    score: 75,
    description: 'Mars in 3rd house indicates athletic potential.',
  },
  {
    name: 'Leadership',
    icon: <Sparkles color="#FFC107" size={20} />,
    score: 82,
    description: 'Sun in 10th house supports leadership qualities.',
  },
];

const lifePhases: LifePhase[] = [
  {
    age: '0-5 years',
    title: 'Early Childhood',
    description: 'Focus on health and early development',
    focus: ['Health monitoring', 'Early learning', 'Emotional bonding'],
  },
  {
    age: '6-12 years',
    title: 'School Years',
    description: 'Academic foundation and skill discovery',
    focus: ['Education', 'Talent identification', 'Social skills'],
  },
  {
    age: '13-18 years',
    title: 'Adolescence',
    description: 'Career planning and higher education',
    focus: ['Career guidance', 'Higher studies', 'Personal development'],
  },
  {
    age: '19-25 years',
    title: 'Young Adulthood',
    description: 'Career establishment and independence',
    focus: ['Career growth', 'Financial planning', 'Relationships'],
  },
];

export default function ChildAstrologyScreen() {
  const [selectedTalent, setSelectedTalent] = useState<TalentArea | null>(null);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#E91E63', '#F06292', '#F48FB1']}
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
            <Text style={styles.headerTitle}>Child Astrology</Text>
            <View style={styles.placeholder} />
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.content}>
        {/* Child Profile */}
        <View style={styles.profileCard}>
          <View style={styles.profileImageContainer}>
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1503454537195-7dc0b3c3c5b5?w=200' }}
              style={styles.profileImage}
              contentFit="cover"
            />
            <View style={styles.profileBadge}>
              <Baby color="#FFF" size={16} />
            </View>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.childName}>Aarav Sharma</Text>
            <Text style={styles.childDetails}>Born: March 15, 2018</Text>
            <Text style={styles.childDetails}>Aries | Ashwini Nakshatra</Text>
          </View>
        </View>

        {/* Key Traits */}
        <View style={styles.traitsCard}>
          <Text style={styles.sectionTitle}>Key Personality Traits</Text>
          <View style={styles.traitsList}>
            <View style={styles.traitItem}>
              <CheckCircle color="#4CAF50" size={16} />
              <Text style={styles.traitText}>Intelligent & Quick Learner</Text>
            </View>
            <View style={styles.traitItem}>
              <CheckCircle color="#4CAF50" size={16} />
              <Text style={styles.traitText}>Creative & Imaginative</Text>
            </View>
            <View style={styles.traitItem}>
              <CheckCircle color="#4CAF50" size={16} />
              <Text style={styles.traitText}>Natural Leader</Text>
            </View>
            <View style={styles.traitItem}>
              <AlertCircle color="#FF9800" size={16} />
              <Text style={styles.traitText}>Can be impatient at times</Text>
            </View>
          </View>
        </View>

        {/* Talent Areas */}
        <Text style={styles.sectionTitle}>Talent Potential</Text>
        <View style={styles.talentsContainer}>
          {talentAreas.map((talent, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.talentCard,
                selectedTalent?.name === talent.name && styles.talentCardSelected,
              ]}
              onPress={() => setSelectedTalent(
                selectedTalent?.name === talent.name ? null : talent
              )}
            >
              <View style={styles.talentHeader}>
                <View style={styles.talentIcon}>{talent.icon}</View>
                <View style={styles.talentInfo}>
                  <Text style={styles.talentName}>{talent.name}</Text>
                  <View style={styles.talentScoreBar}>
                    <View
                      style={[
                        styles.talentScoreFill,
                        { width: `${talent.score}%` },
                      ]}
                    />
                  </View>
                </View>
                <Text style={styles.talentScoreText}>{talent.score}%</Text>
              </View>
              {selectedTalent?.name === talent.name && (
                <Text style={styles.talentDescription}>{talent.description}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Education Guidance */}
        <Text style={styles.sectionTitle}>Education Guidance</Text>
        <View style={styles.educationCard}>
          <View style={styles.educationItem}>
            <BookOpen color="#3F51B5" size={20} />
            <View style={styles.educationContent}>
              <Text style={styles.educationTitle}>Best Subjects</Text>
              <Text style={styles.educationText}>Mathematics, Science, Computer Science</Text>
            </View>
          </View>
          <View style={styles.educationItem}>
            <Brain color="#9C27B0" size={20} />
            <View style={styles.educationContent}>
              <Text style={styles.educationTitle}>Learning Style</Text>
              <Text style={styles.educationText}>Visual and practical learning works best</Text>
            </View>
          </View>
          <View style={styles.educationItem}>
            <GraduationCap color="#4CAF50" size={20} />
            <View style={styles.educationContent}>
              <Text style={styles.educationTitle}>Career Path</Text>
              <Text style={styles.educationText}>Engineering, Technology, Research</Text>
            </View>
          </View>
        </View>

        {/* Life Phases */}
        <Text style={styles.sectionTitle}>Life Phase Guidance</Text>
        {lifePhases.map((phase, index) => (
          <View key={index} style={styles.phaseCard}>
            <View style={styles.phaseHeader}>
              <View style={styles.phaseAgeBadge}>
                <Text style={styles.phaseAgeText}>{phase.age}</Text>
              </View>
              <Text style={styles.phaseTitle}>{phase.title}</Text>
            </View>
            <Text style={styles.phaseDescription}>{phase.description}</Text>
            <View style={styles.focusList}>
              {phase.focus.map((item, i) => (
                <View key={i} style={styles.focusItem}>
                  <View style={styles.focusDot} />
                  <Text style={styles.focusText}>{item}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}

        {/* Remedies for Children */}
        <Text style={styles.sectionTitle}>Beneficial Remedies</Text>
        <View style={styles.remediesCard}>
          <View style={styles.remedyItem}>
            <View style={styles.remedyNumber}>
              <Text style={styles.remedyNumberText}>1</Text>
            </View>
            <View style={styles.remedyContent}>
              <Text style={styles.remedyTitle}>Education Enhancement</Text>
              <Text style={styles.remedyText}>Chant Saraswati Mantra on Thursdays</Text>
            </View>
          </View>
          <View style={styles.remedyItem}>
            <View style={styles.remedyNumber}>
              <Text style={styles.remedyNumberText}>2</Text>
            </View>
            <View style={styles.remedyContent}>
              <Text style={styles.remedyTitle}>Health Protection</Text>
              <Text style={styles.remedyText}>Offer water to Sun every morning</Text>
            </View>
          </View>
          <View style={styles.remedyItem}>
            <View style={styles.remedyNumber}>
              <Text style={styles.remedyNumberText}>3</Text>
            </View>
            <View style={styles.remedyContent}>
              <Text style={styles.remedyTitle}>Overall Growth</Text>
              <Text style={styles.remedyText}>Donate books to needy students</Text>
            </View>
          </View>
        </View>
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
  placeholder: {
    width: 40,
  },
  content: {
    padding: 16,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  profileImageContainer: {
    position: 'relative',
  },
  profileImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
  },
  profileBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E91E63',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: {
    marginLeft: 14,
    flex: 1,
  },
  childName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  childDetails: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
    marginTop: 8,
  },
  traitsCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  traitsList: {
    gap: 8,
  },
  traitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  traitText: {
    fontSize: 14,
    color: Colors.text,
  },
  talentsContainer: {
    marginBottom: 16,
  },
  talentCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  talentCardSelected: {
    borderColor: '#E91E63',
    borderWidth: 2,
  },
  talentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  talentIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  talentInfo: {
    flex: 1,
  },
  talentName: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 6,
  },
  talentScoreBar: {
    height: 6,
    backgroundColor: Colors.background,
    borderRadius: 3,
    overflow: 'hidden',
  },
  talentScoreFill: {
    height: '100%',
    backgroundColor: '#E91E63',
    borderRadius: 3,
  },
  talentScoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E91E63',
    marginLeft: 10,
  },
  talentDescription: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  educationCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  educationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
    gap: 12,
  },
  educationContent: {
    flex: 1,
  },
  educationTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 2,
  },
  educationText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  phaseCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  phaseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 10,
  },
  phaseAgeBadge: {
    backgroundColor: '#FCE4EC',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  phaseAgeText: {
    fontSize: 11,
    color: '#E91E63',
    fontWeight: '500',
  },
  phaseTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  phaseDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 10,
  },
  focusList: {
    gap: 6,
  },
  focusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  focusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E91E63',
  },
  focusText: {
    fontSize: 12,
    color: Colors.text,
  },
  remediesCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  remedyItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  remedyNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FCE4EC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  remedyNumberText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E91E63',
  },
  remedyContent: {
    flex: 1,
  },
  remedyTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 2,
  },
  remedyText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
});
