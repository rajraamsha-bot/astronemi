import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Calendar, Star, Bell, ChevronLeft, ChevronRight, X, ArrowLeft } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { computeFestivalsForYear } from '@/utils/hindu-calendar-engine';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Festival {
  id: string;
  name: string;
  hindiName: string;
  date: Date;
  type: 'major' | 'minor' | 'vrat' | 'ekadashi' | 'purnima' | 'amavasya';
  description: string;
  rituals: string[];
  significance: string;
  panchangRule?: string;
}

// ─── Helper: map engine output → local Festival type ─────────────────────────

function toFestivalList(computed: { id: string; name: string; date: Date; type: string; description: string }[]): Festival[] {
  return computed.map(f => ({
    id: f.id,
    name: f.name,
    hindiName: f.name,
    date: f.date,
    type: f.type as Festival['type'],
    description: f.description,
    rituals: ['Prayer', 'Feasting', 'Community gathering'],
    significance: 'Celebrates cultural and spiritual traditions.',
    panchangRule: undefined,
  }));
}

// ─── Style maps ──────────────────────────────────────────────────────────────

const typeColors: Record<string, string> = {
  major: Colors.primary,
  minor: Colors.textLight,
  vrat: Colors.purple,
  ekadashi: Colors.success,
  purnima: Colors.gold,
  amavasya: Colors.text,
};

