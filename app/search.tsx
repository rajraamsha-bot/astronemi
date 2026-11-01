import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  Dimensions,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  X,
  Search,
  Star,
  Clock,
  TrendingUp,
  FileText,
  Sparkles,
  Calendar,
  ChevronRight,
} from 'lucide-react-native';
import { router } from 'expo-router';
import Colors from '@/constants/colors';
import { astrologersApi } from '@/services/api';
import { UiAstrologer } from '@/lib/database.types';
import { zodiacSigns } from '@/mocks/horoscopes';
import { Logger } from '@/services/logger';



const { width } = Dimensions.get('window');

interface SearchResult {
  id: string;
  type: 'astrologer' | 'service' | 'zodiac' | 'feature';
  title: string;
  subtitle?: string;
  image?: string;
  rating?: number;
  route: string;
}

const popularSearches = [
  'Kundli Matching',
  'Sade Sati',
  'Mangal Dosha',
  'Career Prediction',
  'Love Marriage',
  'Gemstone',
  'Daily Horoscope',
  'Muhurat',
];

const allServices = [
  { id: 'kundli', title: 'Kundli', subtitle: 'Birth Chart Analysis', icon: FileText, route: '/kundli', color: '#FF6B6B' },
  { id: 'matching', title: 'Kundli Matching', subtitle: 'Marriage Compatibility', icon: Sparkles, route: '/kundli-matching', color: '#E91E63' },
  { id: 'horoscope', title: 'Horoscope', subtitle: 'Daily Predictions', icon: Star, route: '/horoscope', color: '#FFB74D' },
  { id: 'panchang', title: 'Panchang', subtitle: 'Hindu Calendar', icon: Calendar, route: '/panchang', color: '#4CAF50' },
  { id: 'transit', title: 'Transit', subtitle: 'Gochar Predictions', icon: TrendingUp, route: '/transit', color: '#3F51B5' },
  { id: 'muhurat', title: 'Muhurat', subtitle: 'Auspicious Timings', icon: Clock, route: '/muhurat', color: '#795548' },
  { id: 'numerology', title: 'Numerology', subtitle: 'Number Predictions', icon: FileText, route: '/numerology', color: '#607D8B' },
  { id: 'tarot', title: 'Tarot Reading', subtitle: 'Card Predictions', icon: Sparkles, route: '/tarot', color: '#673AB7' },
  { id: 'festivals', title: 'Festivals', subtitle: 'Hindu Festival Calendar', icon: Calendar, route: '/festivals', color: '#FF5722' },
  { id: 'lal-kitab', title: 'Lal Kitab', subtitle: 'Simple Remedies', icon: FileText, route: '/lal-kitab', color: '#C62828' },
  { id: 'shop', title: 'Shop', subtitle: 'Gemstones & More', icon: Sparkles, route: '/shop', color: '#00897B' },
  { id: 'blog', title: 'Learn', subtitle: 'Courses & Articles', icon: FileText, route: '/blog', color: '#4A90A4' },
];

