/**
 * Expanded Yogas Tests
 * 
 * Tests for Vedic astrology yoga (planetary combination) detection:
 * - Pancha Mahapurusha Yogas (5 great yogas)
 * - Wealth Yogas (Gaja Kesari, Lakshmi, etc.)
 * - Spiritual Yogas (Pravrajya, etc.)
 * - Doshas (Kemadruma, Kala Sarpa, etc.)
 * - Special Yogas (Budha-Aditya, etc.)
 */

import {
  detectAllYogas,
  detectPanchaMahapurushaYogas,
  detectWealthYogas,
  detectSpiritualYogas,
  detectDoshas,
  detectSpecialYogas,
  isRuchakaYoga,
  isRuchakYoga,
  isBhadraYoga,
  isHamsaYoga,
  isMalavyaYoga,
  isSasaYoga,
  isGajaKesariYoga,
  isKemadrumaDosha,
  isKalaSarpaYoga,
  YogaType,
  YogaStrength,
} from '@/utils/expanded-yogas';

describe('Expanded Yogas', () => {
  // Sample chart with various yogas
  const sampleChart = {
    planets: [
      { name: 'Sun', sign: 'Aries', house: 1, longitude: 15.5, isExalted: true },
      { name: 'Moon', sign: 'Taurus', house: 2, longitude: 45.3, isExalted: true },
      { name: 'Mars', sign: 'Capricorn', house: 10, longitude: 285.7, isExalted: true },
      { name: 'Mercury', sign: 'Virgo', house: 6, longitude: 165.2, isExalted: true },
      { name: 'Jupiter', sign: 'Cancer', house: 4, longitude: 105.4, isExalted: true },
      { name: 'Venus', sign: 'Pisces', house: 12, longitude: 355.8, isExalted: true },
      { name: 'Saturn', sign: 'Libra', house: 7, longitude: 195.6, isExalted: true },
      { name: 'Rahu', sign: 'Gemini', house: 3, longitude: 75.9 },
      { name: 'Ketu', sign: 'Sagittarius', house: 9, longitude: 255.9 },
    ],
    ascendant: 'Aries',
  };

  describe('Pancha Mahapurusha Yogas', () => {
    it('should detect all five Mahapurusha yogas', () => {
      const yogas = detectPanchaMahapurushaYogas(sampleChart.planets);
      
      expect(yogas).toBeDefined();
      expect(Array.isArray(yogas)).toBe(true);
    });

    describe('Ruchaka Yoga (Mars)', () => {
      it('should detect Ruchaka yoga when Mars is in kendra and own/exalted sign', () => {
        const planets = [
          { name: 'Mars', sign: 'Aries', house: 1, longitude: 15.0, isExalted: false },
        ];
        
        expect(isRuchakaYoga(planets)).toBe(true);
      });

      it('should detect Ruchaka yoga with Mars in Scorpio', () => {
        const planets = [
          { name: 'Mars', sign: 'Scorpio', house: 7, longitude: 225.0, isExalted: false },
        ];
        
        expect(isRuchakYoga(planets)).toBe(true);
      });

      it('should detect Ruchaka yoga with Mars exalted in Capricorn', () => {
        const planets = [
          { name: 'Mars', sign: 'Capricorn', house: 10, longitude: 285.0, isExalted: true },
        ];
        
        expect(isRuchakYoga(planets)).toBe(true);
      });

      it('should not detect Ruchaka yoga when Mars is not in kendra', () => {
        const planets = [
          { name: 'Mars', sign: 'Aries', house: 5, longitude: 135.0, isExalted: false },
        ];
        
        expect(isRuchakYoga(planets)).toBe(false);
      });
    });

    describe('Bhadra Yoga (Mercury)', () => {
      it('should detect Bhadra yoga when Mercury is in kendra and own/exalted sign', () => {
        const planets = [
          { name: 'Mercury', sign: 'Gemini', house: 1, longitude: 75.0, isExalted: false },
        ];
        
        expect(isBhadraYoga(planets)).toBe(true);
      });

      it('should detect Bhadra yoga with Mercury in Virgo', () => {
        const planets = [
          { name: 'Mercury', sign: 'Virgo', house: 4, longitude: 165.0, isExalted: true },
        ];
        
        expect(isBhadraYoga(planets)).toBe(true);
      });
    });

    describe('Hamsa Yoga (Jupiter)', () => {
      it('should detect Hamsa yoga when Jupiter is in kendra and own/exalted sign', () => {
        const planets = [
          { name: 'Jupiter', sign: 'Sagittarius', house: 1, longitude: 255.0, isExalted: false },
        ];
        
        expect(isHamsaYoga(planets)).toBe(true);
      });

      it('should detect Hamsa yoga with Jupiter exalted in Cancer', () => {
        const planets = [
          { name: 'Jupiter', sign: 'Cancer', house: 4, longitude: 105.0, isExalted: true },
        ];
        
        expect(isHamsaYoga(planets)).toBe(true);
      });
    });

    describe('Malavya Yoga (Venus)', () => {
      it('should detect Malavya yoga when Venus is in kendra and own/exalted sign', () => {
        const planets = [
          { name: 'Venus', sign: 'Taurus', house: 1, longitude: 45.0, isExalted: false },
        ];
        
        expect(isMalavyaYoga(planets)).toBe(true);
      });

      it('should detect Malavya yoga with Venus exalted in Pisces', () => {
        const planets = [
          { name: 'Venus', sign: 'Pisces', house: 7, longitude: 355.0, isExalted: true },
        ];
        
        expect(isMalavyaYoga(planets)).toBe(true);
      });
    });

    describe('Sasa Yoga (Saturn)', () => {
      it('should detect Sasa yoga when Saturn is in kendra and own/exalted sign', () => {
        const planets = [
          { name: 'Saturn', sign: 'Capricorn', house: 1, longitude: 285.0, isExalted: false },
        ];
        
        expect(isSasaYoga(planets)).toBe(true);
      });

      it('should detect Sasa yoga with Saturn exalted in Libra', () => {
        const planets = [
          { name: 'Saturn', sign: 'Libra', house: 7, longitude: 195.0, isExalted: true },
        ];
        
        expect(isSasaYoga(planets)).toBe(true);
      });
    });
  });

  describe('Wealth Yogas', () => {
    it('should detect wealth yogas in chart', () => {
      const yogas = detectWealthYogas(sampleChart.planets);
      
      expect(yogas).toBeDefined();
      expect(Array.isArray(yogas)).toBe(true);
    });

    describe('Gaja Kesari Yoga', () => {
      it('should detect Gaja Kesari when Jupiter and Moon are in kendras', () => {
        const planets = [
          { name: 'Moon', sign: 'Aries', house: 1, longitude: 15.0 },
          { name: 'Jupiter', sign: 'Cancer', house: 4, longitude: 105.0 },
        ];
        
        expect(isGajaKesariYoga(planets)).toBe(true);
      });

      it('should detect Gaja Kesari when Jupiter is in kendra from Moon', () => {
        const planets = [
          { name: 'Moon', sign: 'Aries', house: 1, longitude: 15.0 },
          { name: 'Jupiter', sign: 'Libra', house: 7, longitude: 195.0 },
        ];
        
        expect(isGajaKesariYoga(planets)).toBe(true);
      });

      it('should not detect Gaja Kesari when Jupiter is not in kendra from Moon', () => {
        const planets = [
          { name: 'Moon', sign: 'Aries', house: 1, longitude: 15.0 },
          { name: 'Jupiter', sign: 'Gemini', house: 3, longitude: 75.0 },
        ];
        
        expect(isGajaKesariYoga(planets)).toBe(false);
      });
    });

    describe('Lakshmi Yoga', () => {
      it('should detect Lakshmi yoga with strong Venus and 9th lord', () => {
        const yogas = detectWealthYogas([
          { name: 'Venus', sign: 'Pisces', house: 9, longitude: 355.0, isExalted: true },
          { name: 'Jupiter', sign: 'Sagittarius', house: 9, longitude: 255.0 },
        ]);
        
        const hasLakshmiYoga = yogas.some(y => y.name.includes('Lakshmi'));
        expect(hasLakshmiYoga).toBe(true);
      });
    });

    describe('Chandra-Mangala Yoga', () => {
      it('should detect when Moon and Mars are conjunct', () => {
        const yogas = detectWealthYogas([
          { name: 'Moon', sign: 'Aries', house: 1, longitude: 15.0 },
          { name: 'Mars', sign: 'Aries', house: 1, longitude: 18.0 },
        ]);
        
        const hasChandraMangalaYoga = yogas.some(y => y.name.includes('Chandra-Mangala'));
        expect(hasChandraMangalaYoga).toBe(true);
      });
    });
  });

  describe('Spiritual Yogas', () => {
    it('should detect spiritual yogas in chart', () => {
      const yogas = detectSpiritualYogas(sampleChart.planets);
      
      expect(yogas).toBeDefined();
      expect(Array.isArray(yogas)).toBe(true);
    });

    describe('Pravrajya Yoga', () => {
      it('should detect Pravrajya yoga with strong 12th house', () => {
        const yogas = detectSpiritualYogas([
          { name: 'Saturn', sign: 'Pisces', house: 12, longitude: 355.0 },
          { name: 'Jupiter', sign: 'Pisces', house: 12, longitude: 350.0 },
          { name: 'Ketu', sign: 'Pisces', house: 12, longitude: 345.0 },
        ]);
        
        const hasPravrajyaYoga = yogas.some(y => y.name.includes('Pravrajya'));
        expect(hasPravrajyaYoga).toBe(true);
      });
    });

    describe('Moksha Yoga', () => {
      it('should detect Moksha yoga with benefics in trines', () => {
        const yogas = detectSpiritualYogas([
          { name: 'Jupiter', sign: 'Sagittarius', house: 9, longitude: 255.0 },
          { name: 'Venus', sign: 'Leo', house: 5, longitude: 135.0 },
        ]);
        
        const hasMokshaYoga = yogas.some(y => y.name.includes('Moksha') || y.name.includes('Spiritual'));
        expect(hasMokshaYoga).toBe(true);
      });
    });
  });

  describe('Doshas', () => {
    it('should detect doshas in chart', () => {
      const doshas = detectDoshas(sampleChart.planets);
      
      expect(doshas).toBeDefined();
      expect(Array.isArray(doshas)).toBe(true);
    });

    describe('Kemadruma Dosha', () => {
      it('should detect Kemadruma when Moon has no planets in adjacent houses', () => {
        const planets = [
          { name: 'Moon', sign: 'Taurus', house: 2, longitude: 45.0 },
          { name: 'Sun', sign: 'Leo', house: 5, longitude: 135.0 },
          { name: 'Mars', sign: 'Scorpio', house: 8, longitude: 225.0 },
        ];
        
        expect(isKemadrumaDosha(planets)).toBe(true);
      });

      it('should not detect Kemadruma when Moon has planets in adjacent houses', () => {
        const planets = [
          { name: 'Moon', sign: 'Taurus', house: 2, longitude: 45.0 },
          { name: 'Sun', sign: 'Aries', house: 1, longitude: 15.0 },
          { name: 'Mars', sign: 'Gemini', house: 3, longitude: 75.0 },
        ];
        
        expect(isKemadrumaDosha(planets)).toBe(false);
      });
    });

    describe('Kala Sarpa Yoga', () => {
      it('should detect Kala Sarpa when all planets are between Rahu and Ketu', () => {
        const planets = [
          { name: 'Rahu', sign: 'Aries', house: 1, longitude: 15.0 },
          { name: 'Sun', sign: 'Taurus', house: 2, longitude: 45.0 },
          { name: 'Moon', sign: 'Gemini', house: 3, longitude: 75.0 },
          { name: 'Mars', sign: 'Cancer', house: 4, longitude: 105.0 },
          { name: 'Mercury', sign: 'Leo', house: 5, longitude: 135.0 },
          { name: 'Jupiter', sign: 'Virgo', house: 6, longitude: 165.0 },
          { name: 'Ketu', sign: 'Libra', house: 7, longitude: 195.0 },
        ];
        
        expect(isKalaSarpaYoga(planets)).toBe(true);
      });

      it('should not detect Kala Sarpa when planets are on both sides', () => {
        const planets = [
          { name: 'Rahu', sign: 'Aries', house: 1, longitude: 15.0 },
          { name: 'Sun', sign: 'Taurus', house: 2, longitude: 45.0 },
          { name: 'Moon', sign: 'Scorpio', house: 8, longitude: 225.0 },
          { name: 'Ketu', sign: 'Libra', house: 7, longitude: 195.0 },
        ];
        
        expect(isKalaSarpaYoga(planets)).toBe(false);
      });
    });

    describe('Mangal Dosha', () => {
      it('should detect Mangal Dosha when Mars is in specific houses', () => {
        const doshas = detectDoshas([
          { name: 'Mars', sign: 'Aries', house: 1, longitude: 15.0 },
        ]);
        
        const hasMangalDosha = doshas.some(d => d.name.includes('Mangal'));
        expect(hasMangalDosha).toBe(true);
      });
    });
  });

  describe('Special Yogas', () => {
    it('should detect special yogas in chart', () => {
      const yogas = detectSpecialYogas(sampleChart.planets);
      
      expect(yogas).toBeDefined();
      expect(Array.isArray(yogas)).toBe(true);
    });

    describe('Budha-Aditya Yoga', () => {
      it('should detect when Sun and Mercury are conjunct', () => {
        const yogas = detectSpecialYogas([
          { name: 'Sun', sign: 'Gemini', house: 3, longitude: 75.0 },
          { name: 'Mercury', sign: 'Gemini', house: 3, longitude: 78.0 },
        ]);
        
        const hasBudhaAdityaYoga = yogas.some(y => y.name.includes('Budha-Aditya'));
        expect(hasBudhaAdityaYoga).toBe(true);
      });

      it('should not detect when Sun and Mercury are far apart', () => {
        const yogas = detectSpecialYogas([
          { name: 'Sun', sign: 'Aries', house: 1, longitude: 15.0 },
          { name: 'Mercury', sign: 'Libra', house: 7, longitude: 195.0 },
        ]);
        
        const hasBudhaAdityaYoga = yogas.some(y => y.name.includes('Budha-Aditya'));
        expect(hasBudhaAdityaYoga).toBe(false);
      });
    });

    describe('Neecha Bhanga Raja Yoga', () => {
      it('should detect cancellation of debilitation', () => {
        const yogas = detectSpecialYogas([
          { name: 'Sun', sign: 'Libra', house: 7, longitude: 195.0, isDebilitated: true },
          { name: 'Saturn', sign: 'Libra', house: 7, longitude: 198.0, isExalted: true },
        ]);
        
        const hasNeechaBhangaYoga = yogas.some(y => y.name.includes('Neecha Bhanga'));
        expect(hasNeechaBhangaYoga).toBe(true);
      });
    });
  });

  describe('detectAllYogas', () => {
    it('should detect all types of yogas in one call', () => {
      const allYogas = detectAllYogas(sampleChart);
      
      expect(allYogas).toBeDefined();
      expect(allYogas.mahapurushaYogas).toBeDefined();
      expect(allYogas.wealthYogas).toBeDefined();
      expect(allYogas.spiritualYogas).toBeDefined();
      expect(allYogas.doshas).toBeDefined();
      expect(allYogas.specialYogas).toBeDefined();
    });

    it('should return arrays for all yoga types', () => {
      const allYogas = detectAllYogas(sampleChart);
      
      expect(Array.isArray(allYogas.mahapurushaYogas)).toBe(true);
      expect(Array.isArray(allYogas.wealthYogas)).toBe(true);
      expect(Array.isArray(allYogas.spiritualYogas)).toBe(true);
      expect(Array.isArray(allYogas.doshas)).toBe(true);
      expect(Array.isArray(allYogas.specialYogas)).toBe(true);
    });

    it('should include yoga details', () => {
      const allYogas = detectAllYogas(sampleChart);
      
      const allYogasList = [
        ...allYogas.mahapurushaYogas,
        ...allYogas.wealthYogas,
        ...allYogas.spiritualYogas,
        ...allYogas.specialYogas,
      ];
      
      allYogasList.forEach(yoga => {
        expect(yoga.name).toBeDefined();
        expect(yoga.description).toBeDefined();
        expect(yoga.effects).toBeDefined();
        expect(yoga.strength).toBeDefined();
      });
    });

    it('should calculate yoga strength', () => {
      const allYogas = detectAllYogas(sampleChart);
      
      const allYogasList = [
        ...allYogas.mahapurushaYogas,
        ...allYogas.wealthYogas,
      ];
      
      allYogasList.forEach(yoga => {
        expect(['Weak', 'Moderate', 'Strong', 'Very Strong']).toContain(yoga.strength);
      });
    });
  });

  describe('Yoga Effects and Remedies', () => {
    it('should provide effects for each yoga', () => {
      const allYogas = detectAllYogas(sampleChart);
      
      const allYogasList = [
        ...allYogas.mahapurushaYogas,
        ...allYogas.wealthYogas,
        ...allYogas.spiritualYogas,
        ...allYogas.specialYogas,
      ];
      
      allYogasList.forEach(yoga => {
        expect(Array.isArray(yoga.effects)).toBe(true);
        expect(yoga.effects.length).toBeGreaterThan(0);
      });
    });

    it('should provide remedies for doshas', () => {
      const allYogas = detectAllYogas(sampleChart);
      
      allYogas.doshas.forEach(dosha => {
        expect(dosha.remedies).toBeDefined();
        expect(Array.isArray(dosha.remedies)).toBe(true);
        expect(dosha.remedies.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty planet array', () => {
      const emptyChart = { planets: [], ascendant: 'Aries' };
      
      expect(() => detectAllYogas(emptyChart)).not.toThrow();
    });

    it('should handle chart with only one planet', () => {
      const singlePlanetChart = {
        planets: [{ name: 'Sun', sign: 'Aries', house: 1, longitude: 15.0 }],
        ascendant: 'Aries',
      };
      
      expect(() => detectAllYogas(singlePlanetChart)).not.toThrow();
    });

    it('should handle missing planet properties gracefully', () => {
      const incompleteChart = {
        planets: [
          { name: 'Sun', sign: 'Aries', house: 1 },
          { name: 'Moon', sign: 'Taurus' },
        ],
        ascendant: 'Aries',
      };
      
      expect(() => detectAllYogas(incompleteChart)).not.toThrow();
    });
  });
});
