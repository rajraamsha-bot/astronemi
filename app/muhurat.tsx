import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { 
  Calendar, Clock, Star, ChevronRight, X,
  Home, Briefcase, Heart, Car, GraduationCap, ShoppingBag,
  Plane, FileText, Users, Sparkles, CheckCircle, ArrowLeft
} from 'lucide-react-native';
import Colors from '@/constants/colors';

interface Muhurat {
  id: string;
  name: string;
  hindiName: string;
  category: string;
  icon: React.ComponentType<{size?: number; color?: string}>;
  color: string;
  description: string;
  importance: string;
  bestMonths: string[];
  avoidMonths: string[];
  nextAvailable: Date;
  duration: string;
}

interface MuhuratTime {
  date: Date;
  startTime: string;
  endTime: string;
  quality: 'excellent' | 'good' | 'average';
}

const muhuratCategories = [
  { id: 'marriage', name: 'Marriage', icon: Heart, color: '#e91e63' },
  { id: 'property', name: 'Property', icon: Home, color: '#4caf50' },
  { id: 'business', name: 'Business', icon: Briefcase, color: '#2196f3' },
  { id: 'education', name: 'Education', icon: GraduationCap, color: '#9c27b0' },
  { id: 'travel', name: 'Travel', icon: Plane, color: '#ff9800' },
  { id: 'vehicle', name: 'Vehicle', icon: Car, color: '#795548' },
  { id: 'shopping', name: 'Shopping', icon: ShoppingBag, color: '#00bcd4' },
  { id: 'legal', name: 'Legal', icon: FileText, color: '#607d8b' },
  { id: 'ceremony', name: 'Ceremony', icon: Users, color: '#ffc107' },
];

// Helper function to get a dynamic future date
const getNextAvailableDate = (daysFromNow: number): Date => {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date;
};

