
import { secureRandomString } from './secure-random';
function secureRandomFloat(): number {
  // Map 8 random bytes to a 32-bit unsigned int, then to [0,1)
  // CSPRNG used for hygiene; not security-critical here.
  return parseInt(secureRandomString(8, '0123456789'), 10) / 1e9;
}

/* eslint-disable no-console */
/**
 * A/B Testing Infrastructure
 *
 * Simple, flexible A/B testing system for feature experiments:
 * - Feature flags
 * - Variant assignment
 * - Experiment tracking
 * - Results analysis
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { analytics } from './analytics-tracker';
import { Logger } from '@/services/logger';

export type VariantId = string;

export interface Experiment {
  id: string;
  name: string;
  description: string;
  variants: Variant[];
  enabled: boolean;
  startDate?: Date;
  endDate?: Date;
  targetPercentage?: number; // 0-100, percentage of users to include
}

export interface Variant {
  id: VariantId;
  name: string;
  weight: number; // 0-100, relative weight for assignment
  config?: Record<string, unknown>;
}

export interface ExperimentAssignment {
  experimentId: string;
  variantId: VariantId;
  assignedAt: Date;
}

const STORAGE_KEY = '@ab_testing/assignments';

/**
 * A/B Testing Manager
 */
class ABTestingManager {
  private experiments: Map<string, Experiment> = new Map();
  private assignments: Map<string, ExperimentAssignment> = new Map();
  private _userId: string | null = null;
  private isInitialized: boolean = false;

  /**
   * Initialize A/B testing system
   */
  async initialize(userId?: string) {
    this._userId = userId || null;
    await this.loadAssignments();
    this.isInitialized = true;

    if (__DEV__) {
      Logger.info('[ABTesting] Initialized', { userId: this._userId, assignments: this.assignments.size });
    }
  }

  /**
   * Register an experiment
   */
  registerExperiment(experiment: Experiment) {
    // Validate weights sum to 100
    const totalWeight = experiment.variants.reduce((sum, v) => sum + v.weight, 0);
    if (Math.abs(totalWeight - 100) > 0.01) {
      Logger.warn(`[ABTesting] Experiment ${experiment.id} variant weights don't sum to 100 (${totalWeight})`);
    }

    this.experiments.set(experiment.id, experiment);

    if (__DEV__) {
      Logger.info('[ABTesting] Registered experiment:', experiment.id);
    }
  }

  /**
   * Get variant for an experiment
   */
  async getVariant(experimentId: string): Promise<VariantId | null> {
    if (!this.isInitialized) {
      Logger.warn('[ABTesting] Not initialized, call initialize() first');
      return null;
    }

    const experiment = this.experiments.get(experimentId);
    if (!experiment) {
      Logger.warn(`[ABTesting] Experiment not found: ${experimentId}`);
      return null;
    }

    if (!experiment.enabled) {
      return null;
    }

    // Check if experiment is within date range
    if (experiment.startDate && new Date() < experiment.startDate) {
      return null;
    }
    if (experiment.endDate && new Date() > experiment.endDate) {
      return null;
    }

    // Check if user is already assigned
    const existingAssignment = this.assignments.get(experimentId);
    if (existingAssignment) {
      return existingAssignment.variantId;
    }

    // Check target percentage using deterministic hash so users get
    // consistent inclusion across the same session.
    if (experiment.targetPercentage !== undefined) {
      const seed = `${this._userId ?? ''}:${experimentId}:target`;
      const random = this._userId ? this.deterministicRandom(seed) * 100 : secureRandomFloat() * 100;
      if (random > experiment.targetPercentage) {
        return null; // User not included in experiment
      }
    }

    // Assign variant based on weights
    const variantId = this.assignVariant(experiment);

    // Save assignment
    const assignment: ExperimentAssignment = {
      experimentId,
      variantId,
      assignedAt: new Date(),
    };
    this.assignments.set(experimentId, assignment);
    await this.saveAssignments();

    // Track assignment
    analytics.track('experiment_assigned', {
      experiment_id: experimentId,
      experiment_name: experiment.name,
      variant_id: variantId,
      variant_name: experiment.variants.find(v => v.id === variantId)?.name,
    });

    return variantId;
  }

  /**
   * Check if user is in a specific variant
   */
  async isVariant(experimentId: string, variantId: VariantId): Promise<boolean> {
    const assignedVariant = await this.getVariant(experimentId);
    return assignedVariant === variantId;
  }

  /**
   * Get variant config
   */
  async getVariantConfig<T = unknown>(experimentId: string): Promise<T | null> {
    const variantId = await this.getVariant(experimentId);
    if (!variantId) return null;

    const experiment = this.experiments.get(experimentId);
    if (!experiment) return null;

    const variant = experiment.variants.find(v => v.id === variantId);
    return (variant?.config as T) || null;
  }

  /**
   * Track experiment event
   */
  trackEvent(experimentId: string, eventName: string, properties?: Record<string, unknown>) {
    const assignment = this.assignments.get(experimentId);
    if (!assignment) return;

    const experiment = this.experiments.get(experimentId);
    if (!experiment) return;

    analytics.track(`experiment_${eventName}`, {
      experiment_id: experimentId,
      experiment_name: experiment.name,
      variant_id: assignment.variantId,
      variant_name: experiment.variants.find(v => v.id === assignment.variantId)?.name,
      ...properties,
    });
  }

  /**
   * Track conversion for an experiment
   */
  trackConversion(experimentId: string, value?: number, metadata?: Record<string, unknown>) {
    this.trackEvent(experimentId, 'conversion', { value, ...metadata });
  }

