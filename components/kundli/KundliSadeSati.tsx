import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Shield, AlertTriangle, CheckCircle2, Lock, ArrowRight, ShieldCheck } from 'lucide-react-native';
import { useAppTheme, AppTheme } from '@/contexts/ThemeContext';
import { Card } from '@/components/Card';
import { SadeSatiAnalysis } from '@/utils/transit-engine';

interface KundliSadeSatiProps {
  analysis?: SadeSatiAnalysis;
  isLocked?: boolean;
  onUpgrade?: () => void;
}

export const KundliSadeSati: React.FC<KundliSadeSatiProps> = ({
  analysis,
  isLocked,
  onUpgrade,
}) => {
  const Colors = useAppTheme();
  const styles = React.useMemo(() => createStyles(Colors), [Colors]);

  const PhaseItem = ({ label, active, done }: PhaseItemProps) => (
    <View style={styles.phaseItem}>
      <View style={[
        styles.phaseCircle,
        active && styles.activeCircle,
        done && styles.doneCircle
      ]}>
        {done && <CheckCircle2 size={12} color="#FFF" />}
      </View>
      <Text style={[styles.phaseLabel, active && styles.activeLabel]}>{label}</Text>
    </View>
  );

  if (!analysis) return null;

  const { isActive, currentPhase, intensity, overallEffect } = analysis;

  return (
    <Card style={[styles.container, !isActive && styles.inactiveContainer]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Shield size={22} color={isActive ? '#4527A0' : Colors.success} />
          <Text style={styles.title}>Sade Sati Report</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: isActive ? '#FFE0E0' : '#E8F5E9' }]}>
          <Text style={[styles.statusText, { color: isActive ? '#C62828' : '#2E7D32' }]}>
            {isActive ? 'ACTIVE' : 'NOT ACTIVE'}
          </Text>
        </View>
      </View>

      <Text style={styles.summaryText}>{overallEffect}</Text>

      {isActive ? (
        <View style={styles.activeContent}>
          {/* Visual 3-Phase Indicator */}
          <View style={styles.phasesContainer}>
            <PhaseItem label="Rising" active={currentPhase.phase === 'first'} done={false} />
            <PhaseItem label="Peak" active={currentPhase.phase === 'second'} done={currentPhase.phase === 'third'} />
            <PhaseItem label="Setting" active={currentPhase.phase === 'third'} done={false} />
          </View>

          <View style={styles.insightBox}>
            <AlertTriangle size={20} color="#C62828" />
            <View style={styles.insightTextContent}>
              <Text style={styles.insightTitle}>{currentPhase.phase.toUpperCase()} PHASE INTENSITY: {intensity.toUpperCase()}</Text>
              <Text style={styles.insightDesc}>{currentPhase.description}</Text>
            </View>
          </View>

          {isLocked ? (
            <TouchableOpacity style={styles.lockedRemedies} onPress={onUpgrade}>
              <View style={styles.lockIconBox}>
                <Lock size={16} color="#FFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.lockedTitle}>Unlock Protective Remedies</Text>
                <Text style={styles.lockedSub}>Get specific rituals & mantras to mitigate Saturn&apos;s impact.</Text>
              </View>
              <ArrowRight size={20} color={Colors.textLight} />
            </TouchableOpacity>
          ) : (
            <View style={styles.remedySection}>
              <Text style={styles.remedyTitle}>Protective Measures</Text>
              {currentPhase.remedies.map((remedy, idx) => (
                <View key={idx} style={styles.remedyRow}>
                  <ShieldCheck size={16} color={Colors.primary} />
                  <Text style={styles.remedyText}>{remedy}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      ) : (
        <View style={styles.inactiveContent}>
          <CheckCircle2 size={40} color={Colors.success} style={{ marginBottom: 16 }} />
          <Text style={styles.safeTitle}>You are in a period of protection.</Text>
          <Text style={styles.safeDesc}>Saturn is not transiting your moon sign. This is a good time to build wealth and focus on long-term stability.</Text>
        </View>
      )}

      <View style={styles.footerInfo}>
        <Text style={styles.footerText}>Calculation based on Sidereal Saturn transits (7.5 years total cycle).</Text>
      </View>
    </Card>
  );
};

interface PhaseItemProps {
  label: string;
  active: boolean;
  done: boolean;
}

const createStyles = (Colors: AppTheme) => StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 24,
    padding: 20,
    borderRadius: 24,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: '#4527A033',
  },
  inactiveContainer: {
    borderColor: Colors.success + '33',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
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
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  summaryText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
    marginBottom: 20,
  },
  activeContent: {
    gap: 20,
  },
  phasesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: Colors.background,
    padding: 16,
    borderRadius: 16,
    marginBottom: 10,
  },
  phaseItem: {
    alignItems: 'center',
    gap: 6,
  },
  phaseCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeCircle: {
    borderColor: '#4527A0',
    backgroundColor: '#4527A0',
    transform: [{ scale: 1.2 }],
  },
  doneCircle: {
    borderColor: Colors.success,
    backgroundColor: Colors.success,
  },
  phaseLine: {
    flex: 1,
    height: 2,
    backgroundColor: Colors.border,
    marginHorizontal: -20,
    marginTop: -20,
  },
  phaseLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textLight,
  },
  activeLabel: {
    color: '#4527A0',
  },
  insightBox: {
    flexDirection: 'row',
    backgroundColor: '#FFF5F5',
    padding: 16,
    borderRadius: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#FFDADA',
  },
  insightTextContent: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#C62828',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  insightDesc: {
    fontSize: 13,
    color: '#333',
    lineHeight: 18,
  },
  lockedRemedies: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: 16,
    borderRadius: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  lockIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockedTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.text,
  },
  lockedSub: {
    fontSize: 11,
    color: Colors.textLight,
    marginTop: 2,
  },
  remedySection: {
    gap: 12,
  },
  remedyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.text,
  },
  remedyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.background,
    padding: 12,
    borderRadius: 12,
  },
  remedyText: {
    fontSize: 13,
    color: Colors.text,
    flex: 1,
  },
  inactiveContent: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  safeTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.success,
    marginBottom: 8,
  },
  safeDesc: {
    fontSize: 13,
    color: Colors.textLight,
    textAlign: 'center',
    lineHeight: 18,
  },
  footerInfo: {
    marginTop: 20,
    opacity: 0.5,
  },
  footerText: {
    fontSize: 10,
    color: Colors.textLight,
    textAlign: 'center',
  }
});