const muhurats: Muhurat[] = [
  {
    id: '1',
    name: 'Vivah Muhurat',
    hindiName: 'Marriage Muhurat',
    category: 'marriage',
    icon: Heart,
    color: '#e91e63',
    description: 'Auspicious time for marriage ceremony ensuring long and happy married life.',
    importance: 'Marriage is one of the most important samskaras. Choosing the right muhurat ensures harmony, prosperity, and longevity of the relationship.',
    bestMonths: ['Magha', 'Phalguna', 'Vaishakha', 'Jyeshtha'],
    avoidMonths: ['Chaturmas (Ashadha to Kartik)', 'Adhik Maas'],
    nextAvailable: getNextAvailableDate(3),
    duration: '2-4 hours',
  },
  {
    id: '2',
    name: 'Griha Pravesh',
    hindiName: 'House Warming',
    category: 'property',
    icon: Home,
    color: '#4caf50',
    description: 'Auspicious time for entering a new house to bring prosperity and peace.',
    importance: 'Griha Pravesh purifies the new home and invites positive energies. It ensures health, wealth, and happiness for the family.',
    bestMonths: ['Magha', 'Phalguna', 'Vaishakha', 'Jyeshtha', 'Kartik'],
    avoidMonths: ['Ashadha', 'Bhadrapada', 'Paush'],
    nextAvailable: getNextAvailableDate(5),
    duration: '1-2 hours',
  },
  {
    id: '3',
    name: 'Business Start',
    hindiName: 'Vyapar Arambh',
    category: 'business',
    icon: Briefcase,
    color: '#2196f3',
    description: 'Auspicious time to start a new business or expand existing one.',
    importance: 'Starting business during favorable muhurat ensures growth, profits, and success in ventures.',
    bestMonths: ['Chaitra', 'Vaishakha', 'Kartik', 'Margashirsha'],
    avoidMonths: ['Chaturmas', 'Adhik Maas'],
    nextAvailable: getNextAvailableDate(2),
    duration: '1-2 hours',
  },
  {
    id: '4',
    name: 'Vidya Arambh',
    hindiName: 'Education Start',
    category: 'education',
    icon: GraduationCap,
    color: '#9c27b0',
    description: 'Auspicious time to start education, new course, or learning.',
    importance: 'Vidya Arambh muhurat ensures success in studies, good concentration, and academic achievements.',
    bestMonths: ['Chaitra', 'Vaishakha', 'Shravana', 'Kartik'],
    avoidMonths: ['Chaturmas'],
    nextAvailable: getNextAvailableDate(4),
    duration: '30 min - 1 hour',
  },
  {
    id: '5',
    name: 'Yatra Muhurat',
    hindiName: 'Travel Muhurat',
    category: 'travel',
    icon: Plane,
    color: '#ff9800',
    description: 'Auspicious time to start a journey for safe and successful travel.',
    importance: 'Starting journey during favorable muhurat ensures safety, success in purpose, and smooth travel.',
    bestMonths: ['All months except Chaturmas'],
    avoidMonths: ['During Rahu Kaal', 'Yamaganda Kaal'],
    nextAvailable: getNextAvailableDate(1),
    duration: '15-30 min',
  },
  {
    id: '6',
    name: 'Vehicle Purchase',
    hindiName: 'Vahan Kharid',
    category: 'vehicle',
    icon: Car,
    color: '#795548',
    description: 'Auspicious time to purchase a vehicle for safety and prosperity.',
    importance: 'Buying vehicle during shubh muhurat ensures safety, longevity of vehicle, and prosperity.',
    bestMonths: ['Chaitra', 'Vaishakha', 'Kartik', 'Margashirsha'],
    avoidMonths: ['Ashadha', 'Bhadrapada'],
    nextAvailable: getNextAvailableDate(6),
    duration: '1-2 hours',
  },
  {
    id: '7',
    name: 'Shopping Muhurat',
    hindiName: 'Kharid Muhurat',
    category: 'shopping',
    icon: ShoppingBag,
    color: '#00bcd4',
    description: 'Auspicious time for important purchases and investments.',
    importance: 'Making purchases during favorable time ensures value, longevity, and satisfaction.',
    bestMonths: ['All months'],
    avoidMonths: ['During Rahu Kaal', 'Amavasya'],
    nextAvailable: getNextAvailableDate(1),
    duration: '1-2 hours',
  },
  {
    id: '8',
    name: 'Legal Matters',
    hindiName: 'Nyayik Muhurat',
    category: 'legal',
    icon: FileText,
    color: '#607d8b',
    description: 'Auspicious time for filing cases, court appearances, legal documents.',
    importance: 'Favorable muhurat for legal matters increases chances of favorable outcomes.',
    bestMonths: ['Chaitra', 'Vaishakha', 'Kartik'],
    avoidMonths: ['Chaturmas', 'Adhik Maas'],
    nextAvailable: getNextAvailableDate(3),
    duration: '30 min - 1 hour',
  },
  {
    id: '9',
    name: 'Naming Ceremony',
    hindiName: 'Namkaran',
    category: 'ceremony',
    icon: Users,
    color: '#ffc107',
    description: 'Auspicious time for naming ceremony of a newborn.',
    importance: 'Namkaran performed at right muhurat blesses the child with good fortune and identity.',
    bestMonths: ['All months'],
    avoidMonths: ['During Sutak period'],
    nextAvailable: getNextAvailableDate(2),
    duration: '1-2 hours',
  },
];

const generateMuhuratTimes = (_muhurat: Muhurat): MuhuratTime[] => {
  const times: MuhuratTime[] = [];
  const baseDate = new Date();
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(baseDate);
    date.setDate(date.getDate() + i);
    
    // Generate 2-3 time slots per day
    const slots = [
      { start: '06:00 AM', end: '07:30 AM', quality: 'excellent' as const },
      { start: '09:00 AM', end: '10:30 AM', quality: 'good' as const },
      { start: '04:00 PM', end: '05:30 PM', quality: 'average' as const },
    ];
    
    slots.forEach(slot => {
      times.push({
        date,
        startTime: slot.start,
        endTime: slot.end,
        quality: slot.quality,
      });
    });
  }
  
  return times.slice(0, 15);
};

