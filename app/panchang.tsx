import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { MapPin, Sun, Calendar, Loader2, Clock } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import { Gradients, Shadows } from '@/constants/theme';

import { useLocation } from '@/hooks/useLocation';
import { usePanchang } from '@/hooks/usePanchang';
import { EmptyState } from '@/components/shared/EmptyState';
import { PanchangAngaGrid } from '@/components/panchang/PanchangAngaGrid';
import { SunMoonGrid } from '@/components/panchang/SunMoonGrid';
import { MuhurtaList } from '@/components/panchang/MuhurtaList';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';

export default function PanchangScreen() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const { location, locationLabel, isLoading: locLoading } = useLocation();
  const { panchang, loading: panLoading, dataSource, loadPanchang } = usePanchang(location);

  const loading = locLoading || panLoading;

  const handleRefresh = useCallback(() => {
    loadPanchang(selectedDate);
  }, [selectedDate, loadPanchang]);

  const changeDate = useCallback((days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
    loadPanchang(newDate);
  }, [selectedDate, loadPanchang]);

  if (loading && !panchang) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
           <LinearGradient colors={Gradients.purple} style={styles.loaderCircle}>
             <Loader2 color="#FFF" size={32} />
           </LinearGradient>
           <Text style={styles.loadingText}>Aligning the Stars...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 🌌 SACRED HEADER */}
      <LinearGradient colors={Gradients.purple} style={styles.headerHero}>
        <SafeAreaView edges={['top']}>
          <View style={styles.navBar}>
            <Button variant="ghost" icon="chevron-back" title="" onPress={() => router.back()} containerStyle={styles.glassBtn} />
            <Text style={styles.headerTitle}>Panchang</Text>
            <Button variant="ghost" icon="refresh" title="" onPress={handleRefresh} containerStyle={styles.glassBtn} />
          </View>

          <View style={styles.dateControl}>
            <Button variant="ghost" icon="chevron-back" title="" onPress={() => changeDate(-1)} containerStyle={styles.dateNavBtn} />
            <View style={styles.dateInfo}>
               <Text style={styles.dateLabel}>{panchang?.date || 'Select Date'}</Text>
               <View style={styles.locationTag}>
                 <MapPin size={12} color="rgba(255,255,255,0.7)" />
                 <Text style={styles.locationText}>{locationLabel || 'Locating...'}</Text>
               </View>
            </View>
            <Button variant="ghost" icon="chevron-forward" title="" onPress={() => changeDate(1)} containerStyle={styles.dateNavBtn} />
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {!panchang ? (
           <EmptyState
             icon={Calendar}
             title="Celestial Out of Sync"
             description="We couldn't align the data for your location."
             actionLabel="Retry Calculations"
             onAction={handleRefresh}
           />
        ) : (
          <>
            <View style={styles.dataSourceBox}>
              <Card variant="filled" padding="none" borderRadius="full">
                <Text style={styles.dataSourceText}>
                  Verified: {dataSource === 'prokerala' ? 'Astro Engine' : 'Calculated'}
                </Text>
              </Card>
            </View>

            <PanchangAngaGrid data={panchang} />

            <View style={styles.divider} />

            <SunMoonGrid data={panchang} />

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Clock size={20} color={Colors.purple} />
                <Text style={styles.sectionTitle}>Choghadiya & Muhurtas</Text>
              </View>
              <MuhurtaList timings={panchang.auspiciousTimings} />
            </View>

            {panchang.festivals.length > 0 && (
              <View style={styles.section}>
                <Card variant="glass" padding="md" borderRadius="lg">
                   <View style={styles.sectionHeader}>
                     <Sun size={20} color="#FFD700" />
                     <Text style={styles.sectionTitle}>Festivals Today</Text>
                   </View>
                   {panchang.festivals.map((fest, idx) => (
                    <View key={idx} style={styles.festItem}>
                      <View style={styles.festDot} />
                      <Text style={styles.festName}>{fest}</Text>
                    </View>
                  ))}
                </Card>
              </View>
            )}

            <Text style={styles.footerNote}>
              * Astronomical data precision based on {locationLabel} coordinates.
            </Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F7FF' },
  headerHero: { borderBottomLeftRadius: 32, borderBottomRightRadius: 32, paddingBottom: 20, ...Shadows.medium },
  navBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#FFF', letterSpacing: -0.5 },
  glassBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)' },
  dateControl: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20, marginTop: 10 },
  dateNavBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.1)' },
  dateInfo: { alignItems: 'center' },
  dateLabel: { color: '#FFF', fontSize: 18, fontWeight: '800' },
  locationTag: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  locationText: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600' },
  scrollContent: { paddingBottom: 40, marginTop: 10 },
  dataSourceBox: { alignSelf: 'center', marginTop: -15, width: '40%' },
  dataSourceText: { fontSize: 10, color: Colors.purple, fontWeight: '800', textTransform: 'uppercase', textAlign: 'center', paddingVertical: 4 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loaderCircle: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', ...Shadows.glow(Colors.purple) },
  loadingText: { marginTop: 24, fontSize: 18, color: Colors.purple, fontWeight: '700' },
  divider: { height: 1, backgroundColor: '#E0D5F5', marginHorizontal: 24, marginVertical: 16 },
  section: { paddingHorizontal: 20, paddingVertical: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#2D1B5A' },
  festItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, paddingLeft: 8 },
  festDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFD700', marginRight: 12 },
  festName: { fontSize: 16, color: '#4A3B75', fontWeight: '600' },
  footerNote: { padding: 24, fontSize: 12, color: '#AAA', textAlign: 'center', fontStyle: 'italic' },
});
