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
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Star,
  MapPin,
  Info,
  ChevronRight,
} from 'lucide-react-native';
import { router } from 'expo-router';
import Colors from '@/constants/colors';

interface Event {
  id: string;
  name: string;
  icon: string;
  bestDates: string[];
  bestTimes: string[];
  considerations: string[];
  avoid: string[];
}

const events: Event[] = [
  {
    id: '1',
    name: 'Marriage',
    icon: 'wedding',
    bestDates: ['Feb 14-18, 2024', 'Apr 22-26, 2024', 'May 15-20, 2024'],
    bestTimes: ['6:00 AM - 8:00 AM', '10:00 AM - 12:00 PM'],
    considerations: ['Check Venus position', 'Avoid Mercury retrograde', 'Consider Moon in benefic signs'],
    avoid: ['Eclipses', 'Mercury retrograde', 'Moon in 6th/8th/12th house'],
  },
  {
    id: '2',
    name: 'Business Launch',
    icon: 'business',
    bestDates: ['Mar 5-8, 2024', 'Apr 1-4, 2024', 'May 2-6, 2024'],
    bestTimes: ['9:00 AM - 11:00 AM', '2:00 PM - 4:00 PM'],
    considerations: ['Jupiter in 2nd/11th house', 'Strong Ascendant lord', 'Moon waxing'],
    avoid: ['Saturn in 8th house', 'Rahu-Kala periods', 'Moon debilitated'],
  },
  {
    id: '3',
    name: 'House Warming',
    icon: 'home',
    bestDates: ['Feb 20-22, 2024', 'Mar 15-18, 2024', 'Apr 10-12, 2024'],
    bestTimes: ['Morning hours', 'Abhijit Muhurta'],
    considerations: ['Jupiter in 4th house', 'Venus well-placed', 'Moon in Taurus/Cancer'],
    avoid: ['Rahu in 4th', 'Mars aspect on 4th house', 'Amavasya'],
  },
  {
    id: '4',
    name: 'Travel/Journey',
    icon: 'travel',
    bestDates: ['Feb 10-12, 2024', 'Mar 8-10, 2024', 'Apr 5-7, 2024'],
    bestTimes: ['Early morning', 'Before sunset'],
    considerations: ['Strong 3rd/9th house', 'Jupiter aspect on journey house', 'Moon in movable sign'],
    avoid: ['Mercury retrograde', 'Mars in 3rd/9th', 'Rahu in 7th house'],
  },
  {
    id: '5',
    name: 'Education/Course',
    icon: 'education',
    bestDates: ['Feb 5-8, 2024', 'Mar 3-6, 2024', 'Apr 1-4, 2024'],
    bestTimes: ['Brahma Muhurta', 'Morning hours'],
    considerations: ['Mercury strong', 'Jupiter in 5th/9th', 'Thursday preferred'],
    avoid: ['Mercury combust', 'Rahu in 5th', 'Moon in 8th'],
  },
  {
    id: '6',
    name: 'Medical Treatment',
    icon: 'medical',
    bestDates: ['Feb 12-15, 2024', 'Mar 10-13, 2024', 'Apr 8-11, 2024'],
    bestTimes: ['Morning hours', 'Avoid Rahu Kala'],
    considerations: ['Moon in Cancer', 'Jupiter aspect on 6th', 'Wednesday/Sunday'],
    avoid: ['Mars in 6th', 'Saturn aspect on Moon', 'Eclipses'],
  },
];

