import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  Gift,
  Calendar,
  User,
  MessageSquare,
  Star,
  CheckCircle,
  Sparkles,
} from 'lucide-react-native';
import { router } from 'expo-router';
import Colors from '@/constants/colors';

interface GiftCard {
  id: string;
  name: string;
  amount: number;
  image: string;
  color: string;
  popular: boolean;
}

const giftCards: GiftCard[] = [
  { id: '1', name: 'Basic', amount: 500, image: '', color: '#4CAF50', popular: false },
  { id: '2', name: 'Silver', amount: 1000, image: '', color: '#9E9E9E', popular: true },
  { id: '3', name: 'Gold', amount: 2000, image: '', color: '#FFC107', popular: true },
  { id: '4', name: 'Platinum', amount: 5000, image: '', color: '#03A9F4', popular: false },
  { id: '5', name: 'Diamond', amount: 10000, image: '', color: '#9C27B0', popular: false },
];

export default function GiftCardsScreen() {
  const [selectedCard, setSelectedCard] = useState<GiftCard | null>(null);
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [senderName, setSenderName] = useState('');
  const [message, setMessage] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [step, setStep] = useState(1);

  const handlePurchase = () => {
    if (selectedCard && recipientName && recipientEmail) {
      // In a real app, this would process payment
      router.push('/orders');
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#E91E63', '#F06292', '#F48FB1']}
        style={styles.header}
      >
        <SafeAreaView edges={['top']}>
          <View style={styles.headerContent}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <ArrowLeft color="#FFF" size={24} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Gift Cards</Text>
            <View style={styles.placeholder} />
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.content}>
        {/* Info Card */}
        <View style={styles.infoCard}>
          <Gift color="#E91E63" size={20} />
          <Text style={styles.infoText}>
            Give the gift of cosmic wisdom! Our gift cards can be used for
            consultations, reports, and premium features.
          </Text>
        </View>

        {/* Step Indicator */}
        <View style={styles.stepIndicator}>
          <View style={[styles.stepItem, step >= 1 && styles.stepItemActive]}>
            <View style={[styles.stepCircle, step >= 1 && styles.stepCircleActive]}>
              <Text style={[styles.stepNumber, step >= 1 && styles.stepNumberActive]}>1</Text>
            </View>
            <Text style={[styles.stepLabel, step >= 1 && styles.stepLabelActive]}>Select Card</Text>
          </View>
          <View style={styles.stepLine} />
          <View style={[styles.stepItem, step >= 2 && styles.stepItemActive]}>
            <View style={[styles.stepCircle, step >= 2 && styles.stepCircleActive]}>
              <Text style={[styles.stepNumber, step >= 2 && styles.stepNumberActive]}>2</Text>
            </View>
            <Text style={[styles.stepLabel, step >= 2 && styles.stepLabelActive]}>Details</Text>
          </View>
          <View style={styles.stepLine} />
          <View style={[styles.stepItem, step >= 3 && styles.stepItemActive]}>
            <View style={[styles.stepCircle, step >= 3 && styles.stepCircleActive]}>
              <Text style={[styles.stepNumber, step >= 3 && styles.stepNumberActive]}>3</Text>
            </View>
            <Text style={[styles.stepLabel, step >= 3 && styles.stepLabelActive]}>Confirm</Text>
          </View>
        </View>

        {/* Step 1: Select Card */}
        {step === 1 && (
          <>
            <Text style={styles.sectionTitle}>Choose Gift Card Value</Text>
            <View style={styles.cardsGrid}>
              {giftCards.map((card) => (
                <TouchableOpacity
                  key={card.id}
                  style={[
                    styles.cardItem,
                    selectedCard?.id === card.id && styles.cardItemSelected,
                  ]}
                  onPress={() => setSelectedCard(card)}
                >
                  {card.popular && (
                    <View style={styles.popularBadge}>
                      <Star color="#FFF" size={10} fill="#FFF" />
                      <Text style={styles.popularText}>Popular</Text>
                    </View>
                  )}
                  <View style={[styles.cardIcon, { backgroundColor: card.color + '20' }]}>
                    <Gift color={card.color} size={28} />
                  </View>
                  <Text style={styles.cardName}>{card.name}</Text>
                  <Text style={styles.cardAmount}> {card.amount}</Text>
                  {selectedCard?.id === card.id && (
                    <View style={styles.selectedCheck}>
                      <CheckCircle color="#E91E63" size={20} />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={[styles.nextButton, !selectedCard && styles.nextButtonDisabled]}
              onPress={() => selectedCard && setStep(2)}
              disabled={!selectedCard}
            >
              <Text style={styles.nextButtonText}>Continue</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Step 2: Enter Details */}
        {step === 2 && (
          <>
            <Text style={styles.sectionTitle}>Recipient Details</Text>
            <View style={styles.formCard}>
              <View style={styles.inputGroup}>
                <User color={Colors.textLight} size={18} />
                <TextInput
                  style={styles.input}
                  placeholder="Recipient Name"
                  placeholderTextColor={Colors.textLight}
                  value={recipientName}
                  onChangeText={setRecipientName}
                />
              </View>
              <View style={styles.inputGroup}>
                <MessageSquare color={Colors.textLight} size={18} />
                <TextInput
                  style={styles.input}
                  placeholder="Recipient Email"
                  placeholderTextColor={Colors.textLight}
                  value={recipientEmail}
                  onChangeText={setRecipientEmail}
                  keyboardType="email-address"
                />
              </View>
              <View style={styles.inputGroup}>
                <User color={Colors.textLight} size={18} />
                <TextInput
                  style={styles.input}
                  placeholder="Your Name (Sender)"
                  placeholderTextColor={Colors.textLight}
                  value={senderName}
                  onChangeText={setSenderName}
                />
              </View>
              <View style={styles.inputGroup}>
                <Calendar color={Colors.textLight} size={18} />
                <TextInput
                  style={styles.input}
                  placeholder="Delivery Date (Optional)"
                  placeholderTextColor={Colors.textLight}
                  value={deliveryDate}
                  onChangeText={setDeliveryDate}
                />
              </View>
              <View style={styles.inputGroup}>
                <MessageSquare color={Colors.textLight} size={18} />
                <TextInput
                  style={[styles.input, styles.messageInput]}
                  placeholder="Personal Message (Optional)"
                  placeholderTextColor={Colors.textLight}
                  value={message}
                  onChangeText={setMessage}
                  multiline
                  numberOfLines={3}
                />
              </View>
            </View>
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.backActionButton}
                onPress={() => setStep(1)}
              >
                <Text style={styles.backActionButtonText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.nextButton, (!recipientName || !recipientEmail) && styles.nextButtonDisabled]}
                onPress={() => (recipientName && recipientEmail) && setStep(3)}
                disabled={!recipientName || !recipientEmail}
              >
                <Text style={styles.nextButtonText}>Continue</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Step 3: Confirm */}
        {step === 3 && selectedCard && (
          <>
            <Text style={styles.sectionTitle}>Review & Purchase</Text>
            <View style={styles.previewCard}>
              <LinearGradient
                colors={['#E91E63', '#F06292']}
                style={styles.giftCardPreview}
              >
                <View style={styles.previewHeader}>
                  <Sparkles color="#FFF" size={24} />
                  <Text style={styles.previewTitle}>AstroNemi</Text>
                </View>
                <Text style={styles.previewAmount}> {selectedCard.amount}</Text>
                <Text style={styles.previewLabel}>Gift Card</Text>
                <View style={styles.previewFooter}>
                  <Text style={styles.previewTo}>To: {recipientName}</Text>
                  <Text style={styles.previewFrom}>From: {senderName || 'Anonymous'}</Text>
                </View>
              </LinearGradient>
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Order Summary</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Gift Card</Text>
                <Text style={styles.summaryValue}>{selectedCard.name} ( {selectedCard.amount})</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Recipient</Text>
                <Text style={styles.summaryValue}>{recipientName}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Delivery</Text>
                <Text style={styles.summaryValue}>{deliveryDate || 'Instant'}</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabelTotal}>Total</Text>
                <Text style={styles.summaryValueTotal}> {selectedCard.amount}</Text>
              </View>
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.backActionButton}
                onPress={() => setStep(2)}
              >
                <Text style={styles.backActionButtonText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.purchaseButton}
                onPress={handlePurchase}
              >
                <Gift color="#FFF" size={18} />
                <Text style={styles.purchaseButtonText}>Purchase Gift Card</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Benefits */}
        <Text style={styles.sectionTitle}>Gift Card Benefits</Text>
        <View style={styles.benefitsCard}>
          <View style={styles.benefitItem}>
            <CheckCircle color="#4CAF50" size={16} />
            <Text style={styles.benefitText}>Never expires</Text>
          </View>
          <View style={styles.benefitItem}>
            <CheckCircle color="#4CAF50" size={16} />
            <Text style={styles.benefitText}>Instant delivery</Text>
          </View>
          <View style={styles.benefitItem}>
            <CheckCircle color="#4CAF50" size={16} />
            <Text style={styles.benefitText}>Use for any service</Text>
          </View>
          <View style={styles.benefitItem}>
            <CheckCircle color="#4CAF50" size={16} />
            <Text style={styles.benefitText}>Personalized message</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingBottom: 12,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
  },
  placeholder: {
    width: 40,
  },
  content: {
    padding: 16,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FCE4EC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#C2185B',
    lineHeight: 17,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  stepItem: {
    alignItems: 'center',
  },
  stepItemActive: {},
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  stepCircleActive: {
    backgroundColor: '#E91E63',
    borderColor: '#E91E63',
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textLight,
  },
  stepNumberActive: {
    color: '#FFF',
  },
  stepLabel: {
    fontSize: 11,
    color: Colors.textLight,
  },
  stepLabelActive: {
    color: '#E91E63',
    fontWeight: '500',
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: Colors.border,
    marginHorizontal: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
    marginTop: 8,
  },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  cardItem: {
    width: '47%',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    position: 'relative',
  },
  cardItemSelected: {
    borderColor: '#E91E63',
    borderWidth: 2,
  },
  popularBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF9800',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 2,
  },
  popularText: {
    fontSize: 9,
    color: '#FFF',
    fontWeight: '500',
  },
  cardIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  cardName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  cardAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#E91E63',
  },
  selectedCheck: {
    position: 'absolute',
    bottom: 8,
    right: 8,
  },
  formCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
    gap: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: Colors.text,
  },
  messageInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  backActionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  backActionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },
  nextButton: {
    flex: 2,
    backgroundColor: '#E91E63',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  nextButtonDisabled: {
    backgroundColor: Colors.textLight,
  },
  nextButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  previewCard: {
    marginBottom: 16,
  },
  giftCardPreview: {
    borderRadius: 16,
    padding: 20,
    minHeight: 180,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  previewAmount: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 4,
  },
  previewLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 20,
  },
  previewFooter: {
    marginTop: 'auto',
  },
  previewTo: {
    fontSize: 13,
    color: '#FFF',
    marginBottom: 2,
  },
  previewFrom: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  summaryCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  summaryValue: {
    fontSize: 13,
    color: Colors.text,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 10,
  },
  summaryLabelTotal: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  summaryValueTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#E91E63',
  },
  purchaseButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E91E63',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  purchaseButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  benefitsCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  benefitText: {
    fontSize: 13,
    color: Colors.text,
  },
});
