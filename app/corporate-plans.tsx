import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  Building2,
  Users,
  CheckCircle,
  Phone,
  Mail,
  Globe,
  Star,
  ArrowRight,
} from 'lucide-react-native';
import { router } from 'expo-router';
import Colors from '@/constants/colors';
import { SUPPORT_PHONE } from '@/constants/support';

interface CorporatePlan {
  id: string;
  name: string;
  price: string;
  period: string;
  features: string[];
  recommended: boolean;
  color: string;
}

const corporatePlans: CorporatePlan[] = [
  {
    id: '1',
    name: 'Starter',
    price: '9,999',
    period: 'month',
    features: [
      'Up to 50 employees',
      'Monthly horoscope reports',
      'Basic Kundli generation',
      'Email support',
      'Annual predictions',
    ],
    recommended: false,
    color: '#4CAF50',
  },
  {
    id: '2',
    name: 'Business',
    price: '24,999',
    period: 'month',
    features: [
      'Up to 200 employees',
      'Weekly horoscope updates',
      'Advanced Kundli analysis',
      'Priority support',
      'Muhurat consultation',
      'Team compatibility reports',
      'Quarterly reviews',
    ],
    recommended: true,
    color: '#2196F3',
  },
  {
    id: '3',
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    features: [
      'Unlimited employees',
      'Daily personalized updates',
      'Full astrology suite',
      'Dedicated account manager',
      'Custom integrations',
      'On-site consultations',
      'Executive reports',
      'API access',
    ],
    recommended: false,
    color: '#9C27B0',
  },
];

const benefits = [
  { title: 'Employee Wellness', description: 'Support mental well-being with personalized guidance' },
  { title: 'Team Building', description: 'Improve team dynamics with compatibility insights' },
  { title: 'Decision Support', description: 'Auspicious timing for important business decisions' },
  { title: 'Cultural Integration', description: 'Align with Indian traditions and festivals' },
];

