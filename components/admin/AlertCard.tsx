import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';
import Colors from '@/constants/colors';

interface AlertCardProps {
  alert: {
    id: string;
    message: string;
    timestamp: Date | string;
    severity: 'low' | 'medium' | 'high' | 'critical';
  };
  onResolve: (alertId: string) => void;
}

const AlertCard: React.FC<AlertCardProps> = ({ alert, onResolve }) => (
  <View style={styles.alertCard}>
    <AlertTriangle
      size={20}
      color={alert.severity === 'critical' ? Colors.error : Colors.warning}
    />
    <View style={styles.alertContent}>
      <Text style={styles.alertMessage}>{alert.message}</Text>
      <Text style={styles.alertTime}>
        {new Date(alert.timestamp).toLocaleTimeString()}
      </Text>
    </View>
    <TouchableOpacity
      style={styles.resolveButton}
      onPress={() => onResolve(alert.id)}
    >
      <Text style={styles.resolveButtonText}>Resolve</Text>
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    gap: 12,
  },
  alertContent: {
    flex: 1,
  },
  alertMessage: {
    fontSize: 14,
    color: Colors.text,
  },
  alertTime: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 4,
  },
  resolveButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  resolveButtonText: {
    fontSize: 12,
    color: Colors.white,
    fontWeight: '600',
  },
});

export default AlertCard;