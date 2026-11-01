/**
 * Tier Progress Card
 * 
 * Shows user's current tier and progress to next tier
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Zap, TrendingUp, Crown, ChevronRight } from 'lucide-react-native';
import { router } from 'expo-router';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useUserEngagement } from '@/contexts/UserEngagementContext';
import { UserTier } from '@/utils/progressive-disclosure';

export default function TierProgressCard() {
  const Colors = useAppTheme();
  const { currentTier, tierProgress, engagement } = useUserEngagement();
  
  const progressAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Animate progress bar
    Animated.timing(progressAnim, {
      toValue: tierProgress.progress,
      duration: 1000,
      useNativeDriver: false,
    }).start();

    // Pulse effect for power user
    if (currentTier === UserTier.POWER && !engagement.hasSubscription) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [tierProgress.progress, currentTier, engagement.hasSubscription, progressAnim, pulseAnim]);

  const getTierIcon = (tier: UserTier) => {
    switch (tier) {
      case UserTier.NEW:
        return <Zap size={24} color={Colors.primary} />;
      case UserTier.ENGAGED:
        return <TrendingUp size={24} color={Colors.primary} />;
      case UserTier.POWER:
        return <Crown size={24} color="#F59E0B" />;
    }
  };

  const getTierName = (tier: UserTier) => {
    switch (tier) {
      case UserTier.NEW:
        return 'New Explorer';
      case UserTier.ENGAGED:
        return 'Engaged Seeker';
      case UserTier.POWER:
        return 'Power User';
    }
  };

  const getTierColor = (tier: UserTier) => {
    switch (tier) {
      case UserTier.NEW:
        return Colors.primary;
      case UserTier.ENGAGED:
        return '#8B5CF6';
      case UserTier.POWER:
        return '#F59E0B';
    }
  };

  const handlePress = () => {
    router.push('/subscription');
  };

  // Don't show for power users who are subscribed
  if (currentTier === UserTier.POWER && engagement.hasSubscription) {
    return null;
  }

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: Colors.cardBackground }]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      {/* Header */}
      <View style={styles.header}>
        <Animated.View style={[styles.tierBadge, { transform: [{ scale: pulseAnim }] }]}>
          {getTierIcon(currentTier)}
          <Text style={[styles.tierName, { color: Colors.text }]}>
            {getTierName(currentTier)}
          </Text>
        </Animated.View>
        
        <ChevronRight size={20} color={Colors.textLight} />
      </View>

      {/* Progress Section */}
      {tierProgress.nextTier && (
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={[styles.progressLabel, { color: Colors.textLight }]}>
              Progress to {getTierName(tierProgress.nextTier)}
            </Text>
            <Text style={[styles.progressPercentage, { color: getTierColor(currentTier) }]}>
              {Math.round(tierProgress.progress)}%
            </Text>
          </View>

          {/* Progress Bar */}
          <View style={[styles.progressBar, { backgroundColor: Colors.border }]}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  backgroundColor: getTierColor(currentTier),
                  width: progressAnim.interpolate({
                    inputRange: [0, 100],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>

          {/* Requirements */}
          {tierProgress.requirements.length > 0 && (
            <View style={styles.requirements}>
              {tierProgress.requirements.slice(0, 2).map((req, index) => (
                <Text key={index} style={[styles.requirement, { color: Colors.textLight }]}>
                  • {req}
                </Text>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Power User Message */}
      {currentTier === UserTier.POWER && !engagement.hasSubscription && (
        <View style={styles.powerMessage}>
          <Crown size={20} color="#F59E0B" />
          <Text style={[styles.powerText, { color: Colors.text }]}>
            You&apos;re a Power User! Subscribe to unlock all premium features instantly.
          </Text>
        </View>
      )}

      {/* Stats */}
      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: Colors.text }]}>
            {engagement.sessionCount}
          </Text>
          <Text style={[styles.statLabel, { color: Colors.textLight }]}>
            Sessions
          </Text>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: Colors.text }]}>
            {engagement.daysSinceSignup}
          </Text>
          <Text style={[styles.statLabel, { color: Colors.textLight }]}>
            Days
          </Text>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: Colors.text }]}>
            {engagement.hasSubscription ? 'Premium' : 'Free'}
          </Text>
          <Text style={[styles.statLabel, { color: Colors.textLight }]}>
            Plan
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    margin: 16,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tierName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  progressSection: {
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  requirements: {
    gap: 4,
  },
  requirement: {
    fontSize: 12,
  },
  powerMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
  },
  powerText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
  },
});
