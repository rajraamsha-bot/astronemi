import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useAppTheme } from '@/contexts/ThemeContext';
import { DivisionalPlanet } from '@/utils/jaimini-engine';
import { KundliChartRenderer } from './KundliChartRenderer';
import { LayoutGrid } from 'lucide-react-native';

interface PlanetWithHouse {
  name: string;
  sanskritName?: string;
  house?: number;
  houseIndex?: number;
  isRetrograde: boolean;
}

interface KundliDataSubset {
  d1Planets: PlanetWithHouse[];
  d2Chart?: { planets: DivisionalPlanet[]; ascendant: { sign: string; signIndex: number } };
  d3Chart?: { planets: DivisionalPlanet[]; ascendant: { sign: string; signIndex: number } };
  d7Chart?: { planets: DivisionalPlanet[]; ascendant: { sign: string; signIndex: number } };
  d9Chart?: { planets: DivisionalPlanet[]; ascendant: { sign: string; signIndex: number } };
  d12Chart?: { planets: DivisionalPlanet[]; ascendant: { sign: string; signIndex: number } };
  d30Chart?: { planets: DivisionalPlanet[]; ascendant: { sign: string; signIndex: number } };
}

interface DivisionalChartExplorerProps {
  data: KundliDataSubset;
  isLocked?: boolean;
  onUpgrade?: () => void;
}

export const DivisionalChartExplorer: React.FC<DivisionalChartExplorerProps> = ({
  data,
  isLocked,
  onUpgrade,
}) => {
  const Colors = useAppTheme();
  const [activeVarga, setActiveVarga] = useState<'D1' | 'D2' | 'D3' | 'D7' | 'D9' | 'D12' | 'D30'>('D1');

  // Core Vargas are free, deeper ones are gated
  const isVargaGated = (varga: string) => {
    if (varga === 'D1' || varga === 'D9' || varga === 'D3') return false;
    return isLocked;
  };

  const vargas = [
    { id: 'D1' as const, label: 'D1 (Rashi)', subtitle: 'Physical & Character' },
    { id: 'D9' as const, label: 'D9 (Navamsa)', subtitle: 'Spouse & Inner Strength' },
    { id: 'D3' as const, label: 'D3 (Drekkana)', subtitle: 'Siblings & Courage' },
    { id: 'D2' as const, label: 'D2 (Hora)', subtitle: 'Wealth & Prosperity' },
    { id: 'D7' as const, label: 'D7 (Saptamsa)', subtitle: 'Children & Creativity' },
    { id: 'D12' as const, label: 'D12 (Dwadasamsa)', subtitle: 'Parents & Lineage' },
    { id: 'D30' as const, label: 'D30 (Trimsamsa)', subtitle: 'Difficulties & Trials' },
  ];

  const getActiveChartData = () => {
    switch (activeVarga) {
      case 'D1': return { title: 'D1 — Birth Chart', data: data.d1Planets, center: 'Rashi' };
      case 'D9': return { title: 'D9 — Navamsa', data: data.d9Chart?.planets, center: 'D9', lagna: data.d9Chart?.ascendant?.sign };
      case 'D3': return { title: 'D3 — Drekkana', data: data.d3Chart?.planets, center: 'D3', lagna: data.d3Chart?.ascendant?.sign };
      case 'D2': return { title: 'D2 — Hora', data: data.d2Chart?.planets, center: 'D2', lagna: data.d2Chart?.ascendant?.sign };
      case 'D7': return { title: 'D7 — Saptamsa', data: data.d7Chart?.planets, center: 'D7', lagna: data.d7Chart?.ascendant?.sign };
      case 'D12': return { title: 'D12 — Dwadasamsa', data: data.d12Chart?.planets, center: 'D12', lagna: data.d12Chart?.ascendant?.sign };
      case 'D30': return { title: 'D30 — Trimsamsa', data: data.d30Chart?.planets, center: 'D30', lagna: data.d30Chart?.ascendant?.sign };
      default: return { title: 'Birth Chart', data: data.d1Planets, center: 'Rashi' };
    }
  };

  const active = getActiveChartData();

  const getPlanetsCallback = (house: number) => {
    if (!active.data) return [];
    
    if (activeVarga === 'D1') {
      return (active.data as PlanetWithHouse[])
        .filter((p: PlanetWithHouse) => (p.house || (p.houseIndex ?? 0) + 1) === house)
        .map((p: PlanetWithHouse) => (p.sanskritName || p.name).slice(0, 2) + (p.isRetrograde ? '®' : ''));
    }

    return (active.data as DivisionalPlanet[])
      .filter((p: DivisionalPlanet) => p.house === house)
      .map((p: DivisionalPlanet) => p.name.slice(0, 2));
  };

  const currentVargaGated = isVargaGated(activeVarga);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <LayoutGrid size={20} color={Colors.primary} />
        <Text style={[styles.title, { color: Colors.text }]}>Divisional Charts (Vargas)</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
        {vargas.map((v) => (
          <TouchableOpacity
            key={v.id}
            onPress={() => setActiveVarga(v.id)}
            style={[
              styles.tab,
              { backgroundColor: activeVarga === v.id ? Colors.primary : '#F3F4F6' }
            ]}
          >
            <Text style={[styles.tabText, { color: activeVarga === v.id ? '#FFF' : '#4B5563' }]}>
              {v.id}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.chartWrapper}>
        <View style={currentVargaGated ? { opacity: 0.2 } : {}}>
          <KundliChartRenderer
            title={active.title}
            centerLabel={active.center}
            getPlanets={getPlanetsCallback}
            subtitle={active.lagna ? `Lagna: ${active.lagna}` : undefined}
          />
        </View>

        {currentVargaGated && (
          <View style={styles.lockOverlay}>
            <TouchableOpacity style={styles.upgradeInline} onPress={onUpgrade}>
              <Text style={styles.upgradeInlineText}>Unlock Premium Vargas</Text>
            </TouchableOpacity>
          </View>
        )}
        
        <View style={styles.infoBox}>
          <Text style={styles.vargaSubTitle}>{vargas.find(v => v.id === activeVarga)?.subtitle}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  tabsScroll: {
    gap: 8,
    paddingBottom: 4,
    paddingHorizontal: 4,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    minWidth: 60,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '700',
  },
  chartWrapper: {
    marginTop: 16,
  },
  infoBox: {
    alignItems: 'center',
    marginTop: -8,
    paddingBottom: 8,
  },
  vargaSubTitle: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
    fontStyle: 'italic',
  },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.4)',
    borderRadius: 24,
    zIndex: 10,
  },
  upgradeInline: {
    backgroundColor: '#6B46C1',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: '#6B46C1',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  upgradeInlineText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
