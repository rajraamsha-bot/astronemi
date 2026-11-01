import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  Calendar,
  Bell,
  BellOff,
  Star,
  Moon,
  Sun,
  Gift,
  Users,
} from 'lucide-react-native';
import { router } from 'expo-router';
import Colors from '@/constants/colors';
import { computeFestivalsForYear } from '@/utils/hindu-calendar-engine';

interface FestivalCountdown {
  id: string;
  name: string;
  date: Date;
  daysLeft: number;
  image: string;
  description: string;
  significance: string;
  rituals: string[];
  reminderEnabled: boolean;
  category: string;
}


const upcomingFestivals = computeFestivalsForYear(new Date().getFullYear())
  .filter(f => f.date >= new Date())
  .slice(0, 10)
  .map(f => ({
    id: f.id,
    name: f.name,
    date: f.date,
    daysLeft: Math.ceil((f.date.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)),
    image: `https://images.unsplash.com/photo-1544986581-efac024faf62?w=500&q=80`, // Reliable generic indian festival image
    description: f.description || `One of the most significant festivals in the Hindu calendar.`,
    significance: f.significance || `Celebrates cultural and spiritual traditions.`,
    rituals: (f.rituals && f.rituals.length > 0) ? f.rituals : ['Prayer', 'Feasting', 'Community gathering'],
    reminderEnabled: false,
    category: 'Hindu',
  }));

const festivals: FestivalCountdown[] = upcomingFestivals;


