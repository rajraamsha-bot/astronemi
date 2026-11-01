import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Clock, Zap, AlertCircle, Info, Lock } from 'lucide-react-native';
import { useAppTheme, AppTheme } from '@/contexts/ThemeContext';
import { Card } from '@/components/Card';
import { getMuhurat } from '@/utils/hindu-calendar-engine';

interface DailyMuhuratProps {
  location?: { lat: number; lng: number };
  isLocked?: boolean;
  onUpgrade?: () => void;
}

export const DailyMuhurat: React.FC<DailyMuhuratProps> = ({
  location,
  isLocked,
  onUpgrade,
}) => {
  const Colors = useAppTheme();
  const styles = React.useMemo(() => createStyles(Colors), [Colors]);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000); // Update every minute
    return () => clearInterval(timer);
  }, []);

  const muhurats = getMuhurat(currentTime, location?.lat, location?.lng);
  
  const abhijit = muhurats.find(m => m.type === 'Abhijit Muhurat');
  const rahu = muhurats.find(m => m.type === 'Rahu Kaal (Avoid)');

  const isTimeInRange = (start: string, end: string) => {
    const now = currentTime.getHours() * 60 + currentTime.getMinutes();
    const startParts = start.split(':').map(Number);
    const endParts = end.split(':').map(Number);
    if (startParts.length < 2 || endParts.length < 2) return false;
    const [sH, sM] = startParts as [number, number];
    const [eH, eM] = endParts as [number, number];
    const s = sH * 60 + sM;
    const e = eH * 60 + eM;
    return now >= s && now <= e;
  };

  const isAbhijitActive = abhijit ? isTimeInRange(abhijit.start, abhijit.end) : false;
  const isRahuActive = rahu ? isTimeInRange(rahu.start, rahu.end) : false;

  return (
    <Card style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Clock size={22} color={Colors.primary} />
          <Text style={styles.title}>Daily Muhurat</Text>
        </View>
        <View style={[styles.liveBadge, { backgroundColor: isAbhijitActive ? Colors.success + '22' : (isRahuActive ? Colors.error + '22' : Colors.border) }]}>
          <View style={[styles.pulse, { backgroundColor: isAbhijitActive ? Colors.success : (isRahuActive ? Colors.error : Colors.textLight) }]} />
          <Text style={[styles.liveText, { color: isAbhijitActive ? Colors.success : (isRahuActive ? Colors.error : Colors.textLight) }]}>
            {isAbhijitActive ? 'LUCKY TIME' : (isRahuActive ? 'CAUTION' : 'NEUTRAL')}
          </Text>
        </View>
      </View>

      <Text style={styles.subtitle}>Track today&apos;s cosmic windows for success:</Text>

      <View style={styles.grid}>
        {/* Abhijit - The Golden Hour */}
        <View style={[styles.muhuratBox, isAbhijitActive && styles.activeAbhijit]}>
          <View style={styles.boxHeader}>
            <Zap size={20} color={Colors.success} fill={isAbhijitActive ? Colors.success : 'transparent'} />
            <Text style={styles.boxTitle}>Abhijit Muhurat</Text>
          </View>
          <Text style={styles.timeText}>{abhijit?.start} - {abhijit?.end}</Text>
          <Text style={styles.descText}>Best for new starts and success.</Text>
        </View>

        {/* Rahu Kaal - The Shadow Hour */}
        <View style={[styles.muhuratBox, isRahuActive && styles.activeRahu]}>
          <View style={styles.boxHeader}>
            <AlertCircle size={20} color={Colors.error} />
            <Text style={styles.boxTitle}>Rahu Kaal</Text>
          </View>
          <Text style={styles.timeText}>{rahu?.start} - {rahu?.end}</Text>
          <Text style={styles.descText}>Avoid taking major decisions.</Text>
        </View>
      </View>

      {/* Locked Elite Muhurats */}
      {isLocked ? (
        <TouchableOpacity style={styles.lockedFooter} onPress={onUpgrade}>
          <Lock size={14} color={Colors.purple} />
          <Text style={styles.lockedFooterText}>Unlock Brahma & Gulika Muhurats with Gold</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.eliteRow}>
          <Info size={14} color={Colors.textLight} />
          <Text style={styles.eliteText}>Check the full Panchang for Brahma Muhurat timings.</Text>
        </View>
      )}
    </Card>
  );
};

const createStyles = (Colors: AppTheme) => StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 24,
    padding: 20,
    borderRadius: 24,
    backgroundColor: Colors.white,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  pulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  liveText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textLight,
    marginBottom: 20,
  },
  grid: {
    flexDirection: 'row',
    gap: 12,
  },
  muhuratBox: {
    flex: 1,
    padding: 16,
    backgroundColor: Colors.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  activeAbhijit: {
    borderColor: Colors.success,
    backgroundColor: Colors.success + '08',
  },
  activeRahu: {
    borderColor: Colors.error,
    backgroundColor: Colors.error + '08',
  },
  boxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  boxTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  timeText: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.primary,
    marginBottom: 6,
  },
  descText: {
    fontSize: 11,
    color: Colors.textLight,
    lineHeight: 16,
  },
  lockedFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  lockedFooterText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.purple,
  },
  eliteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
    opacity: 0.7,
  },
  eliteText: {
    fontSize: 11,
    color: Colors.textLight,
  }
});
