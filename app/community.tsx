/**
 * Community forum — reads real posts from Supabase, lets signed-in users
 * post and like. Replies live on a detail route (future).
 *
 * Design goals:
 *   • Fast list with pinned posts first, then newest.
 *   • Category tabs driven by a static list matching the seed data.
 *   • "New post" modal gated behind auth; unauthenticated users see a
 *     prompt to sign in.
 */

import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  Flame,
  Heart,
  MessageCircle,
  Pin,
  Plus,
  Search,
  Send,
  Star,
  TrendingUp,
  Users,
  X,
} from 'lucide-react-native';
import { router } from 'expo-router';
import Colors from '@/constants/colors';
import { useUser } from '@/contexts/UserContext';
import {
  useCreateForumPost,
  useForumPosts,
  useToggleForumLike,
} from '@/hooks/queries/useCommunity';
import { relativeTime } from '@/services/cms';
import type { ForumPost } from '@/services/community';
import { FeatureErrorBoundary } from '@/components/FeatureErrorBoundary';

const CATEGORIES = [
  { id: 'Kundli & Birth Chart', color: '#FF9800', icon: Star },
  { id: 'Horoscope Discussion', color: '#2196F3', icon: TrendingUp },
  { id: 'Marriage & Compatibility', color: '#E91E63', icon: Heart },
  { id: 'Career & Finance', color: '#4CAF50', icon: Flame },
  { id: 'Remedies & Rituals', color: '#9C27B0', icon: Pin },
  { id: 'Gemstones & Rudraksha', color: '#00BCD4', icon: Star },
] as const;

