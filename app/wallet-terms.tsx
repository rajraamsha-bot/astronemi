import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { router } from 'expo-router';
import Colors from '@/constants/colors';

const SECTIONS: Array<{ title: string; body: string[] }> = [
  {
    title: '1. What AstroNemi Credits are',
    body: [
      'AstroNemi Credits ("Credits") are service credits recorded in your AstroNemi account. They can be used only for eligible consultations, reports, and app features that display a Credit price.',
      'Credits are not money, legal tender, a bank deposit, a prepaid payment instrument, a stored-value wallet, or a payment system. Credits have no cash value, do not earn interest, and cannot be withdrawn, encashed, transferred, gifted, or exchanged for cash or cash equivalents.',
      'Your Credit balance is a record of the service credits available to your account. It is not a claim against any bank or payment provider.',
    ],
  },
  {
    title: '2. Buying Credits',
    body: [
      'Credit packs are sold as consumable in-app purchases through the Apple App Store or Google Play. The store displays the price, currency, and applicable taxes before you confirm a purchase.',
      'The number of Credits added to your account is shown in the app before purchase and is determined by our server-side product catalogue, not by a client-supplied amount.',
      'A purchase is completed only after the store confirms it and our server verifies the transaction. If verification fails, the Credits are not added. Do not finalize or delete the purchase until verification succeeds.',
      'Credits are added to the account that made the purchase and cannot be claimed by another account.',
    ],
  },
  {
    title: '3. Using Credits',
    body: [
      'Credits are deducted when you start or continue an eligible paid consultation or purchase an eligible digital feature. Per-minute consultations are billed according to the rate shown before you start.',
      'If a consultation ends early, only the amount actually used is deducted. Unused Credits remain in your account.',
      'Paid Credits do not expire unless applicable law or the terms shown at the time of purchase say otherwise. Promotional, bonus, referral, or goodwill Credits may expire on the date shown when they are issued.',
      'Bonus Credits may be used alongside paid Credits in the order shown in the app. Bonus Credits have no cash value and are not refundable.',
    ],
  },
  {
    title: '4. Refunds and cancellations',
    body: [
      'All purchases are final except where required by applicable law or the store’s refund policy. Refund requests for App Store purchases are handled by Apple; refund requests for Google Play purchases are handled by Google.',
      'If you believe a purchase was made in error, contact support before spending the Credits. We may ask for the store order ID and other information needed to investigate.',
      'Credits that have already been spent on a consultation or digital feature are not refundable. If we approve a refund, we may reverse the corresponding Credits and any bonus Credits.',
      'Chargebacks, payment reversals, or fraudulent purchases may result in suspension of the account and reversal of the affected Credits.',
    ],
  },
  {
    title: '5. Account closure and suspension',
    body: [
      'You can request account deletion from Settings. Deleting your account permanently removes your profile, consultation history, and remaining Credits, except for records we must retain by law.',
      'If your account is suspended or closed for fraud, abuse, or a violation of our Terms, unused Credits may be forfeited to the extent permitted by law.',
      'Before deleting your account, contact support if you believe you are entitled to a refund of unused paid Credits.',
    ],
  },
  {
    title: '6. Changes and contact',
    body: [
      'We may update these Wallet Terms to reflect changes in the service, store rules, or applicable law. The updated version will be posted in the app and on our website with a new effective date.',
      'Questions about Credits, purchases, or refunds: support@astronemi.app.',
    ],
  },
];

export default function WalletTermsScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft color={Colors.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Wallet Terms</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>AstroNemi Credits — Wallet Terms</Text>
        <Text style={styles.effectiveDate}>Effective: 29 October 2026</Text>
        <Text style={styles.intro}>
          These Wallet Terms supplement the AstroNemi Terms of Service and Privacy Policy. By buying
          or using Credits, you agree to these terms.
        </Text>

        {SECTIONS.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.body.map((paragraph, index) => (
              <Text key={`${section.title}-${index}`} style={styles.paragraph}>
                {paragraph}
              </Text>
            ))}
          </View>
        ))}

        <View style={styles.links}>
          <TouchableOpacity onPress={() => router.push('/terms')}>
            <Text style={styles.link}>Terms of Service</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/privacy-policy')}>
            <Text style={styles.link}>Privacy Policy</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.text },
  content: { padding: 20 },
  title: { fontSize: 24, fontWeight: '800', color: Colors.text, marginBottom: 6 },
  effectiveDate: { fontSize: 12, color: Colors.textLight, marginBottom: 16 },
  intro: { fontSize: 14, lineHeight: 21, color: Colors.text, marginBottom: 24 },
  section: { marginBottom: 22 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  paragraph: { fontSize: 14, lineHeight: 21, color: Colors.text, marginBottom: 8 },
  links: { flexDirection: 'row', gap: 20, paddingVertical: 24 },
  link: { fontSize: 14, fontWeight: '600', color: Colors.primary },
});
