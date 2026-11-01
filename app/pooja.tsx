import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Sparkles, Star, Flame, Clock, Calendar, CheckCircle, Moon, Sun, ShieldAlert } from 'lucide-react-native';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import { openCheckout } from '@/services/payment';
import { useAuth } from '@/contexts/AuthContext';
import { Logger } from '@/services/logger';

const poojaCategories = [
  { id: '1', title: 'Rahu Shanti', icon: Sparkles, color: '#E91E63', price: '₹2100', amount: 2100, duration: '2 Hours', benefits: ['Mano-shanti', 'Career Growth', 'Remove Obstacles'] },
  { id: '2', title: 'Navgrah Shanti', icon: Star, color: '#9C27B0', price: '₹5100', amount: 5100, duration: '3 Hours', benefits: ['Planetary Balance', 'Health', 'Prosperity'] },
  { id: '3', title: 'Mangal Dosh', icon: Flame, color: '#F44336', price: '₹3100', amount: 3100, duration: '2.5 Hours', benefits: ['Marriage Prospects', 'Reduce Anger', 'Stability'] },
  { id: '4', title: 'Kaal Sarp Dosh', icon: Clock, color: '#3F51B5', price: '₹4100', amount: 4100, duration: '4 Hours', benefits: ['Success in Life', 'Financial Stability', 'Mental Peace'] },
  { id: '5', title: 'Pitr Dosh Nivaran', icon: ShieldAlert, color: '#795548', price: '₹5500', amount: 5500, duration: '4.5 Hours', benefits: ['Ancestral Blessings', 'Family Harmony', 'Growth in Business'] },
  { id: '6', title: 'Shani Sade Sati Shanti', icon: Star, color: '#607D8B', price: '₹4500', amount: 4500, duration: '3.5 Hours', benefits: ['Relief from Hardships', 'Career Progress', 'Mental Peace'] },
  { id: '7', title: 'Surya (Sun) Shanti', icon: Sun, color: '#FF9800', price: '₹2500', amount: 2500, duration: '2 Hours', benefits: ['Confidence', 'Leadership Skills', 'Government Approvals'] },
  { id: '8', title: 'Chandra (Moon) Shanti', icon: Moon, color: '#00BCD4', price: '₹2500', amount: 2500, duration: '2 Hours', benefits: ['Emotional Stability', 'Peace of Mind', 'Good Health'] },
  { id: '9', title: 'Guru Chandal Dosh', icon: Sparkles, color: '#FFC107', price: '₹3500', amount: 3500, duration: '3 Hours', benefits: ['Educational Success', 'Spiritual Growth', 'Wisdom'] },
  { id: '10', title: 'Satyanarayan Katha', icon: Calendar, color: '#4CAF50', price: '₹1100', amount: 1100, duration: '1.5 Hours', benefits: ['Family Well-being', 'Positivity', 'Good Luck'] },
];

export default function PoojaScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const Colors = useAppTheme();
  const { user } = useAuth();
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleBookNow = async (pooja: typeof poojaCategories[0]) => {
    if (!user) {
      Alert.alert(
        '🔐 Login Required',
        'Please login to book a pooja.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Login', onPress: () => router.push('/login') },
        ]
      );
      return;
    }

    setProcessingId(pooja.id);
    try {
      const result = await openCheckout(
        'razorpay',
        {
          amount: pooja.amount * 100, // Convert INR to paise for Razorpay
          currency: 'INR',
          receipt: `pooja_${pooja.id}_${Date.now()}`,
          notes: {
            type: 'pooja_booking',
            pooja_id: pooja.id,
            pooja_name: pooja.title,
            user_id: user.id,
          },
          description: `Payment for ${pooja.title}`,
        }
      );

      if (result.success) {
        Alert.alert(
          t('payment.bookingConfirmed'),
          t('payment.bookingSuccessMsg', { service: pooja.title })
        );
      } else {
        Alert.alert(t('payment.failed'), result.error || t('payment.tryAgain'));
      }
    } catch (error) {
      Logger.error('Pooja booking error:', error);
      Alert.alert(t('common.error'), t('payment.paymentError'));
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: Colors.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: Colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: Colors.text }]}>E-Pooja Services</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.infoBanner}>
          <Text style={styles.infoText}>Book a specialized online pooja performed by verified pandits. Includes sankalp with your name & gotra.</Text>
        </View>

        {poojaCategories.map((pooja) => (
          <View key={pooja.id} style={[styles.poojaCard, { backgroundColor: Colors.card, borderColor: Colors.border }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconContainer, { backgroundColor: pooja.color + '15' }]}>
                <pooja.icon size={28} color={pooja.color} />
              </View>
              <View style={styles.titleContainer}>
                <Text style={[styles.poojaTitle, { color: Colors.text }]}>{pooja.title}</Text>
                <Text style={[styles.poojaDuration, { color: Colors.textLight }]}><Clock size={12} color={Colors.textLight} /> {pooja.duration}</Text>
              </View>
              <Text style={[styles.poojaPrice, { color: Colors.primary }]}>{pooja.price}</Text>
            </View>

            <View style={[styles.benefitsContainer, { borderTopColor: Colors.border }]}>
              {pooja.benefits.map((benefit, index) => (
                <View key={index} style={styles.benefitRow}>
                  <CheckCircle size={14} color="#4CAF50" />
                  <Text style={[styles.benefitText, { color: Colors.text }]}>{benefit}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity 
              style={[
                styles.bookButton, 
                { backgroundColor: Colors.primary },
                processingId === pooja.id && { opacity: 0.7 }
              ]}
              onPress={() => handleBookNow(pooja)}
              disabled={processingId === pooja.id}
            >
              {processingId === pooja.id ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={styles.bookButtonText}>Book Now</Text>
              )}
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  infoBanner: {
    backgroundColor: '#FFF3E0',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  infoText: {
    color: '#E65100',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  poojaCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  titleContainer: {
    flex: 1,
  },
  poojaTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  poojaDuration: {
    fontSize: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  poojaPrice: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  benefitsContainer: {
    borderTopWidth: 1,
    paddingTop: 12,
    marginBottom: 16,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  benefitText: {
    marginLeft: 8,
    fontSize: 14,
  },
  bookButton: {
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  bookButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