export default function CorporatePlansScreen() {
  const [selectedPlan, setSelectedPlan] = useState<CorporatePlan | null>(null);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1565C0', '#1976D2', '#1E88E5']}
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
            <Text style={styles.headerTitle}>Corporate Plans</Text>
            <View style={styles.placeholder} />
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.content}>
        {/* Hero Section */}
        <View style={styles.heroCard}>
          <Building2 color="#1565C0" size={32} />
          <Text style={styles.heroTitle}>Astrology for Business</Text>
          <Text style={styles.heroText}>
            Empower your organization with ancient wisdom. Our corporate plans
            provide astrology-based insights for employee wellness, team building,
            and strategic decision-making.
          </Text>
        </View>

        {/* Benefits */}
        <Text style={styles.sectionTitle}>Why Choose Corporate Astrology?</Text>
        <View style={styles.benefitsGrid}>
          {benefits.map((benefit, index) => (
            <View key={index} style={styles.benefitCard}>
              <View style={styles.benefitIcon}>
                <Star color="#1565C0" size={18} />
              </View>
              <Text style={styles.benefitTitle}>{benefit.title}</Text>
              <Text style={styles.benefitDescription}>{benefit.description}</Text>
            </View>
          ))}
        </View>

        {/* Plans */}
        <Text style={styles.sectionTitle}>Choose Your Plan</Text>
        {corporatePlans.map((plan) => (
          <TouchableOpacity
            key={plan.id}
            style={[
              styles.planCard,
              selectedPlan?.id === plan.id && styles.planCardSelected,
              plan.recommended && styles.planCardRecommended,
            ]}
            onPress={() => setSelectedPlan(plan)}
          >
            {plan.recommended && (
              <View style={[styles.recommendedBadge, { backgroundColor: plan.color }]}>
                <Text style={styles.recommendedText}>Most Popular</Text>
              </View>
            )}
            <View style={styles.planHeader}>
              <View style={[styles.planIcon, { backgroundColor: plan.color + '20' }]}>
                <Building2 color={plan.color} size={24} />
              </View>
              <View style={styles.planInfo}>
                <Text style={styles.planName}>{plan.name}</Text>
                <View style={styles.planPriceRow}>
                  <Text style={[styles.planPrice, { color: plan.color }]}>
                    {plan.price === 'Custom' ? plan.price : ` ${plan.price}`}
                  </Text>
                  {plan.period && (
                    <Text style={styles.planPeriod}>/{plan.period}</Text>
                  )}
                </View>
              </View>
              {selectedPlan?.id === plan.id && (
                <CheckCircle color={plan.color} size={24} />
              )}
            </View>
            <View style={styles.featuresList}>
              {plan.features.map((feature, index) => (
                <View key={index} style={styles.featureItem}>
                  <CheckCircle color={plan.color} size={14} />
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>
          </TouchableOpacity>
        ))}

        {/* Contact Section */}
        <Text style={styles.sectionTitle}>Get Started</Text>
        <View style={styles.contactCard}>
          <Text style={styles.contactTitle}>Contact Our Corporate Team</Text>
          <Text style={styles.contactText}>
            Our dedicated team will help you choose the right plan and customize
            it for your organization&apos;s needs.
          </Text>
          <View style={styles.contactOptions}>
            <TouchableOpacity style={styles.contactOption}>
              <Phone color="#1565C0" size={18} />
              <Text style={styles.contactOptionText}>{SUPPORT_PHONE || 'Contact via Help screen'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.contactOption}>
              <Mail color="#1565C0" size={18} />
              <Text style={styles.contactOptionText}>corporate@astronemi.app</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.contactOption}>
              <Globe color="#1565C0" size={18} />
              <Text style={styles.contactOptionText}>www.astronemi.app/corporate</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Request Demo */}
        <TouchableOpacity style={styles.demoButton}>
          <Text style={styles.demoButtonText}>Request a Demo</Text>
          <ArrowRight color="#FFF" size={18} />
        </TouchableOpacity>

        {/* FAQ */}
        <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
        <View style={styles.faqCard}>
          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>How does corporate astrology work?</Text>
            <Text style={styles.faqAnswer}>
              We analyze birth charts of employees (with consent) to provide insights
              for team building, wellness programs, and strategic timing.
            </Text>
          </View>
          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>Is employee data secure?</Text>
            <Text style={styles.faqAnswer}>
              Yes, we follow strict data privacy protocols. Birth details are encrypted
              and reports are shared only with authorized personnel.
            </Text>
          </View>
          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>Can we customize the plan?</Text>
            <Text style={styles.faqAnswer}>
              Absolutely! Our Enterprise plan offers full customization. Contact our
              team to discuss your specific requirements.
            </Text>
          </View>
        </View>

        {/* CTA */}
        {selectedPlan && (
          <TouchableOpacity style={styles.ctaButton}>
            <Users color="#FFF" size={18} />
            <Text style={styles.ctaButtonText}>Get Started with {selectedPlan.name}</Text>
          </TouchableOpacity>
        )}
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
  heroCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 12,
    marginBottom: 8,
  },
  heroText: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
    marginTop: 8,
  },
  benefitsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  benefitCard: {
    width: '48%',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  benefitIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  benefitTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  benefitDescription: {
    fontSize: 11,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  planCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    position: 'relative',
  },
  planCardSelected: {
    borderWidth: 2,
  },
  planCardRecommended: {
    borderColor: '#2196F3',
  },
  recommendedBadge: {
    position: 'absolute',
    top: -10,
    right: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  recommendedText: {
    fontSize: 10,
    color: '#FFF',
    fontWeight: '600',
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  planIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  planInfo: {
    flex: 1,
  },
  planName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  planPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  planPrice: {
    fontSize: 22,
    fontWeight: '700',
  },
  planPeriod: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  featuresList: {
    gap: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  contactCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  contactTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  contactText: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 14,
    lineHeight: 18,
  },
  contactOptions: {
    gap: 10,
  },
  contactOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  contactOptionText: {
    fontSize: 13,
    color: Colors.text,
  },
  demoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1565C0',
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 16,
    gap: 10,
  },
  demoButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
  },
  faqCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  faqItem: {
    marginBottom: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  faqQuestion: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 6,
  },
  faqAnswer: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 17,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1565C0',
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 24,
    gap: 10,
  },
  ctaButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
  },
});