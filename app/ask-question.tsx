import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  Send,
  HelpCircle,
  Star,
  DollarSign,
  CheckCircle,
  MessageCircle,
} from 'lucide-react-native';
import { Redirect, router } from 'expo-router';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Logger } from '@/services/logger';
import { FeatureErrorBoundary } from '@/components/FeatureErrorBoundary';
import { isAIFeaturesEnabled } from '@/config/ai-features';

interface QuestionCategory {
  id: string;
  name: string;
  icon: string;
  price: number;
  description: string;
}

// Stable AI astrologer row (migration 010) — paid questions are triaged to a
// human astrologer later, but consultations.astrologer_id is NOT NULL so the
// question must land on a real profile.
const AI_ASTROLOGER_ID = '00000000-0000-4000-a000-0000000000a1';

const questionCategories: QuestionCategory[] = [
  {
    id: '1',
    name: 'Career & Business',
    icon: 'briefcase',
    price: 199,
    description: 'Job changes, promotions, business decisions',
  },
  {
    id: '2',
    name: 'Marriage & Relationships',
    icon: 'heart',
    price: 199,
    description: 'Love life, marriage timing, compatibility',
  },
  {
    id: '3',
    name: 'Health',
    icon: 'activity',
    price: 199,
    description: 'Health concerns, recovery timeline',
  },
  {
    id: '4',
    name: 'Finance & Wealth',
    icon: 'dollar',
    price: 199,
    description: 'Investment decisions, financial growth',
  },
  {
    id: '5',
    name: 'Education',
    icon: 'book',
    price: 149,
    description: 'Course selection, exam results',
  },
  {
    id: '6',
    name: 'Property & Vehicle',
    icon: 'home',
    price: 199,
    description: 'Property purchase, vehicle buying',
  },
  {
    id: '7',
    name: 'Children',
    icon: 'baby',
    price: 199,
    description: 'Childbirth, education, future',
  },
  {
    id: '8',
    name: 'Travel & Abroad',
    icon: 'plane',
    price: 199,
    description: 'Foreign travel, settlement abroad',
  },
];

const popularQuestions = [
  'When will I get married?',
  'Will I get a government job?',
  'Is this the right time to change jobs?',
  'Will my business be successful?',
  'When will I have children?',
  'Should I buy property now?',
];

