import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { ChevronRight, Thermometer, Sparkles, Calendar, Lock } from 'lucide-react-native';
import { useAppTheme, AppTheme } from '@/contexts/ThemeContext';
import { Card } from '@/components/Card';
import { DashaPeriod } from '@/utils/vedic-astrology';



interface DashaTimelineProps {
  dashas?: DashaPeriod[];
  isLocked?: boolean;
  onUpgrade?: () => void;
}

export const DashaTimeline: React.FC<DashaTimelineProps> = ({
  dashas,
  isLocked,
  onUpgrade,
}) => {
  const Colors = useAppTheme();
  const styles = React.useMemo(() => createStyles(Colors), [Colors]);
  const now = new Date();

  if (!dashas || dashas.length === 0) return null;

  // Find the current active dasha
  const currentIdx = dashas.findIndex(d => now >= d.startDate && now <= d.endDate);
  const activeDasha = currentIdx !== -1 ? dashas[currentIdx] : null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Calendar size={22} color={Colors.primary} />
          <Text style={styles.title}>Dasha Timeline</Text>
        </View>
        <TouchableOpacity style={styles.infoBtn}>
          <Sparkles size={16} color={Colors.primary} />
          <Text style={styles.infoText}>Predictions</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.subtitle}>Your life cycles as ruled by the planets:</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {dashas.map((dasha, idx) => {
          const isActive = dasha === activeDasha;
          const isPast = now > dasha.endDate;
          
          return (
            <View key={idx} style={styles.dashaColumn}>
              <View style={[
                styles.dashaBlock, 
                isActive && styles.activeBlock,
                isPast && styles.pastBlock
              ]}>
                <Text style={[styles.planetName, isActive && styles.activeText]}>{dasha.planet}</Text>
                <Text style={[styles.durationText, isActive && styles.activeText]}>{dasha.years} years</Text>
              </View>
              
              <View style={styles.timelineTrack}>
                <View style={[styles.node, isActive && styles.activeNode, isPast && styles.pastNode]} />
                {idx < dashas.length - 1 && <View style={styles.connector} />}
              </View>

              <Text style={styles.dateLabel}>{dasha.startDate.getFullYear()}</Text>
            </View>
          );
        })}
      </ScrollView>

      {/* Detail Card for Active Dasha */}
      {activeDasha && (
        <Card style={styles.activeDetailCard}>
          <View style={styles.activeHeader}>
            <View style={styles.activeIcon}>
              <Thermometer size={20} color={Colors.white} />
            </View>
            <View>
              <Text style={styles.activeLabel}>CURRENTLY ACTIVE</Text>
              <Text style={styles.activeTitle}>{activeDasha.planet} Mahadasha</Text>
            </View>
          </View>
          
          <Text style={styles.activeDateRange}>
            {activeDasha.startDate.toLocaleDateString()} — {activeDasha.endDate.toLocaleDateString()}
          </Text>

          {isLocked ? (
            <TouchableOpacity style={styles.lockedArea} onPress={onUpgrade}>
              <Lock size={16} color={Colors.gold} />
              <Text style={styles.lockedText}>Upgrade to Gold to see Antardashas & Predictions</Text>
              <ChevronRight size={16} color={Colors.gold} />
            </TouchableOpacity>
          ) : (
            <View style={styles.unlockedArea}>
              <Text style={styles.predictionTeaser}>
                This is a period of {activeDasha.planet === 'Jupiter' ? 'expansion and learning' : 'focus and transformation'}. 
                Watch for opportunities in your 10th house...
              </Text>
              <TouchableOpacity style={styles.fullReportBtn}>
                <Text style={styles.fullReportText}>View Detailed Breakdown</Text>
              </TouchableOpacity>
            </View>
          )}
        </Card>
      )}
    </View>
  );
};

const createStyles = (Colors: AppTheme) => StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
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
  infoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  infoText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textLight,
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  dashaColumn: {
    alignItems: 'center',
    width: 100,
  },
  dashaBlock: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  activeBlock: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
    transform: [{ scale: 1.1 }],
    elevation: 8,
    shadowOpacity: 0.2,
    shadowColor: Colors.primary,
  },
  pastBlock: {
    backgroundColor: Colors.background,
    opacity: 0.6,
  },
  planetName: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.text,
  },
  durationText: {
    fontSize: 10,
    color: Colors.textLight,
    marginTop: 2,
  },
  activeText: {
    color: Colors.white,
  },
  timelineTrack: {
    height: 20,
    justifyContent: 'center',
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  node: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.border,
    zIndex: 2,
  },
  activeNode: {
    backgroundColor: Colors.primary,
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  pastNode: {
    backgroundColor: Colors.textLight,
  },
  connector: {
    position: 'absolute',
    left: '50%',
    width: 100,
    height: 2,
    backgroundColor: Colors.border,
    zIndex: 1,
  },
  dateLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textLight,
  },
  activeDetailCard: {
    marginHorizontal: 20,
    marginTop: 10,
    padding: 20,
    borderRadius: 24,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.primary + '33',
  },
  activeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  activeIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 1,
  },
  activeTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
  },
  activeDateRange: {
    fontSize: 13,
    color: Colors.textLight,
    marginBottom: 16,
  },
  lockedArea: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gold + '11',
    padding: 16,
    borderRadius: 16,
    gap: 12,
  },
  lockedText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: '#886600',
    lineHeight: 18,
  },
  unlockedArea: {
    backgroundColor: Colors.background,
    padding: 16,
    borderRadius: 16,
  },
  predictionTeaser: {
    fontSize: 13,
    color: Colors.text,
    lineHeight: 20,
    marginBottom: 12,
  },
  fullReportBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 0,
  },
  fullReportText: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.primary,
  }
});
