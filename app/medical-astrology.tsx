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
  Heart,
  Brain,
  Activity,
  Eye,
  Wind,
  Droplet,
  Bone,
  AlertTriangle,
  CheckCircle,
  Info,
} from 'lucide-react-native';
import { router } from 'expo-router';
import Colors from '@/constants/colors';

interface HealthIndicator {
  planet: string;
  organ: string;
  icon: React.ReactNode;
  status: 'good' | 'moderate' | 'attention';
  description: string;
  remedies: string[];
}

const healthIndicators: HealthIndicator[] = [
  {
    planet: 'Sun',
    organ: 'Heart & Spine',
    icon: <Heart color="#FF5722" size={20} />,
    status: 'good',
    description: 'Strong Sun indicates good vitality and heart health.',
    remedies: ['Surya Namaskar', 'Drink water from copper vessel'],
  },
  {
    planet: 'Moon',
    organ: 'Mind & Digestion',
    icon: <Brain color="#2196F3" size={20} />,
    status: 'moderate',
    description: 'Moon in 6th house may cause digestive issues and anxiety.',
    remedies: ['Meditation', 'Avoid cold foods at night'],
  },
  {
    planet: 'Mars',
    organ: 'Blood & Muscles',
    icon: <Activity color="#F44336" size={20} />,
    status: 'attention',
    description: 'Afflicted Mars can lead to blood disorders or accidents.',
    remedies: ['Hanuman Chalisa', 'Avoid spicy food'],
  },
  {
    planet: 'Mercury',
    organ: 'Nervous System',
    icon: <Eye color="#4CAF50" size={20} />,
    status: 'good',
    description: 'Well-placed Mercury supports good nervous system function.',
    remedies: ['Green vegetables', 'Brahmi herb'],
  },
  {
    planet: 'Jupiter',
    organ: 'Liver & Pancreas',
    icon: <Droplet color="#FF9800" size={20} />,
    status: 'moderate',
    description: 'Jupiter in 8th house may affect liver health.',
    remedies: ['Guru Mantra', 'Turmeric with milk'],
  },
  {
    planet: 'Venus',
    organ: 'Reproductive System',
    icon: <Wind color="#9C27B0" size={20} />,
    status: 'good',
    description: 'Strong Venus indicates good reproductive health.',
    remedies: ['Wear white on Fridays', 'Chant Om Shum Shukraya Namaha'],
  },
  {
    planet: 'Saturn',
    organ: 'Bones & Teeth',
    icon: <Bone color="#607D8B" size={20} />,
    status: 'attention',
    description: 'Saturn in 1st house may cause joint issues or dental problems.',
    remedies: ['Shani Mantra', 'Sesame seeds'],
  },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case 'good': return '#4CAF50';
    case 'moderate': return '#FF9800';
    case 'attention': return '#F44336';
    default: return Colors.textLight;
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'good': return <CheckCircle color="#4CAF50" size={18} />;
    case 'moderate': return <Info color="#FF9800" size={18} />;
    case 'attention': return <AlertTriangle color="#F44336" size={18} />;
    default: return null;
  }
};

