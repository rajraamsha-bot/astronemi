import { Redirect } from 'expo-router';
import { isAIFeaturesEnabled } from '@/config/ai-features';

/**
 * Backwards-compatible route for old links and bookmarks.
 * The AI chat experience now lives at /ai-chat, but AI is disabled in v1
 * production builds.
 */
export default function AIChatbotRedirect() {
  return <Redirect href={isAIFeaturesEnabled() ? '/ai-chat' : '/(tabs)'} />;
}
