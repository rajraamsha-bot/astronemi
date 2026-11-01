/**
 * Consultation Integration Tests
 * 
 * Tests for complete consultation booking flow including:
 * - Creating consultation
 * - Starting consultation
 * - Sending messages
 * - Ending consultation
 * - Submitting review
 */

jest.mock('@/lib/supabase', () => {
  const consultations: any[] = [];
  const messages: any[] = [];
  const astrologers: any[] = [];
  let consultationCounter = 0;

  const chain = {
    _table: '',
    _pendingUpdate: null as any,
    _filteredData: null as any,
    _single: false,

    insert: jest.fn(function(this: any, obj: any) {
      const records = Array.isArray(obj) ? obj : [obj];
      const newRecords = records.map(r => {
        const newRec = { ...r };
        if (!newRec.id) {
          if (this._table === 'chat_messages') {
            newRec.id = `m_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
          } else if (this._table === 'consultations') {
            newRec.id = `c_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
          } else {
            newRec.id = `gen_${Date.now()}`;
          }
        }
        if (!newRec.created_at) {
          newRec.created_at = new Date().toISOString();
        }
        return newRec;
      });

      if (this._table === 'chat_messages') {
        messages.push(...newRecords);
      } else if (this._table === 'consultations') {
        consultations.push(...newRecords);
      }
      this._filteredData = newRecords;
      return this;
    }),

    select: jest.fn(function(this: any) {
      return this;
    }),

    update: jest.fn(function(this: any, obj: any) {
      this._pendingUpdate = obj;
      return this;
    }),

    eq: jest.fn(function(this: any, field: string, value: any) {
      if (this._pendingUpdate) {
        let targetList: any[] = [];
        if (this._table === 'consultations') {
          targetList = consultations;
        } else if (this._table === 'chat_messages') {
          targetList = messages;
        } else if (this._table === 'astrologers') {
          targetList = astrologers;
        }

        targetList.forEach(item => {
          if (item[field] === value) {
            Object.assign(item, this._pendingUpdate);
          }
        });
        return this;
      }

      let sourceList: any[] = [];
      if (this._table === 'consultations') {
        sourceList = consultations;
      } else if (this._table === 'chat_messages') {
        sourceList = messages;
      } else if (this._table === 'astrologers') {
        sourceList = astrologers;
      }

      this._filteredData = (this._filteredData || sourceList).filter((item: any) => item[field] === value);
      return this;
    }),

    not: jest.fn(function(this: any) {
      return this;
    }),

    order: jest.fn(function(this: any) {
      return this;
    }),

    limit: jest.fn(function(this: any, val: number) {
      if (this._filteredData) {
        this._filteredData = this._filteredData.slice(0, val);
      }
      return this;
    }),

    single: jest.fn(function(this: any) {
      this._single = true;
      return this;
    }),

    then: function(this: any, resolve: any) {
      let resultData: any = null;
      let sourceList: any[] = [];

      if (this._table === 'consultations') {
        sourceList = consultations;
      } else if (this._table === 'chat_messages') {
        sourceList = messages;
      } else if (this._table === 'astrologers') {
        sourceList = astrologers;
      }

      const currentData = this._filteredData || sourceList;

      if (this._single) {
        resultData = currentData.length > 0 ? currentData[0] : null;
      } else {
        resultData = currentData;
      }

      this._single = false;
      this._pendingUpdate = null;
      this._filteredData = null;

      resolve({ data: resultData, error: null });
    }
  };

  const rpcCalls: Array<{ name: string; args: any }> = [];
  const client = {
    rpc: jest.fn((fnName, args) => {
      rpcCalls.push({ name: fnName, args });
      if (fnName === 'secure_create_consultation') {
        consultationCounter++;
        const id = `c${consultationCounter}`;
        consultations.push({
          id,
          user_id: 'user-1',
          astrologer_id: args.p_astrologer_id,
          type: args.p_type,
          status: 'pending',
          created_at: new Date().toISOString(),
        });
        return Promise.resolve({
          data: { success: true, id },
          error: null,
        });
      }
      if (fnName === 'accept_consultation') {
        const c = consultations.find((c: any) => c.id === args.p_consultation_id);
        if (c) {
          c.status = 'active';
          c.start_time = new Date().toISOString();
        }
        return Promise.resolve({ data: { success: true }, error: null });
      }
      if (fnName === 'end_consultation') {
        // Simulate the server-side end_consultation RPC (migration 024):
        // derives duration from the trusted start_time and writes the
        // completed status + billed amount.
        const c = consultations.find((c: any) => c.id === args.p_consultation_id);
        if (c) {
          const start = c.start_time ? new Date(c.start_time).getTime() : Date.now();
          const durationMinutes = Math.max(
            0,
            Math.round((Date.now() - start) / 60000),
          );
          c.status = 'completed';
          c.duration_minutes = durationMinutes;
          c.total_amount = (c.total_amount ?? 0) + durationMinutes * 10;
          c.end_time = new Date().toISOString();
        }
        return Promise.resolve({ data: { success: true }, error: null });
      }
      if (fnName === 'complete_consultation') {
        const c = consultations.find((c: any) => c.id === args.p_consultation_id);
        if (c) {
          c.status = 'completed';
          c.end_time = new Date().toISOString();
        }
        return Promise.resolve({ data: { success: true }, error: null });
      }
      if (fnName === 'update_astrologer_rating') {
        return Promise.resolve({ data: { success: true }, error: null });
      }
      if (fnName === 'rate_consultation') {
        // Mirrors migration 015: the RPC verifies ownership + 'completed'
        // status server-side and writes the rating onto the consultation.
        const c = consultations.find((c: any) => c.id === args.p_consultation_id);
        if (c) {
          c.user_rating = args.p_user_rating;
          c.user_review = args.p_user_review ?? null;
        }
        return Promise.resolve({ data: null, error: null });
      }
      if (fnName === 'send_consultation_message') {
        // Mirrors migration 041: the RPC derives sender_id/sender_type from
        // auth — the caller only supplies the consultation id and the text.
        const newMsg = {
          id: `m_${Date.now()}_${messages.length + 1}`,
          consultation_id: args.p_consultation_id,
          sender_id: 'user-1',
          sender_type: 'user',
          message: args.p_message,
          is_read: false,
          created_at: new Date().toISOString(),
        };
        messages.push(newMsg);
        return Promise.resolve({ data: { success: true, ...newMsg }, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    }),
    from: jest.fn((table: string) => {
      chain._table = table;
      chain._pendingUpdate = null;
      chain._filteredData = null;
      chain._single = false;
      return chain;
    }),
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn(),
    })),
    removeChannel: jest.fn(),
    _reset: () => {
      consultations.length = 0;
      messages.length = 0;
      astrologers.length = 0;
      rpcCalls.length = 0;
      consultationCounter = 0;
    },
    _consultations: consultations,
    _messages: messages,
    _astrologers: astrologers,
    _rpcCalls: rpcCalls,
  };

  return {
    supabase: client,
    isSupabaseConfigured: jest.fn(() => true),
  };
});

