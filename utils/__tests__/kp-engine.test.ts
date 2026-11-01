import { 
  getSubLord, 
  calculateKPHorary, 
  generateKPChart,
  SUB_LORD_TABLE
} from '../kp-engine';

describe('KP Astrology Engine', () => {
  describe('Sub-Lord Table', () => {
    it('should build exactly 249 sub-lord entries', () => {
      expect(SUB_LORD_TABLE.length).toBe(249);
    });

    it('should cover the full 360 degrees without gaps or overlaps', () => {
      expect(SUB_LORD_TABLE[0]!.startDeg).toBe(0);
      expect(SUB_LORD_TABLE[248]!.endDeg).toBeCloseTo(360, 5);

      for (let i = 0; i < SUB_LORD_TABLE.length - 1; i++) {
        expect(SUB_LORD_TABLE[i + 1]!.startDeg).toBe(SUB_LORD_TABLE[i]!.endDeg);
      }
    });

    it('should verify correct lords for ASHWINI Nakshatra (Aries)', () => {
      const entry = SUB_LORD_TABLE[0]!; // First entry in Ashwini (Ketu star)
      expect(entry.signLord).toBe('Mars');
      expect(entry.starLord).toBe('Ketu');
      expect(entry.subLord).toBe('Ketu');
      expect(entry.nakshatra).toBe('Ashwini');
    });
  });

  describe('Lookup Logic (getSubLord)', () => {
    it('should handle wraparound longitudes (>360)', () => {
      const entry1 = getSubLord(10);
      const entry2 = getSubLord(370);
      expect(entry1).toEqual(entry2);
    });

    it('should handle negative longitudes', () => {
      const entry1 = getSubLord(350);
      const entry2 = getSubLord(-10);
      expect(entry1).toEqual(entry2);
    });
  });

  describe('Horary (Prashna) Logic', () => {
    it('should map number 1 to the start of the Zodiac', () => {
      const result = calculateKPHorary(1);
      expect(result.ascendantSign).toBe('Aries');
      expect(result.ascendantSignLord).toBe('Mars');
      expect(result.ascendantStarLord).toBe('Ketu');
      expect(result.ascendantSubLord).toBe('Ketu');
    });

    it('should map number 249 to the end of the Zodiac (Revati)', () => {
      const result = calculateKPHorary(249);
      expect(result.ascendantSign).toBe('Pisces');
      expect(result.ascendantSignLord).toBe('Jupiter');
      expect(result.ascendantStarLord).toBe('Mercury');
      expect(result.ascendantSubLord).toBe('Saturn'); // The last sub-lord of Revati is Saturn
    });
  });

  describe('KP Chart Generation', () => {
    it('should generate a complete KP chart with significators', () => {
      const dummyPlanets = [
        { name: 'Sun', longitude: 10, house: 1, isRetrograde: false },
        { name: 'Moon', longitude: 120, house: 5, isRetrograde: false },
      ];
      const ascendantLong = 5;
      const lat = 28.6;
      const ayanamsa = 24.1;

      const chart = generateKPChart(dummyPlanets, ascendantLong, lat, ayanamsa);

      expect(chart).toHaveProperty('planets');
      expect(chart).toHaveProperty('cusps');
      expect(chart.cusps.length).toBe(12);
      expect(chart.planets.length).toBe(2);
      
      // Verify significators logic
      expect(chart.significators.length).toBe(12);
      expect(chart.predictions.length).toBeGreaterThan(0);
    });
  });
});