export default function CommunityScreen() {
  const { user } = useUser();
  const [active, setActive] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [showCompose, setShowCompose] = useState(false);

  const { data: posts = [], isLoading, refetch, isRefetching } = useForumPosts({
    category: active === 'all' ? undefined : active,
    search: search.trim() || undefined,
  });
  const createPost = useCreateForumPost(user?.id);
  const toggleLike = useToggleForumLike(user?.id);

  const categoriesWithAll = useMemo(
    () => [{ id: 'all', color: Colors.primary, label: 'All' }, ...CATEGORIES.map(c => ({ id: c.id, color: c.color, label: c.id }))],
    [],
  );

  const handleNewPost = () => {
    if (!user) {
      Alert.alert('Sign in required', 'You need to sign in before posting.');
      return;
    }
    setShowCompose(true);
  };

  const handleLike = (postId: string) => {
    if (!user) {
      Alert.alert('Sign in required', 'Sign in to like posts.');
      return;
    }
    toggleLike.mutate(postId);
  };

  return (
    <FeatureErrorBoundary featureName="Community">
    <View style={styles.container}>
      <LinearGradient colors={['#6B46C1', '#805AD5', '#9F7AEA']} style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerBar}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <ArrowLeft color="#FFF" size={22} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Community</Text>
            <TouchableOpacity style={styles.backButton} onPress={handleNewPost}>
              <Plus color="#FFF" size={22} />
            </TouchableOpacity>
          </View>
          <View style={styles.searchBar}>
            <Search color={Colors.textLight} size={16} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search discussions…"
              placeholderTextColor={Colors.textLight}
              style={styles.searchInput}
              autoCorrect={false}
              returnKeyType="search"
            />
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        {categoriesWithAll.map(c => (
          <TouchableOpacity
            key={c.id}
            style={[
              styles.chip,
              active === c.id && { backgroundColor: c.color, borderColor: c.color },
            ]}
            onPress={() => setActive(c.id)}
          >
            <Text
              style={[
                styles.chipText,
                active === c.id && styles.chipTextActive,
              ]}
            >
              {c.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {isLoading ? (
        <View style={styles.stateBox}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : posts.length === 0 ? (
        <View style={styles.stateBox}>
          <Users color={Colors.textLight} size={40} />
          <Text style={styles.stateTitle}>No discussions yet</Text>
          <Text style={styles.stateText}>
            Be the first to start a thread in this category.
          </Text>
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={p => p.id}
          contentContainerStyle={styles.listContent}
          refreshing={isRefetching}
          onRefresh={refetch}
          renderItem={({ item }) => (
            <PostCard post={item} onLike={() => handleLike(item.id)} />
          )}
        />
      )}

      {/* Floating compose button (accessible fallback for screens without header plus) */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleNewPost}
        accessibilityRole="button"
        accessibilityLabel="New post"
      >
        <Plus color="#FFF" size={22} />
      </TouchableOpacity>

      <ComposeModal
        visible={showCompose}
        isSubmitting={createPost.isPending}
        onClose={() => setShowCompose(false)}
        onSubmit={async input => {
          try {
            await createPost.mutateAsync(input);
            setShowCompose(false);
          } catch (err) {
            Alert.alert('Could not post', (err as Error).message || 'Please try again.');
          }
        }}
      />
    </View>
    </FeatureErrorBoundary>
  );
}

function PostCard({ post, onLike }: { post: ForumPost; onLike: () => void }) {
  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.85}>
      {post.isPinned && (
        <View style={styles.pinnedBadge}>
          <Pin size={10} color="#FFF" />
          <Text style={styles.pinnedText}>Pinned</Text>
        </View>
      )}

      <View style={styles.cardHeader}>
        {post.author.avatar ? (
          <Image source={{ uri: post.author.avatar }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarFallbackText}>{post.author.name.charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.authorName}>{post.author.name}</Text>
          <Text style={styles.headerMeta}>
            {post.category} · {relativeTime(post.createdAt)}
          </Text>
        </View>
        {post.isHot && (
          <View style={styles.hotBadge}>
            <Flame color="#FFF" size={10} />
            <Text style={styles.hotText}>Hot</Text>
          </View>
        )}
      </View>

      <Text style={styles.title}>{post.title}</Text>
      <Text style={styles.content} numberOfLines={3}>
        {post.content}
      </Text>

      {post.tags.length > 0 && (
        <View style={styles.tagsRow}>
          {post.tags.slice(0, 3).map(t => (
            <View key={t} style={styles.tag}>
              <Text style={styles.tagText}>#{t}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.cardFooter}>
        <TouchableOpacity style={styles.footerItem} onPress={onLike} accessibilityRole="button">
          <Heart size={16} color={Colors.textLight} />
          <Text style={styles.footerText}>{post.likeCount}</Text>
        </TouchableOpacity>
        <View style={styles.footerItem}>
          <MessageCircle size={16} color={Colors.textLight} />
          <Text style={styles.footerText}>{post.replyCount}</Text>
        </View>
        <View style={styles.footerItem}>
          <Users size={16} color={Colors.textLight} />
          <Text style={styles.footerText}>{post.viewCount} views</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function ComposeModal({
  visible,
  isSubmitting,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (input: {
    title: string;
    content: string;
    category: string;
    tags: string[];
  }) => Promise<void>;
}) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<string>(CATEGORIES[0].id);
  const [tagsText, setTagsText] = useState('');

  const reset = () => {
    setTitle('');
    setContent('');
    setCategory(CATEGORIES[0].id);
    setTagsText('');
  };

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) {
      Alert.alert('Missing details', 'Give your post a title and a body.');
      return;
    }
    const tags = tagsText
      .split(',')
      .map(t => t.trim())
      .filter(Boolean)
      .slice(0, 5);
    await onSubmit({
      title: title.trim(),
      content: content.trim(),
      category,
      tags,
    });
    reset();
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={handleClose} accessibilityLabel="Close composer">
            <X color={Colors.text} size={22} />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>New post</Text>
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isSubmitting}
            accessibilityRole="button"
          >
            {isSubmitting ? (
              <ActivityIndicator color={Colors.primary} />
            ) : (
              <Send color={Colors.primary} size={20} />
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.modalBody}>
          <Text style={styles.label}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {CATEGORIES.map(c => (
              <TouchableOpacity
                key={c.id}
                style={[
                  styles.chip,
                  category === c.id && { backgroundColor: c.color, borderColor: c.color },
                ]}
                onPress={() => setCategory(c.id)}
              >
                <Text style={[styles.chipText, category === c.id && styles.chipTextActive]}>
                  {c.id}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.label}>Title</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Give your post a clear title"
            placeholderTextColor={Colors.textLight}
            maxLength={200}
          />

          <Text style={styles.label}>Body</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            value={content}
            onChangeText={setContent}
            multiline
            textAlignVertical="top"
            placeholder="Share your question, insight, or experience."
            placeholderTextColor={Colors.textLight}
          />

          <Text style={styles.label}>Tags (optional, comma-separated)</Text>
          <TextInput
            style={styles.input}
            value={tagsText}
            onChangeText={setTagsText}
            placeholder="Saturn, Transit, Sade Sati"
            placeholderTextColor={Colors.textLight}
            autoCapitalize="none"
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingBottom: 16 },
  headerBar: {
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
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: Colors.text },
  chipRow: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: Colors.white,
    marginRight: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipText: { fontSize: 12, fontWeight: '600', color: Colors.text },
  chipTextActive: { color: '#FFF' },
  stateBox: { padding: 40, alignItems: 'center', gap: 8, flex: 1, justifyContent: 'center' },
  stateTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginTop: 8 },
  stateText: { fontSize: 13, color: Colors.textLight, textAlign: 'center' },
  listContent: { padding: 16, paddingBottom: 96 },

  card: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
  },
  pinnedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: '#FF9800',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  pinnedText: { color: '#FFF', fontSize: 10, fontWeight: '700' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#eee' },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
  },
  avatarFallbackText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  authorName: { fontSize: 14, fontWeight: '700', color: Colors.text },
  headerMeta: { fontSize: 11, color: Colors.textLight },
  hotBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#E53935',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  hotText: { color: '#FFF', fontSize: 10, fontWeight: '700' },
  title: { fontSize: 15, fontWeight: '700', color: Colors.text },
  content: { fontSize: 13, color: Colors.textLight, lineHeight: 18 },
  tagsRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 2 },
  tag: {
    backgroundColor: `${Colors.primary}15`,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagText: { color: Colors.primary, fontSize: 10, fontWeight: '700' },
  cardFooter: {
    flexDirection: 'row',
    gap: 18,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  footerItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  footerText: { fontSize: 12, color: Colors.textLight, fontWeight: '600' },

  fab: {
    position: 'absolute',
    right: 20,
    bottom: 28,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.white,
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  modalBody: { padding: 16, paddingBottom: 40, gap: 12 },
  label: { fontSize: 12, fontWeight: '700', color: Colors.text, marginTop: 4 },
  input: {
    backgroundColor: Colors.white,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  textarea: { minHeight: 140 },
});
