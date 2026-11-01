import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  Gem, Flame, BookOpen, Hand, Droplet, Music, 
  ChevronRight, Star, CheckCircle, ArrowLeft, Sparkles 
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { computePanchang } from '@/utils/hindu-calendar-engine';

interface Remedy {
  id: string;
  title: string;
  description: string;
  benefits: string[];
  howTo: string;
  bestDay: string;
  planet: string;
}

interface Gemstone {
  id: string;
  name: string;
  hindiName: string;
  planet: string;
  color: string;
  benefits: string[];
  price: string;
  image: string;
  caratWeight: string;
}

const remedyCategories = [
  { id: 'mantras', title: 'Mantras', icon: Music, color: '#E3F2FD', iconColor: '#1976D2' },
  { id: 'gemstones', title: 'Gemstones', icon: Gem, color: '#F3E5F5', iconColor: '#7B1FA2' },
  { id: 'pujas', title: 'Pujas', icon: Flame, color: '#FFF3E0', iconColor: '#F57C00' },
  { id: 'donations', title: 'Donations', icon: Hand, color: '#E8F5E9', iconColor: '#388E3C' },
  { id: 'fasting', title: 'Fasting', icon: Droplet, color: '#FFEBEE', iconColor: '#D32F2F' },
  { id: 'yantras', title: 'Yantras', icon: BookOpen, color: '#FFF8E1', iconColor: '#FFA000' },
];

const gemstones: Gemstone[] = [
  {
    id: '1',
    name: 'Ruby',
    hindiName: 'Manik',
    planet: 'Sun',
    color: '#E53935',
    benefits: ['Leadership qualities', 'Fame & Recognition', 'Confidence boost', 'Father relationship'],
    price: '₹5,000 - ₹50,000/carat',
    image: 'https://images.unsplash.com/photo-1551751299-1b51cab2694c?w=400',
    caratWeight: '3-6 carats recommended',
  },
  {
    id: '2',
    name: 'Pearl',
    hindiName: 'Moti',
    planet: 'Moon',
    color: '#F5F5F5',
    benefits: ['Emotional balance', 'Mental peace', 'Mother relationship', 'Intuition'],
    price: '₹1,00,0 - ₹15,000/carat',
    image: 'https://images.unsplash.com/photo-1518131672697-613becd4fab5?w=400',
    caratWeight: '4-6 carats recommended',
  },
  {
    id: '3',
    name: 'Red Coral',
    hindiName: 'Moonga',
    planet: 'Mars',
    color: '#FF5722',
    benefits: ['Courage & Strength', 'Property gains', 'Sibling harmony', 'Energy boost'],
    price: '₹2,000 - ₹20,000/carat',
    image: 'https://images.unsplash.com/photo-1583937443566-6d72b63ad990?w=400',
    caratWeight: '5-9 carats recommended',
  },
  {
    id: '4',
    name: 'Emerald',
    hindiName: 'Panna',
    planet: 'Mercury',
    color: '#4CAF50',
    benefits: ['Intelligence', 'Communication', 'Business success', 'Skin health'],
    price: '₹3,000 - ₹1,00,000/carat',
    image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400',
    caratWeight: '3-5 carats recommended',
  },
  {
    id: '5',
    name: 'Yellow Sapphire',
    hindiName: 'Pukhraj',
    planet: 'Jupiter',
    color: '#FFC107',
    benefits: ['Wisdom & Knowledge', 'Marriage prospects', 'Children blessing', 'Wealth'],
    price: '₹5,000 - ₹50,000/carat',
    image: 'https://images.unsplash.com/photo-1551122087-f99a3c6a3d7a?w=400',
    caratWeight: '3-5 carats recommended',
  },
];

const mantras: Remedy[] = [
  {
    id: '1',
    title: 'Gayatri Mantra',
    description: 'Most powerful Vedic mantra for overall well-being and spiritual growth',
    benefits: ['Mental clarity', 'Spiritual awakening', 'Protection', 'Wisdom'],
    howTo: 'Chant 108 times during Brahma Muhurat (4-5 AM)',
    bestDay: 'Daily, especially Sunday',
    planet: 'Sun',
  },
  {
    id: '2',
    title: 'Mahamrityunjaya Mantra',
    description: 'Powerful mantra for health, longevity and protection from negativity',
    benefits: ['Health improvement', 'Fear removal', 'Accident protection', 'Longevity'],
    howTo: 'Chant 108 times with clear pronunciation',
    bestDay: 'Monday',
    planet: 'Moon',
  },
];

