import { supabase } from '@/lib/supabase';
import { AIChatServiceError, requestAIChat } from '@/services/ai-chatbot-service';
import { interpretDream } from '@/services/dream-interpretation';

jest.mock('@/lib/supabase', () => ({
  supabase: {
    functions: { invoke: jest.fn() },
  },
  isSupabaseConfigured: jest.fn(() => true),
}));

describe('AI-disabled behavior', () => {
  const original = process.env.EXPO_PUBLIC_ENABLE_AI_FEATURES;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.EXPO_PUBLIC_ENABLE_AI_FEATURES = 'false';
  });

  afterAll(() => {
    if (original === undefined) delete process.env.EXPO_PUBLIC_ENABLE_AI_FEATURES;
    else process.env.EXPO_PUBLIC_ENABLE_AI_FEATURES = original;
  });

  it('rejects AI chat before making a network call', async () => {
    await expect(
      requestAIChat({ messages: [{ role: 'user', content: 'Tell my future' }] })
    ).rejects.toThrow(AIChatServiceError);

    expect(supabase.functions.invoke).not.toHaveBeenCalled();
  });

  it('routes dream interpretation to the offline heuristic without OpenAI', async () => {
    const result = await interpretDream('I was flying over a river with a bird');

    expect(result.source).toBe('offline');
    expect(result.symbols.length).toBeGreaterThan(0);
    expect(supabase.functions.invoke).not.toHaveBeenCalled();
  });
});
