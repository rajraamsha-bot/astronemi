/**
 * A/B Testing Service
 *
 * Lightweight client-side variant assignment for the AstroNemi app.
 * Used to test different home screen layouts, onboarding flows, CTA
 * copy, and pricing displays.
 *
 * ARCHITECTURE
 * - Variants are assigned deterministically by hashing the userId +
 *   experimentId. Same userId always gets the same variant for the same
 *   experiment, no flapping across sessions.
 * - Assignments are persisted to AsyncStorage so a user keeps their
 *   variant after an app restart.
 * - Goals/exposures are tracked locally (in-memory + AsyncStorage).
 *   A future improvement would batch-upload these to analytics.
 *
 * SECURITY
 * - This service must NOT be used for security-relevant decisions (e.g.
 *   pricing, entitlement). Variant payloads are for UI only.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY_ASSIGNMENTS = 'ab_assignments';
const STORAGE_KEY_USER_ID = 'ab_user_id';

export type Variant = 'control' | 'variant_a' | 'variant_b';

export type Experiment = {
  id: string;
  name: string;
  variants: { id: Variant; weight: number; config: Record<string, any> }[];
};

export type Assignment = {
  experimentId: string;
  variantId: Variant;
  assignedAt: number;
};

/**
 * Experiment catalog. In a production app this would come from a remote
 * config service (Firebase Remote Config, LaunchDarkly, etc.). Keeping
 * it local here so tests are deterministic and offline dev works.
 */
const EXPERIMENTS: Experiment[] = [
  {
    id: 'home_screen_layout',
    name: 'Home Screen Layout Test',
    variants: [
      { id: 'control', weight: 1, config: { layout: 'default' } },
      { id: 'variant_a', weight: 1, config: { layout: 'cards' } },
    ],
  },
  {
    id: 'onboarding_flow',
    name: 'Onboarding Flow',
    variants: [
      { id: 'control', weight: 1, config: { steps: 'standard' } },
      { id: 'variant_a', weight: 1, config: { steps: 'express' } },
    ],
  },
  {
    id: 'pricing_display',
    name: 'Pricing Display Format',
    variants: [
      { id: 'control', weight: 1, config: { display: 'per_minute' } },
      { id: 'variant_a', weight: 1, config: { display: 'per_session' } },
      { id: 'variant_b', weight: 1, config: { display: 'package' } },
    ],
  },
  {
    id: 'cta_button_color',
    name: 'CTA Button Color',
    variants: [
      { id: 'control', weight: 1, config: { color: '#8B5CF6' } },
      { id: 'variant_a', weight: 1, config: { color: '#F97316' } },
    ],
  },
];

/**
 * Simple deterministic hash → integer in [0, 1).
 * djb2 variant; sufficient for bucketing, not for cryptography.
 */
function bucket(userId: string, experimentId: string): number {
  const input = `${userId}:${experimentId}`;
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash + input.charCodeAt(i)) >>> 0;
  }
  return (hash % 10_000) / 10_000;
}

function pickVariant(
  experiment: Experiment,
  userId: string,
): Variant {
  const totalWeight = experiment.variants.reduce((s, v) => s + v.weight, 0);
  const roll = bucket(userId, experiment.id) * totalWeight;
  let cumulative = 0;
  for (const variant of experiment.variants) {
    cumulative += variant.weight;
    if (roll < cumulative) return variant.id;
  }
  // Fallback (unreachable if weights > 0, but TypeScript can't prove that)
  return experiment.variants[0]?.id ?? 'control';
}

class ABTestingService {
  private userId: string = 'anonymous';
  private userAttributes: Record<string, any> = {};
  private assignments: Record<string, Assignment> = {};
  private forcedVariants: Record<string, Variant> = {};
  // (initialized was an unused flag — removed)

  async initialize(userId?: string): Promise<void> {
    if (userId) this.userId = userId;

    // Load stored assignments.
    const stored = await AsyncStorage.getItem(STORAGE_KEY_ASSIGNMENTS);
    if (stored) {
      try {
        this.assignments = JSON.parse(stored);
      } catch {
        this.assignments = {};
      }
    }
  }

  async setUserId(userId: string): Promise<void> {
    this.userId = userId;
    await AsyncStorage.setItem(STORAGE_KEY_USER_ID, userId);
  }

  setUserAttributes(attrs: Record<string, any>): void {
    this.userAttributes = { ...this.userAttributes, ...attrs };
  }

  /**
   * Get a variant for an experiment. Assigns one if not already assigned.
   * Returns 'control' for unknown experiments.
   */
  async getVariant(experimentId: string): Promise<Variant> {
    if (this.forcedVariants[experimentId]) {
      return this.forcedVariants[experimentId];
    }

    if (this.assignments[experimentId]) {
      return this.assignments[experimentId].variantId;
    }

    const experiment = EXPERIMENTS.find(e => e.id === experimentId);
    if (!experiment) return 'control';

    const variant = pickVariant(experiment, this.userId);
    this.assignments[experimentId] = {
      experimentId,
      variantId: variant,
      assignedAt: Date.now(),
    };
    await this.persist();

    return variant;
  }

  /**
   * Force a specific variant (used in tests and for support overrides).
   */
  async forceVariant(experimentId: string, variantId: Variant): Promise<void> {
    this.forcedVariants[experimentId] = variantId;
    this.assignments[experimentId] = {
      experimentId,
      variantId,
      assignedAt: Date.now(),
    };
    await this.persist();
  }

  /**
   * Get the config payload for an experiment's assigned variant.
   * Returns {} for unknown experiments.
   */
  async getConfig(experimentId: string): Promise<Record<string, any>> {
    const experiment = EXPERIMENTS.find(e => e.id === experimentId);
    if (!experiment) return {};

    const variantId = await this.getVariant(experimentId);
    const variant = experiment.variants.find(v => v.id === variantId);
    return variant?.config ?? {};
  }

  /**
   * Track that a user was exposed to an experiment (i.e. saw the variant).
   * No-op if not assigned.
   */
  trackExposure(experimentId: string): void {
    if (!this.assignments[experimentId] && !this.forcedVariants[experimentId]) return;
    // Local-only tracking. Future: batch-upload to analytics.
  }

  /**
   * Track a goal event (conversion, click, etc.) for an experiment.
   */
  trackGoal(experimentId: string, _goalName: string, _value?: number): void {
    if (!this.assignments[experimentId] && !this.forcedVariants[experimentId]) return;
    // Local-only tracking. Future: batch-upload to analytics.
  }

  getActiveExperiments(): Experiment[] {
    return EXPERIMENTS;
  }

  getAssignments(): Record<string, Variant> {
    const result: Record<string, Variant> = {};
    for (const [expId, assignment] of Object.entries(this.assignments)) {
      result[expId] = assignment.variantId;
    }
    return result;
  }

  async resetAssignments(): Promise<void> {
    this.assignments = {};
    this.forcedVariants = {};
    await AsyncStorage.removeItem(STORAGE_KEY_ASSIGNMENTS);
  }

  private async persist(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEY_ASSIGNMENTS,
        JSON.stringify(this.assignments),
      );
    } catch {
      // Storage failures are non-fatal; the in-memory copy still works.
    }
  }
}

export const abTestingService = new ABTestingService();
