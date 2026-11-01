/**
 * AI feature master switch.
 *
 * v1 ships without AI. All AI screens, services, and Edge Functions stay in
 * the repository, but production builds set
 * `EXPO_PUBLIC_ENABLE_AI_FEATURES=false` (or leave it unset) and the AI
 * functions are not deployed.
 *
 * Default is OFF so a missing env var fails closed.
 */

export function isAIFeaturesEnabled(): boolean {
  return process.env.EXPO_PUBLIC_ENABLE_AI_FEATURES === 'true';
}

/** Snapshot for render-time conditionals. Production inlines this env value. */
export const AI_FEATURES_ENABLED = isAIFeaturesEnabled();

const AI_PLAN_FEATURE_KEYS = new Set([
  'limitedAiChat',
  'unlimitedAiChat',
  'aiChat',
  'aiGuruInsights',
  'soulmateSynthesis',
]);

/**
 * Matches both translation keys (`unlimitedAiChat`) and the human-readable
 * plan strings used in services/subscription.ts (`AI Chat (10/day)`,
 * `AI Guru Insights`, `Soulmate Synthesis (AI)`).
 */
export function isAIPlanFeature(value: string): boolean {
  return AI_PLAN_FEATURE_KEYS.has(value) || /\bai\b|soulmate synthesis/i.test(value);
}

export function filterAIPlanFeatures(features: string[]): string[] {
  if (isAIFeaturesEnabled()) return features;
  return features.filter((feature) => !isAIPlanFeature(feature));
}

/** True when an `is_ai` astrologer must be hidden from the current build. */
export function isAIAstrologerHidden(isAi: boolean): boolean {
  return isAi && !isAIFeaturesEnabled();
}
