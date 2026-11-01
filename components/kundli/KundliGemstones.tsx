import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Diamond, Info, Lock, ShoppingCart } from 'lucide-react-native';
import { useAppTheme, AppTheme } from '@/contexts/ThemeContext';
import { Card } from '@/components/Card';
import { GemstoneRecommendation } from '@/utils/astrology-remedies';

interface KundliGemstonesProps {
  recommendations?: GemstoneRecommendation[];
  isLocked?: boolean;
  onUpgrade?: () => void;
}

export const KundliGemstones: React.FC<KundliGemstonesProps> = ({
  recommendations,
  isLocked,
  onUpgrade,
}) => {
  const Colors = useAppTheme();
  const styles = React.useMemo(() => createStyles(Colors), [Colors]);

  if (isLocked) {
    return (
      <Card style={[styles.container, styles.lockedContainer]}>
        <View style={styles.header}>
          <Diamond size={22} color={Colors.purple} />
          <Text style={[styles.title, { color: Colors.purple }]}>Remedial Gemstones</Text>
          <Lock size={16} color={Colors.purple} />
        </View>
        <Text style={styles.lockedText}>
          Discover your &quot;Life Stone&quot; and &quot;Fortune Stone&quot; optimized for your birth chart&apos;s strength.
        </Text>
        <TouchableOpacity style={styles.upgradeBtn} onPress={onUpgrade}>
          <Text style={styles.upgradeBtnText}>Upgrade to Premium to Unlock</Text>
        </TouchableOpacity>
      </Card>
    );
  }

  if (!recommendations || recommendations.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Diamond size={22} color={Colors.primary} />
        <Text style={styles.title}>Recommended Gemstones</Text>
      </View>
      
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {recommendations.map((gem, idx) => (
          <View key={idx} style={styles.gemCard}>
            <View style={[styles.gemIcon, { backgroundColor: gem.color + '22' }]}>
              <Diamond size={32} color={gem.color} />
            </View>
            <Text style={styles.gemPurpose}>{gem.purpose} Stone</Text>
            <Text style={styles.gemName}>{gem.name} ({gem.hindiName})</Text>
            
            <View style={styles.benefitList}>
              {gem.benefits.slice(0, 2).map((b, i) => (
                <Text key={i} style={styles.benefitText}>• {b}</Text>
              ))}
            </View>

            <View style={styles.instructionBox}>
              <Text style={styles.instructionLabel}>Wear on {gem.instructions.day}</Text>
              <Text style={styles.instructionSub}>{gem.instructions.finger} Finger ({gem.instructions.metal})</Text>
            </View>

            <TouchableOpacity style={[styles.buyBtn, { backgroundColor: gem.color }]}>
              <ShoppingCart size={14} color="#FFF" />
              <Text style={styles.buyBtnText}>Buy Certified</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footerInfo}>
        <Info size={14} color={Colors.textLight} />
        <Text style={styles.footerText}>Always consult with an expert before wearing any stone.</Text>
      </View>
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
    gap: 8,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
  },
  scrollContent: {
    paddingRight: 20,
    gap: 16,
  },
  gemCard: {
    width: 200,
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  gemIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    alignSelf: 'center',
  },
  gemPurpose: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textLight,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: 4,
  },
  gemName: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  benefitList: {
    marginBottom: 16,
  },
  benefitText: {
    fontSize: 12,
    color: Colors.text,
    marginBottom: 2,
  },
  instructionBox: {
    backgroundColor: Colors.background,
    padding: 10,
    borderRadius: 12,
    marginBottom: 12,
  },
  instructionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.text,
  },
  instructionSub: {
    fontSize: 11,
    color: Colors.textLight,
    marginTop: 2,
  },
  buyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  buyBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  footerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingHorizontal: 4,
  },
  footerText: {
    fontSize: 11,
    color: Colors.textLight,
  },
  lockedContainer: {
    padding: 20,
    backgroundColor: Colors.purple + '08',
    borderColor: Colors.purple + '33',
    borderWidth: 1,
    alignItems: 'center',
  },
  lockedText: {
    fontSize: 14,
    color: Colors.textLight,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  upgradeBtn: {
    backgroundColor: Colors.purple,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  upgradeBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  }
});
