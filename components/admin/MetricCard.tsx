import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Colors from '@/constants/colors';

interface MetricCardProps {
  metric: {
    id: string;
    title: string;
    value: string;
    change: string;
    changeType: 'positive' | 'negative' | 'neutral';
    icon: React.ReactNode;
  };
}

const MetricCard: React.FC<MetricCardProps> = ({ metric }) => (
  <View style={styles.metricCard}>
    <View style={styles.metricIcon}>{metric.icon}</View>
    <Text style={styles.metricTitle}>{metric.title}</Text>
    <Text style={styles.metricValue}>{metric.value}</Text>
    <Text
      style={[
        styles.metricChange,
        metric.changeType === 'positive' && styles.positiveChange,
        metric.changeType === 'negative' && styles.negativeChange,
      ]}
    >
      {metric.change}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  metricCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  metricIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  metricTitle: {
    fontSize: 12,
    color: Colors.textLight,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.text,
  },
  metricChange: {
    fontSize: 12,
    marginTop: 4,
  },
  positiveChange: {
    color: Colors.success,
  },
  negativeChange: {
    color: Colors.error,
  },
});

export default MetricCard;