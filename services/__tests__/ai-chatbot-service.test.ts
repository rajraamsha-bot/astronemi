import {
  AIChatbotService,
  formatChatHistory,
  requestAIChat,
} from '../ai-chatbot-service';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

jest.mock('@/lib/supabase', () => ({
  supabase: {
    functions: {
      invoke: jest.fn(),
    },
  },
  isSupabaseConfigured: jest.fn(() => false),
}));

jest.mock('@/services/error-reporting', () => ({
  errorReporting: {
    captureException: jest.fn(),
    captureMessage: jest.fn(),
  },
}));

describe('AIChatbotService', () => {
  const originalAiFlag = process.env.EXPO_PUBLIC_ENABLE_AI_FEATURES;

  const mockUser = {
    id: 'user-123',
    name: 'John Doe',
    birthDate: '1990-01-01',
    birthTime: '12:00',
    metadata: {
      birth_date: '1990-01-01',
      birth_time: '12:00',
      birth_place: 'New Delhi',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // This suite exercises the AI-enabled path.
    process.env.EXPO_PUBLIC_ENABLE_AI_FEATURES = 'true';
    (isSupabaseConfigured as jest.Mock).mockReturnValue(false);
  });

  afterAll(() => {
    if (originalAiFlag === undefined) {
      delete process.env.EXPO_PUBLIC_ENABLE_AI_FEATURES;
    } else {
      process.env.EXPO_PUBLIC_ENABLE_AI_FEATURES = originalAiFlag;
    }
  });

  describe('sendMessage', () => {
    it('should successfully send a message and return the response', async () => {
      (isSupabaseConfigured as jest.Mock).mockReturnValue(true);
      const mockResponse = {
        data: { content: 'Hello! I am your AI astrologer.' },
        error: null,
      };
      (supabase.functions.invoke as jest.Mock).mockResolvedValue(mockResponse);

      const result = await AIChatbotService.sendMessage('Hello', [], mockUser);

      expect(result).toBe('Hello! I am your AI astrologer.');
      expect(supabase.functions.invoke).toHaveBeenCalledWith(
        'ai-chat',
        expect.objectContaining({
          body: expect.objectContaining({
            messages: [{ role: 'user', content: 'Hello' }],
          }),
        })
      );
    });

    it('should return a fallback message if the API fails', async () => {
      (isSupabaseConfigured as jest.Mock).mockReturnValue(true);
      (supabase.functions.invoke as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: 'API Overloaded' },
      });

      const result = await AIChatbotService.sendMessage('Hello', [], mockUser);

      expect(result).toContain('cannot reach the AI service');
      expect(result).toContain('try again in a moment');
    });
  });

  describe('requestAIChat', () => {
    it('rejects malformed empty conversations before invoking the backend', async () => {
      (isSupabaseConfigured as jest.Mock).mockReturnValue(true);

      await expect(requestAIChat({
        messages: [{ role: 'user', content: '   ' }],
      })).rejects.toThrow('A message is required');

      expect(supabase.functions.invoke).not.toHaveBeenCalled();
    });
  });

  describe('formatChatHistory', () => {
    it('should format message history correctly for the API', () => {
      const history = [
        { id: '1', role: 'user' as const, content: 'Hi', timestamp: new Date() },
        { id: '2', role: 'model' as const, content: 'Hello', timestamp: new Date() },
      ];
      
      const formatted = formatChatHistory(history);
      
      expect(formatted).toHaveLength(2);
      expect(formatted[0]?.role).toBe('user');
      expect(formatted[1]?.role).toBe('assistant');
    });
  });
});
