import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  Search,
  MessageCircle,
  Phone,
  Video,
  Clock,
  Star,
  ChevronRight,
  Calendar,
} from 'lucide-react-native';
import { router } from 'expo-router';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { getConsultationHistory } from '@/services/chat';
import { Logger } from '@/services/logger';

interface RawConsultationData {
  id: string;
  astrologerId: string;
  astrologerName?: string;
  astrologerImage?: string;
  type: 'chat' | 'call' | 'video';
  createdAt: string;
  durationMinutes?: number;
  notes?: string;
  userRating?: number;
  transcript?: string;
  lastMessage?: string;
  status?: string;
}

interface ChatSession {
  id: string;
  astrologerId: string;
  astrologerName: string;
  astrologerImage: string;
  type: 'chat' | 'call' | 'video';
  date: string;
  time: string;
  duration: string;
  topic: string;
  rating?: number;
  isBookmarked: boolean;
  lastMessage?: string;
}

const filterOptions = ['All', 'Chat', 'Call', 'Video'];

export default function ChatHistoryScreen() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!user) return;
      
      try {
        const history = await getConsultationHistory(user.id);
        const mapped: ChatSession[] = (history as unknown as RawConsultationData[]).map((c) => ({
          id: c.id,
          astrologerId: c.astrologerId,
          astrologerName: c.astrologerName || 'Astrologer',
          astrologerImage: c.astrologerImage || 'https://via.placeholder.com/100',
          type: c.type,
          date: c.createdAt,
          time: new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          duration: `${c.durationMinutes || 0} mins`,
          topic: c.notes || 'Consultation',
          rating: c.userRating,
          isBookmarked: false, // Could be handled by a separate table if needed
          lastMessage: c.transcript ? c.transcript.substring(0, 50) + '...' : undefined
        }));
        setSessions(mapped);
      } catch (err) {
        Logger.error('Failed to fetch chat history', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [user]);

  const filteredSessions = sessions.filter((session) => {
    const matchesSearch = session.astrologerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      session.topic.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = selectedFilter === 'All' ||
      session.type.toLowerCase() === selectedFilter.toLowerCase();
    
    return matchesSearch && matchesFilter;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'chat':
        return <MessageCircle color={Colors.primary} size={18} />;
      case 'call':
        return <Phone color="#4CAF50" size={18} />;
      case 'video':
        return <Video color="#E91E63" size={18} />;
      default:
        return <MessageCircle color={Colors.primary} size={18} />;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }
  };

  const viewSessionDetails = (session: ChatSession) => {
    Alert.alert(
      'Session Details',
      `Topic: ${session.topic}\nDuration: ${session.duration}\nRating: ${session.rating || 'Not rated'} stars`,
      [
        { text: 'Book Again', onPress: () => router.push(`/astrologer/${session.astrologerId}`) },
        { text: 'Close', style: 'cancel' },
      ]
    );
  };

  const renderSession = ({ item }: { item: ChatSession }) => (
    <TouchableOpacity
      style={styles.sessionCard}
      onPress={() => viewSessionDetails(item)}
    >
      <Image
        source={{ uri: item.astrologerImage }}
        style={styles.astrologerImage}
        contentFit="cover"
      />
      <View style={styles.sessionInfo}>
        <View style={styles.sessionHeader}>
          <Text style={styles.astrologerName}>{item.astrologerName}</Text>
          <View style={styles.typeBadge}>
            {getTypeIcon(item.type)}
          </View>
        </View>
        <Text style={styles.topicText}>{item.topic}</Text>
        <View style={styles.sessionMeta}>
          <View style={styles.metaItem}>
            <Calendar color={Colors.textLight} size={12} />
            <Text style={styles.metaText}>{formatDate(item.date)}</Text>
          </View>
          <View style={styles.metaItem}>
            <Clock color={Colors.textLight} size={12} />
            <Text style={styles.metaText}>{item.duration}</Text>
          </View>
        </View>
        {item.lastMessage && (
          <Text style={styles.lastMessage} numberOfLines={1}>
            {item.lastMessage}
          </Text>
        )}
      </View>
      <View style={styles.sessionActions}>
        {item.rating && (
          <View style={styles.ratingContainer}>
            <Star color="#FFD700" size={14} fill="#FFD700" />
            <Text style={styles.ratingText}>{item.rating}</Text>
          </View>
        )}
        <ChevronRight color={Colors.textLight} size={20} />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#2196F3', '#42A5F5', '#64B5F6']}
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
            <Text style={styles.headerTitle}>Chat History</Text>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>

        <View style={styles.headerInfo}>
          <Text style={styles.headerSubtitle}>Your Conversations</Text>
          <Text style={styles.headerDescription}>
            Review past consultations and experts
          </Text>
        </View>
      </LinearGradient>

      {/* Search and Filter */}
      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <Search color={Colors.textLight} size={20} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by astrologer or topic..."
            placeholderTextColor={Colors.textLight}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
        >
          {filterOptions.map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterChip,
                selectedFilter === filter && styles.filterChipActive,
              ]}
              onPress={() => setSelectedFilter(filter)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedFilter === filter && styles.filterChipTextActive,
                ]}
              >
                {filter}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Sessions List */}
      <FlatList
        data={filteredSessions}
        renderItem={renderSession}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.sessionsList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
          ) : (
            <View style={styles.emptyContainer}>
              <MessageCircle color={Colors.textLight} size={48} />
              <Text style={styles.emptyText}>No sessions found</Text>
              <Text style={styles.emptySubtext}>
                Start a consultation to see your history here
              </Text>
            </View>
          )
        }
      />

      {/* Stats Footer */}
      {!loading && sessions.length > 0 && (
        <View style={styles.statsFooter}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{sessions.length}</Text>
            <Text style={styles.statLabel}>Total Sessions</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
               {sessions.filter(s => s.type === 'chat').length}
            </Text>
            <Text style={styles.statLabel}>Chats</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {Math.round((sessions.filter((s) => s.rating).reduce((sum, s) => sum + (s.rating || 0), 0) /
                sessions.filter((s) => s.rating).length || 0) * 10) / 10}
            </Text>
            <Text style={styles.statLabel}>Avg Rating</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingBottom: 20,
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
  headerInfo: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  headerDescription: {
    fontSize: 16,
    color: '#FFF',
    fontWeight: '500',
  },
  searchSection: {
    padding: 20,
    paddingBottom: 10,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    marginLeft: 10,
  },
  filterScroll: {
    marginTop: 12,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.white,
    marginRight: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  filterChipText: {
    fontSize: 13,
    color: Colors.text,
  },
  filterChipTextActive: {
    color: '#FFF',
  },
  sessionsList: {
    padding: 20,
    paddingTop: 10,
    paddingBottom: 100,
  },
  sessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  astrologerImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  astrologerName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
  },
  typeBadge: {
    marginLeft: 8,
  },
  topicText: {
    fontSize: 13,
    color: Colors.primary,
    marginTop: 2,
  },
  sessionMeta: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: Colors.textLight,
  },
  lastMessage: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 6,
    fontStyle: 'italic',
  },
  sessionActions: {
    alignItems: 'center',
    gap: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
  },
  bookmarkButton: {
    padding: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textLight,
    marginTop: 4,
  },
  statsFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: Colors.white,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.primary,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textLight,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.border,
  },
});
