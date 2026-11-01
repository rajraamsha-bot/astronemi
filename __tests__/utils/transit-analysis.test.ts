/**
 * Transit Analysis Tests
 * 
 * Tests for planetary transit calculations and predictions:
 * - Sade Sati (Saturn's 7.5-year cycle)
 * - Jupiter transits (12-year cycle)
 * - Rahu-Ketu transits (18-month cycle)
 * - Transit effects on life areas
 * - Remedies and recommendations
 */

import {
  analyzeSadeSati,
  analyzeJupiterTransit,
  analyzeRahuKetuTransit,
  getTransitPredictions,
  getTransitRemedies,
  calculateTransitStrength,
  isTransitBenefic,
  SadeSatiPhase,
  TransitType,
} from '@/utils/transit-analysis';

describe('Transit Analysis', () => {
  // Sample birth chart data
  const sampleBirthChart = {
    moonSign: 'Capricorn',
    moonHouse: 10,
    ascendant: 'Aries',
    planets: [
      { name: 'Sun', sign: 'Aries', house: 1, longitude: 15.5 },
      { name: 'Moon', sign: 'Capricorn', house: 10, longitude: 285.3 },
      { name: 'Mars', sign: 'Leo', house: 5, longitude: 135.7 },
      { name: 'Mercury', sign: 'Pisces', house: 12, longitude: 345.2 },
      { name: 'Jupiter', sign: 'Sagittarius', house: 9, longitude: 255.4 },
      { name: 'Venus', sign: 'Taurus', house: 2, longitude: 45.8 },
      { name: 'Saturn', sign: 'Aquarius', house: 11, longitude: 315.6 },
      { name: 'Rahu', sign: 'Gemini', house: 3, longitude: 75.9 },
      { name: 'Ketu', sign: 'Sagittarius', house: 9, longitude: 255.9 },
    ],
  };

  // Current transit positions
  const currentTransits = {
    Saturn: { sign: 'Capricorn', house: 10, longitude: 290.0 },
    Jupiter: { sign: 'Pisces', house: 12, longitude: 350.0 },
    Rahu: { sign: 'Aries', house: 1, longitude: 10.0 },
    Ketu: { sign: 'Libra', house: 7, longitude: 190.0 },
  };

  describe('Sade Sati Analysis', () => {
    it('should identify Sade Sati phase correctly', () => {
      const analysis = analyzeSadeSati(sampleBirthChart.moonSign, currentTransits.Saturn.sign);
      
      expect(analysis).toBeDefined();
      expect(analysis.isActive).toBeDefined();
      expect(analysis.phase).toBeDefined();
    });

    it('should detect Rising phase (12th from Moon)', () => {
      const analysis = analyzeSadeSati('Aquarius', 'Capricorn');
      
      expect(analysis.isActive).toBe(true);
      expect(analysis.phase).toBe('Rising');
    });

    it('should detect Peak phase (same as Moon)', () => {
      const analysis = analyzeSadeSati('Capricorn', 'Capricorn');
      
      expect(analysis.isActive).toBe(true);
      expect(analysis.phase).toBe('Peak');
    });

    it('should detect Setting phase (2nd from Moon)', () => {
      const analysis = analyzeSadeSati('Sagittarius', 'Capricorn');
      
      expect(analysis.isActive).toBe(true);
      expect(analysis.phase).toBe('Setting');
    });

    it('should detect when Sade Sati is not active', () => {
      const analysis = analyzeSadeSati('Aries', 'Capricorn');
      
      expect(analysis.isActive).toBe(false);
      expect(analysis.phase).toBeNull();
    });

    it('should provide phase-specific effects', () => {
      const risingAnalysis = analyzeSadeSati('Aquarius', 'Capricorn');
      const peakAnalysis = analyzeSadeSati('Capricorn', 'Capricorn');
      const settingAnalysis = analyzeSadeSati('Sagittarius', 'Capricorn');
      
      expect(risingAnalysis.effects).toBeDefined();
      expect(peakAnalysis.effects).toBeDefined();
      expect(settingAnalysis.effects).toBeDefined();
      
      // Peak should have most intense effects
      expect(peakAnalysis.effects.length).toBeGreaterThan(0);
    });

    it('should provide remedies for active Sade Sati', () => {
      const analysis = analyzeSadeSati('Capricorn', 'Capricorn');
      
      expect(analysis.remedies).toBeDefined();
      expect(analysis.remedies.length).toBeGreaterThan(0);
    });

    it('should calculate duration correctly', () => {
      const analysis = analyzeSadeSati('Capricorn', 'Capricorn');
      
      expect(analysis.duration).toBeDefined();
      expect(analysis.duration).toContain('2.5 years');
    });
  });

  describe('Jupiter Transit Analysis', () => {
    it('should analyze Jupiter transit effects', () => {
      const analysis = analyzeJupiterTransit(
        sampleBirthChart.moonSign,
        currentTransits.Jupiter.sign
      );
      
      expect(analysis).toBeDefined();
      expect(analysis.currentHouse).toBeDefined();
      expect(analysis.effects).toBeDefined();
    });

    it('should identify house position from Moon', () => {
      const analysis = analyzeJupiterTransit('Aries', 'Aries');
      
      expect(analysis.currentHouse).toBe(1);
    });

    it('should provide house-specific predictions', () => {
      const houses = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
      
      houses.forEach(house => {
        const moonSign = 'Aries';
        const jupiterSign = getSignByHouseOffset(moonSign, house - 1);
        const analysis = analyzeJupiterTransit(moonSign, jupiterSign);
        
        expect(analysis.currentHouse).toBe(house);
        expect(analysis.effects.length).toBeGreaterThan(0);
      });
    });

    it('should identify benefic houses (1, 2, 5, 7, 9, 11)', () => {
      const beneficHouses = [1, 2, 5, 7, 9, 11];
      
      beneficHouses.forEach(house => {
        const moonSign = 'Aries';
        const jupiterSign = getSignByHouseOffset(moonSign, house - 1);
        const analysis = analyzeJupiterTransit(moonSign, jupiterSign);
        
        expect(analysis.isBenefic).toBe(true);
      });
    });

    it('should identify challenging houses (6, 8, 12)', () => {
      const challengingHouses = [6, 8, 12];
      
      challengingHouses.forEach(house => {
        const moonSign = 'Aries';
        const jupiterSign = getSignByHouseOffset(moonSign, house - 1);
        const analysis = analyzeJupiterTransit(moonSign, jupiterSign);
        
        expect(analysis.isBenefic).toBe(false);
      });
    });

    it('should provide career predictions', () => {
      const analysis = analyzeJupiterTransit('Aries', 'Capricorn'); // 10th house
      
      expect(analysis.predictions.career).toBeDefined();
      expect(analysis.predictions.career.length).toBeGreaterThan(0);
    });

    it('should provide relationship predictions', () => {
      const analysis = analyzeJupiterTransit('Aries', 'Libra'); // 7th house
      
      expect(analysis.predictions.relationships).toBeDefined();
      expect(analysis.predictions.relationships.length).toBeGreaterThan(0);
    });

    it('should provide financial predictions', () => {
      const analysis = analyzeJupiterTransit('Aries', 'Taurus'); // 2nd house
      
      expect(analysis.predictions.finance).toBeDefined();
      expect(analysis.predictions.finance.length).toBeGreaterThan(0);
    });

    it('should calculate transit duration', () => {
      const analysis = analyzeJupiterTransit('Aries', 'Taurus');
      
      expect(analysis.duration).toBeDefined();
      expect(analysis.duration).toContain('1 year');
    });
  });

  describe('Rahu-Ketu Transit Analysis', () => {
    it('should analyze Rahu-Ketu axis transit', () => {
      const analysis = analyzeRahuKetuTransit(
        sampleBirthChart.moonSign,
        currentTransits.Rahu.sign,
        currentTransits.Ketu.sign
      );
      
      expect(analysis).toBeDefined();
      expect(analysis.rahuHouse).toBeDefined();
      expect(analysis.ketuHouse).toBeDefined();
    });

    it('should maintain Rahu-Ketu opposition (7 houses apart)', () => {
      const analysis = analyzeRahuKetuTransit('Aries', 'Aries', 'Libra');
      
      const houseDiff = Math.abs(analysis.rahuHouse - analysis.ketuHouse);
      expect(houseDiff).toBe(6); // 7 houses apart (difference of 6)
    });

    it('should provide Rahu-specific effects', () => {
      const analysis = analyzeRahuKetuTransit('Aries', 'Taurus', 'Scorpio');
      
      expect(analysis.rahuEffects).toBeDefined();
      expect(analysis.rahuEffects.length).toBeGreaterThan(0);
    });

    it('should provide Ketu-specific effects', () => {
      const analysis = analyzeRahuKetuTransit('Aries', 'Taurus', 'Scorpio');
      
      expect(analysis.ketuEffects).toBeDefined();
      expect(analysis.ketuEffects.length).toBeGreaterThan(0);
    });

    it('should identify karmic lessons', () => {
      const analysis = analyzeRahuKetuTransit('Aries', 'Cancer', 'Capricorn');
      
      expect(analysis.karmicLessons).toBeDefined();
      expect(analysis.karmicLessons.length).toBeGreaterThan(0);
    });

    it('should provide remedies for challenging transits', () => {
      const analysis = analyzeRahuKetuTransit('Aries', 'Aries', 'Libra'); // 1st-7th axis
      
      expect(analysis.remedies).toBeDefined();
      expect(analysis.remedies.length).toBeGreaterThan(0);
    });

    it('should calculate transit duration', () => {
      const analysis = analyzeRahuKetuTransit('Aries', 'Taurus', 'Scorpio');
      
      expect(analysis.duration).toBeDefined();
      expect(analysis.duration).toContain('18 months');
    });
  });

  describe('Transit Predictions', () => {
    it('should generate comprehensive transit predictions', () => {
      const predictions = getTransitPredictions(sampleBirthChart, currentTransits);
      
      expect(predictions).toBeDefined();
      expect(predictions.career).toBeDefined();
      expect(predictions.health).toBeDefined();
      expect(predictions.relationships).toBeDefined();
      expect(predictions.finance).toBeDefined();
    });

    it('should provide career predictions', () => {
      const predictions = getTransitPredictions(sampleBirthChart, currentTransits);
      
      expect(Array.isArray(predictions.career)).toBe(true);
      expect(predictions.career.length).toBeGreaterThan(0);
    });

    it('should provide health predictions', () => {
      const predictions = getTransitPredictions(sampleBirthChart, currentTransits);
      
      expect(Array.isArray(predictions.health)).toBe(true);
      expect(predictions.health.length).toBeGreaterThan(0);
    });

    it('should provide relationship predictions', () => {
      const predictions = getTransitPredictions(sampleBirthChart, currentTransits);
      
      expect(Array.isArray(predictions.relationships)).toBe(true);
      expect(predictions.relationships.length).toBeGreaterThan(0);
    });

    it('should provide financial predictions', () => {
      const predictions = getTransitPredictions(sampleBirthChart, currentTransits);
      
      expect(Array.isArray(predictions.finance)).toBe(true);
      expect(predictions.finance.length).toBeGreaterThan(0);
    });

    it('should include timing information', () => {
      const predictions = getTransitPredictions(sampleBirthChart, currentTransits);
      
      expect(predictions.timing).toBeDefined();
      expect(predictions.timing.currentPeriod).toBeDefined();
    });
  });

  describe('Transit Remedies', () => {
    it('should provide remedies for all transit types', () => {
      const remedies = getTransitRemedies('Saturn', 'challenging');
      
      expect(remedies).toBeDefined();
      expect(Array.isArray(remedies)).toBe(true);
      expect(remedies.length).toBeGreaterThan(0);
    });

    it('should provide Saturn-specific remedies', () => {
      const remedies = getTransitRemedies('Saturn', 'challenging');
      
      expect(remedies.some(r => r.toLowerCase().includes('saturn'))).toBe(true);
    });

    it('should provide Jupiter-specific remedies', () => {
      const remedies = getTransitRemedies('Jupiter', 'benefic');
      
      expect(remedies.some(r => r.toLowerCase().includes('jupiter'))).toBe(true);
    });

    it('should provide Rahu-specific remedies', () => {
      const remedies = getTransitRemedies('Rahu', 'challenging');
      
      expect(remedies.some(r => r.toLowerCase().includes('rahu'))).toBe(true);
    });

    it('should differentiate between benefic and challenging remedies', () => {
      const challengingRemedies = getTransitRemedies('Saturn', 'challenging');
      const beneficRemedies = getTransitRemedies('Jupiter', 'benefic');
      
      expect(challengingRemedies).not.toEqual(beneficRemedies);
    });
  });

  describe('Transit Strength Calculation', () => {
    it('should calculate transit strength (0-100)', () => {
      const strength = calculateTransitStrength('Jupiter', 'Pisces', 12);
      
      expect(strength).toBeGreaterThanOrEqual(0);
      expect(strength).toBeLessThanOrEqual(100);
    });

    it('should give higher strength for exalted planets', () => {
      const jupiterInCancer = calculateTransitStrength('Jupiter', 'Cancer', 4);
      const jupiterInCapricorn = calculateTransitStrength('Jupiter', 'Capricorn', 10);
      
      // Jupiter is exalted in Cancer, debilitated in Capricorn
      expect(jupiterInCancer).toBeGreaterThan(jupiterInCapricorn);
    });

    it('should consider house position', () => {
      const beneficHouse = calculateTransitStrength('Jupiter', 'Aries', 1);
      const challengingHouse = calculateTransitStrength('Jupiter', 'Virgo', 6);
      
      expect(beneficHouse).toBeGreaterThan(challengingHouse);
    });
  });

  describe('Transit Benefic Check', () => {
    it('should identify benefic transits', () => {
      expect(isTransitBenefic('Jupiter', 'Pisces', 1)).toBe(true);
      expect(isTransitBenefic('Jupiter', 'Sagittarius', 9)).toBe(true);
    });

    it('should identify malefic transits', () => {
      expect(isTransitBenefic('Saturn', 'Aries', 8)).toBe(false);
      expect(isTransitBenefic('Rahu', 'Scorpio', 12)).toBe(false);
    });

    it('should consider planet nature', () => {
      // Jupiter is naturally benefic
      expect(isTransitBenefic('Jupiter', 'Aries', 5)).toBe(true);
      
      // Saturn is naturally malefic
      expect(isTransitBenefic('Saturn', 'Aries', 5)).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle unknown signs gracefully', () => {
      // @ts-expect-error Testing invalid input
      expect(() => analyzeSadeSati('Unknown', 'Capricorn')).not.toThrow();
    });

    it('should handle null transit data', () => {
      // @ts-expect-error Testing invalid input
      expect(() => getTransitPredictions(sampleBirthChart, null)).not.toThrow();
    });

    it('should handle empty birth chart', () => {
      const emptyChart = { moonSign: '', moonHouse: 0, ascendant: '', planets: [] };
      
      expect(() => getTransitPredictions(emptyChart, currentTransits)).not.toThrow();
    });
  });
});

// Helper function to get sign by house offset
function getSignByHouseOffset(startSign: string, offset: number): string {
  const signs = [
    'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
    'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
  ];
  
  const startIndex = signs.indexOf(startSign);
  const targetIndex = (startIndex + offset) % 12;
  
  return signs[targetIndex];
}