export default function SearchScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>(['Kundli', 'Horoscope', 'Astrologer']);
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false);

  // effect:audited — Perform database search when searchQuery changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim().length > 0) {
        performSearch(searchQuery);
        setShowResults(true);
      } else {
        setSearchResults([]);
        setShowResults(false);
      }
    }, 300); // Debounce
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const performSearch = async (query: string) => {
    setLoading(true);
    try {
      const results: SearchResult[] = [];
      const lowerQuery = query.toLowerCase();

      // 1. Search DB Astrologers
      const response = await astrologersApi.getAll();
      const dbAstrologers = response.data;

      if (dbAstrologers && dbAstrologers.data) {
        dbAstrologers.data.forEach((astrologer: UiAstrologer) => {
          const hasNameMatch = astrologer.name?.toLowerCase().includes(lowerQuery);
          const hasSpecMatch = astrologer.specialization?.some((s: string) => s.toLowerCase().includes(lowerQuery));

          if (hasNameMatch || hasSpecMatch) {
            results.push({
              id: astrologer.id,
              type: 'astrologer',
              title: astrologer.name || 'Astrologer',
              subtitle: astrologer.experience ? `${astrologer.experience} years experience` : 'Vedic Expert',
              image: astrologer.image || '',
              rating: astrologer.rating || 4.5,
              route: `/astrologer/${astrologer.id}`,
            });
          }
        });
      }

      // 2. Search local services (keep these as they are mostly app features)
      allServices.forEach(service => {
        if (
          service.title.toLowerCase().includes(lowerQuery) ||
          service.subtitle?.toLowerCase().includes(lowerQuery)
        ) {
          results.push({
            id: service.id,
            type: 'service',
            title: service.title,
            subtitle: service.subtitle,
            route: service.route,
          });
        }
      });

      // 3. Search zodiac signs
      zodiacSigns.forEach(sign => {
        if (sign.name.toLowerCase().includes(lowerQuery)) {
          results.push({
            id: sign.id,
            type: 'zodiac',
            title: `${sign.emoji} ${sign.name}`,
            subtitle: sign.dateRange,
            route: '/horoscope',
          });
        }
      });

      setSearchResults(results);
    } catch (err) {
      Logger.error('Search failed', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResultPress = (result: SearchResult) => {
    // Add to recent searches
    setRecentSearches(prev => {
      const filtered = prev.filter(s => s !== result.title);
      return [result.title, ...filtered].slice(0, 5);
    });
    
    router.push(result.route);
  };

  const handleQuickSearch = (query: string) => {
    setSearchQuery(query);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setShowResults(false);
  };

  const renderSearchResult = ({ item }: { item: SearchResult }) => (
    <TouchableOpacity
      style={styles.resultItem}
      onPress={() => handleResultPress(item)}
    >
      <View style={styles.resultIcon}>
        {item.type === 'astrologer' ? (
          <Image source={{ uri: item.image }} style={styles.resultImage} />
        ) : item.type === 'zodiac' ? (
          <Text style={styles.zodiacEmoji}>{item.title.charAt(0)}</Text>
        ) : (
          <FileText size={24} color={Colors.primary} />
        )}
      </View>
      <View style={styles.resultContent}>
        <Text style={styles.resultTitle}>{item.title}</Text>
        {item.subtitle && (
          <Text style={styles.resultSubtitle}>{item.subtitle}</Text>
        )}
      </View>
      {item.rating && (
        <View style={styles.ratingContainer}>
          <Star size={14} color={Colors.gold} fill={Colors.gold} />
          <Text style={styles.ratingText}>{item.rating}</Text>
        </View>
      )}
      <ChevronRight size={20} color={Colors.textLight} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Search Header */}
      <View style={styles.searchHeader}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color={Colors.textLight} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search astrologers, services..."
            placeholderTextColor={Colors.textLight}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={clearSearch}>
              <X size={18} color={Colors.textLight} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>

      {showResults ? (
        // Search Results
        <FlatList
          data={searchResults}
          renderItem={renderSearchResult}
          keyExtractor={(item) => `${item.type}-${item.id}`}
          style={styles.resultsList}
          initialNumToRender={8}
          maxToRenderPerBatch={4}
          windowSize={8}
          removeClippedSubviews={true}
          ListEmptyComponent={
            loading ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyTitle}>Searching...</Text>
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Search size={48} color={Colors.textLight} />
                <Text style={styles.emptyTitle}>No results found</Text>
                <Text style={styles.emptySubtitle}>
                  Try searching with different keywords
                </Text>
              </View>
            )
          }
        />
      ) : (
        // Default Content
        <ScrollView style={styles.defaultContent} showsVerticalScrollIndicator={false}>
          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recent Searches</Text>
                <TouchableOpacity onPress={() => setRecentSearches([])}>
                  <Text style={styles.clearText}>Clear</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.recentSearchesContainer}>
                {recentSearches.map((search, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.recentSearchChip}
                    onPress={() => handleQuickSearch(search)}
                  >
                    <Clock size={14} color={Colors.textLight} />
                    <Text style={styles.recentSearchText}>{search}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Popular Searches */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Popular Searches</Text>
            <View style={styles.popularSearchesContainer}>
              {popularSearches.map((search, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.popularSearchChip}
                  onPress={() => handleQuickSearch(search)}
                >
                  <TrendingUp size={14} color={Colors.primary} />
                  <Text style={styles.popularSearchText}>{search}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Browse Categories */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Browse Services</Text>
            <View style={styles.servicesGrid}>
              {allServices.map((service) => (
                <TouchableOpacity
                  key={service.id}
                  style={styles.serviceCard}
                  onPress={() => router.push(service.route)}
                >
                  <View style={[styles.serviceIcon, { backgroundColor: service.color + '20' }]}>
                    <service.icon size={24} color={service.color} />
                  </View>
                  <Text style={styles.serviceTitle}>{service.title}</Text>
                  <Text style={styles.serviceSubtitle}>{service.subtitle}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.white,
    gap: 12,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
  },
  cancelText: {
    fontSize: 15,
    color: Colors.primary,
    fontWeight: '600',
  },
  resultsList: {
    flex: 1,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  resultIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  resultImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  zodiacEmoji: {
    fontSize: 24,
  },
  resultContent: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  resultSubtitle: {
    fontSize: 13,
    color: Colors.textLight,
    marginTop: 2,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginRight: 8,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textLight,
    marginTop: 8,
  },
  defaultContent: {
    flex: 1,
  },
  section: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },
  clearText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '500',
  },
  recentSearchesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  recentSearchChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  recentSearchText: {
    fontSize: 13,
    color: Colors.text,
  },
  popularSearchesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  popularSearchChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary + '10',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  popularSearchText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '500',
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  serviceCard: {
    width: (width - 44) / 2,
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  serviceIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  serviceTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
  },
  serviceSubtitle: {
    fontSize: 11,
    color: Colors.textLight,
    textAlign: 'center',
    marginTop: 2,
  },
});