import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Shield } from 'lucide-react-native';
import { router } from 'expo-router';
import Colors from '@/constants/colors';
import { SUPPORT_EMAIL, SUPPORT_PHONE, SUPPORT_WHATSAPP } from '@/constants/support';

export default function PrivacyPolicyScreen() {
  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft color={Colors.text} size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Privacy Policy</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.iconContainer}>
          <Shield color={Colors.primary} size={48} />
        </View>

        <Text style={styles.lastUpdated}>Last Updated: 29 October 2026</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Introduction</Text>
          <Text style={styles.sectionText}>
            Welcome to AstroNemi (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;). We are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application and services.
          </Text>
          <Text style={styles.sectionText}>
            By using AstroNemi, you agree to the collection and use of information in accordance with this policy. If you do not agree with our policies and practices, please do not use our services.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Information We Collect</Text>
          <Text style={styles.subsectionTitle}>Personal Information</Text>
          <Text style={styles.sectionText}>
            We may collect personal information that you voluntarily provide when using our services, including:
          </Text>
          <Text style={styles.bulletPoint}>• Name and email address</Text>
          <Text style={styles.bulletPoint}>• Phone number</Text>
          <Text style={styles.bulletPoint}>• Date, time, and place of birth (for astrological calculations)</Text>
          <Text style={styles.bulletPoint}>• Payment information (processed securely through third-party payment processors)</Text>
          <Text style={styles.bulletPoint}>• Profile picture</Text>

          <Text style={styles.subsectionTitle}>Automatically Collected Information</Text>
          <Text style={styles.sectionText}>
            When you use our app, we automatically collect certain information, including:
          </Text>
          <Text style={styles.bulletPoint}>• Device information (type, operating system, unique identifiers)</Text>
          <Text style={styles.bulletPoint}>• Log data (access times, pages viewed, app crashes)</Text>
          <Text style={styles.bulletPoint}>• Location data (with your permission, for accurate astrological calculations)</Text>
          <Text style={styles.bulletPoint}>• Usage data (features used, interactions with astrologers)</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. How We Use Your Information</Text>
          <Text style={styles.sectionText}>
            We use the collected information for various purposes, including:
          </Text>
          <Text style={styles.bulletPoint}>• Providing personalized astrological readings and predictions</Text>
          <Text style={styles.bulletPoint}>• Processing transactions and managing your wallet</Text>
          <Text style={styles.bulletPoint}>• Connecting you with astrologers for consultations</Text>
          <Text style={styles.bulletPoint}>• Sending notifications about your readings, appointments, and offers</Text>
          <Text style={styles.bulletPoint}>• Improving our services and developing new features</Text>
          <Text style={styles.bulletPoint}>• Providing customer support</Text>
          <Text style={styles.bulletPoint}>• Preventing fraud and ensuring security</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Sharing Your Information</Text>
          <Text style={styles.sectionText}>
            We may share your information in the following circumstances:
          </Text>
          <Text style={styles.bulletPoint}>• With astrologers you consult (limited to information necessary for the consultation)</Text>
          <Text style={styles.bulletPoint}>• With service providers who assist in our operations, including Supabase (hosting/database), Apple and Google (in-app purchases), Razorpay (physical orders and eligible consultations), Agora (calls), Expo/Firebase (push), and Sentry (diagnostics)</Text>
          <Text style={styles.bulletPoint}>• To comply with legal obligations or respond to lawful requests</Text>
          <Text style={styles.bulletPoint}>• To protect our rights, privacy, safety, or property</Text>
          <Text style={styles.bulletPoint}>• In connection with a merger, acquisition, or sale of assets</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Data Security</Text>
          <Text style={styles.sectionText}>
            We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. These measures include:
          </Text>
          <Text style={styles.bulletPoint}>• Encryption of data in transit and at rest</Text>
          <Text style={styles.bulletPoint}>• Secure servers and databases</Text>
          <Text style={styles.bulletPoint}>• Regular security assessments</Text>
          <Text style={styles.bulletPoint}>• Access controls and authentication</Text>
          <Text style={styles.sectionText}>
            However, no method of transmission over the Internet or electronic storage is 100% secure. While we strive to protect your information, we cannot guarantee its absolute security.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Your Rights and Choices</Text>
          <Text style={styles.sectionText}>
            You have certain rights regarding your personal information:
          </Text>
          <Text style={styles.bulletPoint}>• Access: You can request a copy of your personal data</Text>
          <Text style={styles.bulletPoint}>• Correction: You can update or correct inaccurate information</Text>
          <Text style={styles.bulletPoint}>• Deletion: You can request deletion of your account and data</Text>
          <Text style={styles.bulletPoint}>• Opt-out: You can opt out of marketing communications</Text>
          <Text style={styles.bulletPoint}>• Data Portability: You can request your data in a portable format</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. Children&apos;s Privacy</Text>
          <Text style={styles.sectionText}>
            Our services are not intended for children under 18 years of age. We do not knowingly collect personal information from children. If you are a parent or guardian and believe your child has provided us with personal information, please contact us immediately.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>8. International Data Transfers</Text>
          <Text style={styles.sectionText}>
            Your information may be transferred to and processed in countries other than your country of residence. These countries may have different data protection laws. By using our services, you consent to such transfers.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>9. Third-Party Links</Text>
          <Text style={styles.sectionText}>
            Our app may contain links to third-party websites or services. We are not responsible for the privacy practices of these third parties. We encourage you to read their privacy policies before providing any personal information.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>10. Cookies and Tracking</Text>
          <Text style={styles.sectionText}>
            We use cookies, web beacons, and similar technologies to collect information about your usage patterns and preferences. You can manage cookie preferences through your device settings.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>11. Changes to This Policy</Text>
          <Text style={styles.sectionText}>
            We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new policy on this page and updating the &quot;Last Updated&quot; date. We encourage you to review this policy periodically.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>12. Contact Us</Text>
          <Text style={styles.sectionText}>
            If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:
          </Text>
          {SUPPORT_EMAIL ? <Text style={styles.contactInfo}>Email: {SUPPORT_EMAIL}</Text> : null}
          {SUPPORT_PHONE ? <Text style={styles.contactInfo}>Phone: {SUPPORT_PHONE}</Text> : null}
          {SUPPORT_WHATSAPP ? <Text style={styles.contactInfo}>WhatsApp: {SUPPORT_WHATSAPP}</Text> : null}
          <Text style={styles.contactInfo}>Address: AstroNemi Technologies Pvt. Ltd., WeWork Prestige Atlanta, Koramangala, Bangalore, Karnataka, India - 560034</Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            © 2024 AstroNemi. All rights reserved.
          </Text>
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
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  lastUpdated: {
    textAlign: 'center',
    fontSize: 12,
    color: Colors.textLight,
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 12,
    marginBottom: 8,
  },
  sectionText: {
    fontSize: 14,
    lineHeight: 22,
    color: Colors.text,
    marginBottom: 8,
  },
  bulletPoint: {
    fontSize: 14,
    lineHeight: 22,
    color: Colors.text,
    marginLeft: 8,
    marginBottom: 4,
  },
  contactInfo: {
    fontSize: 14,
    lineHeight: 22,
    color: Colors.primary,
    fontWeight: '500',
    marginBottom: 4,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginTop: 16,
  },
  footerText: {
    fontSize: 12,
    color: Colors.textLight,
  },
});