import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, FileText } from 'lucide-react-native';
import { router } from 'expo-router';
import Colors from '@/constants/colors';
import { SUPPORT_PHONE, SUPPORT_WHATSAPP } from '@/constants/support';

export default function TermsOfServiceScreen() {
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
          <Text style={styles.headerTitle}>Terms of Service</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.iconContainer}>
          <FileText color={Colors.primary} size={48} />
        </View>

        <Text style={styles.lastUpdated}>Last Updated: 29 October 2026</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
          <Text style={styles.sectionText}>
            By downloading, installing, or using the AstroNemi mobile application (&quot;App&quot;), you agree to be bound by these Terms of Service (&quot;Terms&quot;). If you do not agree to these Terms, please do not use our App.
          </Text>
          <Text style={styles.sectionText}>
            These Terms constitute a legally binding agreement between you and AstroNemi regarding your use of the App and services offered through it.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Description of Services</Text>
          <Text style={styles.sectionText}>
            AstroNemi provides astrological services including but not limited to:
          </Text>
          <Text style={styles.bulletPoint}>• Birth chart (Kundli) generation and analysis</Text>
          <Text style={styles.bulletPoint}>• Horoscope readings (daily, weekly, monthly, yearly)</Text>
          <Text style={styles.bulletPoint}>• Kundli matching for marriage compatibility</Text>
          <Text style={styles.bulletPoint}>• Panchang and Muhurat calculations</Text>
          <Text style={styles.bulletPoint}>• Transit predictions and Sade Sati analysis</Text>
          <Text style={styles.bulletPoint}>• Numerology readings</Text>
          <Text style={styles.bulletPoint}>• Tarot card readings</Text>
          <Text style={styles.bulletPoint}>• Lal Kitab remedies</Text>
          <Text style={styles.bulletPoint}>• Live consultations with astrologers via chat, call, or video</Text>
          <Text style={styles.bulletPoint}>• E-commerce for astrological products and remedies</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. User Accounts</Text>
          <Text style={styles.subsectionTitle}>Registration</Text>
          <Text style={styles.sectionText}>
            To access certain features, you must create an account. You agree to:
          </Text>
          <Text style={styles.bulletPoint}>• Provide accurate, current, and complete information</Text>
          <Text style={styles.bulletPoint}>• Maintain and update your information as needed</Text>
          <Text style={styles.bulletPoint}>• Keep your password confidential</Text>
          <Text style={styles.bulletPoint}>• Accept responsibility for all activities under your account</Text>

          <Text style={styles.subsectionTitle}>Account Termination</Text>
          <Text style={styles.sectionText}>
            We reserve the right to suspend or terminate your account if you violate these Terms or for any other reason at our discretion.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Paid Services & Payments</Text>
          <Text style={styles.subsectionTitle}>AstroNemi Credits</Text>
          <Text style={styles.sectionText}>
            AstroNemi Credits are service credits, not money, a bank deposit, or a stored-value wallet. They have no cash value, cannot be withdrawn or transferred, and can be used only for eligible features that display a Credit price. Credit packs are purchased through the Apple App Store or Google Play, and the server verifies the store transaction before crediting your account. See the in-app Wallet Terms for purchase, expiry, refund, and account-closure rules.
          </Text>

          <Text style={styles.subsectionTitle}>Consultation Fees</Text>
          <Text style={styles.sectionText}>
            Fees for astrologer consultations are displayed before booking. Once a consultation is booked and confirmed, the fee is deducted from your Credits. Refunds for missed consultations are at the discretion of the astrologer and AstroNemi, subject to applicable law.
          </Text>

          <Text style={styles.subsectionTitle}>Subscription Passes</Text>
          <Text style={styles.sectionText}>
            Customer subscription passes and AstroPro passes are non-renewing access passes. They do not auto-renew. Access ends on the date shown in the app, and buying another pass extends access from the current end date. Store purchases are managed by Apple or Google under their terms.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Astrologer Services</Text>
          <Text style={styles.sectionText}>
            Astrologers on our platform are independent contractors, not employees of AstroNemi. We provide a platform for connecting users with astrologers but do not guarantee the accuracy of predictions or advice.
          </Text>
          <Text style={styles.subsectionTitle}>User Conduct with Astrologers</Text>
          <Text style={styles.sectionText}>
            When interacting with astrologers, you agree to:
          </Text>
          <Text style={styles.bulletPoint}>• Be respectful and professional</Text>
          <Text style={styles.bulletPoint}>• Not record consultations without permission</Text>
          <Text style={styles.bulletPoint}>• Not share personal contact information</Text>
          <Text style={styles.bulletPoint}>• Not harass or abuse astrologers</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. User Content</Text>
          <Text style={styles.sectionText}>
            You retain ownership of content you submit to the App. By submitting content, you grant AstroNemi a non-exclusive, worldwide, royalty-free license to use, reproduce, and display such content in connection with our services.
          </Text>
          <Text style={styles.sectionText}>
            You agree not to submit content that is:
          </Text>
          <Text style={styles.bulletPoint}>• Unlawful, harmful, or offensive</Text>
          <Text style={styles.bulletPoint}>• Infringing on intellectual property rights</Text>
          <Text style={styles.bulletPoint}>• Containing personal information of others</Text>
          <Text style={styles.bulletPoint}>• Spam or promotional material</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. Intellectual Property</Text>
          <Text style={styles.sectionText}>
            The App, including all content, features, and functionality, is owned by AstroNemi and is protected by international copyright, trademark, and other intellectual property laws.
          </Text>
          <Text style={styles.sectionText}>
            You may not:
          </Text>
          <Text style={styles.bulletPoint}>• Copy, modify, or distribute the App or its content</Text>
          <Text style={styles.bulletPoint}>• Reverse engineer or attempt to extract source code</Text>
          <Text style={styles.bulletPoint}>• Use our trademarks without permission</Text>
          <Text style={styles.bulletPoint}>• Create derivative works based on our content</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>8. Disclaimer of Warranties</Text>
          <Text style={styles.sectionText}>
            Astrological predictions and advice are for entertainment and guidance purposes only. AstroNemi does not guarantee the accuracy, reliability, or completeness of any astrological readings or predictions.
          </Text>
          <Text style={styles.sectionText}>
            THE APP AND SERVICES ARE PROVIDED &quot;AS IS&quot; WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>9. Limitation of Liability</Text>
          <Text style={styles.sectionText}>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, ASTRONEMI SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, OR OTHER INTANGIBLE LOSSES.
          </Text>
          <Text style={styles.sectionText}>
            Our total liability shall not exceed the amount you paid to us in the 12 months preceding the claim.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>10. Indemnification</Text>
          <Text style={styles.sectionText}>
            You agree to indemnify and hold harmless AstroNemi, its officers, directors, employees, and agents from any claims, damages, losses, or expenses arising from your use of the App, violation of these Terms, or infringement of any third-party rights.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>11. Third-Party Services</Text>
          <Text style={styles.sectionText}>
            The App may contain links to or integrate with third-party services. We are not responsible for the content, terms, or practices of these third parties. Your interactions with third parties are solely between you and the third party.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>12. Modifications to Terms</Text>
          <Text style={styles.sectionText}>
            We reserve the right to modify these Terms at any time. We will notify you of material changes through the App or by other means. Your continued use of the App after such modifications constitutes acceptance of the updated Terms.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>13. Termination</Text>
          <Text style={styles.sectionText}>
            We may terminate or suspend your access to the App immediately, without prior notice, for any reason, including breach of these Terms. Upon termination, your right to use the App will immediately cease.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>14. Governing Law</Text>
          <Text style={styles.sectionText}>
            These Terms shall be governed by and construed in accordance with the laws of India, without regard to its conflict of law provisions. Any disputes arising from these Terms shall be subject to the exclusive jurisdiction of the courts in Bangalore, India.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>15. Severability</Text>
          <Text style={styles.sectionText}>
            If any provision of these Terms is found to be unenforceable, the remaining provisions will continue in full force and effect.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>16. Entire Agreement</Text>
          <Text style={styles.sectionText}>
            These Terms, together with our Privacy Policy, constitute the entire agreement between you and AstroNemi regarding your use of the App.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>17. Contact Us</Text>
          <Text style={styles.sectionText}>
            If you have any questions about these Terms, please contact us:
          </Text>
          <Text style={styles.contactInfo}>Email: legal@astronemi.app</Text>
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