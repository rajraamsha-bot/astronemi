/**
 * Chat Service Tests
 */

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ error: null })),
      })),
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          order: jest.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
    })),
    channel: jest.fn(() => ({
      on: jest.fn(() => ({
        subscribe: jest.fn(),
      })),
      subscribe: jest.fn(),
    })),
    removeChannel: jest.fn(),
  },
  isSupabaseConfigured: jest.fn(() => false),
  subscribeToChat: jest.fn(),
}));

import {
  createConsultation,
  startConsultation,
  endConsultation,
  sendMessage,
  getMessages,
  subscribeToChatMessages,
  rateConsultation,
} from '@/services/chat';

describe('Chat Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createConsultation', () => {
    it('should create a new consultation', async () => {
      const consultation = await createConsultation(
        'user123',
        'astrologer456',
        'chat'
      );
      
      expect(consultation).not.toBeNull();
      expect(consultation?.userId).toBe('user123');
      expect(consultation?.astrologerId).toBe('astrologer456');
      expect(consultation?.type).toBe('chat');
      expect(consultation?.status).toBe('pending');
    });

    it('should create consultation with call type', async () => {
      const consultation = await createConsultation(
        'user123',
        'astrologer456',
        'call'
      );
      
      expect(consultation?.type).toBe('call');
    });

    it('should create consultation with video type', async () => {
      const consultation = await createConsultation(
        'user123',
        'astrologer456',
        'video'
      );
      
      expect(consultation?.type).toBe('video');
    });

    it('should initialize with zero duration and amount', async () => {
      const consultation = await createConsultation(
        'user123',
        'astrologer456',
        'chat'
      );
      
      expect(consultation?.durationMinutes).toBe(0);
      expect(consultation?.totalAmount).toBe(0);
    });
  });

  describe('startConsultation', () => {
    it('should start a consultation', async () => {
      const result = await startConsultation('consultation123');
      expect(result).toBe(true);
    });

    it('should return true even for non-existent consultation (fallback)', async () => {
      const result = await startConsultation('nonexistent');
      expect(result).toBe(true);
    });
  });

  describe('endConsultation', () => {
    it('should end a consultation', async () => {
      const result = await endConsultation('consultation123', 30, 150);
      expect(result).toBe(true);
    });

    it('should accept various duration values', async () => {
      const result = await endConsultation('consultation123', 60, 300);
      expect(result).toBe(true);
    });

    it('should handle zero duration', async () => {
      const result = await endConsultation('consultation123', 0, 0);
      expect(result).toBe(true);
    });
  });

  describe('sendMessage', () => {
    it('should send a message from user', async () => {
      const message = await sendMessage(
        'consultation123',
        'user',
        'user123',
        'Hello, astrologer!'
      );
      
      expect(message).not.toBeNull();
      expect(message?.senderType).toBe('user');
      expect(message?.senderId).toBe('user123');
      expect(message?.message).toBe('Hello, astrologer!');
      expect(message?.isRead).toBe(false);
    });

    it('should send a message from astrologer', async () => {
      const message = await sendMessage(
        'consultation123',
        'astrologer',
        'astrologer456',
        'Hello! How can I help you?'
      );
      
      expect(message?.senderType).toBe('astrologer');
      expect(message?.senderId).toBe('astrologer456');
    });

    it('should create message with consultation ID', async () => {
      const message = await sendMessage(
        'consultation123',
        'user',
        'user123',
        'Test message'
      );
      
      expect(message?.consultationId).toBe('consultation123');
    });

    it('should create message with timestamp', async () => {
      const before = new Date();
      const message = await sendMessage(
        'consultation123',
        'user',
        'user123',
        'Test'
      );
      const after = new Date();
      
      expect(message?.createdAt).toBeDefined();
      expect(message?.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(message?.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('getMessages', () => {
    it('should get messages for a consultation', async () => {
      const messages = await getMessages('consultation123');
      expect(Array.isArray(messages)).toBe(true);
    });

    it('should return empty array for non-existent consultation', async () => {
      const messages = await getMessages('nonexistent');
      expect(messages).toEqual([]);
    });
  });

  describe('subscribeToChatMessages', () => {
    it('should subscribe to messages without throwing', () => {
      const callback = jest.fn();
      expect(() => subscribeToChatMessages('consultation123', callback)).not.toThrow();
    });

    it('should accept callback function', () => {
      const callback = (_message: unknown) => {};
      expect(() => subscribeToChatMessages('consultation123', callback)).not.toThrow();
    });
  });

  describe('rateConsultation', () => {
    it('should rate a consultation', async () => {
      const result = await rateConsultation('consultation123', 5, 'Great session!');
      expect(result).toBe(true);
    });

    it('should accept rating without review', async () => {
      const result = await rateConsultation('consultation123', 4);
      expect(result).toBe(true);
    });

    it('should accept various rating values', async () => {
      for (let rating = 1; rating <= 5; rating++) {
        const result = await rateConsultation('consultation123', rating);
        expect(result).toBe(true);
      }
    });
  });

  describe('Consultation Flow', () => {
    it('should handle complete consultation flow', async () => {
      // Create consultation
      const consultation = await createConsultation(
        'user123',
        'astrologer456',
        'chat'
      );
      expect(consultation).not.toBeNull();
      
      // Start consultation
      const started = await startConsultation(consultation!.id);
      expect(started).toBe(true);
      
      // Send messages
      const msg1 = await sendMessage(
        consultation!.id,
        'user',
        'user123',
        'Hello!'
      );
      expect(msg1).not.toBeNull();
      
      const msg2 = await sendMessage(
        consultation!.id,
        'astrologer',
        'astrologer456',
        'Hi there!'
      );
      expect(msg2).not.toBeNull();
      
      // End consultation
      const ended = await endConsultation(consultation!.id, 15, 75);
      expect(ended).toBe(true);
      
      // Rate consultation
      const rated = await rateConsultation(consultation!.id, 5, 'Excellent!');
      expect(rated).toBe(true);
    });
  });

  describe('Message Types', () => {
    it('should handle long messages', async () => {
      const longMessage = 'A'.repeat(1000);
      const message = await sendMessage(
        'consultation123',
        'user',
        'user123',
        longMessage
      );
      
      expect(message?.message).toBe(longMessage);
    });

    it('should handle special characters in messages', async () => {
      const specialMessage = 'Hello! 🌟 How are you? @#$%^&*()';
      const message = await sendMessage(
        'consultation123',
        'user',
        'user123',
        specialMessage
      );
      
      expect(message?.message).toBe(specialMessage);
    });

    it('should handle empty messages', async () => {
      const message = await sendMessage(
        'consultation123',
        'user',
        'user123',
        ''
      );
      
      expect(message?.message).toBe('');
    });
  });
});