export default function AskQuestionScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<QuestionCategory | null>(null);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  useEffect(() => {
    if (!user) {
       router.replace('/login');
       return;
    }
    
    // Fetch real wallet balance
    const fetchBalance = async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('wallet_balance')
          .eq('id', user.id)
          .single();
        
        if (data) setWalletBalance(data.wallet_balance);
        if (error) Logger.error('Failed to fetch balance', error);
      } catch (err) {
        Logger.error('Balance fetch error', err);
      }
    };

    fetchBalance();
  }, [user]);

  // v1: this paid flow still points at the AI astrologer placeholder and has
  // no human triage path. Keep the screen in the repo, but block deep links.
  if (!isAIFeaturesEnabled()) {
    return <Redirect href="/(tabs)" />;
  }

  const handleSubmit = async () => {
    if (!user) {
      Alert.alert('Login Required', 'Please login to ask a question.');
      return;
    }

    if (!question.trim() || !selectedCategory) {
      Alert.alert('Error', 'Please select a category and type your question.');
      return;
    }

    if (walletBalance !== null && walletBalance < selectedCategory.price) {
      Alert.alert(
        'Insufficient Balance',
        `You need ₹${selectedCategory.price} to ask this question. Your current balance is ₹${walletBalance}.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Top Up', onPress: () => router.push('/wallet') }
        ]
      );
      return;
    }

    setLoading(true);
    try {
      // 1. Record the question FIRST as a pending consultation routed to the
      //    AI astrologer (stable id, migration 010) — triage to a human can
      //    reassign it later. Previously nothing was stored: the wallet was
      //    debited, the user was told to track the answer in /consultations,
      //    and no row ever existed there.
      const { data: consultation, error: consultError } = await supabase
        .from('consultations')
        .insert({
          user_id: user.id,
          astrologer_id: AI_ASTROLOGER_ID,
          type: 'chat',
          status: 'pending',
          price: selectedCategory.price,
          total_amount: selectedCategory.price,
          notes: `[#${selectedCategory.id} ${selectedCategory.name}] ${question.trim()}`,
        })
        .select('id')
        .single();

      if (consultError || !consultation) {
        throw new Error(consultError?.message || 'Could not record your question. You have not been charged.');
      }

      // 2. Charge the wallet. The server validates the amount against the
      //    fixed question prices (deduct-wallet), so the price below is
      //    display-consistent, not trust-relevant.
      const { data: debitResult, error: debitError } = await supabase.functions.invoke('deduct-wallet', {
        body: {
          amount: selectedCategory.price,
          source: 'question',
          description: `Expert Question: ${selectedCategory.name}`,
          referenceId: consultation.id,
        },
      });

      if (debitError || !debitResult?.success) {
        // Payment failed — cancel the just-created record so the pending
        // queue does not fill with questions that were never paid for.
        await supabase
          .from('consultations')
          .update({ status: 'cancelled', updated_at: new Date().toISOString() })
          .eq('id', consultation.id);
        throw new Error(debitError?.message || debitResult?.message || 'Payment failed. You have not been charged.');
      }

      Logger.info('Question submitted and billed successfully', {
        userId: user.id,
        consultationId: consultation.id,
        amount: selectedCategory.price,
        category: selectedCategory.name
      });

      Alert.alert(
        'Question Submitted!',
        'Your question has been received. Our expert astrologers will respond within 24 hours. You can track this in your consultations.',
        [{ text: 'Great!', onPress: () => router.push('/consultations') }]
      );
      
    } catch (err: unknown) {
      Logger.error('Question submission failed', err);
      const errorMessage = err instanceof Error ? err.message : 'Could not submit question. Please try again.';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <FeatureErrorBoundary featureName="Ask Question">
    <View style={styles.container}>
      <LinearGradient
        colors={['#00838F', '#0097A7', '#00ACC1']}
        style={[styles.header, { paddingTop: insets.top }]}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft color="#FFF" size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Ask a Question</Text>
          <View style={styles.placeholder} />
        </View>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.content}>
        {/* Wallet Balance Info */}
        <View style={styles.balanceCard}>
          <DollarSign color={Colors.primary} size={18} />
          <Text style={styles.balanceText}>
            Wallet Balance: <Text style={styles.balanceValue}>₹{walletBalance ?? '...'}</Text>
          </Text>
          <TouchableOpacity onPress={() => router.push('/wallet')}>
            <Text style={styles.topUpLink}>Top Up</Text>
          </TouchableOpacity>
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <HelpCircle color="#00838F" size={18} />
          <Text style={styles.infoText}>
            Get personalized answers to your specific questions from our expert
            astrologers. Responses within 24 hours.
          </Text>
        </View>

        {/* Step 1: Select Category */}
        <Text style={styles.sectionTitle}>Select Category</Text>
        <View style={styles.categoriesGrid}>
          {questionCategories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryCard,
                selectedCategory?.id === category.id && styles.categoryCardSelected,
              ]}
              onPress={() => {
                setSelectedCategory(category);
              }}
            >
              <View style={styles.categoryHeader}>
                <View style={styles.categoryIcon}>
                  <MessageCircle color="#00838F" size={18} />
                </View>
                {selectedCategory?.id === category.id && (
                  <CheckCircle color="#00838F" size={18} />
                )}
              </View>
              <Text style={styles.categoryName}>{category.name}</Text>
              <Text style={styles.categoryDescription} numberOfLines={2}>
                {category.description}
              </Text>
              <View style={styles.categoryPrice}>
                <Text style={styles.priceText}>₹{category.price}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Step 2: Type Question */}
        {selectedCategory && (
          <>
            <Text style={styles.sectionTitle}>Your Question</Text>
            <View style={styles.questionInputCard}>
              <TextInput
                style={styles.questionInput}
                placeholder="Type your specific question here..."
                placeholderTextColor={Colors.textLight}
                multiline
                numberOfLines={4}
                maxLength={500}
                value={question}
                onChangeText={setQuestion}
              />
              <Text style={styles.charCount}>{question.length}/500</Text>
            </View>

            {/* Popular Questions */}
            <Text style={styles.sectionTitle}>Popular Questions</Text>
            <View style={styles.popularQuestionsCard}>
              {popularQuestions.map((q, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.popularQuestionItem}
                  onPress={() => setQuestion(q)}
                >
                  <Star color="#FFC107" size={14} />
                  <Text style={styles.popularQuestionText}>{q}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                (!question.trim() || loading) && styles.submitButtonDisabled,
                { marginBottom: Math.max(insets.bottom, 24) }
              ]}
              onPress={handleSubmit}
              disabled={!question.trim() || loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <>
                  <Send color="#FFF" size={18} />
                  <Text style={styles.submitButtonText}>
                    Submit Question - ₹{selectedCategory.price}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
    </FeatureErrorBoundary>
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
  balanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
  },
  balanceText: {
    fontSize: 14,
    color: Colors.textSecondary,
    flex: 1,
  },
  balanceValue: {
    fontWeight: '700',
    color: Colors.text,
  },
  topUpLink: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#E0F7FA',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#006064',
    lineHeight: 17,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
    marginTop: 8,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  categoryCard: {
    width: '48%',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryCardSelected: {
    borderColor: '#00838F',
    borderWidth: 2,
    backgroundColor: '#E0F7FA',
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E0F7FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryName: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  categoryDescription: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginBottom: 8,
    height: 30,
  },
  categoryPrice: {
    marginTop: 4,
  },
  priceText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4CAF50',
  },
  questionInputCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  questionInput: {
    fontSize: 14,
    color: Colors.text,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 11,
    color: Colors.textLight,
    textAlign: 'right',
    marginTop: 8,
  },
  popularQuestionsCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  popularQuestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 10,
  },
  popularQuestionText: {
    fontSize: 13,
    color: Colors.text,
    flex: 1,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00838F',
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 24,
    gap: 10,
  },
  submitButtonDisabled: {
    backgroundColor: Colors.textLight,
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
  },
});
