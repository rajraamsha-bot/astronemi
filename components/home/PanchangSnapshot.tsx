import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAppTheme, AppTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { computePanchang } from '@/utils/hindu-calendar-engine';
import { Card } from '@/components/Card';
import { Sunrise, Sunset, Moon, Sparkles } from 'lucide-react-native';

export const PanchangSnapshot = () => {
  const Colors = useAppTheme();
  const { t } = useLanguage();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  const panchang = useMemo(() => {
    return computePanchang(new Date());
  }, []);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t('panchang.snapshot')}</Text>
      <Card variant="filled" style={styles.card} padding="lg">
        <View style={styles.row}>
          <View style={styles.item}>
            <View style={[styles.iconBox, { backgroundColor: '#FFB34120' }]}>
              <Sparkles size={20} color="#FFB341" />
            </View>
            <View>
              <Text style={styles.label}>{t('panchang.tithi')}</Text>
              <Text style={styles.value}>{panchang.tithiName}</Text>
              <Text style={styles.subvalue}>{panchang.paksha} {t('panchang.paksha')}</Text>
            </View>
          </View>
          
          <View style={styles.divider} />

          <View style={styles.item}>
            <View style={[styles.iconBox, { backgroundColor: '#8B5CF620' }]}>
              <Moon size={20} color="#8B5CF6" />
            </View>
            <View>
              <Text style={styles.label}>{t('panchang.nakshatra')}</Text>
              <Text style={styles.value}>{panchang.nakshatraName}</Text>
              <Text style={styles.subvalue}>{t('panchang.moonIn', { rashi: panchang.moonRashiName || '' })}</Text>
            </View>
          </View>
        </View>

        <View style={styles.sunRow}>
          <View style={styles.sunItem}>
            <Sunrise size={14} color={Colors.textSecondary} />
            <Text style={styles.sunText}>{t('panchang.sunrise')}: {panchang.sunRise}</Text>
          </View>
          <View style={styles.sunItem}>
            <Sunset size={14} color={Colors.textSecondary} />
            <Text style={styles.sunText}>{t('panchang.sunset')}: {panchang.sunSet}</Text>
          </View>
        </View>
      </Card>
    </View>
  );
};

const createStyles = (Colors: AppTheme) => StyleSheet.create({
  section: {
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
    paddingHorizontal: 16,
    marginBottom: 12,
    letterSpacing: -0.4,
  },
  card: {
    marginHorizontal: 16,
    backgroundColor: Colors.cardBg,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  item: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  value: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.text,
  },
  subvalue: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 1,
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.border,
    marginHorizontal: 16,
  },
  sunRow: {
    flexDirection: 'row',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    justifyContent: 'space-around',
  },
  sunItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sunText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
});
