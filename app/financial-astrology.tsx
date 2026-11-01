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
  TrendingUp,
  TrendingDown,
  DollarSign,
  PiggyBank,
  Briefcase,
  Landmark,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Info,
} from 'lucide-react-native';
import { router } from 'expo-router';
import Colors from '@/constants/colors';

interface FinancialPeriod {
  period: string;
  type: 'gain' | 'loss' | 'stable';
  description: string;
  percentage: string;
}

interface InvestmentArea {
  name: string;
  icon: React.ReactNode;
  suitability: 'excellent' | 'good' | 'moderate' | 'avoid';
  description: string;
}

const financialPeriods: FinancialPeriod[] = [
  { period: 'Jan - Mar 2024', type: 'gain', description: 'Strong Jupiter transit brings financial growth', percentage: '+15%' },
  { period: 'Apr - Jun 2024', type: 'stable', description: 'Stable period with steady income', percentage: '+3%' },
  { period: 'Jul - Sep 2024', type: 'loss', description: 'Saturn transit may cause expenses', percentage: '-8%' },
  { period: 'Oct - Dec 2024', type: 'gain', description: 'Venus transit brings unexpected gains', percentage: '+20%' },
];

const investmentAreas: InvestmentArea[] = [
  {
    name: 'Stock Market',
    icon: <TrendingUp color="#4CAF50" size={20} />,
    suitability: 'excellent',
    description: 'Your 5th and 9th house strength supports speculative gains.',
  },
  {
    name: 'Real Estate',
    icon: <Landmark color="#2196F3" size={20} />,
    suitability: 'good',
    description: 'Strong 4th house indicates property gains.',
  },
  {
    name: 'Gold & Silver',
    icon: <DollarSign color="#FFC107" size={20} />,
    suitability: 'excellent',
    description: 'Jupiter and Venus favor precious metal investments.',
  },
  {
    name: 'Business',
    icon: <Briefcase color="#9C27B0" size={20} />,
    suitability: 'good',
    description: '7th house strength supports partnerships.',
  },
  {
    name: 'Fixed Deposits',
    icon: <PiggyBank color="#607D8B" size={20} />,
    suitability: 'moderate',
    description: 'Safe but lower returns during this period.',
  },
];

const getSuitabilityColor = (suitability: string) => {
  switch (suitability) {
    case 'excellent': return '#4CAF50';
    case 'good': return '#8BC34A';
    case 'moderate': return '#FF9800';
    case 'avoid': return '#F44336';
    default: return Colors.textLight;
  }
};

const getTypeColor = (type: string) => {
  switch (type) {
    case 'gain': return '#4CAF50';
    case 'loss': return '#F44336';
    case 'stable': return '#FF9800';
    default: return Colors.textLight;
  }
};

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'gain': return <TrendingUp color="#4CAF50" size={18} />;
    case 'loss': return <TrendingDown color="#F44336" size={18} />;
    case 'stable': return <CheckCircle color="#FF9800" size={18} />;
    default: return null;
  }
};

