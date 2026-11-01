import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Sparkles, Info, Lock, Flame, Shield, BookOpen, Music } from 'lucide-react-native';
import { useAppTheme, AppTheme } from '@/contexts/ThemeContext';
import { Card } from '@/components/Card';
import { calculateIshtaDevta, getLalKitabRemedies } from '@/utils/astrology-remedies';
import { KundliData } from '@/utils/kundli-generator';

interface KundliSacredRemediesProps {
  data: KundliData;
  isLocked?: boolean;
  onUpgrade?: () => void;
}

export const KundliSacredRemedies: React.FC<KundliSacredRemediesProps> = ({
  data,
  isLocked,
  onUpgrade,
}) => {
  const Colors = useAppTheme();
  const styles = React.useMemo(() => createStyles(Colors), [Colors]);

  const ishtaDevta = calculateIshtaDevta(data);
  const lalKitabRemedies = getLalKitabRemedies(data);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Flame size={24} color="#FF8F00" fill="#FF8F00" />
          <Text style={styles.title}>Sacred Remedies</Text>
        </View>
        <TouchableOpacity style={styles.infoBtn}>
          <Info size={16} color={Colors.textLight} />
        </TouchableOpacity>
      </View>

      <Text style={styles.subtitle}>Spiritual paths and actions to balance your karma:</Text>

      {/* Ishta Devta Card */}
      <Card style={styles.ishtaCard}>
        <View style={styles.ishtaHeader}>
          <View style={styles.ishtaBadge}>
            <Text style={styles.ishtaBadgeText}>YOUR ISHTA DEVTA</Text>
          </View>
          <Sparkles size={20} color={Colors.gold} />
        </View>
        
        <Text style={styles.deityName}>{ishtaDevta.deity}</Text>
        <Text style={styles.deitySignificance}>{ishtaDevta.significance}</Text>

        <View style={styles.mantraBox}>
          <View style={styles.mantraHeader}>
            <Music size={14} color="#FFF" />
            <Text style={styles.mantraLabel}>SACRED MANTRA</Text>
          </View>
          <Text style={styles.mantraText}>{ishtaDevta.mantra}</Text>
          <Text style={styles.mantraCount}>Chant daily - 108 times</Text>
        </View>

        <View style={styles.ishtaSource}>
          <Text style={styles.sourceText}>Calculated via Jaimini Jivanmuktamsana method.</Text>
        </View>

        {/* Path to Deeksha (Initiation) */}
        <View style={styles.deekshaSection}>
           <View style={styles.deekshaHeader}>
              <Flame size={16} color="#FF8F00" />
              <Text style={styles.deekshaTitle}>PATH TO DEEKSHA (INITIATION)</Text>
           </View>
           <Text style={styles.deekshaDesc}>Formalize your spiritual connection through traditional lineages:</Text>
           <View style={styles.lineageGrid}>
              {ishtaDevta.lineages.map((lineage, idx) => (
                <View key={idx} style={styles.lineageChip}>
                   <Text style={styles.lineageText}>{lineage}</Text>
                </View>
              ))}
           </View>
           <TouchableOpacity style={styles.guruConsultBtn}>
              <Text style={styles.guruConsultText}>Consult a Guru for Initiation Path</Text>
           </TouchableOpacity>
        </View>
      </Card>

      {/* Lal Kitab Section */}
      <View style={styles.sectionHeader}>
        <BookOpen size={18} color={Colors.text} />
        <Text style={styles.sectionTitle}>Lal Kitab Practical Remedies</Text>
      </View>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        contentContainerStyle={styles.remedyScroll}
      >
        {lalKitabRemedies.map((remedy, idx) => (
          <View key={idx} style={styles.remedyCard}>
             <View style={styles.remedyIcon}>
                <Shield size={16} color="#FFF" />
             </View>
             <Text style={styles.remedyText}>{remedy}</Text>
          </View>
        ))}
        
        {isLocked && (
          <TouchableOpacity style={[styles.remedyCard, styles.lockedCard]} onPress={onUpgrade}>
            <Lock size={20} color={Colors.purple} />
            <Text style={styles.lockedText}>Upgrade to Gold for 10+ Detailed Remedies</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Weekly Pooja Guidance */}
      <View style={styles.poojaBox}>
        <Text style={styles.poojaTitle}>Upcoming Sacred Action</Text>
        <Text style={styles.poojaDesc}>Perform a specialized Saturn Pooja this Saturday for career stability.</Text>
        <TouchableOpacity style={styles.poojaBtn}>
          <Text style={styles.poojaBtnText}>View Ritual Details</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const createStyles = (Colors: AppTheme) => StyleSheet.create({
  container: {
    marginBottom: 32,
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
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text,
  },
  infoBtn: {
    padding: 4,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textLight,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  ishtaCard: {
    marginHorizontal: 20,
    padding: 24,
    borderRadius: 28,
    backgroundColor: '#FFF8E1',
    borderWidth: 1,
    borderColor: '#FFD54F',
    marginBottom: 24,
  },
  ishtaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  ishtaBadge: {
    backgroundColor: '#FF8F00',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  ishtaBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 1,
  },
  deityName: {
    fontSize: 28,
    fontWeight: '900',
    color: '#4B3F72',
    marginBottom: 4,
  },
  deitySignificance: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
    fontWeight: '600',
  },
  mantraBox: {
    backgroundColor: '#4B3F72',
    padding: 16,
    borderRadius: 20,
    gap: 8,
  },
  mantraHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mantraLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFF',
    opacity: 0.8,
  },
  mantraText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFD54F',
    lineHeight: 24,
  },
  mantraCount: {
    fontSize: 11,
    color: '#FFF',
    opacity: 0.6,
    fontStyle: 'italic',
  },
  ishtaSource: {
    marginTop: 16,
    opacity: 0.5,
  },
  sourceText: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
  },
  deekshaSection: {
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  deekshaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  deekshaTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FF8F00',
    letterSpacing: 1,
  },
  deekshaDesc: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
    marginBottom: 16,
  },
  lineageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  lineageChip: {
    backgroundColor: '#FFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FFD54F',
  },
  lineageText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4B3F72',
  },
  guruConsultBtn: {
    backgroundColor: '#4B3F72',
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
  },
  guruConsultText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFF',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.text,
  },
  remedyScroll: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  remedyCard: {
    width: 200,
    padding: 16,
    backgroundColor: Colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: 12,
  },
  remedyIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#4B3F72',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  remedyText: {
    fontSize: 13,
    color: Colors.text,
    lineHeight: 20,
    fontWeight: '600',
  },
  lockedCard: {
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    borderStyle: 'dashed',
  },
  lockedText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.purple,
    textAlign: 'center',
  },
  poojaBox: {
    marginHorizontal: 20,
    padding: 20,
    backgroundColor: Colors.primary + '10',
    borderRadius: 20,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  poojaTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.primary,
    marginBottom: 4,
  },
  poojaDesc: {
    fontSize: 13,
    color: Colors.text,
    lineHeight: 18,
    marginBottom: 12,
  },
  poojaBtn: {
    alignSelf: 'flex-start',
  },
  poojaBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.primary,
    textDecorationLine: 'underline',
  }
});
