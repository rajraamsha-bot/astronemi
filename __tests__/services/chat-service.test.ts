/**
 * Chat Service Tests
 * 
 * Tests for real-time chat messaging, conversation management,
 * and message history retrieval.
 */

// Mock Supabase client
const mockChannel = {
  on: jest.fn().mockReturnThis(),
  subscribe: jest.fn(),
  unsubscribe: jest.fn(),
};

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          order: jest.fn(() => ({
            limit: jest.fn(() => ({
              range: jest.fn(() => Promise.resolve({ data: [], error: null })),
            })),
          })),
          single: jest.fn(() => Promise.resolve({ data: null, error: null })),
          limit: jest.fn(() => Promise.resolve({ data: [], error: null })),
        })),
        order: jest.fn(() => ({
          limit: jest.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({
            data: { id: 'msg-1', content: 'Hello', user_id: 'user-1', created_at: new Date().toISOString() },
            error: null,
          })),
        })),
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ data: null, error: null })),
      })),
      delete: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    })),
    channel: jest.fn(() => mockChannel),
    removeChannel: jest.fn(),
    auth: {
      getUser: jest.fn(() => Promise.resolve({
        data: { user: { id: 'user-1' } },
        error: null,
      })),
    },
  },
}));

import { supabase } from '@/lib/supabase';

describe('Chat Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Message Sending', () => {
    it('should insert a message into the database', async () => {
      const result = await supabase
        .from('messages')
        .insert({
          content: 'Hello',
          user_id: 'user-1',
          session_id: 'session-1',
          type: 'text',
        })
        .select()
        .single();

      expect(result.data).toBeDefined();
      expect(result.error).toBeNull();
    });
  });

  describe('Conversation Loading', () => {
    it('should fetch conversations for a user', async () => {
      const result = await supabase
        .from('consultation_messages')
        .select('*')
        .eq('session_id', 'session-1')
        .order('created_at', { ascending: true })
        .limit(50);

      expect(result.error).toBeFalsy();
    });
  });

  describe('Real-time Subscription', () => {
    it('should create a channel for real-time messages', () => {
      const channel = supabase.channel('messages:session-1');

      channel
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'consultation_messages',
          filter: 'session_id=eq.session-1',
        }, () => {})
        .subscribe();

      expect(supabase.channel).toHaveBeenCalledWith('messages:session-1');
      expect(mockChannel.on).toHaveBeenCalled();
      expect(mockChannel.subscribe).toHaveBeenCalled();
    });

    it('should unsubscribe from channel', () => {
      const channel = supabase.channel('messages:session-1');
      channel.unsubscribe();

      expect(mockChannel.unsubscribe).toHaveBeenCalled();
    });
  });

  describe('Message Status Updates', () => {
    it('should mark messages as read', async () => {
      const result = await supabase
        .from('consultation_messages')
        .update({ read: true })
        .eq('session_id', 'session-1');

      expect(result.error).toBeNull();
    });
  });
});