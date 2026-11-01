import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  Star,
  Users,
  Globe,
  Award,
  Heart,
  Mail,
  Phone,
  MapPin,
  Instagram,
  Twitter,
  Facebook,
  Youtube,
} from 'lucide-react-native';
import { router } from 'expo-router';
import Colors from '@/constants/colors';
import { SUPPORT_EMAIL, SUPPORT_PHONE } from '@/constants/support';
import { useLanguage } from '@/contexts/LanguageContext';

export default function AboutScreen() {
  const { t } = useLanguage();

  const handleSocialLink = (platform: string) => {
    const urls: Record<string, string> = {
      instagram: 'https://instagram.com/astronemi',
      twitter: 'https://twitter.com/astronemi',
      facebook: 'https://facebook.com/astronemi',
      youtube: 'https://youtube.com/astronemi',
    };
    Linking.openURL(urls[platform] ?? '');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft color={Colors.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('about.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <LinearGradient
          colors={['#6B46C1', '#805AD5', '#9F7AEA']}
          style={styles.heroSection}
        >
          <View style={styles.logoContainer}>
            <Star size={48} color="#FFD700" fill="#FFD700" />
          </View>
          <Text style={styles.appName}>AstroNemi</Text>
          <Text style={styles.tagline}>{t('about.tagline')}</Text>
          <Text style={styles.version}>Version 1.0.0</Text>
        </LinearGradient>

        {/* About Content */}
        <View style={styles.aboutSection}>
          <Text style={styles.aboutTitle}>{t('about.whoWeAre')}</Text>
          <Text style={styles.aboutText}>
            {t('about.whoWeAre1')}
          </Text>
          <Text style={styles.aboutText}>
            {t('about.whoWeAre2')}
          </Text>
        </View>

        {/* Features */}
        <View style={styles.featuresSection}>
          <Text style={styles.sectionTitle}>{t('about.whatWeOffer')}</Text>
          {[
            { icon: Star, title: t('about.freeKundli'), desc: t('about.freeKundliDesc') },
            { icon: Users, title: t('home.expertAstrologers'), desc: t('about.expertAstrologersDesc') },
            { icon: Globe, title: t('about.multipleLanguages'), desc: t('about.multipleLanguagesDesc') },
            { icon: Award, title: t('about.trustedPlatform'), desc: t('about.trustedPlatformDesc') },
          ].map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <feature.icon size={24} color={Colors.primary} />
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDesc}>{feature.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Mission */}
        <View style={styles.missionSection}>
          <Text style={styles.sectionTitle}>{t('about.ourMission')}</Text>
          <Text style={styles.missionText}>
            {t('about.missionText')}
          </Text>
        </View>

        {/* Contact */}
        <View style={styles.contactSection}>
          <Text style={styles.sectionTitle}>{t('profile.contactUs')}</Text>
          <View style={styles.contactItem}>
            <Mail size={20} color={Colors.primary} />
            <Text style={styles.contactText}>{SUPPORT_EMAIL || 'See Help screen'}</Text>
          </View>
          <View style={styles.contactItem}>
            <Phone size={20} color={Colors.primary} />
            <Text style={styles.contactText}>{SUPPORT_PHONE || 'See Help screen'}</Text>
          </View>
          <View style={styles.contactItem}>
            <MapPin size={20} color={Colors.primary} />
            <Text style={styles.contactText}>
              AstroNemi Technologies Pvt. Ltd.{'\n'}
              WeWork Prestige Atlanta, Koramangala{'\n'}
              Bangalore, Karnataka, India - 560034
            </Text>
          </View>
        </View>

        {/* Social Links */}
        <View style={styles.socialSection}>
          <Text style={styles.sectionTitle}>{t('about.followUs')}</Text>
          <View style={styles.socialLinks}>
            <TouchableOpacity 
              style={styles.socialButton}
              onPress={() => handleSocialLink('instagram')}
            >
              <Instagram size={24} color="#E1306C" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.socialButton}
              onPress={() => handleSocialLink('twitter')}
            >
              <Twitter size={24} color="#1DA1F2" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.socialButton}
              onPress={() => handleSocialLink('facebook')}
            >
              <Facebook size={24} color="#4267B2" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.socialButton}
              onPress={() => handleSocialLink('youtube')}
            >
              <Youtube size={24} color="#FF0000" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Made with Love */}
        <View style={styles.footer}>
          <Heart size={16} color="#E91E63" fill="#E91E63" />
          <Text style={styles.footerText}>
            {t('about.madeWithLove')}
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
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
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  appName: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFF',
  },
  tagline: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 8,
  },
  version: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 8,
  },
  aboutSection: {
    backgroundColor: Colors.white,
    margin: 16,
    borderRadius: 16,
    padding: 20,
  },
  aboutTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },
  aboutText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 22,
    marginBottom: 12,
  },
  statsSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  statItem: {
    width: '50%',
    alignItems: 'center',
    paddingVertical: 16,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 4,
  },
  featuresSection: {
    backgroundColor: Colors.white,
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary + '10',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  featureDesc: {
    fontSize: 13,
    color: Colors.textLight,
    marginTop: 2,
  },
  missionSection: {
    backgroundColor: Colors.white,
    margin: 16,
    borderRadius: 16,
    padding: 20,
  },
  missionText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 22,
  },
  contactSection: {
    backgroundColor: Colors.white,
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 20,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  contactText: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  socialSection: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  socialLinks: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 12,
  },
  socialButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 20,
  },
  footerText: {
    fontSize: 14,
    color: Colors.textLight,
  },
});