  /**
   * Get all active experiments
   */
  getActiveExperiments(): Experiment[] {
    const now = new Date();
    return Array.from(this.experiments.values()).filter(exp => {
      if (!exp.enabled) return false;
      if (exp.startDate && now < exp.startDate) return false;
      if (exp.endDate && now > exp.endDate) return false;
      return true;
    });
  }

  /**
   * Get user's assignments
   */
  getUserAssignments(): ExperimentAssignment[] {
    return Array.from(this.assignments.values());
  }

  /**
   * Reset all assignments (for testing)
   */
  async resetAssignments() {
    this.assignments.clear();
    await AsyncStorage.removeItem(STORAGE_KEY);

    if (__DEV__) {
      Logger.info('[ABTesting] Assignments reset');
    }
  }

  /**
   * Assign variant based on weights.
   * Uses a deterministic hash of userId + experimentId so the same user
   * always lands on the same variant (correct production behavior).
   */
  private assignVariant(experiment: Experiment): VariantId {
    const seed = `${this._userId ?? ''}:${experiment.id}:variant`;
    const random = this._userId
      ? this.deterministicRandom(seed)
      : secureRandomFloat();
    let cumulative = 0;
    for (const variant of experiment.variants) {
      cumulative += variant.weight;
      if (random * 100 < cumulative) {
        return variant.id;
      }
    }
    // Fallback to last variant if rounding put us just past 100
    return experiment.variants[experiment.variants.length - 1]?.id ?? 'control';
  }

  /**
   * Lightweight deterministic [0, 1) hash for variant assignment.
   * Same (userId, experimentId) always produces the same value, ensuring
   * stable test assertions and stable user experiences.
   */
  private deterministicRandom(seed: string): number {
    let h = 2166136261;
    for (let i = 0; i < seed.length; i++) {
      h ^= seed.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return ((h >>> 0) % 100000) / 100000;
  }

  /**
   * Load assignments from storage
   */
  private async loadAssignments() {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const assignments: ExperimentAssignment[] = JSON.parse(stored);
        assignments.forEach(assignment => {
          this.assignments.set(assignment.experimentId, {
            ...assignment,
            assignedAt: new Date(assignment.assignedAt),
          });
        });
      }
    } catch (error) {
      Logger.error('[ABTesting] Failed to load assignments:', error);
    }
  }

  /**
   * Save assignments to storage
   */
  private async saveAssignments() {
    try {
      const assignments = Array.from(this.assignments.values());
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(assignments));
    } catch (error) {
      Logger.error('[ABTesting] Failed to save assignments:', error);
    }
  }
}

// Singleton instance
export const abTesting = new ABTestingManager();

// Convenience functions
export const getVariant = (experimentId: string) => abTesting.getVariant(experimentId);
export const isVariant = (experimentId: string, variantId: VariantId) =>
  abTesting.isVariant(experimentId, variantId);
export const getVariantConfig = <T = unknown>(experimentId: string) =>
  abTesting.getVariantConfig<T>(experimentId);
export const trackConversion = (experimentId: string, value?: number, metadata?: Record<string, unknown>) =>
  abTesting.trackConversion(experimentId, value, metadata);

// Example experiments
export const EXPERIMENTS = {
  ONBOARDING_FLOW: 'onboarding_flow',
  PRICING_PAGE: 'pricing_page',
  HOME_LAYOUT: 'home_layout',
  FEATURE_DISCOVERY: 'feature_discovery',
};

// Register example experiments
export function registerDefaultExperiments() {
  abTesting.registerExperiment({
    id: EXPERIMENTS.ONBOARDING_FLOW,
    name: 'Onboarding Flow Test',
    description: 'Test different onboarding flows',
    enabled: true,
    variants: [
      { id: 'control', name: 'Control (3 steps)', weight: 50, config: { steps: 3, showSkip: true } },
      { id: 'short', name: 'Short (2 steps)', weight: 50, config: { steps: 2, showSkip: false } },
    ],
  });

  abTesting.registerExperiment({
    id: EXPERIMENTS.PRICING_PAGE,
    name: 'Pricing Page Layout',
    description: 'Test different pricing page layouts',
    enabled: true,
    variants: [
      { id: 'control', name: 'Control (3 tiers)', weight: 50, config: { tiers: 3, highlightMiddle: true } },
      { id: 'simple', name: 'Simple (2 tiers)', weight: 50, config: { tiers: 2, highlightMiddle: false } },
    ],
  });

  abTesting.registerExperiment({
    id: EXPERIMENTS.HOME_LAYOUT,
    name: 'Home Screen Layout',
    description: 'Test different home screen layouts',
    enabled: false,
    variants: [
      { id: 'control', name: 'Control (Grid)', weight: 50, config: { layout: 'grid', columns: 2 } },
      { id: 'list', name: 'List View', weight: 50, config: { layout: 'list', columns: 1 } },
    ],
  });

  abTesting.registerExperiment({
    id: EXPERIMENTS.FEATURE_DISCOVERY,
    name: 'Feature Discovery Method',
    description: 'Test different ways to help users discover features',
    enabled: true,
    targetPercentage: 50,
    variants: [
      { id: 'control', name: 'Control (No prompts)', weight: 33, config: { showPrompts: false, showBadges: false } },
      { id: 'prompts', name: 'Feature Prompts', weight: 33, config: { showPrompts: true, showBadges: false } },
      { id: 'badges', name: 'New Feature Badges', weight: 34, config: { showPrompts: false, showBadges: true } },
    ],
  });
}

export default abTesting;
