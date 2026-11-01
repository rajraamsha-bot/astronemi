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
  Users,
  Heart,
  Star,
  CheckCircle,
  AlertTriangle,
  Info,
  ChevronRight,
} from 'lucide-react-native';
import { router } from 'expo-router';
import Colors from '@/constants/colors';

interface ComparisonAspect {
  name: string;
  score: number;
  description: string;
  status: 'good' | 'moderate' | 'challenging';
}

interface ChartInfo {
  name: string;
  zodiac: string;
  nakshatra: string;
  moon: string;
  ascendant: string;
  image: string;
}

const chart1: ChartInfo = {
  name: 'Rahul',
  zodiac: 'Aries',
  nakshatra: 'Ashwini',
  moon: 'Aries',
  ascendant: 'Leo',
  image: 'https://randomuser.me/api/portraits/men/32.jpg',
};

const chart2: ChartInfo = {
  name: 'Priya',
  zodiac: 'Leo',
  nakshatra: 'Magha',
  moon: 'Leo',
  ascendant: 'Sagittarius',
  image: 'https://randomuser.me/api/portraits/women/44.jpg',
};

const comparisonAspects: ComparisonAspect[] = [
  {
    name: 'Mental Compatibility',
    score: 85,
    description: 'Moon signs are compatible, indicating emotional harmony.',
    status: 'good',
  },
  {
    name: 'Physical Attraction',
    score: 78,
    description: 'Venus-Mars aspects create strong physical chemistry.',
    status: 'good',
  },
  {
    name: 'Communication',
    score: 72,
    description: 'Mercury positions support good understanding.',
    status: 'moderate',
  },
  {
    name: 'Financial Alignment',
    score: 65,
    description: '2nd house lords need attention for financial harmony.',
    status: 'moderate',
  },
  {
    name: 'Family Compatibility',
    score: 88,
    description: '4th house connections indicate family support.',
    status: 'good',
  },
  {
    name: 'Spiritual Bond',
    score: 92,
    description: '9th house and Dharma connections are strong.',
    status: 'good',
  },
];

const kutaScore = {
  total: 28,
  max: 36,
  varna: 1,
  vashya: 2,
  tara: 3,
  yoni: 4,
  grahaMaitri: 5,
  gana: 6,
  bhakut: 7,
  nadi: 8,
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'good': return '#4CAF50';
    case 'moderate': return '#FF9800';
    case 'challenging': return '#F44336';
    default: return Colors.textLight;
  }
};

