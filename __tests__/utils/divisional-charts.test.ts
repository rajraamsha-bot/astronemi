/**
 * Divisional Charts (Varga Charts) Tests
 * 
 * Tests for Vedic astrology divisional chart calculations:
 * - D7 (Saptamsa) - Children
 * - D10 (Dasamsa) - Career
 * - D12 (Dwadasamsa) - Parents
 * - D16 (Shodasamsa) - Vehicles
 * - D20 (Vimsamsa) - Spiritual pursuits
 * - D24 (Chaturvimsamsa) - Education
 * - D60 (Shashtiamsa) - Overall life
 */

import {
  calculateDivisionalChart,
  getDivisionalChartName,
  getDivisionalChartPurpose,
  calculateD7,
  calculateD10,
  calculateD12,
  calculateD16,
  calculateD20,
  calculateD24,
  calculateD60,
  DivisionalChartType,
} from '@/utils/divisional-charts';

describe('Divisional Charts', () => {
  // Sample planet positions for testing
  const samplePlanets = [
    { name: 'Sun', longitude: 45.5, sign: 'Taurus', house: 1 },
    { name: 'Moon', longitude: 120.3, sign: 'Leo', house: 4 },
    { name: 'Mars', longitude: 200.7, sign: 'Libra', house: 7 },
    { name: 'Mercury', longitude: 50.2, sign: 'Taurus', house: 2 },
    { name: 'Jupiter', longitude: 280.4, sign: 'Capricorn', house: 10 },
    { name: 'Venus', longitude: 35.8, sign: 'Aries', house: 1 },
    { name: 'Saturn', longitude: 310.6, sign: 'Aquarius', house: 11 },
  ];

  describe('Chart Type Metadata', () => {
    it('should return correct names for all divisional charts', () => {
      expect(getDivisionalChartName('D7')).toBe('Saptamsa');
      expect(getDivisionalChartName('D10')).toBe('Dasamsa');
      expect(getDivisionalChartName('D12')).toBe('Dwadasamsa');
      expect(getDivisionalChartName('D16')).toBe('Shodasamsa');
      expect(getDivisionalChartName('D20')).toBe('Vimsamsa');
      expect(getDivisionalChartName('D24')).toBe('Chaturvimsamsa');
      expect(getDivisionalChartName('D60')).toBe('Shashtiamsa');
    });

    it('should return correct purposes for all divisional charts', () => {
      expect(getDivisionalChartPurpose('D7')).toContain('children');
      expect(getDivisionalChartPurpose('D10')).toContain('career');
      expect(getDivisionalChartPurpose('D12')).toContain('parents');
      expect(getDivisionalChartPurpose('D16')).toContain('vehicles');
      expect(getDivisionalChartPurpose('D20')).toContain('spiritual');
      expect(getDivisionalChartPurpose('D24')).toContain('education');
      expect(getDivisionalChartPurpose('D60')).toContain('overall');
    });

    it('should handle unknown chart types gracefully', () => {
      // @ts-expect-error Testing invalid input
      expect(getDivisionalChartName('D99')).toBe('Unknown');
      // @ts-expect-error Testing invalid input
      expect(getDivisionalChartPurpose('D99')).toBe('');
    });
  });

  describe('D7 - Saptamsa (Children)', () => {
    it('should calculate D7 positions for all planets', () => {
      const d7Chart = calculateD7(samplePlanets);
      
      expect(d7Chart).toBeDefined();
      expect(d7Chart.planets).toHaveLength(samplePlanets.length);
      expect(d7Chart.chartType).toBe('D7');
      expect(d7Chart.name).toBe('Saptamsa');
    });

    it('should have valid sign positions (0-11)', () => {
      const d7Chart = calculateD7(samplePlanets);
      
      d7Chart.planets.forEach(planet => {
        expect(planet.signNumber).toBeGreaterThanOrEqual(0);
        expect(planet.signNumber).toBeLessThan(12);
      });
    });

    it('should have valid house positions (1-12)', () => {
      const d7Chart = calculateD7(samplePlanets);
      
      d7Chart.planets.forEach(planet => {
        expect(planet.house).toBeGreaterThanOrEqual(1);
        expect(planet.house).toBeLessThanOrEqual(12);
      });
    });

    it('should preserve planet names', () => {
      const d7Chart = calculateD7(samplePlanets);
      
      samplePlanets.forEach((planet, index) => {
        expect(d7Chart.planets[index].name).toBe(planet.name);
      });
    });

    it('should include interpretation', () => {
      const d7Chart = calculateD7(samplePlanets);
      
      expect(d7Chart.interpretation).toBeDefined();
      expect(d7Chart.interpretation.length).toBeGreaterThan(0);
    });
  });

  describe('D10 - Dasamsa (Career)', () => {
    it('should calculate D10 positions correctly', () => {
      const d10Chart = calculateD10(samplePlanets);
      
      expect(d10Chart.chartType).toBe('D10');
      expect(d10Chart.name).toBe('Dasamsa');
      expect(d10Chart.planets).toHaveLength(samplePlanets.length);
    });

    it('should have career-related interpretation', () => {
      const d10Chart = calculateD10(samplePlanets);
      
      expect(d10Chart.interpretation.toLowerCase()).toContain('career');
    });

    it('should calculate different positions than D7', () => {
      const d7Chart = calculateD7(samplePlanets);
      const d10Chart = calculateD10(samplePlanets);
      
      // At least some planets should have different positions
      let differentCount = 0;
      for (let i = 0; i < samplePlanets.length; i++) {
        if (d7Chart.planets[i].signNumber !== d10Chart.planets[i].signNumber) {
          differentCount++;
        }
      }
      expect(differentCount).toBeGreaterThan(0);
    });
  });

  describe('D12 - Dwadasamsa (Parents)', () => {
    it('should calculate D12 positions correctly', () => {
      const d12Chart = calculateD12(samplePlanets);
      
      expect(d12Chart.chartType).toBe('D12');
      expect(d12Chart.name).toBe('Dwadasamsa');
      expect(d12Chart.planets).toHaveLength(samplePlanets.length);
    });

    it('should have parents-related interpretation', () => {
      const d12Chart = calculateD12(samplePlanets);
      
      expect(d12Chart.interpretation.toLowerCase()).toContain('parent');
    });
  });

  describe('D16 - Shodasamsa (Vehicles)', () => {
    it('should calculate D16 positions correctly', () => {
      const d16Chart = calculateD16(samplePlanets);
      
      expect(d16Chart.chartType).toBe('D16');
      expect(d16Chart.name).toBe('Shodasamsa');
      expect(d16Chart.planets).toHaveLength(samplePlanets.length);
    });

    it('should have vehicles-related interpretation', () => {
      const d16Chart = calculateD16(samplePlanets);
      
      expect(d16Chart.interpretation.toLowerCase()).toContain('vehicle');
    });
  });

  describe('D20 - Vimsamsa (Spiritual)', () => {
    it('should calculate D20 positions correctly', () => {
      const d20Chart = calculateD20(samplePlanets);
      
      expect(d20Chart.chartType).toBe('D20');
      expect(d20Chart.name).toBe('Vimsamsa');
      expect(d20Chart.planets).toHaveLength(samplePlanets.length);
    });

    it('should have spiritual-related interpretation', () => {
      const d20Chart = calculateD20(samplePlanets);
      
      expect(d20Chart.interpretation.toLowerCase()).toContain('spiritual');
    });
  });

  describe('D24 - Chaturvimsamsa (Education)', () => {
    it('should calculate D24 positions correctly', () => {
      const d24Chart = calculateD24(samplePlanets);
      
      expect(d24Chart.chartType).toBe('D24');
      expect(d24Chart.name).toBe('Chaturvimsamsa');
      expect(d24Chart.planets).toHaveLength(samplePlanets.length);
    });

    it('should have education-related interpretation', () => {
      const d24Chart = calculateD24(samplePlanets);
      
      expect(d24Chart.interpretation.toLowerCase()).toContain('education');
    });
  });

  describe('D60 - Shashtiamsa (Overall Life)', () => {
    it('should calculate D60 positions correctly', () => {
      const d60Chart = calculateD60(samplePlanets);
      
      expect(d60Chart.chartType).toBe('D60');
      expect(d60Chart.name).toBe('Shashtiamsa');
      expect(d60Chart.planets).toHaveLength(samplePlanets.length);
    });

    it('should have overall life interpretation', () => {
      const d60Chart = calculateD60(samplePlanets);
      
      expect(d60Chart.interpretation.toLowerCase()).toContain('overall');
    });

    it('should be most detailed chart', () => {
      const d60Chart = calculateD60(samplePlanets);
      
      // D60 divides each sign into 60 parts, so it should be very precise
      expect(d60Chart.interpretation.length).toBeGreaterThan(50);
    });
  });

  describe('Generic calculateDivisionalChart', () => {
    it('should calculate any divisional chart by type', () => {
      const chartTypes: DivisionalChartType[] = ['D7', 'D10', 'D12', 'D16', 'D20', 'D24', 'D60'];
      
      chartTypes.forEach(type => {
        const chart = calculateDivisionalChart(samplePlanets, type);
        expect(chart.chartType).toBe(type);
        expect(chart.planets).toHaveLength(samplePlanets.length);
      });
    });

    it('should match specific calculation functions', () => {
      const d7Generic = calculateDivisionalChart(samplePlanets, 'D7');
      const d7Specific = calculateD7(samplePlanets);
      
      expect(d7Generic.chartType).toBe(d7Specific.chartType);
      expect(d7Generic.name).toBe(d7Specific.name);
    });
  });

  describe('Longitude Calculations', () => {
    it('should handle 0 degree longitude', () => {
      const planets = [{ name: 'Sun', longitude: 0, sign: 'Aries', house: 1 }];
      const d7Chart = calculateD7(planets);
      
      expect(d7Chart.planets[0].signNumber).toBeGreaterThanOrEqual(0);
      expect(d7Chart.planets[0].signNumber).toBeLessThan(12);
    });

    it('should handle 359.99 degree longitude', () => {
      const planets = [{ name: 'Sun', longitude: 359.99, sign: 'Pisces', house: 12 }];
      const d7Chart = calculateD7(planets);
      
      expect(d7Chart.planets[0].signNumber).toBeGreaterThanOrEqual(0);
      expect(d7Chart.planets[0].signNumber).toBeLessThan(12);
    });

    it('should handle mid-sign longitudes', () => {
      const planets = [{ name: 'Moon', longitude: 75.5, sign: 'Gemini', house: 3 }];
      const d10Chart = calculateD10(planets);
      
      expect(d10Chart.planets[0].signNumber).toBeGreaterThanOrEqual(0);
      expect(d10Chart.planets[0].signNumber).toBeLessThan(12);
    });
  });

  describe('Chart Consistency', () => {
    it('should produce consistent results for same input', () => {
      const chart1 = calculateD7(samplePlanets);
      const chart2 = calculateD7(samplePlanets);
      
      chart1.planets.forEach((planet, index) => {
        expect(planet.signNumber).toBe(chart2.planets[index].signNumber);
        expect(planet.house).toBe(chart2.planets[index].house);
      });
    });

    it('should handle empty planet array', () => {
      const emptyChart = calculateD7([]);
      
      expect(emptyChart.planets).toHaveLength(0);
      expect(emptyChart.chartType).toBe('D7');
    });

    it('should handle single planet', () => {
      const singlePlanet = [{ name: 'Sun', longitude: 100, sign: 'Cancer', house: 4 }];
      const chart = calculateD10(singlePlanet);
      
      expect(chart.planets).toHaveLength(1);
      expect(chart.planets[0].name).toBe('Sun');
    });
  });

  describe('Sign Names', () => {
    it('should assign valid zodiac sign names', () => {
      const validSigns = [
        'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
        'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
      ];
      
      const d7Chart = calculateD7(samplePlanets);
      
      d7Chart.planets.forEach(planet => {
        expect(validSigns).toContain(planet.sign);
      });
    });
  });

  describe('Interpretation Quality', () => {
    it('should provide meaningful interpretations', () => {
      const charts = [
        calculateD7(samplePlanets),
        calculateD10(samplePlanets),
        calculateD12(samplePlanets),
        calculateD16(samplePlanets),
        calculateD20(samplePlanets),
        calculateD24(samplePlanets),
        calculateD60(samplePlanets),
      ];
      
      charts.forEach(chart => {
        expect(chart.interpretation).toBeDefined();
        expect(chart.interpretation.length).toBeGreaterThan(20);
        expect(chart.interpretation).not.toBe('');
      });
    });

    it('should have unique interpretations for each chart', () => {
      const interpretations = [
        calculateD7(samplePlanets).interpretation,
        calculateD10(samplePlanets).interpretation,
        calculateD12(samplePlanets).interpretation,
        calculateD16(samplePlanets).interpretation,
        calculateD20(samplePlanets).interpretation,
        calculateD24(samplePlanets).interpretation,
        calculateD60(samplePlanets).interpretation,
      ];
      
      const uniqueInterpretations = new Set(interpretations);
      expect(uniqueInterpretations.size).toBe(interpretations.length);
    });
  });

  describe('Edge Cases', () => {
    it('should handle planets at sign boundaries', () => {
      const boundaryPlanets = [
        { name: 'Sun', longitude: 30.0, sign: 'Taurus', house: 2 },
        { name: 'Moon', longitude: 60.0, sign: 'Gemini', house: 3 },
        { name: 'Mars', longitude: 90.0, sign: 'Cancer', house: 4 },
      ];
      
      const chart = calculateD7(boundaryPlanets);
      
      chart.planets.forEach(planet => {
        expect(planet.signNumber).toBeGreaterThanOrEqual(0);
        expect(planet.signNumber).toBeLessThan(12);
      });
    });

    it('should handle retrograde planets', () => {
      const retroPlanets = [
        { name: 'Mercury', longitude: 150.5, sign: 'Virgo', house: 6, isRetrograde: true },
        { name: 'Saturn', longitude: 280.3, sign: 'Capricorn', house: 10, isRetrograde: true },
      ];
      
      const chart = calculateD10(retroPlanets);
      
      expect(chart.planets).toHaveLength(2);
      chart.planets.forEach(planet => {
        expect(planet.signNumber).toBeGreaterThanOrEqual(0);
        expect(planet.signNumber).toBeLessThan(12);
      });
    });
  });
});
