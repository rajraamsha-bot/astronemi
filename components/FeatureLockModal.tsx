/**
 * Feature Lock Modal
 * 
 * Shows when user tries to access a locked feature.
 * Explains why it's locked and how to unlock it.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Lock, Zap, TrendingUp, Crown, X } from 'lucide-react-native';
import { router } from 'expo-router';
import { useAppTheme } from '@/contexts/ThemeContext';
import { UserTier } from '@/utils/progressive-disclosure';
import { analytics } from '@/utils/analytics-tracker';

interface FeatureLockModalProps {
  visible: boolean;
  onClose: () => void;
  featureName: string;
  featureDescription?: string;
  requiredTier: UserTier;
  currentTier: UserTier;
  requiresSubscription?: boolean;
  tierProgress?: {
    progress: number;
    requirements: string[];
  };
}

export default function FeatureLockModal({
  visible,
  onClose,
  featureName,
  featureDescription,
  requiredTier,
  currentTier,
  requiresSubscription = false,
  tierProgress,
}: FeatureLockModalProps) {
  const Colors = useAppTheme();

  const handleSubscribe = () => {
    analytics.track('feature_lock_subscribe_clicked', {
      feature_name: featureName,
      current_tier: currentTier,
      required_tier: requiredTier,
    });
    onClose();
    router.push('/subscription');
  };

  const handleClose = () => {
    analytics.track('feature_lock_dismissed', {
      feature_name: featureName,
      current_tier: currentTier,
      required_tier: requiredTier,
    });
    onClose();
  };

  const getTierIcon = (tier: UserTier) => {
    switch (tier) {
      case UserTier.NEW:
        return <Zap size={24} color={Colors.primary} />;
      case UserTier.ENGAGED:
        return <TrendingUp size={24} color={Colors.primary} />;
      case UserTier.POWER:
        return <Crown size={24} color={Colors.primary} />;
    }
  };

  const getTierName = (tier: UserTier) => {
    switch (tier) {
      case UserTier.NEW:
        return 'New User';
      case UserTier.ENGAGED:
        return 'Engaged User';
      case UserTier.POWER:
        return 'Power User';
    }
  };

  const getUnlockMessage = () => {
    if (requiresSubscription) {
      return 'This premium feature requires a subscription to unlock.';
    }

    if (requiredTier === UserTier.ENGAGED && currentTier === UserTier.NEW) {
      return 'Keep using the app to unlock this feature! You\'re making great progress.';
    }

    if (requiredTier === UserTier.POWER) {
      return 'This advanced feature is available to Power Users. Subscribe now for instant access, or keep exploring to unlock it naturally.';
    }

    return 'This feature will unlock as you continue your astrology journey with us.';
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modal, { backgroundColor: Colors.background }]}>
          {/* Close Button */}
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <X size={24} color={Colors.textLight} />
          </TouchableOpacity>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Lock Icon */}
            <View style={[styles.iconContainer, { backgroundColor: Colors.primaryLight }]}>
              <Lock size={48} color={Colors.primary} />
            </View>

            {/* Title */}
            <Text style={[styles.title, { color: Colors.text }]}>
              {featureName} is Locked
            </Text>

            {/* Description */}
            {featureDescription && (
              <Text style={[styles.description, { color: Colors.textLight }]}>
                {featureDescription}
              </Text>
            )}

            {/* Unlock Message */}
            <Text style={[styles.unlockMessage, { color: Colors.text }]}>
              {getUnlockMessage()}
            </Text>

            {/* Tier Info */}
            <View style={[styles.tierInfo, { backgroundColor: Colors.cardBackground }]}>
              <View style={styles.tierRow}>
                <View style={styles.tierItem}>
                  <Text style={[styles.tierLabel, { color: Colors.textLight }]}>
                    Your Tier
                  </Text>
                  <View style={styles.tierBadge}>
                    {getTierIcon(currentTier)}
                    <Text style={[styles.tierName, { color: Colors.text }]}>
                      {getTierName(currentTier)}
                    </Text>
                  </View>
                </View>

                <View style={styles.tierItem}>
                  <Text style={[styles.tierLabel, { color: Colors.textLight }]}>
                    Required
                  </Text>
                  <View style={styles.tierBadge}>
                    {getTierIcon(requiredTier)}
                    <Text style={[styles.tierName, { color: Colors.text }]}>
                      {getTierName(requiredTier)}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Progress (if available) */}
            {tierProgress && tierProgress.requirements.length > 0 && (
              <View style={styles.progressSection}>
                <Text style={[styles.progressTitle, { color: Colors.text }]}>
                  Your Progress
                </Text>
                
                {/* Progress Bar */}
                <View style={[styles.progressBar, { backgroundColor: Colors.border }]}>
                  <View
                    style={[
                      styles.progressFill,
                      { 
                        backgroundColor: Colors.primary,
                        width: `${tierProgress.progress}%`,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.progressText, { color: Colors.textLight }]}>
                  {Math.round(tierProgress.progress)}% complete
                </Text>

                {/* Requirements */}
                <View style={styles.requirements}>
                  <Text style={[styles.requirementsTitle, { color: Colors.textLight }]}>
                    To unlock:
                  </Text>
                  {tierProgress.requirements.map((req, index) => (
                    <Text key={index} style={[styles.requirement, { color: Colors.text }]}>
                      • {req}
                    </Text>
                  ))}
                </View>
              </View>
            )}

            {/* Actions */}
            <View style={styles.actions}>
              {/* Subscribe Button */}
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: Colors.primary }]}
                onPress={handleSubscribe}
              >
                <Crown size={20} color="#FFFFFF" />
                <Text style={styles.primaryButtonText}>
                  {requiresSubscription ? 'Subscribe Now' : 'Unlock Instantly'}
                </Text>
              </TouchableOpacity>

              {/* Continue Button */}
              {!requiresSubscription && (
                <TouchableOpacity
                  style={[styles.secondaryButton, { borderColor: Colors.border }]}
                  onPress={handleClose}
                >
                  <Text style={[styles.secondaryButtonText, { color: Colors.text }]}>
                    Continue Exploring
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    padding: 24,
    maxHeight: '80%',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    padding: 8,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  unlockMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  tierInfo: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  tierRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  tierItem: {
    alignItems: 'center',
  },
  tierLabel: {
    fontSize: 12,
    marginBottom: 8,
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tierName: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressSection: {
    marginBottom: 24,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 16,
  },
  requirements: {
    marginTop: 12,
  },
  requirementsTitle: {
    fontSize: 14,
    marginBottom: 8,
  },
  requirement: {
    fontSize: 14,
    marginBottom: 4,
    paddingLeft: 8,
  },
  actions: {
    gap: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