export default function MedicalAstrologyScreen() {
  const [selectedIndicator, setSelectedIndicator] = useState<HealthIndicator | null>(null);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#00695C', '#00796B', '#00897B']}
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
            <Text style={styles.headerTitle}>Medical Astrology</Text>
            <View style={styles.placeholder} />
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.content}>
        {/* Info Card */}
        <View style={styles.infoCard}>
          <Info color="#00695C" size={20} />
          <Text style={styles.infoText}>
            Medical astrology analyzes planetary positions to understand potential health
            vulnerabilities and provides preventive remedies.
          </Text>
        </View>

        {/* Health Overview */}
        <View style={styles.overviewCard}>
          <Text style={styles.overviewTitle}>Health Overview</Text>
          <View style={styles.overviewStats}>
            <View style={styles.statItem}>
              <View style={[styles.statDot, { backgroundColor: '#4CAF50' }]} />
              <Text style={styles.statLabel}>Good</Text>
              <Text style={styles.statValue}>3</Text>
            </View>
            <View style={styles.statItem}>
              <View style={[styles.statDot, { backgroundColor: '#FF9800' }]} />
              <Text style={styles.statLabel}>Moderate</Text>
              <Text style={styles.statValue}>2</Text>
            </View>
            <View style={styles.statItem}>
              <View style={[styles.statDot, { backgroundColor: '#F44336' }]} />
              <Text style={styles.statLabel}>Attention</Text>
              <Text style={styles.statValue}>2</Text>
            </View>
          </View>
        </View>

        {/* Health Indicators */}
        <Text style={styles.sectionTitle}>Planetary Health Indicators</Text>
        {healthIndicators.map((indicator) => (
          <TouchableOpacity
            key={indicator.planet}
            style={[
              styles.indicatorCard,
              selectedIndicator?.planet === indicator.planet && styles.indicatorCardSelected,
            ]}
            onPress={() => setSelectedIndicator(
              selectedIndicator?.planet === indicator.planet ? null : indicator
            )}
          >
            <View style={styles.indicatorHeader}>
              <View style={styles.indicatorLeft}>
                <View style={styles.iconContainer}>
                  {indicator.icon}
                </View>
                <View>
                  <Text style={styles.planetName}>{indicator.planet}</Text>
                  <Text style={styles.organName}>{indicator.organ}</Text>
                </View>
              </View>
              <View style={styles.statusContainer}>
                {getStatusIcon(indicator.status)}
                <Text style={[styles.statusText, { color: getStatusColor(indicator.status) }]}>
                  {indicator.status.charAt(0).toUpperCase() + indicator.status.slice(1)}
                </Text>
              </View>
            </View>
            
            <Text style={styles.description}>{indicator.description}</Text>
            
            {selectedIndicator?.planet === indicator.planet && (
              <View style={styles.remediesContainer}>
                <Text style={styles.remediesTitle}>Recommended Remedies:</Text>
                {indicator.remedies.map((remedy, i) => (
                  <View key={i} style={styles.remedyItem}>
                    <CheckCircle color="#00695C" size={14} />
                    <Text style={styles.remedyText}>{remedy}</Text>
                  </View>
                ))}
              </View>
            )}
          </TouchableOpacity>
        ))}

        {/* Disclaimer */}
        <View style={styles.disclaimerCard}>
          <AlertTriangle color="#FF9800" size={20} />
          <Text style={styles.disclaimerText}>
            Medical astrology is for informational purposes only. Always consult
            qualified healthcare professionals for medical advice and treatment.
          </Text>
        </View>

        {/* Tips Section */}
        <Text style={styles.sectionTitle}>Health Tips Based on Your Chart</Text>
        <View style={styles.tipsCard}>
          <View style={styles.tipItem}>
            <View style={[styles.tipNumber, { backgroundColor: '#E0F2F1' }]}>
              <Text style={[styles.tipNumberText, { color: '#00695C' }]}>1</Text>
            </View>
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>Morning Routine</Text>
              <Text style={styles.tipDescription}>
                Practice Surya Namaskar during sunrise to strengthen your Sun.
              </Text>
            </View>
          </View>
          <View style={styles.tipItem}>
            <View style={[styles.tipNumber, { backgroundColor: '#E3F2FD' }]}>
              <Text style={[styles.tipNumberText, { color: '#1976D2' }]}>2</Text>
            </View>
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>Diet Recommendations</Text>
              <Text style={styles.tipDescription}>
                Include more leafy greens to support your Mercury placement.
              </Text>
            </View>
          </View>
          <View style={styles.tipItem}>
            <View style={[styles.tipNumber, { backgroundColor: '#FFF3E0' }]}>
              <Text style={[styles.tipNumberText, { color: '#F57C00' }]}>3</Text>
            </View>
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>Lifestyle Changes</Text>
              <Text style={styles.tipDescription}>
                Regular oil massage to strengthen bones (Saturn remedy).
              </Text>
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
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#E0F2F1',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#00695C',
    lineHeight: 18,
  },
  overviewCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  overviewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  overviewStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
    marginTop: 8,
  },
  indicatorCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  indicatorCardSelected: {
    borderColor: '#00695C',
    borderWidth: 2,
  },
  indicatorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  indicatorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planetName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  organName: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  description: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  remediesContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  remediesTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  remedyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  remedyText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  disclaimerCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
    marginBottom: 16,
    gap: 10,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 12,
    color: '#E65100',
    lineHeight: 17,
  },
  tipsCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  tipNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  tipNumberText: {
    fontSize: 14,
    fontWeight: '600',
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  tipDescription: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 17,
  },
});
