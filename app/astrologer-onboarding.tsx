import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import {
  ArrowLeft,
  CheckCircle,
  CreditCard,
  User,
  Star,
  UploadCloud,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { AstrologerOnboardingService } from '@/services/astrologer-onboarding';

const STEPS = [
  { id: 'profile', title: 'Profile details', icon: User },
  { id: 'expertise', title: 'Expertise', icon: Star },
  { id: 'skills', title: 'Skills Test', icon: CheckCircle },
  { id: 'kyc', title: 'KYC & ID', icon: ShieldCheck },
  { id: 'bank', title: 'Payout details', icon: CreditCard },
];

export default function AstrologerOnboardingScreen() {
  const [currentStep, setCurrentStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Form Data
  const [name, setName] = useState('');
  const [experience, setExperience] = useState('');
  const [languages, setLanguages] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [upiId, setUpiId] = useState('');
  const [chatRate, setChatRate] = useState('');
  const [callRate, setCallRate] = useState('');
  const [videoRate, setVideoRate] = useState('');

  // Skills Test
  const testQuestions = useMemo(() => AstrologerOnboardingService.getSkillsTestQuestions(10), []);
  const [testAnswers, setTestAnswers] = useState<Record<string, number>>({});
  const [testResult, setTestResult] = useState<{ passed: boolean; score: number } | null>(null);

  const nextStep = () => {
    if (currentStep === 2 && !testResult?.passed) {
      // Skills test step - must pass before continuing
      Alert.alert('Complete Skills Test', 'Please answer all questions and submit the test.');
      return;
    }
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((curr) => curr + 1);
    } else {
      submitForm();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep((curr) => curr - 1);
    } else {
      router.back();
    }
  };

  const submitTest = async () => {
    if (Object.keys(testAnswers).length < testQuestions.length) {
      Alert.alert('Incomplete', 'Please answer all questions before submitting.');
      return;
    }
    // Mock onboarding ID for demo - in production this comes from createOnboarding
    const result = await AstrologerOnboardingService.submitSkillsTest('onboard-demo', testAnswers);
    if (result.success && result.result) {
      setTestResult({ passed: result.result.passed, score: result.result.score });
      Alert.alert(
        result.result.passed ? 'Test Passed!' : 'Test Failed',
        `You scored ${result.result.score}%. ${
          result.result.passed
            ? 'Proceed to KYC verification.'
            : 'Minimum 70% required. You can retry.'
        }`
      );
    }
  };

  const submitForm = async () => {
    setSubmitting(true);
    try {
      const result = await AstrologerOnboardingService.submitApplication({
        name,
        experience,
        languages,
        panNumber,
        aadhaarNumber,
        accountNumber,
        ifsc,
        upiId,
        chatRate,
        callRate,
        videoRate,
      });
      if (result.success) {
        Alert.alert(
          'Application Submitted',
          'Your astrologer profile, KYC details, and skills test have been submitted for verification. Our team will review within 24-48 hours.',
          [{ text: 'OK', onPress: () => router.push('/') }]
        );
      } else {
        Alert.alert(
          'Submission Failed',
          result.error || 'Could not submit your application. Please try again.'
        );
      }
    } catch (error) {
      Alert.alert(
        'Submission Failed',
        'A network error occurred. Your data was not sent. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#FF6B35', '#F7931E']} style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerContent}>
            <TouchableOpacity style={styles.backButton} onPress={prevStep}>
              <ArrowLeft color="#FFF" size={24} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Astrologer Partner</Text>
            <View style={styles.emptyNav} />
          </View>
        </SafeAreaView>
      </LinearGradient>

      <View style={styles.progressContainer}>
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          const isActive = index === currentStep;
          const isCompleted = index < currentStep;
          return (
            <View key={step.id} style={styles.stepIndicator}>
              <View
                style={[
                  styles.stepCircle,
                  isActive && styles.activeStepCircle,
                  isCompleted && styles.completedStepCircle,
                ]}
              >
                {isCompleted ? (
                  <CheckCircle size={14} color="#FFF" />
                ) : (
                  <Icon size={14} color={isActive ? '#FFF' : Colors.textLight} />
                )}
              </View>
              {index < STEPS.length - 1 && (
                <View
                  style={[
                    styles.stepLine,
                    isCompleted && styles.completedStepLine,
                  ]}
                />
              )}
            </View>
          );
        })}
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {currentStep === 0 && (
            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Basic Profile</Text>
              <Text style={styles.sectionSubtitle}>Tell users about yourself</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Full Name (As per PAN)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Rahul Sharma"
                  value={name}
                  onChangeText={setName}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Languages Spoken</Text>
                <TextInput
                  style={styles.input}
                  placeholder="English, Hindi, Sanskrit"
                  value={languages}
                  onChangeText={setLanguages}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Short Bio</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="I am a passionate Vedic astrologer with..."
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
            </View>
          )}

          {currentStep === 1 && (
            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Professional Expertise</Text>
              <Text style={styles.sectionSubtitle}>Highlight your astrological skills</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Experience (in years)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 10"
                  keyboardType="numeric"
                  value={experience}
                  onChangeText={setExperience}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Primary Specialties (comma separated)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Vedic, KP, Vastu, Tarot"
                />
              </View>
            </View>
          )}

          {currentStep === 2 && (
            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Skills Assessment</Text>
              <Text style={styles.sectionSubtitle}>
                {testResult
                  ? testResult.passed
                    ? `Passed with ${testResult.score}%`
                    : `Failed with ${testResult.score}%. Minimum 70% required.`
                  : 'Answer all 10 questions to proceed'}
              </Text>

              {testQuestions.map((q, index) => (
                <View key={q.id} style={styles.questionCard}>
                  <Text style={styles.questionText}>
                    {index + 1}. {q.question}
                  </Text>
                  {q.options.map((option, optIndex) => (
                    <TouchableOpacity
                      key={optIndex}
                      style={[
                        styles.optionButton,
                        testAnswers[q.id] === optIndex && styles.optionSelected,
                      ]}
                      onPress={() =>
                        setTestAnswers((prev) => ({ ...prev, [q.id]: optIndex }))
                      }
                    >
                      <Text
                        style={[
                          styles.optionText,
                          testAnswers[q.id] === optIndex && styles.optionTextSelected,
                        ]}
                      >
                        {option}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ))}

              {!testResult?.passed && (
                <TouchableOpacity style={styles.secondaryButton} onPress={submitTest}>
                  <Text style={styles.secondaryButtonText}>Submit Test</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {currentStep === 3 && (
            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>KYC Verification</Text>
              <Text style={styles.sectionSubtitle}>Secure identity verification</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>PAN Card Number</Text>
                <TextInput
                  style={styles.input}
                  placeholder="ABCDE1234F"
                  autoCapitalize="characters"
                  value={panNumber}
                  onChangeText={setPanNumber}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Aadhaar Card Number</Text>
                <TextInput
                  style={styles.input}
                  placeholder="1234 5678 9012"
                  keyboardType="numeric"
                  value={aadhaarNumber}
                  onChangeText={setAadhaarNumber}
                />
              </View>

              <TouchableOpacity style={styles.uploadBox}>
                <UploadCloud size={32} color={Colors.primary} />
                <Text style={styles.uploadText}>Upload ID Proof (PDF/JPG)</Text>
              </TouchableOpacity>
            </View>
          )}

          {currentStep === 4 && (
            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Pricing & Payout</Text>
              <Text style={styles.sectionSubtitle}>Set your rates and payout method</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Chat Rate (per minute, INR)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="20"
                  keyboardType="numeric"
                  value={chatRate}
                  onChangeText={setChatRate}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Call Rate (per minute, INR)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="30"
                  keyboardType="numeric"
                  value={callRate}
                  onChangeText={setCallRate}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Video Rate (per minute, INR)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="40"
                  keyboardType="numeric"
                  value={videoRate}
                  onChangeText={setVideoRate}
                />
              </View>

              <View style={styles.divider} />

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Bank Account Number</Text>
                <TextInput
                  style={styles.input}
                  placeholder="000123456789"
                  keyboardType="numeric"
                  value={accountNumber}
                  onChangeText={setAccountNumber}
                  secureTextEntry
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>IFSC Code</Text>
                <TextInput
                  style={styles.input}
                  placeholder="SBIN0001234"
                  autoCapitalize="characters"
                  value={ifsc}
                  onChangeText={setIfsc}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>UPI ID (optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="name@upi"
                  autoCapitalize="none"
                  value={upiId}
                  onChangeText={setUpiId}
                />
              </View>
            </View>
          )}

          <TouchableOpacity
            style={[styles.primaryButton, submitting && styles.primaryButtonDisabled]}
            onPress={nextStep}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Text style={styles.primaryButtonText}>
                  {currentStep === STEPS.length - 1 ? 'Submit Verification' : 'Continue'}
                </Text>
                {currentStep < STEPS.length - 1 && <ChevronRight size={20} color="#FFF" />}
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingBottom: 20 },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  backButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#FFF' },
  emptyNav: { width: 40 },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  stepIndicator: { flexDirection: 'row', alignItems: 'center' },
  stepCircle: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.background,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },
  activeStepCircle: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  completedStepCircle: { backgroundColor: Colors.success, borderColor: Colors.success },
  stepLine: { width: 40, height: 2, backgroundColor: Colors.border, marginHorizontal: 4 },
  completedStepLine: { backgroundColor: Colors.success },
  scrollContent: { padding: 20, paddingBottom: 40 },
  formSection: { marginBottom: 30 },
  sectionTitle: { fontSize: 24, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  sectionSubtitle: { fontSize: 14, color: Colors.textLight, marginBottom: 24 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.text, marginBottom: 8 },
  input: {
    backgroundColor: Colors.white,
    borderWidth: 1, borderColor: Colors.border,
    borderRadius: 12, padding: 16,
    fontSize: 15, color: Colors.text,
  },
  textArea: { height: 100 },
  uploadBox: {
    backgroundColor: Colors.primary + '10',
    borderWidth: 2, borderColor: Colors.primary, borderStyle: 'dashed',
    borderRadius: 16, padding: 30,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 10,
  },
  uploadText: { marginTop: 12, fontSize: 14, fontWeight: '600', color: Colors.primary },
  primaryButton: {
    backgroundColor: Colors.primary,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    padding: 16, borderRadius: 14, gap: 8,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  secondaryButton: {
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.primary,
    padding: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  secondaryButtonText: { color: Colors.primary, fontSize: 16, fontWeight: '700' },
  questionCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  questionText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
    lineHeight: 20,
  },
  optionButton: {
    backgroundColor: Colors.background,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  optionSelected: {
    backgroundColor: Colors.primary + '15',
    borderColor: Colors.primary,
  },
  optionText: {
    fontSize: 14,
    color: Colors.text,
  },
  optionTextSelected: {
    color: Colors.primary,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 20,
  },
});