const typeLabels: Record<string, string> = {
  major: 'Major Festival',
  minor: 'Minor Festival',
  vrat: 'Vrat/Fast',
  ekadashi: 'Ekadashi',
  purnima: 'Purnima',
  amavasya: 'Amavasya',
};

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function FestivalsScreen() {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedFestival, setSelectedFestival] = useState<Festival | null>(null);
  const [filterType, setFilterType] = useState<string | null>(null);

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  // ─── Compute festivals from panchang engine (memoised per year) ───────────
  const allFestivals = useMemo<Festival[]>(() => {
    try {
      const computed = computeFestivalsForYear(selectedYear);
      return toFestivalList(computed);
    } catch {
      return [];
    }
  }, [selectedYear]);

  const filteredFestivals = allFestivals.filter(f => {
    const monthMatch = f.date.getMonth() === selectedMonth;
    const typeMatch = filterType ? f.type === filterType : true;
    return monthMatch && typeMatch;
  }).sort((a, b) => a.date.getTime() - b.date.getTime());

  const upcomingFestivals = allFestivals
    .filter(f => f.date >= new Date())
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 5);

  const changeYear = (dir: number) => setSelectedYear(y => y + dir);

  const changeMonth = (direction: number) => {
    setSelectedMonth(prev => {
      const newMonth = prev + direction;
      if (newMonth < 0) return 11;
      if (newMonth > 11) return 0;
      return newMonth;
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-IN', { 
      weekday: 'short', 
      day: 'numeric', 
      month: 'short' 
    });
  };

  const getDaysUntil = (date: Date) => {
    const now = new Date();
    const diff = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return 'Past';
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    return `In ${diff} days`;
  };

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
          <Text style={styles.headerTitle}>Festival Calendar</Text>
          <View style={styles.backButton} />
        </View>
        
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Upcoming Festivals Banner */}
          <View style={styles.upcomingBanner}>
            <Calendar size={24} color={Colors.white} />
            <Text style={styles.upcomingTitle}>Upcoming Festivals</Text>
          </View>

          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.upcomingScroll}
            contentContainerStyle={styles.upcomingList}
          >
            {upcomingFestivals.map((festival) => (
              <TouchableOpacity 
                key={festival.id} 
                style={styles.upcomingCard}
                onPress={() => setSelectedFestival(festival)}
              >
                <View style={[styles.typeIndicator, { backgroundColor: typeColors[festival.type] }]} />
                <Text style={styles.upcomingName}>{festival.name}</Text>
                <Text style={styles.upcomingDate}>{formatDate(festival.date)}</Text>
                <Text style={styles.upcomingDays}>{getDaysUntil(festival.date)}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Month + Year Selector */}
          <View style={styles.monthSelector}>
            <TouchableOpacity
              style={styles.arrowButton}
              onPress={() => changeMonth(-1)}
            >
              <ChevronLeft size={24} color={Colors.white} />
            </TouchableOpacity>
            <View style={styles.monthInfo}>
              <Text style={styles.monthText}>{monthNames[selectedMonth]}</Text>
              {/* Year navigator */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 }}>
                <TouchableOpacity onPress={() => changeYear(-1)}>
                  <ChevronLeft size={18} color='rgba(255,255,255,0.8)' />
                </TouchableOpacity>
                <Text style={styles.yearText}>{selectedYear}</Text>
                <TouchableOpacity onPress={() => changeYear(1)}>
                  <ChevronRight size={18} color='rgba(255,255,255,0.8)' />
                </TouchableOpacity>
              </View>
            </View>
            <TouchableOpacity
              style={styles.arrowButton}
              onPress={() => changeMonth(1)}
            >
              <ChevronRight size={24} color={Colors.white} />
            </TouchableOpacity>
          </View>

          {/* Filter Tabs */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.filterScroll}
            contentContainerStyle={styles.filterList}
          >
            <TouchableOpacity
              style={[styles.filterTab, !filterType && styles.filterTabActive]}
              onPress={() => setFilterType(null)}
            >
              <Text style={[styles.filterText, !filterType && styles.filterTextActive]}>All</Text>
            </TouchableOpacity>
            {Object.keys(typeLabels).map((type) => (
              <TouchableOpacity
                key={type}
                style={[styles.filterTab, filterType === type && styles.filterTabActive]}
                onPress={() => setFilterType(type)}
              >
                <Text style={[styles.filterText, filterType === type && styles.filterTextActive]}>
                  {typeLabels[type]}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Festivals List */}
          <View style={styles.festivalsList}>
            {filteredFestivals.length === 0 ? (
              <View style={styles.emptyState}>
                <Calendar size={40} color={Colors.textLight} />
                <Text style={styles.emptyText}>No festivals this month</Text>
              </View>
            ) : (
              filteredFestivals.map((festival) => (
                <TouchableOpacity
                  key={festival.id}
                  style={styles.festivalCard}
                  onPress={() => setSelectedFestival(festival)}
                >
                  <View style={styles.festivalDateContainer}>
                    <Text style={styles.festivalDay}>{festival.date?.getDate() || 'N/A'}</Text>
                     <Text style={styles.festivalMonth}>{festival.date ? monthNames[festival.date.getMonth()]?.substring(0, 3) : 'N/A'}</Text>
                  </View>
                  <View style={styles.festivalInfo}>
                    <View style={styles.festivalHeader}>
                      <Text style={styles.festivalName}>{festival.name}</Text>
                      <View style={[styles.typeBadge, { backgroundColor: typeColors[festival.type] + '20' }]}>
                        <Text style={[styles.typeText, { color: typeColors[festival.type] }]}>
                          {typeLabels[festival.type]}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.festivalHindi}>{festival.hindiName}</Text>
                    <Text style={styles.festivalDesc} numberOfLines={2}>{festival.description}</Text>
                  </View>
                  <Bell size={20} color={Colors.textLight} />
                </TouchableOpacity>
              ))
            )}
          </View>
        </ScrollView>

        {/* Festival Detail Modal */}
        <Modal
          visible={!!selectedFestival}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setSelectedFestival(null)}
        >
          {selectedFestival && (
            <SafeAreaView style={styles.modal}>
              <View style={styles.modalHeader}>
                <View style={styles.modalTitleRow}>
                  <View style={[styles.modalTypeBadge, { backgroundColor: typeColors[selectedFestival.type] }]}>
                    <Text style={styles.modalTypeText}>{typeLabels[selectedFestival.type]}</Text>
                  </View>
                  <Text style={styles.modalTitle}>{selectedFestival.name}</Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedFestival(null)}>
                  <X size={24} color={Colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalContent}>
                <View style={styles.modalDateCard}>
                  <Calendar size={24} color={Colors.primary} />
                  <View style={styles.modalDateInfo}>
                    <Text style={styles.modalDateText}>
                      {selectedFestival.date.toLocaleDateString('en-IN', { 
                        weekday: 'long', 
                        day: 'numeric', 
                        month: 'long', 
                        year: 'numeric' 
                      })}
                    </Text>
                    <Text style={styles.modalDaysText}>{getDaysUntil(selectedFestival.date)}</Text>
                  </View>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>About</Text>
                  <Text style={styles.modalDescription}>{selectedFestival.description}</Text>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Significance</Text>
                  <Text style={styles.modalDescription}>{selectedFestival.significance}</Text>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Rituals & Practices</Text>
                  {selectedFestival.rituals.map((ritual, idx) => (
                    <View key={idx} style={styles.ritualItem}>
                      <Star size={16} color={Colors.gold} fill={Colors.gold} />
                      <Text style={styles.ritualText}>{ritual}</Text>
                    </View>
                  ))}
                </View>

                <TouchableOpacity style={styles.reminderButton}>
                  <Bell size={20} color={Colors.white} />
                  <Text style={styles.reminderButtonText}>Set Reminder</Text>
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
  upcomingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.purple,
    padding: 16,
    gap: 12,
  },
  upcomingTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.white,
  },
  upcomingScroll: {
    maxHeight: 160,
  },
  upcomingList: {
    padding: 16,
    gap: 12,
  },
  upcomingCard: {
    width: 140,
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
  },
  typeIndicator: {
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 8,
  },
  upcomingName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  upcomingDate: {
    fontSize: 12,
    color: Colors.textLight,
  },
  upcomingDays: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
    marginTop: 4,
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  arrowButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthInfo: {
    alignItems: 'center',
  },
  monthText: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.white,
  },
  yearText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
    opacity: 0.9,
  },
  filterScroll: {
    maxHeight: 50,
    backgroundColor: Colors.white,
  },
  filterList: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.background,
    marginRight: 8,
  },
  filterTabActive: {
    backgroundColor: Colors.primary,
  },
  filterText: {
    fontSize: 13,
    color: Colors.text,
    fontWeight: '500',
  },
  filterTextActive: {
    color: Colors.white,
  },
  festivalsList: {
    padding: 16,
    gap: 12,
  },
  emptyState: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textLight,
    marginTop: 12,
  },
  festivalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  festivalDateContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  festivalDay: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.white,
  },
  festivalMonth: {
    fontSize: 12,
    color: Colors.white,
    opacity: 0.9,
  },
  festivalInfo: {
    flex: 1,
  },
  festivalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  festivalName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  typeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  festivalHindi: {
    fontSize: 12,
    color: Colors.textLight,
    marginBottom: 4,
  },
  festivalDesc: {
    fontSize: 12,
    color: Colors.textLight,
    lineHeight: 18,
  },
  modal: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitleRow: {
    flex: 1,
    marginRight: 16,
  },
  modalTypeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
  },
  modalTypeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.white,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  modalDateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    marginBottom: 20,
  },
  modalDateInfo: {
    flex: 1,
  },
  modalDateText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  modalDaysText: {
    fontSize: 14,
    color: Colors.primary,
    marginTop: 2,
  },
  modalSection: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  modalSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },
  modalDescription: {
    fontSize: 15,
    color: Colors.text,
    lineHeight: 22,
  },
  ritualItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  ritualText: {
    fontSize: 14,
    color: Colors.text,
    flex: 1,
  },
  reminderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginBottom: 20,
  },
  reminderButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
});