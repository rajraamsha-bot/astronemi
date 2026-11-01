import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  Animated, KeyboardAvoidingView, Platform, ScrollView,
  ActivityIndicator, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Phone, ArrowRight, Shield, Star, Users, Sparkles, CheckCircle, RefreshCw } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { createButtonA11yProps } from '@/utils/accessibility-helpers';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SendOTPResult = { success: boolean; message: string; [key: string]: any };

const REVIEW_MODE = process.env.EXPO_PUBLIC_REVIEW_MODE === 'true';
const REVIEW_PHONE = (process.env.EXPO_PUBLIC_REVIEW_PHONE ?? '')
  .replace(/\D/g, '')
  .slice(-10);

export default function LoginScreen() {
  const { sendOTP, verifyOTP, otpLoading, verifyLoading } = useAuth();
  const { t } = useLanguage();
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [timer, setTimer] = useState(30);
  const [error, setError] = useState('');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const otpRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (step === 'otp' && timer > 0) {
      const interval = setInterval(() => setTimer(t => t - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [step, timer]);

  const handleSendOTP = async () => {
    setError('');
    const result: SendOTPResult = await sendOTP(phone);
    if (result.success) {
      setStep('otp');
      setTimer(30);
      if (__DEV__ && result.otp) {
        Alert.alert(t('auth.devOtpTitle'), `${t('auth.devOtpMessage')} ${result.otp}\n\n${t('auth.devOtpNote')}`, [{ text: 'OK' }]);
      }
    } else {
      setError(result.message);
    }
  };

  const handleOTPChange = (value: string, index: number) => {
    setError('');
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOTPKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
      const newOtp = [...otp];
      newOtp[index - 1] = '';
      setOtp(newOtp);
    }
  };

  const handleVerifyOTP = async () => {
    setError('');
    const enteredOTP = otp.join('');
    if (enteredOTP.length !== 6) { setError(t('auth.otpComplete')); return; }
    const result = await verifyOTP(phone, enteredOTP);
    if (result.success) {
      router.replace('/(tabs)');
    } else {
      setError(result.message);
      setOtp(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    }
  };

  const handleReviewerAccess = () => {
    setPhone(REVIEW_PHONE);
    setError('');
    Alert.alert(
      'Reviewer access',
      'The reviewer number is filled in. Tap Get OTP, then enter the test OTP from the review notes.',
    );
  };

  const handleResendOTP = async () => {
    setOtp(['', '', '', '', '', '']);
    setError('');
    const result: SendOTPResult = await sendOTP(phone);
    if (result.success) {
      setTimer(30);
      if (__DEV__ && result.otp) {
        Alert.alert(t('auth.devNewOtpTitle'), `${t('auth.devOtpMessage')} ${result.otp}`, [{ text: 'OK' }]);
      }
    } else {
      setError(result.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <View style={styles.logoContainer}>
              <LinearGradient colors={['#6B46C1', '#9F7AEA']} style={styles.logoCircle}>
                <Sparkles size={48} color="#FFF" />
              </LinearGradient>
              <Text style={styles.appName}>AstroNemi</Text>
              <Text style={styles.tagline}>{t('auth.appTagline')}</Text>
            </View>

            {step === 'phone' ? (
              <View style={styles.formContainer}>
                <Text style={styles.title}>{t('auth.welcomeTitle')} 🙏</Text>
                <Text style={styles.subtitle}>{t('auth.loginSubtitle')}</Text>
                <View style={[styles.inputContainer, error ? styles.inputError : null]}>
                  <View style={styles.countryCode}><Text style={styles.countryCodeText}>🇮🇳 +91</Text></View>
                  <TextInput style={styles.phoneInput} placeholder={t('auth.phonePlaceholder')} placeholderTextColor={Colors.textLight} keyboardType="phone-pad" maxLength={10} value={phone} onChangeText={(t) => { setPhone(t); setError(''); }} />
                  {phone.length === 10 && <CheckCircle size={20} color={Colors.success} style={{ marginRight: 12 }} />}
                </View>
                {error ? <Text style={styles.errorText}>{error}</Text> : null}
                <TouchableOpacity style={[styles.primaryButton, (phone.length !== 10 || otpLoading) && styles.buttonDisabled]} onPress={handleSendOTP} disabled={phone.length !== 10 || otpLoading} {...createButtonA11yProps(t('auth.getOtp'), t('auth.loginSubtitle'), phone.length !== 10 || otpLoading)}>
                  {otpLoading ? <ActivityIndicator color={Colors.white} size="small" /> : <><Text style={styles.primaryButtonText}>{t('auth.getOtp')}</Text><ArrowRight size={20} color={Colors.white} /></>}
                </TouchableOpacity>
                <View style={styles.termsContainer}>
                  <Shield size={14} color={Colors.textLight} />
                  <Text style={styles.termsText}>{t('auth.termsAgree')} <Text style={styles.termsLink}>{t('auth.termsAndPrivacy')}</Text></Text>
                </View>
                {REVIEW_MODE && REVIEW_PHONE ? (
                  <TouchableOpacity style={styles.reviewerButton} onPress={handleReviewerAccess}>
                    <Shield size={14} color={Colors.primary} />
                    <Text style={styles.reviewerText}>Reviewer access</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : (
              <View style={styles.formContainer}>
                <Text style={styles.title}>{t('auth.verifyTitle')} ✓</Text>
                <Text style={styles.subtitle}>{t('auth.otpSentTo')}{'\n'}<Text style={styles.phoneHighlight}>+91 {phone}</Text></Text>
                <View style={styles.otpContainer}>
                  {otp.map((digit, index) => (
                    <TextInput key={index} ref={(ref) => { otpRefs.current[index] = ref; }} style={[styles.otpInput, digit && styles.otpInputFilled, error && styles.otpInputError]} keyboardType="number-pad" maxLength={1} value={digit} onChangeText={(value) => handleOTPChange(value, index)} onKeyPress={({ nativeEvent }) => handleOTPKeyPress(nativeEvent.key, index)} selectTextOnFocus />
                  ))}
                </View>
                {error ? <Text style={styles.errorText}>{error}</Text> : null}
                <TouchableOpacity style={[styles.primaryButton, (otp.join('').length !== 6 || verifyLoading) && styles.buttonDisabled]} onPress={handleVerifyOTP} disabled={otp.join('').length !== 6 || verifyLoading} {...createButtonA11yProps(t('auth.verifyAndContinue'), t('auth.verifyTitle'), otp.join('').length !== 6 || verifyLoading)}>
                  {verifyLoading ? <ActivityIndicator color={Colors.white} size="small" /> : <><Text style={styles.primaryButtonText}>{t('auth.verifyAndContinue')}</Text><ArrowRight size={20} color={Colors.white} /></>}
                </TouchableOpacity>
                <View style={styles.resendContainer}>
                  {timer > 0 ? <Text style={styles.timerText}>{t('auth.resendOtpIn')} <Text style={styles.timerCount}>{timer}s</Text></Text> : (
                    <TouchableOpacity style={styles.resendButton} onPress={handleResendOTP} {...createButtonA11yProps(t('auth.resendOtp'), t('auth.resendOtpIn'))}>
                      <RefreshCw size={16} color={Colors.primary} /><Text style={styles.resendText}>{t('auth.resendOtp')}</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <TouchableOpacity onPress={() => { setStep('phone'); setError(''); setOtp(['', '', '', '', '', '']); }} {...createButtonA11yProps(t('auth.changeNumber'), t('auth.changeNumber'))}>
                  <Text style={styles.changeNumber}>← {t('auth.changeNumber')}</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.features}>
                <View style={styles.featureItem}><Star size={18} color={Colors.gold} fill={Colors.gold} /><Text style={styles.featureText}>{t('auth.expertAstrologers')}</Text></View>
                <View style={styles.featureItem}><Users size={18} color={Colors.primary} /><Text style={styles.featureText}>{t('auth.happyUsers')}</Text></View>
                <View style={styles.featureItem}><Phone size={18} color={Colors.success} /><Text style={styles.featureText}>{t('auth.consultation247')}</Text></View>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F4FF' },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  content: { flex: 1, padding: 24 },
  logoContainer: { alignItems: 'center', marginTop: 32, marginBottom: 32 },
  logoCircle: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center', marginBottom: 16, shadowColor: '#6B46C1', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8 },
  appName: { fontSize: 32, fontWeight: '800', color: '#6B46C1' },
  tagline: { fontSize: 15, color: Colors.textLight, marginTop: 4 },
  formContainer: { backgroundColor: Colors.white, borderRadius: 24, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 5 },
  title: { fontSize: 26, fontWeight: '700', color: Colors.text, marginBottom: 6 },
  subtitle: { fontSize: 14, color: Colors.textLight, marginBottom: 24, lineHeight: 22 },
  phoneHighlight: { fontWeight: '700', color: Colors.text },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F4FF', borderRadius: 14, marginBottom: 8, overflow: 'hidden', borderWidth: 2, borderColor: 'transparent' },
  inputError: { borderColor: Colors.error },
  countryCode: { backgroundColor: '#6B46C1', paddingHorizontal: 14, paddingVertical: 16 },
  countryCodeText: { fontSize: 15, fontWeight: '600', color: Colors.white },
  phoneInput: { flex: 1, fontSize: 16, paddingHorizontal: 14, paddingVertical: 16, color: Colors.text },
  errorText: { fontSize: 13, color: Colors.error, marginBottom: 12, marginTop: 4 },
  primaryButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#6B46C1', paddingVertical: 16, borderRadius: 14, gap: 8, marginTop: 8, shadowColor: '#6B46C1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  buttonDisabled: { opacity: 0.5, shadowOpacity: 0 },
  primaryButtonText: { fontSize: 16, fontWeight: '700', color: Colors.white },
  termsContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 16, gap: 6 },
  termsText: { fontSize: 12, color: Colors.textLight, textAlign: 'center', flex: 1 },
  termsLink: { color: '#6B46C1', fontWeight: '600' },
  reviewerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 14,
    paddingVertical: 8,
  },
  reviewerText: { fontSize: 12, fontWeight: '600', color: '#6B46C1' },
  otpContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, gap: 8 },
  otpInput: { flex: 1, height: 56, backgroundColor: '#F8F4FF', borderRadius: 12, fontSize: 24, fontWeight: '700', textAlign: 'center', color: Colors.text, borderWidth: 2, borderColor: 'transparent' },
  otpInputFilled: { borderColor: '#6B46C1', backgroundColor: '#F0EBFF' },
  otpInputError: { borderColor: Colors.error, backgroundColor: '#FFF0F0' },
  resendContainer: { alignItems: 'center', marginTop: 20 },
  timerText: { fontSize: 14, color: Colors.textLight },
  timerCount: { fontWeight: '700', color: '#6B46C1' },
  resendButton: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  resendText: { fontSize: 14, fontWeight: '600', color: '#6B46C1' },
  changeNumber: { fontSize: 14, fontWeight: '600', color: Colors.textLight, textAlign: 'center', marginTop: 16 },
  features: { marginTop: 32, gap: 12 },
  featureItem: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.white, padding: 14, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  featureText: { fontSize: 14, fontWeight: '500', color: Colors.text },
});