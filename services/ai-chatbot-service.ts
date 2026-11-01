import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Logger } from '@/services/logger';
import { isAIFeaturesEnabled } from '@/config/ai-features';
import { computePanchang } from '@/utils/hindu-calendar-engine';

export interface AstroUser {
  birthDate: string;
  birthTime: string;
  name?: string;
}

export interface UIChatMessage {
  role: 'user' | 'model';
  content: string;
}

export interface AIChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AIChatContext {
  user_name?: string;
  astro_context?: string;
  astrologer_name?: string;
  specialization?: string;
  expertise?: string;
}

export interface AIChatRequest {
  messages: AIChatMessage[];
  context?: AIChatContext;
  deviceId?: string;
  consultationId?: string;
  astrologerId?: string;
}

interface AIChatResponse {
  content?: string;
  error?: string;
  message?: string;
}

export class AIChatServiceError extends Error {
  readonly isLimitReached: boolean;

  constructor(message: string) {
    super(message);
    this.name = 'AIChatServiceError';
    this.isLimitReached = /limit|quota|trial|429/i.test(message);
  }
}

function buildAstroContext(user: AstroUser | null): string {
  if (!user?.birthDate || !user.birthTime) return '';

  try {
    const birthDate = new Date(user.birthDate);
    const panchang = computePanchang(birthDate);
    return `Born on ${panchang.varaName}, during ${panchang.paksha} Paksha, under ${panchang.nakshatraName} Nakshatra; Tithi: ${panchang.tithiName}.`;
  } catch (error) {
    Logger.error('Astrological context build failed', error);
    return '';
  }
}

export function buildSystemPrompt(user: AstroUser | null): string {
  const astroContext = buildAstroContext(user);
  return `You are AstroBot, a premium Vedic astrologer.
Answer with empathy and grounded astrological insights.
${astroContext ? `User context: ${astroContext}` : ''}
Keep responses concise and clearly formatted.`;
}

export function formatChatHistory(history: UIChatMessage[]): AIChatMessage[] {
  return history.map(message => ({
    role: message.role === 'user' ? 'user' : 'assistant',
    content: message.content,
  }));
}

/**
 * Canonical client for the `ai-chat` Edge Function.
 * OpenAI credentials and provider calls remain server-side.
 */
export async function requestAIChat({
  messages,
  context,
  deviceId,
  consultationId,
  astrologerId,
}: AIChatRequest): Promise<string> {
  if (!isAIFeaturesEnabled()) {
    throw new AIChatServiceError('AI features are disabled in this version.');
  }

  if (!isSupabaseConfigured()) {
    throw new AIChatServiceError('AI service is not configured.');
  }

  const normalizedMessages = messages
    .filter(message => message.content.trim().length > 0)
    .slice(-20)
    .map(message => ({
      role: message.role,
      content: message.content.trim().slice(0, 2_000),
    }));

  if (normalizedMessages.length === 0) {
    throw new AIChatServiceError('A message is required.');
  }

  const { data, error } = await supabase.functions.invoke<AIChatResponse>('ai-chat', {
    body: {
      messages: normalizedMessages,
      context,
      device_id: deviceId,
      consultation_id: consultationId,
      astrologer_id: astrologerId,
    },
  });

  if (error) {
    const responseMessage = data?.message || data?.error || error.message;
    throw new AIChatServiceError(responseMessage || 'AI service request failed.');
  }

  if (data?.error) {
    throw new AIChatServiceError(data.message || data.error);
  }

  const content = data?.content?.trim();
  if (!content) {
    throw new AIChatServiceError('AI service returned an empty response.');
  }

  return content;
}

/**
 * Compatibility wrapper used by the shared chat hook.
 * It falls back to deterministic local text when AI is unavailable.
 */
export async function sendMessage(
  message: string,
  history: UIChatMessage[] = [],
  user: AstroUser | null = null
): Promise<string> {
  try {
    return await requestAIChat({
      messages: [
        ...formatChatHistory(history),
        { role: 'user', content: message },
      ],
      context: {
        user_name: user?.name,
        astro_context: buildAstroContext(user),
      },
    });
  } catch (error) {
    Logger.error('AI chat service failed', error);
    return generateEnhancedLocalResponse(message);
  }
}

export function generateEnhancedLocalResponse(userMessage: string): string {
  const lower = userMessage.toLowerCase();

  if (lower.includes('horoscope') || lower.includes('today')) {
    return '**Your Cosmic Forecast**\n\nThe AI service is unavailable. Review today\'s calculated horoscope in the Horoscope section.';
  }

  if (lower.includes('marriage') || lower.includes('love')) {
    return '**Relationship Insight**\n\nThe AI service is unavailable. You can still review your calculated compatibility results.';
  }

  return 'Namaste! I cannot reach the AI service right now. Please try again in a moment.';
}

export const AIChatbotService = {
  buildSystemPrompt,
  sendMessage,
  requestAIChat,
  generateEnhancedLocalResponse,
  formatChatHistory,
};

export default AIChatbotService;
