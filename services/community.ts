/**
 * Community service — reads and writes the forum tables in Supabase.
 * Joined with `users` so we can render each post with the author's name
 * and avatar without doing a second query per card.
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Logger } from './logger';

export interface ForumAuthor {
  id: string;
  name: string;
  avatar: string | null;
}

export interface ForumPost {
  id: string;
  category: string;
  title: string;
  content: string;
  tags: string[];
  likeCount: number;
  replyCount: number;
  viewCount: number;
  isPinned: boolean;
  isHot: boolean;
  createdAt: string;
  updatedAt: string;
  author: ForumAuthor;
}

export interface ForumReply {
  id: string;
  postId: string;
  content: string;
  likeCount: number;
  createdAt: string;
  author: ForumAuthor;
}

export interface CreatePostInput {
  title: string;
  content: string;
  category: string;
  tags?: string[];
}

export interface CreateReplyInput {
  postId: string;
  content: string;
}

interface PostRow {
  id: string;
  user_id: string;
  category: string;
  title: string;
  content: string;
  tags: string[] | null;
  like_count: number;
  reply_count: number;
  view_count: number;
  is_pinned: boolean;
  is_hot: boolean;
  created_at: string;
  updated_at: string;
  users?: { id: string; name: string | null; avatar_url: string | null } | Array<{ id: string; name: string | null; avatar_url: string | null }> | null;
}

function mapAuthor(row: PostRow): ForumAuthor {
  const user = Array.isArray(row.users) ? row.users[0] : row.users;
  return {
    id: user?.id ?? row.user_id,
    name: user?.name ?? 'Community member',
    avatar: user?.avatar_url ?? null,
  };
}

function mapPost(row: PostRow): ForumPost {
  return {
    id: row.id,
    category: row.category,
    title: row.title,
    content: row.content,
    tags: row.tags ?? [],
    likeCount: row.like_count ?? 0,
    replyCount: row.reply_count ?? 0,
    viewCount: row.view_count ?? 0,
    isPinned: row.is_pinned,
    isHot: row.is_hot,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    author: mapAuthor(row),
  };
}

export interface ListPostsOptions {
  category?: string;
  search?: string;
  limit?: number;
}

export async function listForumPosts(options: ListPostsOptions = {}): Promise<ForumPost[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    let query = supabase
      .from('forum_posts')
      .select('*, users!forum_posts_user_id_fkey(id, name, avatar_url)')
      .eq('is_hidden', false)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(options.limit ?? 50);

    if (options.category && options.category !== 'all') {
      query = query.eq('category', options.category);
    }
    if (options.search && options.search.trim()) {
      const term = options.search.trim();
      query = query.or(`title.ilike.%${term}%,content.ilike.%${term}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map(row => mapPost(row as PostRow));
  } catch (err) {
    Logger.error('Failed to list forum posts', err);
    return [];
  }
}

export async function createForumPost(
  userId: string,
  input: CreatePostInput,
): Promise<ForumPost | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await supabase
      .from('forum_posts')
      .insert({
        user_id: userId,
        title: input.title.trim(),
        content: input.content.trim(),
        category: input.category,
        tags: input.tags ?? [],
      })
      .select('*, users!forum_posts_user_id_fkey(id, name, avatar_url)')
      .single();
    if (error) throw error;
    return mapPost(data as PostRow);
  } catch (err) {
    Logger.error('Failed to create forum post', err);
    return null;
  }
}

export async function listForumReplies(postId: string): Promise<ForumReply[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const { data, error } = await supabase
      .from('forum_replies')
      .select('*, users!forum_replies_user_id_fkey(id, name, avatar_url)')
      .eq('post_id', postId)
      .eq('is_hidden', false)
      .order('created_at', { ascending: true });
    if (error) throw error;
    type ReplyRow = {
      id: string;
      post_id: string;
      user_id: string;
      content: string;
      like_count: number;
      created_at: string;
      users?: { id: string; name: string | null; avatar_url: string | null } | Array<{ id: string; name: string | null; avatar_url: string | null }> | null;
    };
    return (data ?? []).map((row: ReplyRow) => {
      const user = Array.isArray(row.users) ? row.users[0] : row.users;
      return {
        id: row.id,
        postId: row.post_id,
        content: row.content,
        likeCount: row.like_count ?? 0,
        createdAt: row.created_at,
        author: {
          id: user?.id ?? row.user_id,
          name: user?.name ?? 'Community member',
          avatar: user?.avatar_url ?? null,
        },
      };
    });
  } catch (err) {
    Logger.error('Failed to list forum replies', err);
    return [];
  }
}

export async function createForumReply(
  userId: string,
  input: CreateReplyInput,
): Promise<ForumReply | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await supabase
      .from('forum_replies')
      .insert({
        user_id: userId,
        post_id: input.postId,
        content: input.content.trim(),
      })
      .select('*, users!forum_replies_user_id_fkey(id, name, avatar_url)')
      .single();
    if (error) throw error;
    const row = data as {
      id: string;
      post_id: string;
      user_id: string;
      content: string;
      like_count: number;
      created_at: string;
      users?: { id: string; name: string | null; avatar_url: string | null } | null;
    };
    const user = row.users;
    return {
      id: row.id,
      postId: row.post_id,
      content: row.content,
      likeCount: row.like_count ?? 0,
      createdAt: row.created_at,
      author: {
        id: user?.id ?? row.user_id,
        name: user?.name ?? 'You',
        avatar: user?.avatar_url ?? null,
      },
    };
  } catch (err) {
    Logger.error('Failed to create forum reply', err);
    return null;
  }
}

export async function toggleForumLike(
  userId: string,
  postId: string,
): Promise<{ liked: boolean } | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    // Check current state
    const { data: existing, error: selErr } = await supabase
      .from('forum_likes')
      .select('user_id')
      .eq('user_id', userId)
      .eq('post_id', postId)
      .maybeSingle();
    if (selErr) throw selErr;

    if (existing) {
      const { error } = await supabase
        .from('forum_likes')
        .delete()
        .eq('user_id', userId)
        .eq('post_id', postId);
      if (error) throw error;
      return { liked: false };
    }

    const { error } = await supabase
      .from('forum_likes')
      .insert({ user_id: userId, post_id: postId });
    if (error) throw error;
    return { liked: true };
  } catch (err) {
    Logger.error('Failed to toggle forum like', err);
    return null;
  }
}