import { supabase } from '@/lib/supabase';
import {
  createConsultation,
  startConsultation,
  endConsultation,
  sendMessage,
  getMessages,
  rateConsultation,
} from '@/services/chat';

describe('Consultation Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    if ((supabase as any)._reset) {
      (supabase as any)._reset();
    }
  });

  describe('Complete Consultation Flow', () => {
    it('should create, start, and complete a chat consultation', async () => {
      const consultation = await createConsultation('user-1', 'astro-1', 'chat');

      expect(consultation).not.toBeNull();
      expect(consultation?.id).toBe('c1');
      expect(consultation?.type).toBe('chat');
    });

    it('should start a pending consultation via RPC', async () => {
      (supabase as any)._consultations.push({
        id: 'c1',
        user_id: 'user-1',
        astrologer_id: 'astro-1',
        type: 'chat',
        status: 'pending',
        created_at: new Date().toISOString(),
      });

      const result = await startConsultation('c1');

      expect(result).toBe(true);
      expect((supabase as any)._rpcCalls.some((c: any) => c.name === 'accept_consultation')).toBe(true);
    });

    it('should send messages during consultation', async () => {
      const message = await sendMessage('c1', 'user', 'user-1', 'Hello!');

      expect(message).not.toBeNull();
      expect(message?.message).toBe('Hello!');
      expect(message?.senderType).toBe('user');
    });

    it('should retrieve messages for a consultation', async () => {
      const mockMessages = [
        { id: 'm1', message: 'Hello!', sender_type: 'user' },
        { id: 'm2', message: 'Hi there!', sender_type: 'astrologer' },
      ];

      (supabase as any)._messages.push(...mockMessages.map(m => ({
        id: m.id,
        consultation_id: 'c1',
        sender_type: m.sender_type,
        sender_id: 'sender-1',
        message: m.message,
        is_read: false,
        created_at: new Date().toISOString(),
      })));

      const messages = await getMessages('c1');

      expect(Array.isArray(messages)).toBe(true);
      expect(messages).toHaveLength(2);
    });

    it('should end consultation (server calculates duration and amount)', async () => {
      const startTime = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      (supabase as any)._consultations.push({
        id: 'c1',
        user_id: 'user-1',
        astrologer_id: 'astro-1',
        type: 'chat',
        status: 'active',
        start_time: startTime,
        created_at: startTime,
      });

      const result = await endConsultation('c1');

      expect(result).toBe(true);
      expect((supabase as any)._consultations[0].status).toBe('completed');
      expect((supabase as any)._consultations[0].duration_minutes).toBeGreaterThanOrEqual(30);
      expect((supabase as any)._consultations[0].total_amount).toBeGreaterThanOrEqual(0);
    });

    it('should rate consultation after completion', async () => {
      (supabase as any)._consultations.push({
        id: 'c1',
        user_id: 'user-1',
        astrologer_id: 'astro-1',
        type: 'chat',
        status: 'completed',
        created_at: new Date().toISOString(),
      });

      const result = await rateConsultation('c1', 5, 'Great session!');

      expect(result).toBe(true);
      expect((supabase as any)._consultations[0].user_rating).toBe(5);
      expect((supabase as any)._consultations[0].user_review).toBe('Great session!');
    });
  });

  describe('Consultation Type Integration', () => {
    it('should handle chat consultation flow', async () => {
      const consultation = await createConsultation('user-1', 'astro-1', 'chat');
      expect(consultation?.type).toBe('chat');
    });

    it('should handle call consultation flow', async () => {
      const consultation = await createConsultation('user-1', 'astro-1', 'call');
      expect(consultation?.type).toBe('call');
    });

    it('should handle video consultation flow', async () => {
      const consultation = await createConsultation('user-1', 'astro-1', 'video');
      expect(consultation?.type).toBe('video');
    });
  });

  describe('Message Integration', () => {
    it('should send multiple messages in sequence', async () => {
      const msg1 = await sendMessage('c1', 'user', 'user-1', 'Message 1');
      const msg2 = await sendMessage('c1', 'user', 'user-1', 'Message 2');
      const msg3 = await sendMessage('c1', 'user', 'user-1', 'Message 3');

      expect(msg1).not.toBeNull();
      expect(msg2).not.toBeNull();
      expect(msg3).not.toBeNull();
      expect((supabase as any)._messages).toHaveLength(3);
    });

    it('should handle messages from both user and astrologer', async () => {
      // The server (send_consultation_message, migration 041) derives the
      // sender_type from auth; the caller-supplied senderType/senderId are no
      // longer honored, so we assert both sends were recorded by the RPC.
      const userMsg = await sendMessage('c1', 'user', 'user-1', 'User message');
      const astrologerMsg = await sendMessage('c1', 'astrologer', 'astro-1', 'Astrologer message');

      expect(userMsg).not.toBeNull();
      expect(astrologerMsg).not.toBeNull();
      expect((supabase as any)._messages).toHaveLength(2);
      const sends = (supabase as any)._rpcCalls.filter(
        (c: any) => c.name === 'send_consultation_message'
      );
      expect(sends).toHaveLength(2);
    });
  });

  describe('Rating Integration', () => {
    it('should rate consultation with 5 stars', async () => {
      (supabase as any)._consultations.push({
        id: 'c1',
        user_id: 'user-1',
        astrologer_id: 'astro-1',
        type: 'chat',
        status: 'completed',
        created_at: new Date().toISOString(),
      });

      const result = await rateConsultation('c1', 5, 'Excellent!');

      expect(result).toBe(true);
      expect((supabase as any)._consultations[0].user_rating).toBe(5);
    });

    it('should rate consultation with 1 star', async () => {
      (supabase as any)._consultations.push({
        id: 'c1',
        user_id: 'user-1',
        astrologer_id: 'astro-1',
        type: 'chat',
        status: 'completed',
        created_at: new Date().toISOString(),
      });

      const result = await rateConsultation('c1', 1, 'Poor experience');

      expect(result).toBe(true);
      expect((supabase as any)._consultations[0].user_rating).toBe(1);
    });

    it('should rate consultation without comment', async () => {
      (supabase as any)._consultations.push({
        id: 'c1',
        user_id: 'user-1',
        astrologer_id: 'astro-1',
        type: 'chat',
        status: 'completed',
        created_at: new Date().toISOString(),
      });

      const result = await rateConsultation('c1', 4);

      expect(result).toBe(true);
      expect((supabase as any)._consultations[0].user_rating).toBe(4);
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle consultation creation failure', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValueOnce({ data: null, error: { message: 'DB error' } });

      const consultation = await createConsultation('user-1', 'astro-1', 'chat');

      expect(consultation).toBeNull();
    });

    it('should handle message sending failure', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: null,
        error: { message: 'Send failed' },
      });

      const message = await sendMessage('c1', 'user', 'user-1', 'Test');

      expect(message).toBeNull();
    });

    it('should handle empty message list', async () => {
      const messages = await getMessages('c1');

      expect(messages).toEqual([]);
    });
  });
});
