/**
 * TipModal — Send an in-app tip to your astrologer.
 *
 * Shows preset amounts (₹51, ₹101, ₹251, ₹501, ₹1001) plus a
 * custom-amount field. 100% of the tip goes to the astrologer.
 *
 * Usage:
 *   <TipModal
 *     visible={showTip}
 *     onClose={() => setShowTip(false)}
 *     astrologerId={a.id}
 *     astrologerName={a.name}
 *     userId={user.id}
 *     consultationId={c.id}
 *   />
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Gift, X } from 'lucide-react-native';
import { AppTheme, useAppTheme } from '@/contexts/ThemeContext';
import { useSendTip, useTipPresets } from '@/hooks/useTips';

interface Props {
  visible: boolean;
  onClose: () => void;
  userId: string;
  astrologerId: string;
  astrologerName: string;
  consultationId?: string;
  onSuccess?: (newBalance: number) => void;
}

export const TipModal: React.FC<Props> = ({
  visible,
  onClose,
  userId,
  astrologerId,
  astrologerName,
  consultationId,
  onSuccess,
}) => {
  const Colors = useAppTheme();
  const styles = React.useMemo(() => createStyles(Colors), [Colors]);
  const { presets, loading: presetsLoading } = useTipPresets();
  const { send, sending, error } = useSendTip();
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [message, setMessage] = useState('');
  const [confirmation, setConfirmation] = useState<string | null>(null);
  // Holds the auto-close timer so we can clear it when the modal hides or
  // unmounts. Without this, `onClose()` could fire on an unmounted component
  // or double-fire if the modal is reopened.
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!visible) {
      setSelectedAmount(null);
      setCustomAmount('');
      setMessage('');
      setConfirmation(null);
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    }
  }, [visible]);

  // Clear any pending auto-close timer on unmount.
  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
  }, []);

  const finalAmount = selectedAmount ?? (customAmount ? Number(customAmount) : 0);

  const handleSend = async () => {
    if (!finalAmount || finalAmount <= 0) return;
    const result = await send({
      userId,
      astrologerId,
      amountInr: finalAmount,
      consultationId,
      message: message.trim() || undefined,
    });
    if (result.success) {
      setConfirmation('Tip sent! Thank you for supporting ' + astrologerName + '.');
      onSuccess?.(result.newBalance ?? 0);
      closeTimerRef.current = setTimeout(() => {
        closeTimerRef.current = null;
        onClose();
      }, 1500);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Gift size={20} color={Colors.primary} />
              <Text style={styles.title}>Send a tip to {astrologerName}</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Close tip modal">
              <X size={22} color={Colors.textLight} />
            </Pressable>
          </View>

          <Text style={styles.subtitle}>100% goes to the astrologer. Zero platform commission.</Text>

          {presetsLoading ? (
            <ActivityIndicator color={Colors.primary} style={{ marginVertical: 16 }} />
          ) : (
            <View style={styles.presets}>
              {presets.map(p => (
                <Pressable
                  key={p.id}
                  style={[
                    styles.preset,
                    selectedAmount === p.amountInr && styles.presetSelected,
                  ]}
                  onPress={() => { setSelectedAmount(p.amountInr); setCustomAmount(''); }}
                  accessibilityRole="button"
                  accessibilityLabel={`Tip ${p.label} Rs ${p.amountInr}`}
                >
                  <Text style={styles.presetEmoji}>{p.emoji}</Text>
                  <Text style={styles.presetAmount}>&#8377;{p.amountInr}</Text>
                  <Text style={styles.presetLabel} numberOfLines={1}>{p.label}</Text>
                </Pressable>
              ))}
            </View>
          )}

          <Text style={styles.label}>Custom amount (Rs)</Text>
          <TextInput
            style={styles.input}
            value={customAmount}
            onChangeText={(t) => { setCustomAmount(t.replace(/[^0-9]/g, '')); setSelectedAmount(null); }}
            keyboardType="number-pad"
            maxLength={6}
            placeholder="e.g. 250"
            placeholderTextColor={Colors.textLight}
          />

          <Text style={styles.label}>Add a message (optional)</Text>
          <TextInput
            style={[styles.input, styles.messageInput]}
            value={message}
            onChangeText={setMessage}
            placeholder="Say something nice..."
            placeholderTextColor={Colors.textLight}
            maxLength={140}
            multiline
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {confirmation ? <Text style={styles.confirmText}>{confirmation}</Text> : null}

          <Pressable
            style={[styles.sendButton, (!finalAmount || sending) && styles.sendButtonDisabled]}
            disabled={!finalAmount || sending}
            onPress={handleSend}
            accessibilityRole="button"
            accessibilityLabel={`Send tip of Rs ${finalAmount}`}
          >
            {sending ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.sendButtonText}>
                {finalAmount > 0 ? `Send Rs ${finalAmount} tip` : 'Select an amount'}
              </Text>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (Colors: AppTheme) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.55)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: Colors.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
      paddingBottom: 32,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
    title: { fontSize: 16, fontWeight: '700', color: Colors.text, flex: 1 },
    subtitle: { fontSize: 12, color: Colors.textLight, marginBottom: 16 },
    presets: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 16,
    },
    preset: {
      flexBasis: '30%',
      flexGrow: 1,
      alignItems: 'center',
      padding: 12,
      backgroundColor: Colors.card,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: 'transparent',
    },
    presetSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
    presetEmoji: { fontSize: 20, marginBottom: 4 },
    presetAmount: { fontSize: 14, fontWeight: '700', color: Colors.text },
    presetLabel: { fontSize: 10, color: Colors.textLight, marginTop: 2 },
    label: { fontSize: 12, fontWeight: '600', color: Colors.textLight, marginBottom: 6, marginTop: 4 },
    input: {
      backgroundColor: Colors.card,
      borderRadius: 10,
      padding: 12,
      fontSize: 15,
      color: Colors.text,
      marginBottom: 12,
    },
    messageInput: { minHeight: 60, textAlignVertical: 'top' },
    errorText: { color: Colors.error, fontSize: 13, marginBottom: 8 },
    confirmText: { color: Colors.success, fontSize: 13, marginBottom: 8 },
    sendButton: {
      backgroundColor: Colors.primary,
      padding: 14,
      borderRadius: 12,
      alignItems: 'center',
      marginTop: 4,
    },
    sendButtonDisabled: { backgroundColor: Colors.textMuted },
    sendButtonText: { color: Colors.white, fontSize: 15, fontWeight: '700' },
  });

export default TipModal;
