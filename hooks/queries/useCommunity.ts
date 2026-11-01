/**
 * React Query wrappers for the community forum.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createForumPost,
  createForumReply,
  listForumPosts,
  listForumReplies,
  toggleForumLike,
  type CreatePostInput,
  type CreateReplyInput,
  type ForumPost,
  type ForumReply,
} from '@/services/community';

export function useForumPosts(
  options: { category?: string; search?: string; limit?: number } = {},
) {
  return useQuery<ForumPost[]>({
    queryKey: ['forum-posts', options.category ?? 'all', options.search ?? '', options.limit ?? 50],
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    queryFn: () => listForumPosts(options),
  });
}

export function useForumReplies(postId: string | null | undefined) {
  return useQuery<ForumReply[]>({
    queryKey: ['forum-replies', postId ?? 'none'],
    enabled: Boolean(postId),
    staleTime: 15 * 1000,
    queryFn: () => (postId ? listForumReplies(postId) : Promise.resolve([])),
  });
}

export function useCreateForumPost(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreatePostInput) => {
      if (!userId) throw new Error('You must be signed in to post');
      const post = await createForumPost(userId, input);
      if (!post) throw new Error('Could not create the post');
      return post;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['forum-posts'] });
    },
  });
}

export function useCreateForumReply(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateReplyInput) => {
      if (!userId) throw new Error('You must be signed in to reply');
      const reply = await createForumReply(userId, input);
      if (!reply) throw new Error('Could not create the reply');
      return reply;
    },
    onSuccess: (_reply, input) => {
      qc.invalidateQueries({ queryKey: ['forum-replies', input.postId] });
      qc.invalidateQueries({ queryKey: ['forum-posts'] });
    },
  });
}

export function useToggleForumLike(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (postId: string) => {
      if (!userId) throw new Error('You must be signed in to like a post');
      const result = await toggleForumLike(userId, postId);
      if (!result) throw new Error('Could not update like');
      return { postId, ...result };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['forum-posts'] });
    },
  });
}
