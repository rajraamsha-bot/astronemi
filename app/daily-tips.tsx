import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import {
  ArrowLeft,
  Sun,
  Moon,
  Star,
  Sparkles,
  Bell,
  Calendar,
  Heart,
  Shield,
  TrendingUp,
  DollarSign,
  Copy,
  Share2,
  Bookmark,
} from 'lucide-react-native';
import { router } from 'expo-router';
import Colors from '@/constants/colors';

interface DailyTip {
  id: string;
  category: 'health' | 'career' | 'relationship' | 'finance' | 'spiritual' | 'general';
  title: string;
  message: string;
  icon: React.ReactNode;
  color: string;
  date: string;
  isBookmarked: boolean;
}

const generateDailyTips = (): DailyTip[] => {
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0] ?? '';

  return [
    {
      id: '1',
      category: 'spiritual',
      title: 'Morning Ritual',
      message: 'Start your day by offering water to the Sun (Surya Namaskar). This practice brings vitality, success, and removes obstacles from your path.',
      icon: <Sun color="#FFD700" size={24} />,
      color: '#FFF8E1',
      date: dateStr,
      isBookmarked: false,
    },
    {
      id: '2',
      category: 'health',
      title: 'Health Tip',
      message: 'Today is favorable for starting a new health routine. Avoid spicy food and include more green vegetables in your diet for better digestion.',
      icon: <Shield color="#4CAF50" size={24} />,
      color: '#E8F5E9',
      date: dateStr,
      isBookmarked: false,
    },
    {
      id: '3',
      category: 'career',
      title: 'Career Guidance',
      message: 'The planetary alignment today supports new beginnings. If you\'ve been considering a job change or new project, this is an auspicious time to take action.',
      icon: <TrendingUp color="#2196F3" size={24} />,
      color: '#E3F2FD',
      date: dateStr,
      isBookmarked: false,
    },
    {
      id: '4',
      category: 'relationship',
      title: 'Relationship Advice',
      message: 'Express your feelings to loved ones today. Venus\'s position favors romantic conversations and strengthening family bonds.',
      icon: <Heart color="#E91E63" size={24} />,
      color: '#FCE4EC',
      date: dateStr,
      isBookmarked: false,
    },
    {
      id: '5',
      category: 'finance',
      title: 'Financial Tip',
      message: 'Avoid major financial decisions today. Instead, focus on budgeting and planning. Saving money today will bring future prosperity.',
      icon: <DollarSign color="#FF9800" size={24} />,
      color: '#FFF3E0',
      date: dateStr,
      isBookmarked: false,
    },
    {
      id: '6',
      category: 'general',
      title: 'Lucky Color & Number',
      message: 'Today\'s lucky color is Yellow and lucky number is 3. Wearing yellow or keeping yellow flowers at home can attract positive energy.',
      icon: <Star color="#9C27B0" size={24} />,
      color: '#F3E5F5',
      date: dateStr,
      isBookmarked: false,
    },
  ];
};

const morningAffirmations = [
  "Today, I embrace the cosmic energy and welcome positive changes into my life.",
  "I am aligned with the universe's abundance and open to receiving its blessings.",
  "My actions today are guided by wisdom and illuminated by celestial light.",
  "I trust the divine timing of my life and remain patient with the universe's plan.",
  "Today brings new opportunities for growth, success, and happiness.",
];

