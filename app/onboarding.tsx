import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  FlatList,
  Animated,
  Switch,
  TextInput,
  ViewToken,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAppTheme } from '@/contexts/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Sparkles, Star, MessageCircle, ChevronRight, Shield, UserCircle } from 'lucide-react-native';
import { analyticsConsent } from '@/services/analytics-consent';
import { Logger } from '@/services/logger';

const { width } = Dimensions.get('window');

interface OnboardingSlide {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  backgroundColor: string;
}

const ONBOARDING_STORAGE_KEY = '@astrofusion_has_seen_onboarding';

export default function OnboardingScreen() {
  const Colors = useAppTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [consent, setConsent] = useState({
    analytics: false,
    crashReporting: true,
    personalizedContent: false,
  });

  // Birth Details State
  const [birthData, setBirthData] = useState({
    name: '',
    dob: '',
    tob: '',
    place: '',
  });

  const slides: OnboardingSlide[] = [
    {
      id: '1',
      title: 'Welcome to AstroNemi',
      description: 'Your complete guide to Vedic astrology. Get personalized insights, predictions, and remedies based on your unique birth chart.',
      icon: <Sparkles size={80} color="#6B46C1" />,
      backgroundColor: '#F3E8FF',
    },
    {
      id: '2',
      title: 'Trusted Astrology Guidance',
      description: 'Connect with verified astrologers for personalized consultations, daily horoscopes, and Kundli guidance.',
      icon: <MessageCircle size={80} color="#6B46C1" />,
      backgroundColor: '#E0E7FF',
    },
    {
      id: '3',
      title: 'Comprehensive Tools',
      description: 'Access Kundli, KP Astrology, Jaimini, Ashtakvarga, Tarot, Numerology, and more.',
      icon: <Star size={80} color="#6B46C1" />,
      backgroundColor: '#FCE7F3',
    },
    {
      id: 'profile',
      title: 'Your Birth Details',
      description: 'We need your birth details to generate your Kundli and offer personalized daily predictions.',
      icon: <UserCircle size={80} color="#6B46C1" />,
      backgroundColor: '#FFFBEB',
    },
    {
      id: '4',
      title: 'Your Privacy Matters',
      description: 'Choose what data you share with us. You can change these settings anytime.',
      icon: <Shield size={80} color="#6B46C1" />,
      backgroundColor: '#ECFDF5',
    },
  ];

  const renderSlide = ({ item }: { item: OnboardingSlide }) => {
    const isConsentSlide = item.id === '4';
    return (
      <View style={[styles.slide, { backgroundColor: item.backgroundColor }]}>
        <View style={styles.iconContainer}>
          {item.icon}
        </View>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.description}>{item.description}</Text>
        
        {item.id === 'profile' && (
          <View style={styles.formContainer}>
            <TextInput style={styles.input} placeholder="Your Name" value={birthData.name} onChangeText={(t) => setBirthData({...birthData, name: t})} />
            <TextInput style={styles.input} placeholder="Date of Birth (DD-MM-YYYY)" value={birthData.dob} onChangeText={(t) => setBirthData({...birthData, dob: t})} />
            <TextInput style={styles.input} placeholder="Time of Birth (HH:MM AM/PM)" value={birthData.tob} onChangeText={(t) => setBirthData({...birthData, tob: t})} />
            <TextInput style={styles.input} placeholder="Place of Birth (City)" value={birthData.place} onChangeText={(t) => setBirthData({...birthData, place: t})} />
          </View>
        )}

        {isConsentSlide && (
          <View style={styles.consentSection}>
            <View style={styles.consentItem}>
              <View style={styles.consentText}>
                <Text style={styles.consentLabel}>Analytics</Text>
                <Text style={styles.consentSubLabel}>Help us improve with anonymous usage data</Text>
              </View>
              <Switch
                value={consent.analytics}
                onValueChange={(v) => setConsent(prev => ({ ...prev, analytics: v }))}
                trackColor={{ false: '#E0E0E0', true: '#6B46C180' }}
                thumbColor={consent.analytics ? '#6B46C1' : '#F5F5F5'}
              />
            </View>
            <View style={styles.consentItem}>
              <View style={styles.consentText}>
                <Text style={styles.consentLabel}>Crash Reports</Text>
                <Text style={styles.consentSubLabel}>Automatically send crash reports to fix bugs</Text>
              </View>
              <Switch
                value={consent.crashReporting}
                onValueChange={(v) => setConsent(prev => ({ ...prev, crashReporting: v }))}
                trackColor={{ false: '#E0E0E0', true: '#6B46C180' }}
                thumbColor={consent.crashReporting ? '#6B46C1' : '#F5F5F5'}
              />
            </View>
            <View style={styles.consentItem}>
              <View style={styles.consentText}>
                <Text style={styles.consentLabel}>Personalization</Text>
                <Text style={styles.consentSubLabel}>Get personalized recommendations</Text>
              </View>
              <Switch
                value={consent.personalizedContent}
                onValueChange={(v) => setConsent(prev => ({ ...prev, personalizedContent: v }))}
                trackColor={{ false: '#E0E0E0', true: '#6B46C180' }}
                thumbColor={consent.personalizedContent ? '#6B46C1' : '#F5F5F5'}
              />
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderDots = () => {
    return (
      <View style={styles.dotsContainer}>
        {slides.map((_, index) => {
          const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
          const scale = scrollX.interpolate({
            inputRange,
            outputRange: [0.8, 1.2, 0.8],
            extrapolate: 'clamp',
          });
          const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.4, 1, 0.4],
            extrapolate: 'clamp',
          });
          return (
            <Animated.View
              key={index}
              style={[
                styles.dot,
                {
                  transform: [{ scale }],
                  opacity,
                  backgroundColor: index === currentIndex ? Colors.primary : Colors.border,
                },
              ]}
            />
          );
        })}
      </View>
    );
  };

  const handleNext = async () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
      setCurrentIndex(currentIndex + 1);
    } else {
      try {
        await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
        await AsyncStorage.setItem('@astrofusion_user_profile', JSON.stringify(birthData));
        await analyticsConsent.setConsent({
          analytics: consent.analytics,
          crashReporting: consent.crashReporting,
          personalizedContent: consent.personalizedContent,
          consentGivenAt: new Date().toISOString(),
        });
      } catch (error) {
        Logger.error('Error saving onboarding status', error);
      }
      router.replace('/(tabs)');
    }
  };

  const handleSkip = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
      await analyticsConsent.setConsent({
        analytics: false,
        crashReporting: true,
        personalizedContent: false,
      });
    } catch (error) {
      Logger.error('Error saving onboarding status', error);
    }
    router.replace('/(tabs)');
  };

  const handleViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems && viewableItems.length > 0 && viewableItems[0] && viewableItems[0].index !== undefined && viewableItems[0].index !== null) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: Colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
          <Text style={[styles.skipText, { color: Colors.textLight }]}>Skip</Text>
        </TouchableOpacity>
      </View>

      <Animated.FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: true }
        )}
        onViewableItemsChanged={handleViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
      />

      {renderDots()}

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.nextButton, { backgroundColor: Colors.primary }]}
          onPress={handleNext}
          activeOpacity={0.8}
        >
          <Text style={styles.nextButtonText}>
            {currentIndex === slides.length - 1 ? 'Get Started' : 'Next'}
          </Text>
          {currentIndex < slides.length - 1 && (
            <ChevronRight size={20} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  skipButton: {
    padding: 10,
  },
  skipText: {
    fontSize: 16,
    fontWeight: '500',
  },
  slide: {
    width,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  iconContainer: {
    marginBottom: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#1A1A1A',
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    color: '#666666',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginHorizontal: 5,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  nextButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  consentSection: {
    marginTop: 32,
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  consentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  consentText: {
    flex: 1,
    marginRight: 16,
  },
  consentLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  consentSubLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  formContainer: {
    width: '100%',
    marginTop: 20,
    gap: 12,
  },
  input: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    fontSize: 16,
    color: '#333',
  },
});