export default function RemediesScreen() {
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState('mantras');

  // Personalized Recommendation Logic
  const personalRemedy = React.useMemo(() => {
    if (!user || !user.birthDate || !user.birthTime) return null;
    try {
      const parts = user.birthDate.split(/[/-]/);
      if (parts.length < 3 || !parts[0] || !parts[1] || !parts[2]) return null;
      const d = parts[0].length === 4 ? parseInt(parts[2]) : parseInt(parts[0]);
      const m = parts[0].length === 4 ? parseInt(parts[1]) - 1 : parseInt(parts[1]) - 1;
      const y = parts[0].length === 4 ? parseInt(parts[0]) : parseInt(parts[2]);
      const birthDate = new Date(y, m, d, ...user.birthTime.split(':').map(Number));
      const p = computePanchang(birthDate);
      if (!p || !p.moonRashiName) return null;

      let recommendation = {
        gem: 'Yellow Sapphire',
        reason: `Based on your ${p.moonRashiName!} Rashi, Jupiter's blessings are vital for your growth.`,
        ritual: `Chant 'Guru Mantra' 108 times on Thursdays.`
      };

      if (['Mesha', 'Vrishchika'].includes(p.moonRashiName!)) {
        recommendation = { gem: 'Red Coral', reason: `Your Mars-ruled sign (${p.moonRashiName!}) benefits from enhanced physical vitality.`, ritual: `Offer red flowers to Lord Hanuman on Tuesdays.` };
      } else if (['Karka'].includes(p.moonRashiName!)) {
        recommendation = { gem: 'Pearl', reason: `Your Moon-ruled sign (${p.moonRashiName!}) needs emotional stability and peace.`, ritual: `Chant the Chandrama Mantra on Full Moon nights.` };
      } else if (['Mithuna', 'Kanya'].includes(p.moonRashiName!)) {
        recommendation = { gem: 'Emerald', reason: `Your Mercury-ruled sign (${p.moonRashiName!}) thrives on sharp intellect.`, ritual: `Feed green grass to cows on Wednesdays.` };
      } else if (['Makara', 'Kumbha'].includes(p.moonRashiName!)) {
        recommendation = { gem: 'Blue Sapphire', reason: `Your Saturn-ruled sign (${p.moonRashiName!}) requires discipline and focus.`, ritual: `Light a mustard oil lamp under a Peepal tree on Saturdays.` };
      }
      return recommendation;
    } catch {
      return null;
    }
  }, [user]);

  const renderPersonalBanner = () => {
    if (!personalRemedy) return null;
    return (
      <LinearGradient colors={['#6B46C1', '#805AD5']} style={styles.personalBanner}>
        <View style={styles.personalHeader}>
          <Sparkles color="#FFD700" size={20} />
          <Text style={styles.personalTitle}>AI Personal Recommendation</Text>
        </View>
        <Text style={styles.recommendationText}>{personalRemedy.reason}</Text>
        <View style={styles.recommendationBox}>
          <View style={styles.recItem}>
            <Gem color="#FFF" size={16} />
            <Text style={styles.recValue}>{personalRemedy.gem}</Text>
          </View>
          <View style={styles.recItem}>
            <Music color="#FFF" size={16} />
            <Text style={styles.recValue}>Daily Mantra</Text>
          </View>
        </View>
        <Text style={styles.ritualNote}>✨ {personalRemedy.ritual}</Text>
      </LinearGradient>
    );
  };

  const renderGemstoneCard = (gemstone: Gemstone) => (
    <TouchableOpacity key={gemstone.id} style={styles.gemstoneCard}>
      <View style={[styles.gemstoneColor, { backgroundColor: gemstone.color }]} />
      <View style={styles.gemstoneInfo}>
        <View style={styles.gemstoneHeader}>
          <View>
            <Text style={styles.gemstoneName}>{gemstone.name}</Text>
            <Text style={styles.gemstoneHindi}>{gemstone.hindiName}</Text>
          </View>
          <View style={styles.planetBadge}>
            <Text style={styles.planetText}>{gemstone.planet}</Text>
          </View>
        </View>
        <View style={styles.benefitsList}>
          {gemstone.benefits.slice(0, 2).map((benefit, idx) => (
            <View key={idx} style={styles.benefitItem}>
              <CheckCircle size={12} color={Colors.success} />
              <Text style={styles.benefitText}>{benefit}</Text>
            </View>
          ))}
        </View>
        <View style={styles.gemstoneFooter}>
          <Text style={styles.gemstonePrice}>{gemstone.price}</Text>
          <Text style={styles.gemstoneWeight}>{gemstone.caratWeight}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderMantraCard = (mantra: Remedy) => (
    <TouchableOpacity key={mantra.id} style={styles.mantraCard}>
      <View style={styles.mantraHeader}>
        <View style={styles.mantraIcon}>
          <Music size={24} color={Colors.primary} />
        </View>
        <View style={styles.mantraHeaderInfo}>
          <Text style={styles.mantraTitle}>{mantra.title}</Text>
          <Text style={styles.mantraPlanet}>Planet: {mantra.planet}</Text>
        </View>
      </View>
      <Text style={styles.mantraDescription}>{mantra.description}</Text>
      <View style={styles.mantraBenefits}>
        {mantra.benefits.map((benefit, idx) => (
          <View key={idx} style={styles.mantraBenefitTag}>
            <Text style={styles.mantraBenefitText}>{benefit}</Text>
          </View>
        ))}
      </View>
      <View style={styles.mantraInstructions}>
        <Text style={styles.instructionLabel}>How to chant:</Text>
        <Text style={styles.instructionText}>{mantra.howTo}</Text>
      </View>
      <View style={styles.bestDayContainer}>
        <Star size={14} color={Colors.gold} fill={Colors.gold} />
        <Text style={styles.bestDayText}>Best Day: {mantra.bestDay}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft color={Colors.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Remedies & Gemstones</Text>
        <View style={styles.backButton} />
      </View>
      
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.headerBanner}>
          <Gem size={32} color={Colors.white} />
          <Text style={styles.bannerTitle}>Astrological Remedies</Text>
          <Text style={styles.bannerSubtitle}>Discover solutions to life&apos;s challenges</Text>
        </View>

        {renderPersonalBanner()}

        <View style={styles.categoriesSection}>
          <Text style={styles.sectionTitle}>Remedy Categories</Text>
          <View style={styles.categoriesGrid}>
            {remedyCategories.map((category) => {
              const IconComponent = category.icon;
              return (
                <TouchableOpacity
                  key={category.id}
                  style={[styles.categoryCard, selectedCategory === category.id && styles.categoryCardSelected]}
                  onPress={() => setSelectedCategory(category.id)}
                >
                  <View style={[styles.categoryIcon, { backgroundColor: category.color }]}>
                    <IconComponent size={24} color={category.iconColor} />
                  </View>
                  <Text style={styles.categoryTitle}>{category.title}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recommended Gemstones</Text>
            <TouchableOpacity><Text style={styles.seeAllText}>See All</Text></TouchableOpacity>
          </View>
          <Text style={styles.sectionSubtitle}>Based on planetary positions in your birth chart</Text>
          {gemstones.slice(0, 4).map(renderGemstoneCard)}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Powerful Mantras</Text>
          </View>
          <Text style={styles.sectionSubtitle}>Sacred chants for spiritual growth and problem-solving</Text>
          {mantras.map(renderMantraCard)}
        </View>

        <View style={styles.consultSection}>
          <View style={styles.consultCard}>
            <Text style={styles.consultTitle}>Need Personalized Remedies?</Text>
            <Text style={styles.consultSubtitle}>Consult with our expert astrologers to get remedies tailored to your birth chart</Text>
            <TouchableOpacity style={styles.consultButton} onPress={() => router.push('/astrologers')}>
              <Text style={styles.consultButtonText}>Talk to Astrologer</Text>
              <ChevronRight size={20} color={Colors.white} />
            </TouchableOpacity>
          </View>
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
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.text },
  headerBanner: { backgroundColor: Colors.primary, padding: 24, alignItems: 'center' },
  bannerTitle: { fontSize: 24, fontWeight: '800', color: Colors.white, marginTop: 12 },
  bannerSubtitle: { fontSize: 14, color: Colors.white, opacity: 0.9, marginTop: 4 },
  personalBanner: { margin: 16, borderRadius: 16, padding: 20 },
  personalHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  personalTitle: { fontSize: 16, fontWeight: '700', color: Colors.white },
  recommendationText: { fontSize: 14, color: Colors.white, opacity: 0.9, lineHeight: 20, marginBottom: 16 },
  recommendationBox: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  recItem: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  recValue: { fontSize: 13, fontWeight: '600', color: Colors.white },
  ritualNote: { fontSize: 13, color: Colors.white, fontWeight: '500', fontStyle: 'italic' },
  categoriesSection: { padding: 20 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: Colors.text, marginBottom: 16 },
  categoriesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  categoryCard: { width: '30%', backgroundColor: Colors.white, borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
  categoryCardSelected: { borderColor: Colors.primary },
  categoryIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  categoryTitle: { fontSize: 12, fontWeight: '600', color: Colors.text, textAlign: 'center' },
  section: { padding: 20, paddingTop: 0 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  seeAllText: { fontSize: 14, fontWeight: '600', color: Colors.primary },
  sectionSubtitle: { fontSize: 13, color: Colors.textLight, marginBottom: 16 },
  gemstoneCard: { flexDirection: 'row', backgroundColor: Colors.white, borderRadius: 12, marginBottom: 12, overflow: 'hidden' },
  gemstoneColor: { width: 8 },
  gemstoneInfo: { flex: 1, padding: 16 },
  gemstoneHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  gemstoneName: { fontSize: 17, fontWeight: '700', color: Colors.text },
  gemstoneHindi: { fontSize: 13, color: Colors.textLight, marginTop: 2 },
  planetBadge: { backgroundColor: '#F3E5F5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  planetText: { fontSize: 12, fontWeight: '600', color: Colors.primary },
  benefitsList: { gap: 6, marginBottom: 12 },
  benefitItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  benefitText: { fontSize: 13, color: Colors.text },
  gemstoneFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.border },
  gemstonePrice: { fontSize: 14, fontWeight: '700', color: Colors.success },
  gemstoneWeight: { fontSize: 12, color: Colors.textLight },
  mantraCard: { backgroundColor: Colors.white, borderRadius: 16, padding: 20, marginBottom: 16 },
  mantraHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  mantraIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F3E5F5', alignItems: 'center', justifyContent: 'center' },
  mantraHeaderInfo: { flex: 1 },
  mantraTitle: { fontSize: 18, fontWeight: '700', color: Colors.text },
  mantraPlanet: { fontSize: 13, color: Colors.textLight, marginTop: 2 },
  mantraDescription: { fontSize: 14, color: Colors.text, lineHeight: 20, marginBottom: 12 },
  mantraBenefits: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  mantraBenefitTag: { backgroundColor: '#E8F5E9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  mantraBenefitText: { fontSize: 12, fontWeight: '500', color: Colors.success },
  mantraInstructions: { backgroundColor: Colors.background, padding: 12, borderRadius: 8, marginBottom: 12 },
  instructionLabel: { fontSize: 12, fontWeight: '600', color: Colors.textLight, marginBottom: 4 },
  instructionText: { fontSize: 14, color: Colors.text },
  bestDayContainer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  bestDayText: { fontSize: 12, color: Colors.textLight, fontWeight: '600' },
  consultSection: { padding: 20 },
  consultCard: { backgroundColor: Colors.secondary, padding: 24, borderRadius: 20 },
  consultTitle: { fontSize: 20, fontWeight: '800', color: Colors.white, marginBottom: 8 },
  consultSubtitle: { fontSize: 14, color: Colors.white, opacity: 0.9, lineHeight: 22, marginBottom: 20 },
  consultButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingVertical: 14, borderRadius: 12, gap: 10 },
  consultButtonText: { fontSize: 16, fontWeight: '700', color: Colors.white },
});
