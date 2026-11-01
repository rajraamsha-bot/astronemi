/**
 * Ayanamsa Systems Tests
 * 
 * Tests for different ayanamsa (precession of equinoxes) calculation systems:
 * - Lahiri (Chitrapaksha)
 * - Raman
 * - Krishnamurti (KP)
 * - Yukteshwar
 * - Fagan-Bradley
 * - Tropical (Western)
 */

import {
  calculateAyanamsa,
  convertTropicalToSidereal,
  convertSiderealToTropical,
  compareAyanamsaSystems,
  getAyanamsaForDate,
  AyanamsaSystem,
  AYANAMSA_VALUES_2000,
  AYANAMSA_RATES,
} from '@/utils/ayanamsa';

describe('Ayanamsa Systems', () => {
  const testDate = new Date('2024-01-01');
  const referenceDate = new Date('2000-01-01');

  describe('Ayanamsa Constants', () => {
    it('should have values for all systems at epoch 2000', () => {
      expect(AYANAMSA_VALUES_2000.LAHIRI).toBeDefined();
      expect(AYANAMSA_VALUES_2000.RAMAN).toBeDefined();
      expect(AYANAMSA_VALUES_2000.KP).toBeDefined();
      expect(AYANAMSA_VALUES_2000.YUKTESHWAR).toBeDefined();
      expect(AYANAMSA_VALUES_2000.FAGAN_BRADLEY).toBeDefined();
      expect(AYANAMSA_VALUES_2000.TROPICAL).toBe(0);
    });

    it('should have annual rates for all systems', () => {
      expect(AYANAMSA_RATES.LAHIRI).toBeDefined();
      expect(AYANAMSA_RATES.RAMAN).toBeDefined();
      expect(AYANAMSA_RATES.KP).toBeDefined();
      expect(AYANAMSA_RATES.YUKTESHWAR).toBeDefined();
      expect(AYANAMSA_RATES.FAGAN_BRADLEY).toBeDefined();
      expect(AYANAMSA_RATES.TROPICAL).toBe(0);
    });

    it('should have Lahiri as most commonly used', () => {
      // Lahiri is the official ayanamsa used by Indian government
      expect(AYANAMSA_VALUES_2000.LAHIRI).toBeCloseTo(23.85, 1);
    });

    it('should have tropical system with zero ayanamsa', () => {
      expect(AYANAMSA_VALUES_2000.TROPICAL).toBe(0);
      expect(AYANAMSA_RATES.TROPICAL).toBe(0);
    });
  });

  describe('calculateAyanamsa', () => {
    it('should calculate ayanamsa for Lahiri system', () => {
      const ayanamsa = calculateAyanamsa(testDate, 'LAHIRI');
      
      expect(ayanamsa).toBeDefined();
      expect(typeof ayanamsa).toBe('number');
      expect(ayanamsa).toBeGreaterThan(23);
      expect(ayanamsa).toBeLessThan(25);
    });

    it('should calculate ayanamsa for Raman system', () => {
      const ayanamsa = calculateAyanamsa(testDate, 'RAMAN');
      
      expect(ayanamsa).toBeDefined();
      expect(typeof ayanamsa).toBe('number');
    });

    it('should calculate ayanamsa for KP system', () => {
      const ayanamsa = calculateAyanamsa(testDate, 'KP');
      
      expect(ayanamsa).toBeDefined();
      expect(typeof ayanamsa).toBe('number');
    });

    it('should calculate ayanamsa for Yukteshwar system', () => {
      const ayanamsa = calculateAyanamsa(testDate, 'YUKTESHWAR');
      
      expect(ayanamsa).toBeDefined();
      expect(typeof ayanamsa).toBe('number');
    });

    it('should calculate ayanamsa for Fagan-Bradley system', () => {
      const ayanamsa = calculateAyanamsa(testDate, 'FAGAN_BRADLEY');
      
      expect(ayanamsa).toBeDefined();
      expect(typeof ayanamsa).toBe('number');
    });

    it('should return 0 for Tropical system', () => {
      const ayanamsa = calculateAyanamsa(testDate, 'TROPICAL');
      
      expect(ayanamsa).toBe(0);
    });

    it('should increase over time', () => {
      const date2000 = new Date('2000-01-01');
      const date2024 = new Date('2024-01-01');
      
      const ayanamsa2000 = calculateAyanamsa(date2000, 'LAHIRI');
      const ayanamsa2024 = calculateAyanamsa(date2024, 'LAHIRI');
      
      expect(ayanamsa2024).toBeGreaterThan(ayanamsa2000);
    });

    it('should calculate correctly for epoch date', () => {
      const epochDate = new Date('2000-01-01');
      const ayanamsa = calculateAyanamsa(epochDate, 'LAHIRI');

      // Allow for astronomical calculation precision (within 0.1 degrees)
      expect(ayanamsa).toBeCloseTo(AYANAMSA_VALUES_2000.LAHIRI, 1);
    });

    it('should handle dates before epoch', () => {
      const oldDate = new Date('1950-01-01');
      const ayanamsa = calculateAyanamsa(oldDate, 'LAHIRI');
      
      expect(ayanamsa).toBeLessThan(AYANAMSA_VALUES_2000.LAHIRI);
      expect(ayanamsa).toBeGreaterThan(0);
    });

    it('should handle dates far in future', () => {
      const futureDate = new Date('2100-01-01');
      const ayanamsa = calculateAyanamsa(futureDate, 'LAHIRI');
      
      expect(ayanamsa).toBeGreaterThan(AYANAMSA_VALUES_2000.LAHIRI);
    });
  });

  describe('convertTropicalToSidereal', () => {
    it('should convert tropical longitude to sidereal', () => {
      const tropicalLongitude = 100; // 10° Gemini tropical
      const siderealLongitude = convertTropicalToSidereal(
        tropicalLongitude,
        testDate,
        'LAHIRI'
      );
      
      expect(siderealLongitude).toBeLessThan(tropicalLongitude);
      expect(siderealLongitude).toBeGreaterThan(0);
    });

    it('should handle 0 degree longitude', () => {
      const sidereal = convertTropicalToSidereal(0, testDate, 'LAHIRI');
      
      expect(sidereal).toBeLessThan(360);
      expect(sidereal).toBeGreaterThan(330); // Should wrap around
    });

    it('should handle 359 degree longitude', () => {
      const sidereal = convertTropicalToSidereal(359, testDate, 'LAHIRI');
      
      expect(sidereal).toBeGreaterThan(0);
      expect(sidereal).toBeLessThan(360);
    });

    it('should not change for Tropical system', () => {
      const tropicalLongitude = 150;
      const result = convertTropicalToSidereal(tropicalLongitude, testDate, 'TROPICAL');
      
      expect(result).toBe(tropicalLongitude);
    });

    it('should produce different results for different systems', () => {
      const tropicalLongitude = 100;
      
      const lahiri = convertTropicalToSidereal(tropicalLongitude, testDate, 'LAHIRI');
      const raman = convertTropicalToSidereal(tropicalLongitude, testDate, 'RAMAN');
      const kp = convertTropicalToSidereal(tropicalLongitude, testDate, 'KP');
      
      expect(lahiri).not.toBe(raman);
      expect(lahiri).not.toBe(kp);
      expect(raman).not.toBe(kp);
    });

    it('should maintain valid longitude range (0-360)', () => {
      for (let i = 0; i < 360; i += 30) {
        const sidereal = convertTropicalToSidereal(i, testDate, 'LAHIRI');
        expect(sidereal).toBeGreaterThanOrEqual(0);
        expect(sidereal).toBeLessThan(360);
      }
    });
  });

  describe('convertSiderealToTropical', () => {
    it('should convert sidereal longitude to tropical', () => {
      const siderealLongitude = 76; // 16° Gemini sidereal
      const tropicalLongitude = convertSiderealToTropical(
        siderealLongitude,
        testDate,
        'LAHIRI'
      );
      
      expect(tropicalLongitude).toBeGreaterThan(siderealLongitude);
      expect(tropicalLongitude).toBeLessThan(360);
    });

    it('should be inverse of tropical to sidereal', () => {
      const originalTropical = 100;
      
      const sidereal = convertTropicalToSidereal(originalTropical, testDate, 'LAHIRI');
      const backToTropical = convertSiderealToTropical(sidereal, testDate, 'LAHIRI');
      
      expect(backToTropical).toBeCloseTo(originalTropical, 5);
    });

    it('should handle wrap-around at 360 degrees', () => {
      const sidereal = convertSiderealToTropical(350, testDate, 'LAHIRI');
      
      expect(sidereal).toBeGreaterThanOrEqual(0);
      expect(sidereal).toBeLessThan(360);
    });

    it('should not change for Tropical system', () => {
      const siderealLongitude = 150;
      const result = convertSiderealToTropical(siderealLongitude, testDate, 'TROPICAL');
      
      expect(result).toBe(siderealLongitude);
    });
  });

  describe('compareAyanamsaSystems', () => {
    it('should compare all ayanamsa systems for a date', () => {
      const comparison = compareAyanamsaSystems(testDate);
      
      expect(comparison).toBeDefined();
      expect(comparison.LAHIRI).toBeDefined();
      expect(comparison.RAMAN).toBeDefined();
      expect(comparison.KP).toBeDefined();
      expect(comparison.YUKTESHWAR).toBeDefined();
      expect(comparison.FAGAN_BRADLEY).toBeDefined();
      expect(comparison.TROPICAL).toBe(0);
    });

    it('should show differences between systems', () => {
      const comparison = compareAyanamsaSystems(testDate);
      
      const values = Object.values(comparison).filter(v => v !== 0);
      const uniqueValues = new Set(values);
      
      expect(uniqueValues.size).toBeGreaterThan(1);
    });

      it('should have Lahiri and Raman close to each other', () => {
        const comparison = compareAyanamsaSystems(testDate);

        const difference = Math.abs(comparison.LAHIRI - comparison.RAMAN);
        expect(difference).toBeLessThan(5); // Should be relatively close (within 5 degrees)
      });

    it('should have consistent values across calls', () => {
      const comparison1 = compareAyanamsaSystems(testDate);
      const comparison2 = compareAyanamsaSystems(testDate);
      
      expect(comparison1.LAHIRI).toBe(comparison2.LAHIRI);
      expect(comparison1.RAMAN).toBe(comparison2.RAMAN);
      expect(comparison1.KP).toBe(comparison2.KP);
    });
  });

  describe('getAyanamsaForDate', () => {
    it('should return ayanamsa with metadata', () => {
      const result = getAyanamsaForDate(testDate, 'LAHIRI');
      
      expect(result.value).toBeDefined();
      expect(result.system).toBe('LAHIRI');
      expect(result.date).toBeDefined();
      expect(result.description).toBeDefined();
    });

    it('should include system description', () => {
      const lahiri = getAyanamsaForDate(testDate, 'LAHIRI');
      const raman = getAyanamsaForDate(testDate, 'RAMAN');
      const kp = getAyanamsaForDate(testDate, 'KP');
      
      expect(lahiri.description).toContain('Lahiri');
      expect(raman.description).toContain('Raman');
      expect(kp.description).toContain('Krishnamurti');
    });

    it('should format date correctly', () => {
      const result = getAyanamsaForDate(testDate, 'LAHIRI');
      
      expect(result.date).toBeInstanceOf(Date);
      expect(result.date.getTime()).toBe(testDate.getTime());
    });
  });

  describe('Sign Conversion Examples', () => {
    it('should convert Aries 0° tropical to late Pisces sidereal', () => {
      const tropical = 0; // 0° Aries tropical
      const sidereal = convertTropicalToSidereal(tropical, testDate, 'LAHIRI');
      
      // Should be around 336° (late Pisces)
      expect(sidereal).toBeGreaterThan(330);
      expect(sidereal).toBeLessThan(360);
    });

    it('should convert Taurus 0° tropical to Aries sidereal', () => {
      const tropical = 30; // 0° Taurus tropical
      const sidereal = convertTropicalToSidereal(tropical, testDate, 'LAHIRI');
      
      // Should be around 6° Aries
      expect(sidereal).toBeGreaterThan(0);
      expect(sidereal).toBeLessThan(15);
    });

    it('should show sign shift between tropical and sidereal', () => {
      const tropicalSigns = [
        { name: 'Aries', start: 0 },
        { name: 'Taurus', start: 30 },
        { name: 'Gemini', start: 60 },
        { name: 'Cancer', start: 90 },
      ];

      tropicalSigns.forEach(sign => {
        const sidereal = convertTropicalToSidereal(sign.start, testDate, 'LAHIRI');
        // Compute circular difference to handle 0/360 wrap-around
        let signShift = sign.start - sidereal;
        while (signShift < -180) signShift += 360;
        while (signShift > 180) signShift -= 360;
        const ayanamsaValue = calculateAyanamsa(testDate, 'LAHIRI');

        // All should have similar shift (ayanamsa value)
        expect(Math.abs(Math.abs(signShift) - ayanamsaValue)).toBeLessThan(1);
      });
    });
  });

  describe('Precision and Accuracy', () => {
    it('should calculate with decimal precision', () => {
      const ayanamsa = calculateAyanamsa(testDate, 'LAHIRI');
      
      expect(ayanamsa % 1).not.toBe(0); // Should have decimal places
    });

    it('should be consistent for same date', () => {
      const date = new Date('2020-06-15');
      
      const calc1 = calculateAyanamsa(date, 'LAHIRI');
      const calc2 = calculateAyanamsa(date, 'LAHIRI');
      
      expect(calc1).toBe(calc2);
    });

    it('should handle leap years correctly', () => {
      const leapYear = new Date('2020-02-29');
      const nonLeapYear = new Date('2021-02-28');
      
      const ayanamsa1 = calculateAyanamsa(leapYear, 'LAHIRI');
      const ayanamsa2 = calculateAyanamsa(nonLeapYear, 'LAHIRI');
      
      expect(ayanamsa1).not.toBe(ayanamsa2);
    });
  });

  describe('Historical Dates', () => {
    it('should calculate for ancient dates', () => {
      const ancientDate = new Date('1000-01-01');
      const ayanamsa = calculateAyanamsa(ancientDate, 'LAHIRI');
      
      expect(ayanamsa).toBeLessThan(AYANAMSA_VALUES_2000.LAHIRI);
      expect(typeof ayanamsa).toBe('number');
    });

    it('should calculate for recent dates', () => {
      const recentDate = new Date('2023-12-31');
      const ayanamsa = calculateAyanamsa(recentDate, 'LAHIRI');
      
      expect(ayanamsa).toBeGreaterThan(AYANAMSA_VALUES_2000.LAHIRI);
    });

    it('should show progression over centuries', () => {
      const date1900 = new Date('1900-01-01');
      const date2000 = new Date('2000-01-01');
      const date2100 = new Date('2100-01-01');
      
      const ayanamsa1900 = calculateAyanamsa(date1900, 'LAHIRI');
      const ayanamsa2000 = calculateAyanamsa(date2000, 'LAHIRI');
      const ayanamsa2100 = calculateAyanamsa(date2100, 'LAHIRI');
      
      expect(ayanamsa1900).toBeLessThan(ayanamsa2000);
      expect(ayanamsa2000).toBeLessThan(ayanamsa2100);
    });
  });

  describe('Edge Cases', () => {
    it('should handle current date', () => {
      const now = new Date();
      const ayanamsa = calculateAyanamsa(now, 'LAHIRI');
      
      expect(ayanamsa).toBeGreaterThan(20);
      expect(ayanamsa).toBeLessThan(30);
    });

    it('should handle all ayanamsa systems', () => {
      const systems: AyanamsaSystem[] = [
        'LAHIRI',
        'RAMAN',
        'KP',
        'YUKTESHWAR',
        'FAGAN_BRADLEY',
        'TROPICAL',
      ];
      
      systems.forEach(system => {
        expect(() => calculateAyanamsa(testDate, system)).not.toThrow();
      });
    });

    it('should handle longitude at boundaries', () => {
      const boundaries = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330, 359.99];
      
      boundaries.forEach(longitude => {
        const sidereal = convertTropicalToSidereal(longitude, testDate, 'LAHIRI');
        expect(sidereal).toBeGreaterThanOrEqual(0);
        expect(sidereal).toBeLessThan(360);
      });
    });

    it('should handle invalid dates gracefully', () => {
      const invalidDate = new Date('invalid');
      
      // Should not throw, but may return NaN
      expect(() => calculateAyanamsa(invalidDate, 'LAHIRI')).not.toThrow();
    });
  });

  describe('System Differences', () => {
    it('should show Lahiri vs Raman difference', () => {
      const lahiri = calculateAyanamsa(testDate, 'LAHIRI');
      const raman = calculateAyanamsa(testDate, 'RAMAN');

      const difference = Math.abs(lahiri - raman);
      expect(difference).toBeGreaterThan(0);
      expect(difference).toBeLessThan(5); // Lahiri and Raman differ by ~2.5 degrees in 2024
    });

    it('should show KP vs Lahiri difference', () => {
      const lahiri = calculateAyanamsa(testDate, 'LAHIRI');
      const kp = calculateAyanamsa(testDate, 'KP');
      
      const difference = Math.abs(lahiri - kp);
      expect(difference).toBeGreaterThan(0);
    });

    it('should show Fagan-Bradley is different from Indian systems', () => {
      const lahiri = calculateAyanamsa(testDate, 'LAHIRI');
      const faganBradley = calculateAyanamsa(testDate, 'FAGAN_BRADLEY');
      
      const difference = Math.abs(lahiri - faganBradley);
      expect(difference).toBeGreaterThan(0.1); // Should be noticeably different
    });
  });
});
