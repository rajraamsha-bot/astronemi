/**
 * Onboarding Flow Component
 * 
 * 3-step guided tour for new users:
 * 1. Welcome & Value Proposition
 * 2. Feature Highlights
 * 3. Quick Win (Free Horoscope)
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Sparkles, Users, Gift, ArrowRight, X } from 'lucide-react-native';
import { useAppTheme } from '@/contexts/ThemeContext';
import { analytics } from '@/utils/analytics-tracker';

const { width } = Dimensions.get('window');

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  image?: string;
  action?: {
    label: string;
    onPress: () => void;
  };
}

interface OnboardingFlowProps {
  onComplete: () => void;
  onSkip?: () => void;
}

export default function OnboardingFlow({ onComplete, onSkip }: OnboardingFlowProps) {
  const Colors = useAppTheme();
  const [currentStep, setCurrentStep] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const steps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to AstroNemi',
      description: 'Your complete astrology companion. Get personalized insights, talk to expert astrologers, and discover your cosmic path.',
      icon: <Sparkles size={80} color={Colors.primary} />,
    },
    {
      id: 'features',
      title: 'Everything You Need',
      description: 'Daily horoscopes, Kundli generation, Panchang, and consultations with verified human astrologers.',
      icon: <Users size={80} color={Colors.primary} />,
    },
    {
      id: 'quick-win',
      title: 'Get Your Free Horoscope',
      description: 'Start your journey with a personalized daily horoscope. See what the stars have in store for you today!',
      icon: <Gift size={80} color={Colors.primary} />,
      action: {
        label: 'Get My Horoscope',
        onPress: () => {
          analytics.trackOnboarding(3, 'quick-win', true);
          onComplete();
          router.push('/(tabs)/horoscope');
        },
      },
    },
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      flatListRef.current?.scrollToIndex({ index: nextStep, animated: true });
      
      analytics.trackOnboarding(nextStep + 1, steps[nextStep]?.id || 'unknown', false);
    } else {
      analytics.trackOnboarding(steps.length, 'complete', true);
      onComplete();
    }
  };

  const handleSkip = () => {
    analytics.trackOnboarding(currentStep + 1, steps[currentStep]?.id || 'unknown', false);
    analytics.track('onboarding_skipped', { step: currentStep + 1 });
    
    if (onSkip) {
      onSkip();
    } else {
      onComplete();
    }
  };

  const handleDotPress = (index: number) => {
    setCurrentStep(index);
    flatListRef.current?.scrollToIndex({ index, animated: true });
    analytics.trackOnboarding(index + 1, steps[index]?.id || 'unknown', false);
  };

  const renderStep = ({ item, index }: { item: OnboardingStep; index: number }) => (
    <View style={[styles.stepContainer, { width }]}>
      <View style={styles.iconContainer}>
        {item.icon}
      </View>

      <Text style={[styles.title, { color: Colors.text }]}>
        {item.title}
      </Text>

      <Text style={[styles.description, { color: Colors.textLight }]}>
        {item.description}
      </Text>

      {item.action && index === currentStep && (
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: Colors.primary }]}
          onPress={item.action.onPress}
        >
          <Text style={styles.actionButtonText}>{item.action.label}</Text>
          <ArrowRight size={20} color="#FFFFFF" />
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: Colors.background }]} edges={['top', 'bottom']}>
      {/* Skip Button */}
      <TouchableOpacity
        style={styles.skipButton}
        onPress={handleSkip}
      >
        <X size={24} color={Colors.textLight} />
      </TouchableOpacity>

      {/* Steps */}
      <FlatList
        ref={flatListRef}
        data={steps}
        renderItem={renderStep}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        style={styles.stepsList}
      />

      {/* Pagination Dots */}
      <View style={styles.pagination}>
        {steps.map((_, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.dot,
              {
                backgroundColor: index === currentStep ? Colors.primary : Colors.border,
                width: index === currentStep ? 24 : 8,
              },
            ]}
            onPress={() => handleDotPress(index)}
          />
        ))}
      </View>

      {/* Navigation */}
      <View style={styles.navigation}>
        {currentStep > 0 && (
          <TouchableOpacity
            style={[styles.navButton, styles.backButton]}
            onPress={() => {
              const prevStep = currentStep - 1;
              setCurrentStep(prevStep);
              flatListRef.current?.scrollToIndex({ index: prevStep, animated: true });
            }}
          >
            <Text style={[styles.navButtonText, { color: Colors.primary }]}>
              Back
            </Text>
          </TouchableOpacity>
        )}

        <View style={{ flex: 1 }} />

        {!steps[currentStep]?.action && (
          <TouchableOpacity
            style={[styles.navButton, styles.nextButton, { backgroundColor: Colors.primary }]}
            onPress={handleNext}
          >
            <Text style={styles.nextButtonText}>
              {currentStep === steps.length - 1 ? 'Get Started' : 'Next'}
            </Text>
            <ArrowRight size={20} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  skipButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  stepsList: {
    flex: 1,
  },
  stepContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  iconContainer: {
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginTop: 20,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 20,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  navigation: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
  },
  navButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  backButton: {
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
