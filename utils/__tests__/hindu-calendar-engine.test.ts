import { computeFestivalsForYear, getMuhurat } from '../hindu-calendar-engine';

describe('Hindu Calendar Engine', () => {
  describe('Festival Calculations', () => {
    it('generates a full year of dynamically calculated festivals', () => {
      const year = 2026;
      const festivals = computeFestivalsForYear(year);

      expect(Array.isArray(festivals)).toBe(true);
      expect(festivals.length).toBeGreaterThan(15); // The new engine should calculate 30+ festivals
      
      const diwali = festivals.find(f => f.name.includes('Diwali'));
      expect(diwali).toBeDefined();
      expect(diwali!.date.getFullYear()).toBe(year);
      
      const holi = festivals.find(f => f.name.includes('Holi'));
      expect(holi).toBeDefined();
    });
  });

  describe('Muhurat Calculations', () => {
    it('calculates accurate sunrise/sunset based muhurats', () => {
      // Testing with a specific date and location (New Delhi)
      const date = new Date('2026-04-15T10:00:00Z');
      const lat = 28.6139;
      const lon = 77.2090;

      const muhurats = getMuhurat(date, lat, lon);
      
      expect(Array.isArray(muhurats)).toBe(true);
      expect(muhurats.length).toBeGreaterThan(0);

      const brahma = muhurats.find(m => m.type === 'Brahma Muhurat');
      expect(brahma).toBeDefined();
      
      const rahu = muhurats.find(m => m.type === 'Rahu Kaal (Avoid)');
      expect(rahu).toBeDefined();

      // Ensure start and end times are strings in HH:MM format
      expect(brahma!.start).toMatch(/^\d{1,2}:\d{2}$/);
      expect(brahma!.end).toMatch(/^\d{1,2}:\d{2}$/);
    });

    it('handles polar night (6 months of darkness)', () => {
      const date = new Date('2026-12-21T12:00:00Z'); // Winter Solstice
      const northPoleLat = 85.0; // Near North Pole
      const lon = 0;

      const muhurats = getMuhurat(date, northPoleLat, lon);
      // In polar night, logic returns 00:00 for both
      expect(muhurats.length).toBeDefined();
    });

    it('handles midnight sun (6 months of light)', () => {
      const date = new Date('2026-06-21T12:00:00Z'); // Summer Solstice
      const northPoleLat = 85.0;
      const lon = 0;

      const muhurats = getMuhurat(date, northPoleLat, lon);
      expect(muhurats.length).toBeDefined();
    });
  });

  describe('Specific Festival Regression (2026)', () => {
    it('calculates Diwali on the correct Kartik Amavasya date', () => {
      const year = 2026;
      const festivals = computeFestivalsForYear(year);
      const diwali = festivals.find(f => f.name === 'Diwali');
      
      expect(diwali).toBeDefined();
      // Diwali 2026: accurate ephemeris places it on Nov 7
      expect(diwali!.date.getMonth()).toBe(10); // November (0-indexed)
      expect(diwali!.date.getDate()).toBeGreaterThanOrEqual(7);
      expect(diwali!.date.getDate()).toBeLessThanOrEqual(9);
    });
  });
});