export default function FinancialAstrologyScreen() {
  const [selectedInvestment, setSelectedInvestment] = useState<InvestmentArea | null>(null);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1B5E20', '#2E7D32', '#388E3C']}
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
            <Text style={styles.headerTitle}>Financial Astrology</Text>
            <View style={styles.placeholder} />
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.content}>
        {/* Info Card */}
        <View style={styles.infoCard}>
          <Info color="#2E7D32" size={20} />
          <Text style={styles.infoText}>
            Financial astrology analyzes your birth chart to identify favorable periods
            for investments, wealth accumulation, and financial decisions.
          </Text>
        </View>

        {/* Wealth Score */}
        <View style={styles.wealthCard}>
          <Text style={styles.wealthTitle}>Wealth Potential Score</Text>
          <View style={styles.wealthScoreContainer}>
            <View style={styles.wealthScoreCircle}>
              <Text style={styles.wealthScoreValue}>78</Text>
              <Text style={styles.wealthScoreMax}>/100</Text>
            </View>
            <View style={styles.wealthBreakdown}>
              <View style={styles.wealthItem}>
                <Text style={styles.wealthItemLabel}>Dhana Bhava (2nd)</Text>
                <View style={styles.wealthBar}>
                  <View style={[styles.wealthBarFill, { width: '85%', backgroundColor: '#4CAF50' }]} />
                </View>
              </View>
              <View style={styles.wealthItem}>
                <Text style={styles.wealthItemLabel}>Labha Bhava (11th)</Text>
                <View style={styles.wealthBar}>
                  <View style={[styles.wealthBarFill, { width: '70%', backgroundColor: '#8BC34A' }]} />
                </View>
              </View>
              <View style={styles.wealthItem}>
                <Text style={styles.wealthItemLabel}>Lakshmi Yoga</Text>
                <View style={styles.wealthBar}>
                  <View style={[styles.wealthBarFill, { width: '90%', backgroundColor: '#4CAF50' }]} />
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Financial Periods */}
        <Text style={styles.sectionTitle}>Financial Periods 2024</Text>
        <View style={styles.periodsCard}>
          {financialPeriods.map((period, index) => (
            <View key={index} style={styles.periodItem}>
              <View style={styles.periodHeader}>
                <View style={styles.periodLeft}>
                  <Calendar color={Colors.text} size={16} />
                  <Text style={styles.periodName}>{period.period}</Text>
                </View>
                <View style={styles.periodRight}>
                  {getTypeIcon(period.type)}
                  <Text style={[styles.periodPercentage, { color: getTypeColor(period.type) }]}>
                    {period.percentage}
                  </Text>
                </View>
              </View>
              <Text style={styles.periodDescription}>{period.description}</Text>
            </View>
          ))}
        </View>

        {/* Investment Areas */}
        <Text style={styles.sectionTitle}>Investment Guidance</Text>
        {investmentAreas.map((area, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.investmentCard,
              selectedInvestment?.name === area.name && styles.investmentCardSelected,
            ]}
            onPress={() => setSelectedInvestment(
              selectedInvestment?.name === area.name ? null : area
            )}
          >
            <View style={styles.investmentHeader}>
              <View style={styles.investmentLeft}>
                <View style={styles.investmentIcon}>{area.icon}</View>
                <Text style={styles.investmentName}>{area.name}</Text>
              </View>
              <View style={[styles.suitabilityBadge, { backgroundColor: getSuitabilityColor(area.suitability) + '20' }]}>
                <Text style={[styles.suitabilityText, { color: getSuitabilityColor(area.suitability) }]}>
                  {area.suitability.charAt(0).toUpperCase() + area.suitability.slice(1)}
                </Text>
              </View>
            </View>
            {selectedInvestment?.name === area.name && (
              <Text style={styles.investmentDescription}>{area.description}</Text>
            )}
          </TouchableOpacity>
        ))}

        {/* Dhan Yogas */}
        <Text style={styles.sectionTitle}>Wealth Yogas in Your Chart</Text>
        <View style={styles.yogasCard}>
          <View style={styles.yogaItem}>
            <CheckCircle color="#4CAF50" size={16} />
            <View style={styles.yogaContent}>
              <Text style={styles.yogaName}>Dhana Yoga</Text>
              <Text style={styles.yogaDescription}>Jupiter in 2nd house with Venus aspect</Text>
            </View>
          </View>
          <View style={styles.yogaItem}>
            <CheckCircle color="#4CAF50" size={16} />
            <View style={styles.yogaContent}>
              <Text style={styles.yogaName}>Lakshmi Yoga</Text>
              <Text style={styles.yogaDescription}>Venus in 9th house with Jupiter conjunction</Text>
            </View>
          </View>
          <View style={styles.yogaItem}>
            <CheckCircle color="#8BC34A" size={16} />
            <View style={styles.yogaContent}>
              <Text style={styles.yogaName}>Gajakesari Yoga</Text>
              <Text style={styles.yogaDescription}>Jupiter-Moon conjunction in Kendra</Text>
            </View>
          </View>
        </View>

        {/* Warning */}
        <View style={styles.warningCard}>
          <AlertTriangle color="#FF9800" size={20} />
          <Text style={styles.warningText}>
            Financial astrology is for guidance only. Always consult certified financial
            advisors before making investment decisions.
          </Text>
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
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#2E7D32',
    lineHeight: 18,
  },
  wealthCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  wealthTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 16,
  },
  wealthScoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  wealthScoreCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginRight: 16,
  },
  wealthScoreValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2E7D32',
  },
  wealthScoreMax: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 8,
  },
  wealthBreakdown: {
    flex: 1,
  },
  wealthItem: {
    marginBottom: 8,
  },
  wealthItemLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  wealthBar: {
    height: 6,
    backgroundColor: Colors.background,
    borderRadius: 3,
  },
  wealthBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
    marginTop: 8,
  },
  periodsCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  periodItem: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingBottom: 12,
    marginBottom: 12,
  },
  periodHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  periodLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  periodName: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },
  periodRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  periodPercentage: {
    fontSize: 14,
    fontWeight: '600',
  },
  periodDescription: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  investmentCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  investmentCardSelected: {
    borderColor: '#2E7D32',
    borderWidth: 2,
  },
  investmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  investmentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  investmentIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  investmentName: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },
  suitabilityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  suitabilityText: {
    fontSize: 11,
    fontWeight: '500',
  },
  investmentDescription: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  yogasCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  yogaItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 10,
  },
  yogaContent: {
    flex: 1,
  },
  yogaName: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 2,
  },
  yogaDescription: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    padding: 14,
    marginBottom: 24,
    gap: 10,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    color: '#E65100',
    lineHeight: 17,
  },
});