export default function DailyTipsScreen() {
  const [tips, setTips] = useState<DailyTip[]>([]);
  const [affirmation, setAffirmation] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [bookmarkedTips, setBookmarkedTips] = useState<string[]>([]);

  // effect:audited — Initialization: Load tips on mount
  // This loads mock data synchronously on component mount
  useEffect(() => {
    loadTips();
  }, []);

  const loadTips = () => {
    const dailyTips = generateDailyTips();
    setTips(dailyTips);
    setAffirmation(morningAffirmations[Math.floor(Math.random() * morningAffirmations.length)] ?? '');
  };

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      loadTips();
      setRefreshing(false);
    }, 1000);
  };

  const toggleBookmark = (tipId: string) => {
    if (bookmarkedTips.includes(tipId)) {
      setBookmarkedTips(bookmarkedTips.filter((id) => id !== tipId));
    } else {
      setBookmarkedTips([...bookmarkedTips, tipId]);
    }
  };

  const shareTip = async (tip: DailyTip) => {
    try {
      await Share.share({
        title: tip.title,
        message: `${tip.title}\n\n${tip.message}\n\n— via AstroNemi Daily Tips`,
      });
    } catch {
      // User dismissed or share unavailable
    }
  };

  const copyTip = async (tip?: DailyTip) => {
    const textToCopy = tip ? `${tip.title}\n\n${tip.message}` : affirmation;
    try {
      await Clipboard.setStringAsync(textToCopy);
      Alert.alert('Copied', 'Tip copied to clipboard!');
    } catch {
      Alert.alert('Error', 'Failed to copy to clipboard');
    }
  };

  const getCategoryLabel = (category: string) => {
    const labels: { [key: string]: string } = {
      health: 'Health & Wellness',
      career: 'Career & Business',
      relationship: 'Love & Relationships',
      finance: 'Finance & Wealth',
      spiritual: 'Spiritual Growth',
      general: 'General Guidance',
    };
    return labels[category] || category;
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#FF6B35', '#F7931E', '#FFB347']}
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
            <Text style={styles.headerTitle}>Daily Tips</Text>
            <TouchableOpacity style={styles.notificationButton}>
              <Bell color="#FFF" size={22} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        <View style={styles.headerInfo}>
          <Text style={styles.headerSubtitle}>Morning Guidance</Text>
          <Text style={styles.headerDescription}>
            Start your day with cosmic wisdom
          </Text>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Date Display */}
        <View style={styles.dateSection}>
          <Calendar color={Colors.primary} size={20} />
          <Text style={styles.dateText}>
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </Text>
        </View>

        {/* Morning Affirmation */}
        <View style={styles.affirmationCard}>
          <View style={styles.affirmationHeader}>
            <Sparkles color="#FFD700" size={24} />
            <Text style={styles.affirmationTitle}>Today&apos;s Affirmation</Text>
          </View>
          <Text style={styles.affirmationText}>&quot;{affirmation}&quot;</Text>
        </View>

        {/* Daily Tips */}
        <Text style={styles.sectionTitle}>Personalized Tips for Today</Text>
        {tips.map((tip) => (
          <View key={tip.id} style={[styles.tipCard, { backgroundColor: tip.color }]}>
            <View style={styles.tipHeader}>
              {tip.icon}
              <View style={styles.tipTitleContainer}>
                <Text style={styles.tipCategory}>{getCategoryLabel(tip.category)}</Text>
                <Text style={styles.tipTitle}>{tip.title}</Text>
              </View>
            </View>
            <Text style={styles.tipMessage}>{tip.message}</Text>
            <View style={styles.tipActions}>
              <TouchableOpacity
                style={styles.tipAction}
                onPress={() => copyTip(tip)}
              >
                <Copy color={Colors.textLight} size={18} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.tipAction}
                onPress={() => shareTip(tip)}
              >
                <Share2 color={Colors.textLight} size={18} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.tipAction}
                onPress={() => toggleBookmark(tip.id)}
              >
                <Bookmark
                  color={bookmarkedTips.includes(tip.id) ? Colors.primary : Colors.textLight}
                  size={18}
                  fill={bookmarkedTips.includes(tip.id) ? Colors.primary : 'transparent'}
                />
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {/* Quick Rituals */}
        <Text style={styles.sectionTitle}>Quick Morning Rituals</Text>
        <View style={styles.ritualsContainer}>
          <View style={styles.ritualCard}>
            <Sun color="#FFD700" size={28} />
            <Text style={styles.ritualTitle}>Surya Namaskar</Text>
            <Text style={styles.ritualTime}>6:00 - 7:00 AM</Text>
            <Text style={styles.ritualDesc}>
              Offer water to the Sun while chanting &quot;Om Suryaya Namah&quot;
            </Text>
          </View>
          <View style={styles.ritualCard}>
            <Moon color="#9C27B0" size={28} />
            <Text style={styles.ritualTitle}>Chandra Namaskar</Text>
            <Text style={styles.ritualTime}>Evening</Text>
            <Text style={styles.ritualDesc}>
              Meditate under moonlight for mental peace
            </Text>
          </View>
          <View style={styles.ritualCard}>
            <Star color="#FF9800" size={28} />
            <Text style={styles.ritualTitle}>Guru Vandana</Text>
            <Text style={styles.ritualTime}>Thursday</Text>
            <Text style={styles.ritualDesc}>
              Seek blessings from teachers and elders
            </Text>
          </View>
        </View>

        {/* Notification Settings */}
        <View style={styles.notificationSection}>
          <Bell color={Colors.primary} size={24} />
          <View style={styles.notificationInfo}>
            <Text style={styles.notificationTitle}>Enable Morning Notifications</Text>
            <Text style={styles.notificationDesc}>
              Get daily tips and affirmations delivered every morning
            </Text>
          </View>
          <TouchableOpacity style={styles.enableButton}>
            <Text style={styles.enableButtonText}>Enable</Text>
          </TouchableOpacity>
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>About Daily Tips</Text>
          <Text style={styles.infoText}>
            Our daily tips are generated based on current planetary positions,
            your birth chart, and ancient Vedic wisdom. These personalized
            suggestions help you align with cosmic energies for a harmonious life.
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
  notificationButton: {
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
  dateSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 10,
  },
  dateText: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500',
  },
  affirmationCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: '#FFF8E1',
    borderRadius: 16,
    padding: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#FFD700',
  },
  affirmationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  affirmationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  affirmationText: {
    fontSize: 16,
    color: Colors.text,
    fontStyle: 'italic',
    lineHeight: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  tipCard: {
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 16,
    padding: 16,
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  tipTitleContainer: {
    marginLeft: 12,
    flex: 1,
  },
  tipCategory: {
    fontSize: 12,
    color: Colors.textLight,
    textTransform: 'uppercase',
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 2,
  },
  tipMessage: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 22,
    marginBottom: 12,
  },
  tipActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
  },
  tipAction: {
    padding: 4,
  },
  ritualsContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  ritualCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    alignItems: 'center',
  },
  ritualTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 8,
  },
  ritualTime: {
    fontSize: 12,
    color: Colors.primary,
    marginTop: 2,
  },
  ritualDesc: {
    fontSize: 13,
    color: Colors.textLight,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
  },
  notificationSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  notificationInfo: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  notificationDesc: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 2,
  },
  enableButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  enableButtonText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
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
  },
});
