/**
 * DetailModal Component
 * 
 * Reusable modal component for displaying item details
 * Used across: vastu, festivals, dreams, lal-kitab, muhurat, courses, etc.
 */

import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { X } from 'lucide-react-native';
import Colors from '@/constants/colors';

export interface DetailModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function DetailModal({
  visible,
  onClose,
  title,
  children,
}: DetailModalProps) {
  return (
    <Modal
      visible={visible}
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      animationType="slide"
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
          >
            <X size={24} color={Colors.text} />
          </TouchableOpacity>
        </View>
        
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.white,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
  },
  closeButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: Colors.cardBg,
  },
  content: {
    flex: 1,
    padding: 16,
  },
});

export default DetailModal;