export default function FestivalCountdownScreen() {
  const [festivalList, setFestivalList] = useState(festivals);
  const [selectedFestival, setSelectedFestival] = useState<FestivalCountdown | null>(null);

  const toggleReminder = (id: string) => {
    setFestivalList(festivalList.map((f) =>
      f.id === id ? { ...f, reminderEnabled: !f.reminderEnabled } : f
    ));
  };

  const formatTime = (date: Date): { days: number; hours: number; minutes: number } => {
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return { days, hours, minutes };
  };

  const renderCountdown = (festival: FestivalCountdown) => {
    const time = formatTime(festival.date);
    return (
      <View style={styles.countdownContainer}>
        <View style={styles.countdownItem}>
          <Text style={styles.countdownValue}>{time.days}</Text>
          <Text style={styles.countdownLabel}>Days</Text>
        </View>
        <Text style={styles.countdownSeparator}>:</Text>
        <View style={styles.countdownItem}>
          <Text style={styles.countdownValue}>{time.hours}</Text>
          <Text style={styles.countdownLabel}>Hours</Text>
        </View>
        <Text style={styles.countdownSeparator}>:</Text>
        <View style={styles.countdownItem}>
          <Text style={styles.countdownValue}>{time.minutes}</Text>
          <Text style={styles.countdownLabel}>Mins</Text>
        </View>
      </View>
    );
  };

  const renderFestivalCard = (festival: FestivalCountdown) => (
    <TouchableOpacity
      key={festival.id}
      style={styles.festivalCard}
      onPress={() => setSelectedFestival(festival)}
    >
      <Image source={{ uri: festival.image }} style={styles.festivalImage} />
      <View style={styles.festivalOverlay}>
        <View style={styles.festivalBadge}>
          <Text style={styles.festivalCategory}>{festival.category}</Text>
        </View>
        <Text style={styles.festivalName}>{festival.name}</Text>
        <Text style={styles.festivalDate}>
          {festival.date.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
        </Text>
        {renderCountdown(festival)}
        <View style={styles.festivalActions}>
          <TouchableOpacity
            style={styles.reminderButton}
            onPress={() => toggleReminder(festival.id)}
          >
            {festival.reminderEnabled ? (
              <Bell color="#FFD700" size={18} fill="#FFD700" />
            ) : (
              <BellOff color="#FFF" size={18} />
            )}
            <Text style={styles.reminderText}>
              {festival.reminderEnabled ? 'Reminder On' : 'Set Reminder'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderUpcomingList = () => (
    <View style={styles.upcomingSection}>
      <Text style={styles.sectionTitle}>Upcoming Festivals</Text>
      {festivalList.slice(1).map((festival) => (
        <TouchableOpacity
          key={festival.id}
          style={styles.upcomingItem}
          onPress={() => setSelectedFestival(festival)}
        >
          <Image source={{ uri: festival.image }} style={styles.upcomingImage} />
          <View style={styles.upcomingContent}>
            <Text style={styles.upcomingName}>{festival.name}</Text>
            <Text style={styles.upcomingDate}>
              {festival.date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
            </Text>
          </View>
          <View style={styles.daysLeftBadge}>
            <Text style={styles.daysLeftText}>{festival.daysLeft}d</Text>
          </View>
          <TouchableOpacity
            style={styles.upcomingReminder}
            onPress={() => toggleReminder(festival.id)}
          >
            {festival.reminderEnabled ? (
              <Bell color="#FFD700" size={16} fill="#FFD700" />
            ) : (
              <BellOff color={Colors.textLight} size={16} />
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderFestivalDetail = () => {
    if (!selectedFestival) return null;

    return (
      <View style={styles.detailCard}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => setSelectedFestival(null)}
        >
          <Text style={styles.closeText}>Close</Text>
        </TouchableOpacity>

        <Text style={styles.detailTitle}>{selectedFestival.name}</Text>
        <Text style={styles.detailDate}>
          {selectedFestival.date.toLocaleDateString('en-US', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </Text>

        {renderCountdown(selectedFestival)}

        <View style={styles.detailSection}>
          <Text style={styles.detailSectionTitle}>About</Text>
          <Text style={styles.detailText}>{selectedFestival.description}</Text>
        </View>

        <View style={styles.detailSection}>
          <Text style={styles.detailSectionTitle}>Significance</Text>
          <Text style={styles.detailText}>{selectedFestival.significance}</Text>
        </View>

        <View style={styles.detailSection}>
          <Text style={styles.detailSectionTitle}>Rituals & Traditions</Text>
          {selectedFestival.rituals.map((ritual, index) => (
            <View key={index} style={styles.ritualItem}>
              <Star color={Colors.primary} size={14} />
              <Text style={styles.ritualText}>{ritual}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={styles.setReminderButton}
          onPress={() => toggleReminder(selectedFestival.id)}
        >
          {selectedFestival.reminderEnabled ? (
            <>
              <BellOff color="#FFF" size={20} />
              <Text style={styles.setReminderText}>Disable Reminder</Text>
            </>
          ) : (
            <>
              <Bell color="#FFF" size={20} />
              <Text style={styles.setReminderText}>Set Reminder</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#C62828', '#D32F2F', '#E53935']}
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
            <Text style={styles.headerTitle}>Festival Countdown</Text>
            <TouchableOpacity style={styles.calendarButton}>
              <Calendar color="#FFF" size={22} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Featured Festival */}
        <View style={styles.featuredSection}>
          <Text style={styles.featuredLabel}>Next Festival</Text>
          {festivalList[0] && renderFestivalCard(festivalList[0])}
        </View>

        {/* Upcoming Festivals */}
        {renderUpcomingList()}

        {/* Festival Categories */}
        <View style={styles.categoriesSection}>
          <Text style={styles.sectionTitle}>Categories</Text>
          <View style={styles.categoriesGrid}>
            <TouchableOpacity style={styles.categoryCard}>
              <View style={[styles.categoryIcon, { backgroundColor: '#FF9800' }]}>
                <Sun color="#FFF" size={24} />
              </View>
              <Text style={styles.categoryName}>Solar Festivals</Text>
              <Text style={styles.categoryCount}>12 festivals</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.categoryCard}>
              <View style={[styles.categoryIcon, { backgroundColor: '#9C27B0' }]}>
                <Moon color="#FFF" size={24} />
              </View>
              <Text style={styles.categoryName}>Lunar Festivals</Text>
              <Text style={styles.categoryCount}>18 festivals</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.categoryCard}>
              <View style={[styles.categoryIcon, { backgroundColor: '#4CAF50' }]}>
                <Gift color="#FFF" size={24} />
              </View>
              <Text style={styles.categoryName}>Harvest Festivals</Text>
              <Text style={styles.categoryCount}>8 festivals</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.categoryCard}>
              <View style={[styles.categoryIcon, { backgroundColor: '#2196F3' }]}>
                <Users color="#FFF" size={24} />
              </View>
              <Text style={styles.categoryName}>Regional Festivals</Text>
              <Text style={styles.categoryCount}>25 festivals</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Festival Detail Modal */}
      {selectedFestival && (
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalContent}>
            {renderFestivalDetail()}
          </ScrollView>
        </View>
      )}
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
  calendarButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuredSection: {
    padding: 16,
  },
  featuredLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textLight,
    marginBottom: 12,
  },
  festivalCard: {
    height: 280,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: Colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  festivalImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  festivalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 20,
    justifyContent: 'flex-end',
  },
  festivalBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  festivalCategory: {
    fontSize: 11,
    color: '#FFF',
    fontWeight: '600',
  },
  festivalName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 4,
  },
  festivalDate: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 12,
  },
  countdownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  countdownItem: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    minWidth: 60,
  },
  countdownValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFF',
  },
  countdownLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  countdownSeparator: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFF',
    marginHorizontal: 8,
  },
  festivalActions: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  reminderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  reminderText: {
    fontSize: 13,
    color: '#FFF',
    fontWeight: '500',
  },
  upcomingSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },
  upcomingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  upcomingImage: {
    width: 50,
    height: 50,
    borderRadius: 10,
  },
  upcomingContent: {
    flex: 1,
    marginLeft: 12,
  },
  upcomingName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  upcomingDate: {
    fontSize: 12,
    color: Colors.textLight,
  },
  daysLeftBadge: {
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 10,
  },
  daysLeftText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  upcomingReminder: {
    padding: 8,
  },
  categoriesSection: {
    padding: 16,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryCard: {
    width: '48%',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  categoryCount: {
    fontSize: 11,
    color: Colors.textLight,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  detailCard: {
    padding: 20,
  },
  closeButton: {
    alignSelf: 'flex-end',
    padding: 8,
  },
  closeText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
  },
  detailTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
    textAlign: 'center',
  },
  detailDate: {
    fontSize: 14,
    color: Colors.textLight,
    textAlign: 'center',
    marginBottom: 20,
  },
  detailSection: {
    marginBottom: 16,
  },
  detailSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: Colors.textLight,
    lineHeight: 22,
  },
  ritualItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  ritualText: {
    fontSize: 14,
    color: Colors.text,
  },
  setReminderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 16,
    gap: 10,
  },
  setReminderText: {
    fontSize: 16,
    color: '#FFF',
    fontWeight: '600',
  },
});