export default function MuhuratScreen() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedMuhurat, setSelectedMuhurat] = useState<Muhurat | null>(null);
  const [muhuratTimes, setMuhuratTimes] = useState<MuhuratTime[]>([]);

  const handleMuhuratPress = (muhurat: Muhurat) => {
    setSelectedMuhurat(muhurat);
    setMuhuratTimes(generateMuhuratTimes(muhurat));
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-IN', { 
      weekday: 'short', 
      day: 'numeric', 
      month: 'short' 
    });
  };

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'excellent': return Colors.success;
      case 'good': return Colors.primary;
      default: return Colors.gold;
    }
  };

  const filteredMuhurats = selectedCategory 
    ? muhurats.filter(m => m.category === selectedCategory)
    : muhurats;

  return (
    <>
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft color={Colors.text} size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Muhurat Finder</Text>
          <View style={styles.backButton} />
        </View>
        
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Header Banner */}
          <View style={styles.headerBanner}>
            <Sparkles size={32} color={Colors.white} />
            <Text style={styles.bannerTitle}>Shubh Muhurat</Text>
            <Text style={styles.bannerSubtitle}>Find auspicious timings for important events</Text>
          </View>

          {/* Category Filter */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.categoryScroll}
            contentContainerStyle={styles.categoryList}
          >
            <TouchableOpacity
              style={[styles.categoryTab, !selectedCategory && styles.categoryTabActive]}
              onPress={() => setSelectedCategory(null)}
            >
              <Star size={18} color={!selectedCategory ? Colors.white : Colors.text} />
              <Text style={[styles.categoryTabText, !selectedCategory && styles.categoryTabTextActive]}>
                All
              </Text>
            </TouchableOpacity>
            {muhuratCategories.map((cat) => {
              const IconComponent = cat.icon;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.categoryTab, selectedCategory === cat.id && styles.categoryTabActive]}
                  onPress={() => setSelectedCategory(cat.id)}
                >
                  <IconComponent size={18} color={selectedCategory === cat.id ? Colors.white : cat.color} />
                  <Text style={[styles.categoryTabText, selectedCategory === cat.id && styles.categoryTabTextActive]}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Muhurats List */}
          <View style={styles.muhuratList}>
            {filteredMuhurats.map((muhurat) => {
              const IconComponent = muhurat.icon;
              return (
                <TouchableOpacity
                  key={muhurat.id}
                  style={styles.muhuratCard}
                  onPress={() => handleMuhuratPress(muhurat)}
                >
                  <View style={[styles.muhuratIcon, { backgroundColor: muhurat.color + '20' }]}>
                    <IconComponent size={28} color={muhurat.color} />
                  </View>
                  
                  <View style={styles.muhuratInfo}>
                    <Text style={styles.muhuratName}>{muhurat.name}</Text>
                    <Text style={styles.muhuratHindi}>{muhurat.hindiName}</Text>
                    <Text style={styles.muhuratDesc} numberOfLines={2}>{muhurat.description}</Text>
                    
                    <View style={styles.muhuratMeta}>
                      <View style={styles.metaItem}>
                        <Calendar size={14} color={Colors.textLight} />
                        <Text style={styles.metaText}>Next: {formatDate(muhurat.nextAvailable)}</Text>
                      </View>
                      <View style={styles.metaItem}>
                        <Clock size={14} color={Colors.textLight} />
                        <Text style={styles.metaText}>{muhurat.duration}</Text>
                      </View>
                    </View>
                  </View>
                  
                  <ChevronRight size={20} color={Colors.textLight} />
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Info Card */}
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>About Muhurat</Text>
            <Text style={styles.infoText}>
              Muhurat is the auspicious time period calculated based on planetary positions, 
              Tithi, Nakshatra, and Yoga. Performing important activities during Shubh Muhurat 
              ensures success, prosperity, and positive outcomes.
            </Text>
          </View>

          <View style={{ height: 20 }} />
        </ScrollView>

        {/* Muhurat Detail Modal */}
        <Modal
          visible={!!selectedMuhurat}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setSelectedMuhurat(null)}
        >
          {selectedMuhurat && (
            <SafeAreaView style={styles.modal}>
              <View style={styles.modalHeader}>
                <View style={styles.modalTitleRow}>
                  <View style={[styles.modalIcon, { backgroundColor: selectedMuhurat.color }]}>
                    <selectedMuhurat.icon size={24} color={Colors.white} />
                  </View>
                  <View>
                    <Text style={styles.modalTitle}>{selectedMuhurat.name}</Text>
                    <Text style={styles.modalSubtitle}>{selectedMuhurat.hindiName}</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => setSelectedMuhurat(null)}>
                  <X size={24} color={Colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalContent}>
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Description</Text>
                  <Text style={styles.modalDescription}>{selectedMuhurat.description}</Text>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Importance</Text>
                  <Text style={styles.modalDescription}>{selectedMuhurat.importance}</Text>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Best Months</Text>
                  <View style={styles.monthsList}>
                    {selectedMuhurat.bestMonths.map((month, idx) => (
                      <View key={idx} style={styles.monthChip}>
                        <CheckCircle size={14} color={Colors.success} />
                        <Text style={styles.monthText}>{month}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Avoid</Text>
                  <View style={styles.avoidCard}>
                    {selectedMuhurat.avoidMonths.map((month, idx) => (
                      <Text key={idx} style={styles.avoidText}>· {month}</Text>
                    ))}
                  </View>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Available Muhurats (Next 7 Days)</Text>
                  <Text style={styles.modalSectionSubtitle}>
                    Showing auspicious time slots for {selectedMuhurat.name}
                  </Text>
                  
                  {muhuratTimes.map((time, idx) => (
                    <View key={idx} style={styles.timeSlot}>
                      <View style={styles.timeDate}>
                        <Text style={styles.timeDateText}>{formatDate(time.date)}</Text>
                      </View>
                      <View style={styles.timeRange}>
                        <Text style={styles.timeStart}>{time.startTime}</Text>
                        <Text style={styles.timeSeparator}>-</Text>
                        <Text style={styles.timeEnd}>{time.endTime}</Text>
                      </View>
                      <View style={[styles.qualityBadge, { backgroundColor: getQualityColor(time.quality) + '20' }]}>
                        <Text style={[styles.qualityText, { color: getQualityColor(time.quality) }]}>
                          {time.quality}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>

                <TouchableOpacity style={styles.bookButton}>
                  <Calendar size={20} color={Colors.white} />
                  <Text style={styles.bookButtonText}>Book Astrologer for Muhurat</Text>
                </TouchableOpacity>
              </ScrollView>
            </SafeAreaView>
          )}
        </Modal>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  headerBanner: {
    backgroundColor: Colors.purple,
    padding: 20,
    alignItems: 'center',
  },
  bannerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.white,
    marginTop: 8,
  },
  bannerSubtitle: {
    fontSize: 14,
    color: Colors.white,
    opacity: 0.9,
    marginTop: 4,
  },
  categoryScroll: {
    maxHeight: 60,
    backgroundColor: Colors.white,
  },
  categoryList: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  categoryTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.background,
    gap: 6,
    marginRight: 8,
  },
  categoryTabActive: {
    backgroundColor: Colors.primary,
  },
  categoryTabText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.text,
  },
  categoryTabTextActive: {
    color: Colors.white,
  },
  muhuratList: {
    padding: 16,
    gap: 12,
  },
  muhuratCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  muhuratIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  muhuratInfo: {
    flex: 1,
  },
  muhuratName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  muhuratHindi: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 2,
  },
  muhuratDesc: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 4,
    lineHeight: 18,
  },
  muhuratMeta: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: Colors.textLight,
  },
  infoCard: {
    backgroundColor: Colors.white,
    margin: 16,
    padding: 16,
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: Colors.textLight,
    lineHeight: 22,
  },
  modal: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  modalSubtitle: {
    fontSize: 13,
    color: Colors.textLight,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  modalSection: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  modalSectionSubtitle: {
    fontSize: 12,
    color: Colors.textLight,
    marginBottom: 12,
  },
  modalDescription: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 22,
  },
  monthsList: {
    gap: 8,
  },
  monthChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  monthText: {
    fontSize: 14,
    color: Colors.text,
  },
  avoidCard: {
    backgroundColor: '#FFF5F5',
    borderRadius: 12,
    padding: 12,
  },
  avoidText: {
    fontSize: 13,
    color: Colors.error,
    marginBottom: 4,
  },
  timeSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    gap: 8,
  },
  timeDate: {
    width: 60,
    flexShrink: 0,
  },
  timeDateText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
  },
  timeRange: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 4,
  },
  timeStart: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
  },
  timeSeparator: {
    fontSize: 12,
    color: Colors.textLight,
  },
  timeEnd: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
  },
  qualityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    flexShrink: 0,
    minWidth: 70,
    alignItems: 'center',
  },
  qualityText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  bookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginBottom: 20,
  },
  bookButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
});
