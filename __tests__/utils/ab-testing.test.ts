/**
 * A/B Testing System Tests
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { abTesting, Experiment, Variant } from '@/utils/ab-testing';
import { Logger } from '@/services/logger';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Mock analytics
jest.mock('@/utils/analytics-tracker', () => ({
  analytics: {
    track: jest.fn(),
  },
}));

describe('A/B Testing System', () => {
  beforeEach(async () => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Reset assignments
    await abTesting.resetAssignments();
    
    // Initialize
    await abTesting.initialize('test-user-123');
  });

  describe('Experiment Registration', () => {
    it('should register an experiment', () => {
      const experiment: Experiment = {
        id: 'test_experiment',
        name: 'Test Experiment',
        description: 'A test experiment',
        enabled: true,
        variants: [
          { id: 'control', name: 'Control', weight: 50 },
          { id: 'variant', name: 'Variant', weight: 50 },
        ],
      };

      abTesting.registerExperiment(experiment);
      
      const active = abTesting.getActiveExperiments();
      expect(active.some(e => e.id === 'test_experiment')).toBe(true);
    });

    it('should warn if variant weights do not sum to 100', () => {
      const loggerSpy = jest.spyOn(Logger, 'warn').mockImplementation();

      const experiment: Experiment = {
        id: 'bad_weights',
        name: 'Bad Weights',
        description: 'Weights do not sum to 100',
        enabled: true,
        variants: [
          { id: 'control', name: 'Control', weight: 40 },
          { id: 'variant', name: 'Variant', weight: 40 },
        ],
      };

      abTesting.registerExperiment(experiment);

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('variant weights don\'t sum to 100')
      );

      loggerSpy.mockRestore();
    });
  });

  describe('Variant Assignment', () => {
    beforeEach(() => {
      const experiment: Experiment = {
        id: 'test_experiment',
        name: 'Test Experiment',
        description: 'A test experiment',
        enabled: true,
        variants: [
          { id: 'control', name: 'Control', weight: 50 },
          { id: 'variant', name: 'Variant', weight: 50 },
        ],
      };

      abTesting.registerExperiment(experiment);
    });

    it('should assign a variant', async () => {
      const variant = await abTesting.getVariant('test_experiment');
      expect(['control', 'variant']).toContain(variant);
    });

    it('should return same variant on subsequent calls', async () => {
      const variant1 = await abTesting.getVariant('test_experiment');
      const variant2 = await abTesting.getVariant('test_experiment');
      expect(variant1).toBe(variant2);
    });

    it('should return null for non-existent experiment', async () => {
      const variant = await abTesting.getVariant('non_existent');
      expect(variant).toBe(null);
    });

    it('should return null for disabled experiment', async () => {
      const experiment: Experiment = {
        id: 'disabled_experiment',
        name: 'Disabled',
        description: 'Disabled experiment',
        enabled: false,
        variants: [
          { id: 'control', name: 'Control', weight: 100 },
        ],
      };

      abTesting.registerExperiment(experiment);
      
      const variant = await abTesting.getVariant('disabled_experiment');
      expect(variant).toBe(null);
    });
  });

  describe('Date Range Control', () => {
    it('should not assign variant before start date', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const experiment: Experiment = {
        id: 'future_experiment',
        name: 'Future Experiment',
        description: 'Starts tomorrow',
        enabled: true,
        startDate: tomorrow,
        variants: [
          { id: 'control', name: 'Control', weight: 100 },
        ],
      };

      abTesting.registerExperiment(experiment);
      
      const variant = await abTesting.getVariant('future_experiment');
      expect(variant).toBe(null);
    });

    it('should not assign variant after end date', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const experiment: Experiment = {
        id: 'past_experiment',
        name: 'Past Experiment',
        description: 'Ended yesterday',
        enabled: true,
        endDate: yesterday,
        variants: [
          { id: 'control', name: 'Control', weight: 100 },
        ],
      };

      abTesting.registerExperiment(experiment);
      
      const variant = await abTesting.getVariant('past_experiment');
      expect(variant).toBe(null);
    });

    it('should assign variant within date range', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const experiment: Experiment = {
        id: 'active_experiment',
        name: 'Active Experiment',
        description: 'Active now',
        enabled: true,
        startDate: yesterday,
        endDate: tomorrow,
        variants: [
          { id: 'control', name: 'Control', weight: 100 },
        ],
      };

      abTesting.registerExperiment(experiment);
      
      const variant = await abTesting.getVariant('active_experiment');
      expect(variant).toBe('control');
    });
  });

  describe('Target Percentage', () => {
    it('should respect target percentage', async () => {
      const experiment: Experiment = {
        id: 'targeted_experiment',
        name: 'Targeted Experiment',
        description: 'Only 50% of users',
        enabled: true,
        targetPercentage: 50,
        variants: [
          { id: 'control', name: 'Control', weight: 100 },
        ],
      };

      abTesting.registerExperiment(experiment);

      // Run multiple times to test distribution
      let included = 0;
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        await abTesting.resetAssignments();
        await abTesting.initialize(`user-${i}`);
        
        const variant = await abTesting.getVariant('targeted_experiment');
        if (variant !== null) {
          included++;
        }
      }

      // Should be roughly 50% (allow 20% margin for randomness)
      expect(included).toBeGreaterThan(30);
      expect(included).toBeLessThan(70);
    });
  });

  describe('Variant Checking', () => {
    beforeEach(() => {
      const experiment: Experiment = {
        id: 'test_experiment',
        name: 'Test Experiment',
        description: 'A test experiment',
        enabled: true,
        variants: [
          { id: 'control', name: 'Control', weight: 100 },
        ],
      };

      abTesting.registerExperiment(experiment);
    });

    it('should check if user is in specific variant', async () => {
      const isControl = await abTesting.isVariant('test_experiment', 'control');
      expect(isControl).toBe(true);
    });

    it('should return false for wrong variant', async () => {
      const isVariant = await abTesting.isVariant('test_experiment', 'variant');
      expect(isVariant).toBe(false);
    });
  });

  describe('Variant Config', () => {
    beforeEach(() => {
      const experiment: Experiment = {
        id: 'config_experiment',
        name: 'Config Experiment',
        description: 'Experiment with config',
        enabled: true,
        variants: [
          { 
            id: 'control', 
            name: 'Control', 
            weight: 100,
            config: { steps: 3, showSkip: true },
          },
        ],
      };

      abTesting.registerExperiment(experiment);
    });

    it('should return variant config', async () => {
      const config = await abTesting.getVariantConfig('config_experiment');
      expect(config).toEqual({ steps: 3, showSkip: true });
    });

    it('should return null for non-existent experiment', async () => {
      const config = await abTesting.getVariantConfig('non_existent');
      expect(config).toBe(null);
    });
  });

  describe('Event Tracking', () => {
    beforeEach(async () => {
      const experiment: Experiment = {
        id: 'test_experiment',
        name: 'Test Experiment',
        description: 'A test experiment',
        enabled: true,
        variants: [
          { id: 'control', name: 'Control', weight: 100 },
        ],
      };

      abTesting.registerExperiment(experiment);
      
      // Assign variant
      await abTesting.getVariant('test_experiment');
    });

    it('should track experiment event', () => {
      const { analytics } = require('@/utils/analytics-tracker');
      
      abTesting.trackEvent('test_experiment', 'click', { button: 'submit' });
      
      expect(analytics.track).toHaveBeenCalledWith(
        'experiment_click',
        expect.objectContaining({
          experiment_id: 'test_experiment',
          variant_id: 'control',
          button: 'submit',
        })
      );
    });

    it('should track conversion', () => {
      const { analytics } = require('@/utils/analytics-tracker');
      
      abTesting.trackConversion('test_experiment', 100, { source: 'checkout' });
      
      expect(analytics.track).toHaveBeenCalledWith(
        'experiment_conversion',
        expect.objectContaining({
          experiment_id: 'test_experiment',
          variant_id: 'control',
          value: 100,
          source: 'checkout',
        })
      );
    });
  });

  describe('Active Experiments', () => {
    it('should return only active experiments', () => {
      const activeExp: Experiment = {
        id: 'active',
        name: 'Active',
        description: 'Active experiment',
        enabled: true,
        variants: [{ id: 'control', name: 'Control', weight: 100 }],
      };

      const disabledExp: Experiment = {
        id: 'disabled',
        name: 'Disabled',
        description: 'Disabled experiment',
        enabled: false,
        variants: [{ id: 'control', name: 'Control', weight: 100 }],
      };

      abTesting.registerExperiment(activeExp);
      abTesting.registerExperiment(disabledExp);

      const active = abTesting.getActiveExperiments();
      
      expect(active.some(e => e.id === 'active')).toBe(true);
      expect(active.some(e => e.id === 'disabled')).toBe(false);
    });
  });

  describe('User Assignments', () => {
    it('should return user assignments', async () => {
      const experiment: Experiment = {
        id: 'test_experiment',
        name: 'Test Experiment',
        description: 'A test experiment',
        enabled: true,
        variants: [
          { id: 'control', name: 'Control', weight: 100 },
        ],
      };

      abTesting.registerExperiment(experiment);
      
      await abTesting.getVariant('test_experiment');
      
      const assignments = abTesting.getUserAssignments();
      expect(assignments.length).toBe(1);
      expect(assignments[0].experimentId).toBe('test_experiment');
      expect(assignments[0].variantId).toBe('control');
    });
  });

  describe('Weight Distribution', () => {
    it('should distribute variants according to weights', async () => {
      const experiment: Experiment = {
        id: 'weighted_experiment',
        name: 'Weighted Experiment',
        description: 'Test weight distribution',
        enabled: true,
        variants: [
          { id: 'control', name: 'Control', weight: 80 },
          { id: 'variant', name: 'Variant', weight: 20 },
        ],
      };

      abTesting.registerExperiment(experiment);

      let controlCount = 0;
      let variantCount = 0;
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        await abTesting.resetAssignments();
        await abTesting.initialize(`user-${i}`);
        
        const variant = await abTesting.getVariant('weighted_experiment');
        if (variant === 'control') controlCount++;
        if (variant === 'variant') variantCount++;
      }

      // Should be roughly 80/20 (allow 15% margin for randomness)
      expect(controlCount).toBeGreaterThan(65);
      expect(controlCount).toBeLessThan(95);
      expect(variantCount).toBeGreaterThan(5);
      expect(variantCount).toBeLessThan(35);
    });
  });
});
