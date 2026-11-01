import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Star, Moon, Sun, Sparkles, Heart } from 'lucide-react-native';
import { KundliData } from '@/utils/kundli-generator';

const { width } = Dimensions.get('window');

interface ViralChartCardProps {
  data: KundliData;
  isMatch?: boolean;
  matchScore?: number;
}

export const ViralChartCard: React.FC<ViralChartCardProps> = ({
  data,
  isMatch,
  matchScore,
}) => {
  return (
    <View style={styles.outerContainer}>
      <LinearGradient colors={['#9C27B0', '#E91E63']} style={styles.container}>
        {/* Top Floating Icons */}
        <View style={styles.floatingIcons}>
          <Star size={16} color="rgba(255,255,255,0.3)" style={{ top: 20, left: 40 }} />
          <Star size={24} color="rgba(255,255,255,0.2)" style={{ top: 100, right: 30 }} />
          <Sparkles size={20} color="rgba(255,255,255,0.4)" style={{ bottom: 150, left: 60 }} />
        </View>

        {/* Branding */}
        <View style={styles.header}>
          <Sparkles size={24} color="#FFF" />
          <Text style={styles.title}>AstroNemi</Text>
        </View>

        <View style={styles.content}>
          <Text style={styles.tagline}>WITWRITTEN IN THE STARS</Text>
          
          <View style={styles.mainSignRow}>
            <View style={styles.signItem}>
              <Sun size={32} color="#FFF" />
              <Text style={styles.signLabel}>SUN SIGN</Text>
              <Text style={styles.signName}>{data.planets.find(p => p.name === 'Sun')?.sign || 'Aries'}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.signItem}>
              <Moon size={32} color="#FFF" />
              <Text style={styles.signLabel}>MOON SIGN</Text>
              <Text style={styles.signName}>{data.planets.find(p => p.name === 'Moon')?.sign || 'Taurus'}</Text>
            </View>
          </View>

          {isMatch ? (
            <View style={styles.matchBox}>
              <Heart size={24} color="#FFF" fill="#FFF" />
              <Text style={styles.matchText}>{matchScore}% Soulmate Synergy</Text>
            </View>
          ) : (
            <View style={styles.destinyBox}>
              <Text style={styles.destinyText}>Ascendant: {data.ascendant.sign}</Text>
              <Text style={styles.destinySub}>Predicting a period of high transformation.</Text>
            </View>
          )}
        </View>

        {/* Professional Watermark */}
        <View style={styles.footer}>
          <View style={styles.footerLine} />
          <Text style={styles.watermark}>WWW.ASTRONEMI.APP | @ASTRONEMI</Text>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    padding: 10,
    backgroundColor: '#FFF', // Padding to simulate a border or clean edge
  },
  container: {
    width: width - 40,
    aspectRatio: 0.8, // Ideal for Instagram
    borderRadius: 30,
    padding: 40,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  floatingIcons: {
    ...StyleSheet.absoluteFillObject,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  content: {
    alignItems: 'center',
  },
  tagline: {
    fontSize: 14,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 4,
    marginBottom: 40,
  },
  mainSignRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 30,
    marginBottom: 60,
  },
  signItem: {
    alignItems: 'center',
    gap: 10,
  },
  signLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 1,
  },
  signName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFF',
  },
  divider: {
    width: 1,
    height: 60,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  matchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  matchText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFF',
  },
  destinyBox: {
    alignItems: 'center',
    gap: 6,
  },
  destinyText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFF',
  },
  destinySub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontStyle: 'italic',
  },
  footer: {
    alignItems: 'center',
    gap: 16,
  },
  footerLine: {
    width: 60,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
  },
  watermark: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 2,
  }
});
