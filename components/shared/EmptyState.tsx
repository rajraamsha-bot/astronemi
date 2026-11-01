import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LucideIcon, RefreshCw } from 'lucide-react-native';
import Colors from '@/constants/colors';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  iconColor?: string;
}

export const EmptyState = React.memo(({ 
  icon: Icon, 
  title, 
  description, 
  actionLabel, 
  onAction,
  iconColor = Colors.primary 
}: EmptyStateProps) => (
  <View style={styles.container}>
    <View style={[styles.iconContainer, { backgroundColor: iconColor + '10' }]}>
      <Icon size={48} color={iconColor} />
    </View>
    <Text style={styles.title}>{title}</Text>
    <Text style={styles.description}>{description}</Text>
    {onAction && (
      <TouchableOpacity style={styles.actionBtn} onPress={onAction}>
        <RefreshCw size={18} color="#FFF" style={styles.actionIcon} />
        <Text style={styles.actionText}>{actionLabel || 'Try Again'}</Text>
      </TouchableOpacity>
    )}
  </View>
));

EmptyState.displayName = 'EmptyState';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: 'transparent',
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 32,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6B46C1',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    shadowColor: '#6B46C1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  actionIcon: { marginRight: 8 },
  actionText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
});
