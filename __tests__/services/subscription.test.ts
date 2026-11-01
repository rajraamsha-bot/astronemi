/**
 * Subscription Service Tests
 */

import {
  SUBSCRIPTION_PLANS,
  YEARLY_DISCOUNT,
  SubscriptionPlan,
  UserSubscription,
  getPlans,
  getPlanById,
  calculateYearlyPrice,
} from '@/services/subscription';

// Mock supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn(() => ({
            gte: jest.fn(() => ({
              order: jest.fn(() => ({
                limit: jest.fn(() => ({
                  single: jest.fn(() => ({ data: null, error: null })),
                })),
              })),
            })),
          })),
        })),
      })),
      insert: jest.fn(() => ({ error: null })),
    })),
  },
  isSupabaseConfigured: jest.fn(() => false),
}));

// Mock payment service
jest.mock('@/services/payment', () => ({
  processSubscriptionPayment: jest.fn(() => ({ success: true, paymentId: 'pay_123' })),
}));

describe('Subscription Service', () => {
  describe('SUBSCRIPTION_PLANS', () => {
    it('should have 4 subscription plans', () => {
      expect(SUBSCRIPTION_PLANS).toHaveLength(4);
    });

    it('should have valid structure for each plan', () => {
      SUBSCRIPTION_PLANS.forEach(plan => {
        expect(plan).toHaveProperty('id');
        expect(plan).toHaveProperty('name');
        expect(plan).toHaveProperty('price');
        expect(plan).toHaveProperty('originalPrice');
        expect(plan).toHaveProperty('duration');
        expect(plan).toHaveProperty('features');
        expect(plan).toHaveProperty('color');
        expect(Array.isArray(plan.features)).toBe(true);
        expect(plan.features.length).toBeGreaterThan(0);
      });
    });

    it('should have Free plan as first option', () => {
      expect(SUBSCRIPTION_PLANS[0].id).toBe('free');
      expect(SUBSCRIPTION_PLANS[0].price).toBe(0);
    });

    it('should have Basic plan marked as popular', () => {
      const basicPlan = SUBSCRIPTION_PLANS.find(p => p.id === 'basic');
      expect(basicPlan?.popular).toBe(true);
    });

    it('should have Premium plan highlighted', () => {
      const premiumPlan = SUBSCRIPTION_PLANS.find(p => p.id === 'premium');
      expect(premiumPlan?.highlighted).toBe(true);
    });

    it('should have Gold plan as most expensive', () => {
      const goldPlan = SUBSCRIPTION_PLANS.find(p => p.id === 'gold');
      const maxPrice = Math.max(...SUBSCRIPTION_PLANS.map(p => p.price));
      expect(goldPlan?.price).toBe(maxPrice);
    });

    it('should have discounted prices', () => {
      SUBSCRIPTION_PLANS.forEach(plan => {
        if (plan.price > 0) {
          expect(plan.originalPrice).toBeGreaterThan(plan.price);
        }
      });
    });

    it('should have all plans with monthly duration', () => {
      SUBSCRIPTION_PLANS.forEach(plan => {
        expect(plan.duration).toBe('monthly');
      });
    });

    it('should have unique plan IDs', () => {
      const ids = SUBSCRIPTION_PLANS.map(p => p.id);
      const uniqueIds = [...new Set(ids)];
      expect(ids.length).toBe(uniqueIds.length);
    });

    it('should have valid colors for all plans', () => {
      SUBSCRIPTION_PLANS.forEach(plan => {
        expect(plan.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      });
    });
  });

  describe('YEARLY_DISCOUNT', () => {
    it('should be 40 percent', () => {
      expect(YEARLY_DISCOUNT).toBe(40);
    });
  });

  describe('getPlans', () => {
    it('should return all subscription plans', () => {
      const plans = getPlans();
      expect(plans).toHaveLength(4);
      expect(plans).toEqual(SUBSCRIPTION_PLANS);
    });
  });

  describe('getPlanById', () => {
    it('should return plan for valid ID', () => {
      const plan = getPlanById('basic');
      expect(plan).toBeDefined();
      expect(plan?.name).toBe('Basic');
    });

    it('should return Free plan for free ID', () => {
      const plan = getPlanById('free');
      expect(plan).toBeDefined();
      expect(plan?.price).toBe(0);
    });

    it('should return Premium plan for premium ID', () => {
      const plan = getPlanById('premium');
      expect(plan).toBeDefined();
      expect(plan?.highlighted).toBe(true);
    });

    it('should return Gold plan for gold ID', () => {
      const plan = getPlanById('gold');
      expect(plan).toBeDefined();
      expect(plan?.price).toBe(999);
    });

    it('should return undefined for invalid ID', () => {
      const plan = getPlanById('invalid');
      expect(plan).toBeUndefined();
    });

    it('should return undefined for empty ID', () => {
      const plan = getPlanById('');
      expect(plan).toBeUndefined();
    });
  });

  describe('calculateYearlyPrice', () => {
    it('should calculate yearly price with 40% discount', () => {
      const monthlyPrice = 199;
      const yearlyPrice = calculateYearlyPrice(monthlyPrice);
      // 199 * 12 = 2388, 40% off = 1432.8, rounded = 1433
      expect(yearlyPrice).toBe(1433);
    });

    it('should return 0 for free plan', () => {
      const yearlyPrice = calculateYearlyPrice(0);
      expect(yearlyPrice).toBe(0);
    });

    it('should calculate for Premium plan', () => {
      const monthlyPrice = 499;
      const yearlyPrice = calculateYearlyPrice(monthlyPrice);
      // 499 * 12 = 5988, 40% off = 3592.8, rounded = 3593
      expect(yearlyPrice).toBe(3593);
    });

    it('should calculate for Gold plan', () => {
      const monthlyPrice = 999;
      const yearlyPrice = calculateYearlyPrice(monthlyPrice);
      // 999 * 12 = 11988, 40% off = 7192.8, rounded = 7193
      expect(yearlyPrice).toBe(7193);
    });

    it('should return rounded integer', () => {
      const yearlyPrice = calculateYearlyPrice(199);
      expect(Number.isInteger(yearlyPrice)).toBe(true);
    });

    it('should apply correct discount formula', () => {
      const monthlyPrice = 100;
      const yearlyPrice = calculateYearlyPrice(monthlyPrice);
      // 100 * 12 = 1200, 40% off = 720
      expect(yearlyPrice).toBe(720);
    });
  });

  describe('SubscriptionPlan Type', () => {
    it('should define plan structure correctly', () => {
      const plan: SubscriptionPlan = {
        id: 'test',
        name: 'Test Plan',
        price: 100,
        originalPrice: 150,
        duration: 'monthly',
        features: ['Feature 1', 'Feature 2'],
        color: '#FFFFFF',
      };
      expect(plan.id).toBe('test');
      expect(plan.features).toHaveLength(2);
    });

    it('should allow optional highlighted flag', () => {
      const plan: SubscriptionPlan = {
        id: 'test',
        name: 'Test',
        price: 100,
        originalPrice: 150,
        duration: 'monthly',
        features: [],
        highlighted: true,
        color: '#FFFFFF',
      };
      expect(plan.highlighted).toBe(true);
    });

    it('should allow optional popular flag', () => {
      const plan: SubscriptionPlan = {
        id: 'test',
        name: 'Test',
        price: 100,
        originalPrice: 150,
        duration: 'monthly',
        features: [],
        popular: true,
        color: '#FFFFFF',
      };
      expect(plan.popular).toBe(true);
    });
  });

  describe('UserSubscription Type', () => {
    it('should define subscription structure correctly', () => {
      const subscription: UserSubscription = {
        id: 'sub_1',
        userId: 'user_1',
        planId: 'basic',
        planName: 'Basic',
        amount: 199,
        currency: 'INR',
        paymentStatus: 'completed',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        isActive: true,
        createdAt: new Date(),
      };
      expect(subscription.planId).toBe('basic');
      expect(subscription.isActive).toBe(true);
    });

    it('should support all payment statuses', () => {
      const statuses: UserSubscription['paymentStatus'][] = [
        'pending',
        'completed',
        'failed',
        'refunded',
      ];
      expect(statuses).toHaveLength(4);
    });

    it('should have optional paymentId', () => {
      const subscription: UserSubscription = {
        id: 'sub_1',
        userId: 'user_1',
        planId: 'basic',
        planName: 'Basic',
        amount: 199,
        currency: 'INR',
        paymentId: 'pay_123',
        paymentStatus: 'completed',
        startDate: new Date(),
        endDate: new Date(),
        isActive: true,
        createdAt: new Date(),
      };
      expect(subscription.paymentId).toBe('pay_123');
    });
  });

  describe('Plan Features', () => {
    it('should have Free plan with 4 features', () => {
      const freePlan = SUBSCRIPTION_PLANS.find(p => p.id === 'free');
      expect(freePlan?.features).toHaveLength(4);
    });

    it('should have Basic plan with 6 features', () => {
      const basicPlan = SUBSCRIPTION_PLANS.find(p => p.id === 'basic');
      expect(basicPlan?.features).toHaveLength(6);
    });

    it('should have Premium plan with 10 features', () => {
      const premiumPlan = SUBSCRIPTION_PLANS.find(p => p.id === 'premium');
      expect(premiumPlan?.features).toHaveLength(10);
    });

    it('should have Gold plan with 11 features', () => {
      const goldPlan = SUBSCRIPTION_PLANS.find(p => p.id === 'gold');
      expect(goldPlan?.features).toHaveLength(11);
    });

    it('should include AI Chat in Free plan', () => {
      const freePlan = SUBSCRIPTION_PLANS.find(p => p.id === 'free');
      expect(freePlan?.features.some(f => f.includes('AI Chat'))).toBe(true);
    });

    it('should include AI Chat in Basic plan', () => {
      const basicPlan = SUBSCRIPTION_PLANS.find(p => p.id === 'basic');
      expect(basicPlan?.features.some(f => f.includes('AI Chat'))).toBe(true);
    });

    it('should include VIP Astrologer Access in Gold plan', () => {
      const goldPlan = SUBSCRIPTION_PLANS.find(p => p.id === 'gold');
      expect(goldPlan?.features.some(f => f.includes('VIP'))).toBe(true);
    });
  });

  describe('Price Calculations', () => {
    it('should calculate savings for Basic plan', () => {
      const basicPlan = SUBSCRIPTION_PLANS.find(p => p.id === 'basic');
      const savings = basicPlan!.originalPrice - basicPlan!.price;
      expect(savings).toBe(100);
    });

    it('should calculate savings for Premium plan', () => {
      const premiumPlan = SUBSCRIPTION_PLANS.find(p => p.id === 'premium');
      const savings = premiumPlan!.originalPrice - premiumPlan!.price;
      expect(savings).toBe(300);
    });

    it('should calculate savings for Gold plan', () => {
      const goldPlan = SUBSCRIPTION_PLANS.find(p => p.id === 'gold');
      const savings = goldPlan!.originalPrice - goldPlan!.price;
      expect(savings).toBe(500);
    });

    it('should calculate yearly savings correctly', () => {
      const monthlyPrice = 199;
      const yearlyFullPrice = monthlyPrice * 12;
      const yearlyDiscounted = calculateYearlyPrice(monthlyPrice);
      const yearlySavings = yearlyFullPrice - yearlyDiscounted;
      // 2388 - 1433 = 955
      expect(yearlySavings).toBe(955);
    });
  });
});
