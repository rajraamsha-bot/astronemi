import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppTheme } from '@/contexts/ThemeContext';
import { ShadbalaResult } from '@/utils/shadbala-engine';
import { Star } from 'lucide-react-native';

interface ShadbalaStrengthWidgetProps {
  shadbala: ShadbalaResult[];
  isLocked?: boolean;
  onUpgrade?: () => void;
}

export const ShadbalaStrengthWidget: React.FC<ShadbalaStrengthWidgetProps> = ({
  shadbala,
  isLocked,
  onUpgrade,
}) => {
  const Colors = useAppTheme();
  
  if (!shadbala || shadbala.length === 0) return null;

  // Sort by total strength descending
  const sortedPlanets = [...shadbala].sort((a, b) => b.totalRupas - a.totalRupas);
  const strongest = sortedPlanets[0];
  const weakest = sortedPlanets[sortedPlanets.length - 1];

  const getPlanetName = (slug: string) => {
    const names: Record<string, string> = {
      Sun: 'Surya', Moon: 'Chandra', Mars: 'Mangal', Mercury: 'Budh',
      Jupiter: 'Guru', Venus: 'Shukra', Saturn: 'Shani'
    };
    return names[slug] || slug;
  };

  const getColor = (rupa: number) => {
    if (rupa >= 7) return '#4CAF50'; // Strong
    if (rupa >= 5) return '#FFEB3B'; // Moderate
    return '#F44336'; // Weak
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Star size={20} color={Colors.primary} fill={Colors.gold} />
        <Text style={[styles.title, { color: Colors.text }]}>Planetary Strength (Shadbala)</Text>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Strongest</Text>
          <Text style={[styles.summaryValue, { color: '#4CAF50' }]}>
            {strongest ? getPlanetName(strongest.planet) : 'N/A'}
          </Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Weakest</Text>
          <Text style={[styles.summaryValue, { color: '#F44336' }]}>
            {weakest ? getPlanetName(weakest.planet) : 'N/A'}
          </Text>
        </View>
      </View>

      <View style={styles.listContainer}>
        {sortedPlanets.map((item, index) => {
          const percentage = Math.min((item.totalRupas / 10) * 100, 100);
          return (
            <View key={index} style={styles.planetRow}>
              <View style={styles.planetLabel}>
                <Text style={[styles.planetName, { color: Colors.text }]}>{getPlanetName(item.planet)}</Text>
                <Text style={[styles.planetRupa, { color: Colors.textLight }]}>{item.totalRupas.toFixed(2)} Rupas</Text>
              </View>
              <View style={styles.barContainer}>
                <View style={[styles.barBackground, { backgroundColor: Colors.border }]}>
                  <LinearGradient
                    colors={[getColor(item.totalRupas), getColor(item.totalRupas) + 'CC']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.barFill, { width: `${percentage}%` }]}
                  />
                </View>
              </View>
            </View>
          );
        })}
      </View>

      {isLocked && (
        <TouchableOpacity style={styles.lockOverlay} onPress={onUpgrade}>
          <LinearGradient colors={['rgba(255,255,255,0.8)', 'rgba(255,255,255,0.95)']} style={styles.lockContent}>
            <Star size={32} color={Colors.gold} fill={Colors.gold} />
            <Text style={styles.lockText}>Unlock Detailed Shadbala Scores</Text>
            <View style={styles.upgradeBtn}>
              <Text style={styles.upgradeBtnText}>Upgrade Now</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  summaryRow: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 12,
    marginBottom: 20,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
    height: '100%',
  },
  summaryLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  listContainer: {
    gap: 14,
  },
  planetRow: {
    gap: 6,
  },
  planetLabel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  planetName: {
    fontSize: 14,
    fontWeight: '600',
  },
  planetRupa: {
    fontSize: 12,
    fontWeight: '500',
  },
  barContainer: {
    width: '100%',
  },
  barBackground: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
  },
  lockContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  lockText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginTop: 12,
    textAlign: 'center',
  },
  upgradeBtn: {
    marginTop: 16,
    backgroundColor: '#6B46C1',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 12,
  },
  upgradeBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
