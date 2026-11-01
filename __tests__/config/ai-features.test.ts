import {
  AI_FEATURES_ENABLED,
  filterAIPlanFeatures,
  isAIAstrologerHidden,
  isAIFeaturesEnabled,
  isAIPlanFeature,
} from '@/config/ai-features';

describe('AI feature switch', () => {
  const original = process.env.EXPO_PUBLIC_ENABLE_AI_FEATURES;

  afterAll(() => {
    if (original === undefined) delete process.env.EXPO_PUBLIC_ENABLE_AI_FEATURES;
    else process.env.EXPO_PUBLIC_ENABLE_AI_FEATURES = original;
  });

  it('fails closed when the env var is unset', () => {
    delete process.env.EXPO_PUBLIC_ENABLE_AI_FEATURES;
    expect(isAIFeaturesEnabled()).toBe(false);
  });

  it('is enabled only for the explicit string "true"', () => {
    process.env.EXPO_PUBLIC_ENABLE_AI_FEATURES = '1';
    expect(isAIFeaturesEnabled()).toBe(false);
    process.env.EXPO_PUBLIC_ENABLE_AI_FEATURES = 'TRUE';
    expect(isAIFeaturesEnabled()).toBe(false);
    process.env.EXPO_PUBLIC_ENABLE_AI_FEATURES = 'true';
    expect(isAIFeaturesEnabled()).toBe(true);
  });

  it('recognises translation keys and human-readable AI plan strings', () => {
    expect(isAIPlanFeature('limitedAiChat')).toBe(true);
    expect(isAIPlanFeature('unlimitedAiChat')).toBe(true);
    expect(isAIPlanFeature('AI Chat (10/day)')).toBe(true);
    expect(isAIPlanFeature('AI Guru Insights (50/day)')).toBe(true);
    expect(isAIPlanFeature('Soulmate Synthesis (AI)')).toBe(true);
    expect(isAIPlanFeature('dailyHoroscope')).toBe(false);
  });

  it('removes AI plan features when disabled', () => {
    process.env.EXPO_PUBLIC_ENABLE_AI_FEATURES = 'false';
    expect(
      filterAIPlanFeatures(['dailyHoroscope', 'limitedAiChat', 'AI Chat (10/day)'])
    ).toEqual(['dailyHoroscope']);
  });

  it('keeps AI plan features when enabled', () => {
    process.env.EXPO_PUBLIC_ENABLE_AI_FEATURES = 'true';
    const features = ['dailyHoroscope', 'limitedAiChat'];
    expect(filterAIPlanFeatures(features)).toEqual(features);
  });

  it('hides AI astrologers only when disabled', () => {
    process.env.EXPO_PUBLIC_ENABLE_AI_FEATURES = 'false';
    expect(isAIAstrologerHidden(true)).toBe(true);
    expect(isAIAstrologerHidden(false)).toBe(false);

    process.env.EXPO_PUBLIC_ENABLE_AI_FEATURES = 'true';
    expect(isAIAstrologerHidden(true)).toBe(false);
  });

  it('exports the build-time snapshot', () => {
    expect(typeof AI_FEATURES_ENABLED).toBe('boolean');
  });
});