export default function ChartComparisonScreen() {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#C2185B', '#D81B60', '#E91E63']}
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
            <Text style={styles.headerTitle}>Chart Comparison</Text>
            <View style={styles.placeholder} />
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.content}>
        {/* Info Card */}
        <View style={styles.infoCard}>
          <Info color="#C2185B" size={18} />
          <Text style={styles.infoText}>
            Compare two birth charts to understand relationship dynamics,
            compatibility, and potential challenges.
          </Text>
        </View>

        {/* Profile Cards */}
        <View style={styles.profilesContainer}>
          <View style={styles.profileCard}>
            <Image source={{ uri: chart1.image }} style={styles.profileImage} contentFit="cover" />
            <Text style={styles.profileName}>{chart1.name}</Text>
            <Text style={styles.profileDetail}>{chart1.zodiac}</Text>
            <Text style={styles.profileDetail}>{chart1.nakshatra}</Text>
          </View>
          
          <View style={styles.heartContainer}>
            <Heart color="#E91E63" size={28} fill="#E91E63" />
          </View>
          
          <View style={styles.profileCard}>
            <Image source={{ uri: chart2.image }} style={styles.profileImage} contentFit="cover" />
            <Text style={styles.profileName}>{chart2.name}</Text>
            <Text style={styles.profileDetail}>{chart2.zodiac}</Text>
            <Text style={styles.profileDetail}>{chart2.nakshatra}</Text>
          </View>
        </View>

        {/* Overall Score */}
        <View style={styles.scoreCard}>
          <Text style={styles.scoreTitle}>Overall Compatibility</Text>
          <View style={styles.scoreCircle}>
            <Text style={styles.scoreValue}>{Math.round((kutaScore.total / kutaScore.max) * 100)}%</Text>
          </View>
          <Text style={styles.scoreLabel}>
            {kutaScore.total}/{kutaScore.max} Kuta Points
          </Text>
          <View style={styles.scoreBar}>
            <View
              style={[
                styles.scoreBarFill,
                { width: `${(kutaScore.total / kutaScore.max) * 100}%` },
              ]}
            />
          </View>
          <Text style={styles.scoreStatus}>Good Match - Recommended</Text>
        </View>

        {/* Ashta Kuta Details */}
        <TouchableOpacity
          style={styles.kutaCard}
          onPress={() => setShowDetails(!showDetails)}
        >
          <View style={styles.kutaHeader}>
            <View style={styles.kutaHeaderLeft}>
              <Star color="#FFC107" size={20} />
              <Text style={styles.kutaTitle}>Ashta Kuta Score</Text>
            </View>
            <ChevronRight
              color={Colors.textLight}
              size={20}
              style={{ transform: [{ rotate: showDetails ? '90deg' : '0deg' }] }}
            />
          </View>
          
          {showDetails && (
            <View style={styles.kutaDetails}>
              <View style={styles.kutaItem}>
                <Text style={styles.kutaItemName}>Varna</Text>
                <Text style={styles.kutaItemScore}>1/1</Text>
              </View>
              <View style={styles.kutaItem}>
                <Text style={styles.kutaItemName}>Vashya</Text>
                <Text style={styles.kutaItemScore}>2/2</Text>
              </View>
              <View style={styles.kutaItem}>
                <Text style={styles.kutaItemName}>Tara</Text>
                <Text style={styles.kutaItemScore}>3/3</Text>
              </View>
              <View style={styles.kutaItem}>
                <Text style={styles.kutaItemName}>Yoni</Text>
                <Text style={styles.kutaItemScore}>4/4</Text>
              </View>
              <View style={styles.kutaItem}>
                <Text style={styles.kutaItemName}>Graha Maitri</Text>
                <Text style={styles.kutaItemScore}>5/5</Text>
              </View>
              <View style={styles.kutaItem}>
                <Text style={styles.kutaItemName}>Gana</Text>
                <Text style={styles.kutaItemScore}>6/6</Text>
              </View>
              <View style={styles.kutaItem}>
                <Text style={styles.kutaItemName}>Bhakut</Text>
                <Text style={styles.kutaItemScore}>7/7</Text>
              </View>
              <View style={styles.kutaItem}>
                <Text style={styles.kutaItemName}>Nadi</Text>
                <Text style={styles.kutaItemScore}>8/8</Text>
              </View>
            </View>
          )}
        </TouchableOpacity>

        {/* Comparison Aspects */}
        <Text style={styles.sectionTitle}>Detailed Analysis</Text>
        {comparisonAspects.map((aspect, index) => (
          <View key={index} style={styles.aspectCard}>
            <View style={styles.aspectHeader}>
              <Text style={styles.aspectName}>{aspect.name}</Text>
              <View style={[styles.aspectBadge, { backgroundColor: getStatusColor(aspect.status) + '20' }]}>
                <Text style={[styles.aspectScore, { color: getStatusColor(aspect.status) }]}>
                  {aspect.score}%
                </Text>
              </View>
            </View>
            <View style={styles.aspectBar}>
              <View
                style={[
                  styles.aspectBarFill,
                  { width: `${aspect.score}%`, backgroundColor: getStatusColor(aspect.status) },
                ]}
              />
            </View>
            <Text style={styles.aspectDescription}>{aspect.description}</Text>
          </View>
        ))}

        {/* Strengths & Challenges */}
        <Text style={styles.sectionTitle}>Relationship Insights</Text>
        <View style={styles.insightsCard}>
          <View style={styles.insightSection}>
            <View style={styles.insightHeader}>
              <CheckCircle color="#4CAF50" size={18} />
              <Text style={styles.insightTitle}>Strengths</Text>
            </View>
            <Text style={styles.insightText}>Strong emotional bond and mutual respect</Text>
            <Text style={styles.insightText}>Good family support and social standing</Text>
            <Text style={styles.insightText}>Shared spiritual values and goals</Text>
          </View>
          <View style={styles.insightDivider} />
          <View style={styles.insightSection}>
            <View style={styles.insightHeader}>
              <AlertTriangle color="#FF9800" size={18} />
              <Text style={styles.insightTitle}>Areas to Work On</Text>
            </View>
            <Text style={styles.insightText}>Financial planning needs joint effort</Text>
            <Text style={styles.insightText}>Communication during disagreements</Text>
            <Text style={styles.insightText}>Respecting individual space and opinions</Text>
          </View>
        </View>

        {/* CTA */}
        <TouchableOpacity style={styles.consultButton}>
          <Users color="#FFF" size={18} />
          <Text style={styles.consultButtonText}>Consult Astrologer for Detailed Analysis</Text>
        </TouchableOpacity>
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
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FCE4EC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#C2185B',
    lineHeight: 17,
  },
  profilesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  profileCard: {
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    width: '40%',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  profileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 8,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  profileDetail: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  heartContainer: {
    marginHorizontal: 12,
  },
  scoreCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  scoreTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 16,
  },
  scoreCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FCE4EC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  scoreValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#C2185B',
  },
  scoreLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  scoreBar: {
    width: '100%',
    height: 8,
    backgroundColor: Colors.background,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  scoreBarFill: {
    height: '100%',
    backgroundColor: '#E91E63',
    borderRadius: 4,
  },
  scoreStatus: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4CAF50',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
    marginTop: 8,
  },
  kutaCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  kutaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  kutaHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  kutaTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  kutaDetails: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  kutaItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  kutaItemName: {
    fontSize: 13,
    color: Colors.text,
  },
  kutaItemScore: {
    fontSize: 13,
    fontWeight: '500',
    color: '#4CAF50',
  },
  aspectCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  aspectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  aspectName: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },
  aspectBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  aspectScore: {
    fontSize: 12,
    fontWeight: '600',
  },
  aspectBar: {
    height: 4,
    backgroundColor: Colors.background,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  aspectBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  aspectDescription: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  insightsCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  insightSection: {
    marginBottom: 12,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  insightText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
    marginLeft: 26,
  },
  insightDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 12,
  },
  consultButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#C2185B',
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 24,
    gap: 10,
  },
  consultButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
});