export default function ElectionalAstrologyScreen() {
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#4527A0', '#512DA8', '#673AB7']}
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
            <Text style={styles.headerTitle}>Electional Astrology</Text>
            <View style={styles.placeholder} />
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.content}>
        {/* Info Card */}
        <View style={styles.infoCard}>
          <Info color="#673AB7" size={18} />
          <Text style={styles.infoText}>
            Electional astrology helps you find the most auspicious time to begin
            important activities. Select an event to see favorable dates and times.
          </Text>
        </View>

        {/* Quick Muhurta */}
        <View style={styles.quickMuhurtaCard}>
          <Text style={styles.quickMuhurtaTitle}>Today&apos;s Auspicious Time</Text>
          <View style={styles.muhurtaGrid}>
            <View style={styles.muhurtaItem}>
              <Clock color="#4CAF50" size={16} />
              <Text style={styles.muhurtaLabel}>Abhijit Muhurta</Text>
              <Text style={styles.muhurtaTime}>11:45 AM - 12:33 PM</Text>
            </View>
            <View style={styles.muhurtaItem}>
              <Star color="#FFC107" size={16} />
              <Text style={styles.muhurtaLabel}>Amrit Kala</Text>
              <Text style={styles.muhurtaTime}>2:15 PM - 3:45 PM</Text>
            </View>
            <View style={styles.muhurtaItem}>
              <CheckCircle color="#2196F3" size={16} />
              <Text style={styles.muhurtaLabel}>Brahma Muhurta</Text>
              <Text style={styles.muhurtaTime}>5:12 AM - 6:00 AM</Text>
            </View>
          </View>
        </View>

        {/* Events List */}
        <Text style={styles.sectionTitle}>Select Event Type</Text>
        {events.map((event) => (
          <TouchableOpacity
            key={event.id}
            style={[
              styles.eventCard,
              selectedEvent?.id === event.id && styles.eventCardSelected,
            ]}
            onPress={() => setSelectedEvent(
              selectedEvent?.id === event.id ? null : event
            )}
          >
            <View style={styles.eventHeader}>
              <View style={styles.eventLeft}>
                <View style={styles.eventIcon}>
                  <Calendar color="#673AB7" size={20} />
                </View>
                <Text style={styles.eventName}>{event.name}</Text>
              </View>
              <ChevronRight
                color={selectedEvent?.id === event.id ? '#673AB7' : Colors.textLight}
                size={20}
                style={{
                  transform: [{ rotate: selectedEvent?.id === event.id ? '90deg' : '0deg' }],
                }}
              />
            </View>

            {selectedEvent?.id === event.id && (
              <View style={styles.eventDetails}>
                {/* Best Dates */}
                <View style={styles.detailSection}>
                  <View style={styles.detailHeader}>
                    <CheckCircle color="#4CAF50" size={16} />
                    <Text style={styles.detailTitle}>Best Dates</Text>
                  </View>
                  {event.bestDates.map((date, index) => (
                    <Text key={index} style={styles.detailItem}>  {date}</Text>
                  ))}
                </View>

                {/* Best Times */}
                <View style={styles.detailSection}>
                  <View style={styles.detailHeader}>
                    <Clock color="#2196F3" size={16} />
                    <Text style={styles.detailTitle}>Best Times</Text>
                  </View>
                  {event.bestTimes.map((time, index) => (
                    <Text key={index} style={styles.detailItem}>  {time}</Text>
                  ))}
                </View>

                {/* Considerations */}
                <View style={styles.detailSection}>
                  <View style={styles.detailHeader}>
                    <AlertTriangle color="#FF9800" size={16} />
                    <Text style={styles.detailTitle}>Considerations</Text>
                  </View>
                  {event.considerations.map((item, index) => (
                    <Text key={index} style={styles.detailItem}>  {item}</Text>
                  ))}
                </View>

                {/* Avoid */}
                <View style={styles.detailSection}>
                  <View style={styles.detailHeader}>
                    <XCircle color="#F44336" size={16} />
                    <Text style={styles.detailTitle}>Avoid</Text>
                  </View>
                  {event.avoid.map((item, index) => (
                    <Text key={index} style={[styles.detailItem, styles.avoidItem]}>  {item}</Text>
                  ))}
                </View>

                {/* Book Consultation */}
                <TouchableOpacity style={styles.bookButton}>
                  <Text style={styles.bookButtonText}>Book Personalized Muhurta</Text>
                </TouchableOpacity>
              </View>
            )}
          </TouchableOpacity>
        ))}

        {/* Location Notice */}
        <View style={styles.locationCard}>
          <MapPin color="#673AB7" size={18} />
          <Text style={styles.locationText}>
            Muhurta timings are calculated based on your current location.
            For accurate results, ensure location services are enabled.
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
    backgroundColor: '#EDE7F6',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#4527A0',
    lineHeight: 17,
  },
  quickMuhurtaCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quickMuhurtaTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  muhurtaGrid: {
    gap: 10,
  },
  muhurtaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  muhurtaLabel: {
    fontSize: 13,
    color: Colors.text,
    flex: 1,
  },
  muhurtaTime: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  eventCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  eventCardSelected: {
    borderColor: '#673AB7',
    borderWidth: 2,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  eventIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EDE7F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventName: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.text,
  },
  eventDetails: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  detailSection: {
    marginBottom: 14,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  detailTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  detailItem: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
    marginLeft: 24,
  },
  avoidItem: {
    color: '#F44336',
  },
  bookButton: {
    backgroundColor: '#673AB7',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  bookButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '500',
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#E8EAF6',
    borderRadius: 12,
    padding: 12,
    marginBottom: 24,
    gap: 10,
  },
  locationText: {
    flex: 1,
    fontSize: 12,
    color: '#3949AB',
    lineHeight: 17,
  },
});