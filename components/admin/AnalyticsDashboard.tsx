/**
 * Analytics Dashboard Component
 * 
 * Admin dashboard for viewing analytics and user engagement metrics
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { 
  TrendingUp, 
  Users, 
  Activity, 
  DollarSign,
  Eye,
  MousePointer,
  Clock,
  Award,
} from 'lucide-react-native';
import { useAppTheme } from '@/contexts/ThemeContext';
import { UserTier } from '@/utils/progressive-disclosure';

const { width } = Dimensions.get('window');

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  color: string;
}

function MetricCard({ title, value, change, icon, color }: MetricCardProps) {
  const Colors = useAppTheme();

  return (
    <View style={[styles.metricCard, { backgroundColor: Colors.cardBackground }]}>
      <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
        {icon}
      </View>
      
      <View style={styles.metricContent}>
        <Text style={[styles.metricTitle, { color: Colors.textLight }]}>
          {title}
        </Text>
        <Text style={[styles.metricValue, { color: Colors.text }]}>
          {value}
        </Text>
        
        {change !== undefined && (
          <View style={styles.changeContainer}>
            <TrendingUp 
              size={14} 
              color={change >= 0 ? '#10B981' : '#EF4444'} 
            />
            <Text style={[
              styles.changeText,
              { color: change >= 0 ? '#10B981' : '#EF4444' }
            ]}>
              {change >= 0 ? '+' : ''}{change}%
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

interface FeatureUsageItem {
  id: string;
  name: string;
  views: number;
  uniqueUsers: number;
  avgTimeSpent: number;
}

interface TierDistribution {
  tier: UserTier;
  count: number;
  percentage: number;
}

export default function AnalyticsDashboard() {
  const Colors = useAppTheme();
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('week');

  // Mock data - replace with actual analytics data
  const metrics = {
    totalUsers: 12543,
    activeUsers: 8234,
    newUsers: 1234,
    revenue: 45678,
    avgSessionDuration: 12.5,
    conversionRate: 3.2,
    retentionRate: 68,
    churnRate: 5.2,
  };

  const changes = {
    totalUsers: 12.5,
    activeUsers: 8.3,
    newUsers: 23.1,
    revenue: 15.7,
  };

  const topFeatures: FeatureUsageItem[] = [
    { id: 'horoscope', name: 'Daily Horoscope', views: 45234, uniqueUsers: 8234, avgTimeSpent: 3.2 },
    { id: 'kundli', name: 'Kundli Generator', views: 32145, uniqueUsers: 6543, avgTimeSpent: 8.5 },
    { id: 'ai-chat', name: 'AI Astrologer', views: 28934, uniqueUsers: 5234, avgTimeSpent: 12.3 },
    { id: 'astrologers', name: 'Talk to Astrologers', views: 21456, uniqueUsers: 4123, avgTimeSpent: 15.7 },
    { id: 'panchang', name: 'Panchang', views: 18234, uniqueUsers: 3456, avgTimeSpent: 2.8 },
  ];

  const tierDistribution: TierDistribution[] = [
    { tier: UserTier.NEW, count: 5234, percentage: 41.7 },
    { tier: UserTier.ENGAGED, count: 4123, percentage: 32.9 },
    { tier: UserTier.POWER, count: 3186, percentage: 25.4 },
  ];

  const getTierColor = (tier: UserTier) => {
    switch (tier) {
      case UserTier.NEW:
        return '#3B82F6';
      case UserTier.ENGAGED:
        return '#8B5CF6';
      case UserTier.POWER:
        return '#F59E0B';
    }
  };

  const getTierName = (tier: UserTier) => {
    switch (tier) {
      case UserTier.NEW:
        return 'New Users';
      case UserTier.ENGAGED:
        return 'Engaged Users';
      case UserTier.POWER:
        return 'Power Users';
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: Colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: Colors.text }]}>
          Analytics Dashboard
        </Text>
        
        {/* Time Range Selector */}
        <View style={styles.timeRangeSelector}>
          {(['day', 'week', 'month'] as const).map((range) => (
            <TouchableOpacity
              key={range}
              style={[
                styles.timeRangeButton,
                timeRange === range && { backgroundColor: Colors.primary },
              ]}
              onPress={() => setTimeRange(range)}
            >
              <Text
                style={[
                  styles.timeRangeText,
                  { color: timeRange === range ? '#FFFFFF' : Colors.textLight },
                ]}
              >
                {range.charAt(0).toUpperCase() + range.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Key Metrics */}
      <View style={styles.metricsGrid}>
        <MetricCard
          title="Total Users"
          value={metrics.totalUsers.toLocaleString()}
          change={changes.totalUsers}
          icon={<Users size={24} color="#3B82F6" />}
          color="#3B82F6"
        />
        <MetricCard
          title="Active Users"
          value={metrics.activeUsers.toLocaleString()}
          change={changes.activeUsers}
          icon={<Activity size={24} color="#10B981" />}
          color="#10B981"
        />
        <MetricCard
          title="New Users"
          value={metrics.newUsers.toLocaleString()}
          change={changes.newUsers}
          icon={<TrendingUp size={24} color="#8B5CF6" />}
          color="#8B5CF6"
        />
        <MetricCard
          title="Revenue"
          value={`₹${metrics.revenue.toLocaleString()}`}
          change={changes.revenue}
          icon={<DollarSign size={24} color="#F59E0B" />}
          color="#F59E0B"
        />
      </View>

      {/* Engagement Metrics */}
      <View style={[styles.section, { backgroundColor: Colors.cardBackground }]}>
        <Text style={[styles.sectionTitle, { color: Colors.text }]}>
          Engagement Metrics
        </Text>
        
        <View style={styles.engagementGrid}>
          <View style={styles.engagementItem}>
            <Clock size={20} color={Colors.primary} />
            <Text style={[styles.engagementLabel, { color: Colors.textLight }]}>
              Avg Session
            </Text>
            <Text style={[styles.engagementValue, { color: Colors.text }]}>
              {metrics.avgSessionDuration} min
            </Text>
          </View>

          <View style={styles.engagementItem}>
            <MousePointer size={20} color={Colors.primary} />
            <Text style={[styles.engagementLabel, { color: Colors.textLight }]}>
              Conversion
            </Text>
            <Text style={[styles.engagementValue, { color: Colors.text }]}>
              {metrics.conversionRate}%
            </Text>
          </View>

          <View style={styles.engagementItem}>
            <Award size={20} color={Colors.primary} />
            <Text style={[styles.engagementLabel, { color: Colors.textLight }]}>
              Retention
            </Text>
            <Text style={[styles.engagementValue, { color: Colors.text }]}>
              {metrics.retentionRate}%
            </Text>
          </View>

          <View style={styles.engagementItem}>
            <TrendingUp size={20} color={Colors.primary} />
            <Text style={[styles.engagementLabel, { color: Colors.textLight }]}>
              Churn Rate
            </Text>
            <Text style={[styles.engagementValue, { color: Colors.text }]}>
              {metrics.churnRate}%
            </Text>
          </View>
        </View>
      </View>

      {/* User Tier Distribution */}
      <View style={[styles.section, { backgroundColor: Colors.cardBackground }]}>
        <Text style={[styles.sectionTitle, { color: Colors.text }]}>
          User Tier Distribution
        </Text>
        
        {tierDistribution.map((item) => (
          <View key={item.tier} style={styles.tierItem}>
            <View style={styles.tierInfo}>
              <View style={[styles.tierDot, { backgroundColor: getTierColor(item.tier) }]} />
              <Text style={[styles.tierLabel, { color: Colors.text }]}>
                {getTierName(item.tier)}
              </Text>
            </View>
            
            <View style={styles.tierStats}>
              <Text style={[styles.tierCount, { color: Colors.text }]}>
                {item.count.toLocaleString()}
              </Text>
              <Text style={[styles.tierPercentage, { color: Colors.textLight }]}>
                ({item.percentage}%)
              </Text>
            </View>
            
            <View style={[styles.tierBar, { backgroundColor: Colors.border }]}>
              <View
                style={[
                  styles.tierBarFill,
                  { 
                    backgroundColor: getTierColor(item.tier),
                    width: `${item.percentage}%`,
                  },
                ]}
              />
            </View>
          </View>
        ))}
      </View>

      {/* Top Features */}
      <View style={[styles.section, { backgroundColor: Colors.cardBackground }]}>
        <Text style={[styles.sectionTitle, { color: Colors.text }]}>
          Top Features
        </Text>
        
        {topFeatures.map((feature, index) => (
          <View key={feature.id} style={styles.featureItem}>
            <View style={styles.featureRank}>
              <Text style={[styles.rankText, { color: Colors.primary }]}>
                #{index + 1}
              </Text>
            </View>
            
            <View style={styles.featureInfo}>
              <Text style={[styles.featureName, { color: Colors.text }]}>
                {feature.name}
              </Text>
              
              <View style={styles.featureStats}>
                <View style={styles.featureStat}>
                  <Eye size={14} color={Colors.textLight} />
                  <Text style={[styles.featureStatText, { color: Colors.textLight }]}>
                    {feature.views.toLocaleString()} views
                  </Text>
                </View>
                
                <View style={styles.featureStat}>
                  <Users size={14} color={Colors.textLight} />
                  <Text style={[styles.featureStatText, { color: Colors.textLight }]}>
                    {feature.uniqueUsers.toLocaleString()} users
                  </Text>
                </View>
                
                <View style={styles.featureStat}>
                  <Clock size={14} color={Colors.textLight} />
                  <Text style={[styles.featureStatText, { color: Colors.textLight }]}>
                    {feature.avgTimeSpent} min
                  </Text>
                </View>
              </View>
            </View>
          </View>
        ))}
      </View>

      {/* Note */}
      <View style={styles.note}>
        <Text style={[styles.noteText, { color: Colors.textLight }]}>
          💡 This is a demo dashboard with mock data. Integrate with your analytics service (Firebase, Mixpanel, Amplitude) to see real data.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  timeRangeSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  timeRangeButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  timeRangeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
    gap: 10,
  },
  metricCard: {
    width: (width - 40) / 2,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    gap: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricContent: {
    flex: 1,
  },
  metricTitle: {
    fontSize: 12,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  changeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    margin: 20,
    marginTop: 10,
    padding: 16,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  engagementGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  engagementItem: {
    width: (width - 72) / 2,
    alignItems: 'center',
    gap: 8,
  },
  engagementLabel: {
    fontSize: 12,
  },
  engagementValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  tierItem: {
    marginBottom: 20,
  },
  tierInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  tierDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  tierLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  tierStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  tierCount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  tierPercentage: {
    fontSize: 14,
  },
  tierBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  tierBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  featureItem: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  featureRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  featureInfo: {
    flex: 1,
  },
  featureName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  featureStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  featureStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  featureStatText: {
    fontSize: 12,
  },
  note: {
    margin: 20,
    padding: 16,
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
  },
  noteText: {
    fontSize: 14,
    lineHeight: 20,
  },
});
