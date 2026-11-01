/**
 * Offline Kundli Generation Service
 * 
 * Enables kundli generation without network connectivity.
 * Uses the LOCAL astronomical engine (astronomy.ts + vedic-astrology.ts)
 * to compute real planetary positions, house cusps, nakshatras, and dashas.
 */

import {
  calculateHouseCusps,
  getNakshatra,
  convertToVedicPlanet,
  calculateVimshottariDasha,
  detectYogas,
  tropicalToSidereal,
  VedicPlanetData,
} from '@/utils/vedic-astrology';
import {
  calculateJulianDay,
  calculateJulianCentury,
  calculateSunPosition,
  calculateMoonPosition,
  calculateMercuryPosition,
  calculateVenusPosition,
  calculateMarsPosition,
  calculateJupiterPosition,
  calculateSaturnPosition,
  calculateRahuKetuPosition,
  calculateAscendant,
  DateTime,
  GeoLocation,
  PlanetPosition,
} from '@/utils/astronomy';
import { secureSetItem, secureGetItem } from '@/utils/secure-storage';
import { Logger } from '@/services/logger';
import { prefixedSecureId } from '../utils/secure-random';

export interface OfflineKundliData {
  id: string;
  name: string;
  birthDate: string;
  birthTime: string;
  birthPlace: string;
  birthLat: number;
  birthLng: number;
  planetPositions: VedicPlanetData[];
  houses: number[];
  nakshatra: { nakshatra: string; nakshatraIndex: number; pada: number; lord: string };
  dashas?: { planet: string; startDate: string; endDate: string; years: number }[];
  yogas?: { name: string; description: string; strength: string }[];
  ascendantSign?: string;
  createdAt: number;
  synced: boolean;
}

export interface KundliGenerationOptions {
  name: string;
  birthDate: string; // YYYY-MM-DD
  birthTime: string; // HH:MM
  birthPlace: string;
  birthLat: number;
  birthLng: number;
  timezone?: string;
}

class OfflineKundliService {
  private readonly STORAGE_KEY = 'offline_kundlis';
  private kundlis: OfflineKundliData[] = [];

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Load kundlis from secure storage
   */
  private async loadFromStorage(): Promise<void> {
    try {
      const stored = await secureGetItem(this.STORAGE_KEY);
      if (stored) {
        this.kundlis = JSON.parse(stored);
      }
    } catch (error) {
      Logger.error('Failed to load offline kundlis:', error);
    }
  }

  /**
   * Save kundlis to secure storage
   */
  private async saveToStorage(): Promise<void> {
    try {
      await secureSetItem(this.STORAGE_KEY, JSON.stringify(this.kundlis));
    } catch (error) {
      Logger.error('Failed to save offline kundlis:', error);
    }
  }

  /**
   * Generate kundli offline using REAL astronomical calculations.
   */
  async generateKundli(options: KundliGenerationOptions): Promise<OfflineKundliData> {
    try {
      Logger.info('Generating kundli offline (real engine)', { name: options.name });

      // --- 1. Parse birth date/time ---
      const [year, month, day] = options.birthDate.split('-').map(Number);
      const [hour, minute] = options.birthTime.split(':').map(Number);
      const timezone = options.timezone
        ? parseFloat(options.timezone)
        : Math.round(options.birthLng / 15); // Approximate TZ from longitude

      const dt: DateTime = { 
        year: year ?? new Date().getFullYear(), 
        month: month ?? 1, 
        day: day ?? 1, 
        hour: hour ?? 0, 
        minute: minute ?? 0, 
        second: 0 
      };
      const location: GeoLocation = {
        latitude: options.birthLat,
        longitude: options.birthLng,
        timezone,
      };

      // --- 2. Julian Day & Century ---
      const jd = calculateJulianDay(dt, timezone);
      const T = calculateJulianCentury(jd);

      // --- 3. Calculate Ascendant ---
      const ascendant = calculateAscendant(jd, location);

      // --- 4. Calculate ALL planet positions ---
      const sunPos = calculateSunPosition(T);
      const moonPos = calculateMoonPosition(T);
      const mercuryPos = calculateMercuryPosition(T);
      const venusPos = calculateVenusPosition(T);
      const marsPos = calculateMarsPosition(T);
      const jupiterPos = calculateJupiterPosition(T);
      const saturnPos = calculateSaturnPosition(T);
      const { rahu: rahuPos, ketu: ketuPos } = calculateRahuKetuPosition(T);

      const planetNames: [string, string, PlanetPosition, boolean][] = [
        ['Sun', 'Surya', sunPos, false],
        ['Moon', 'Chandra', moonPos, false],
        ['Mars', 'Mangal', marsPos, false],
        ['Mercury', 'Budh', mercuryPos, false],
        ['Jupiter', 'Guru', jupiterPos, false],
        ['Venus', 'Shukra', venusPos, false],
        ['Saturn', 'Shani', saturnPos, false],
        ['Rahu', 'Rahu', rahuPos, true], // Rahu is always retrograde
        ['Ketu', 'Ketu', ketuPos, true],
      ];

      const planetPositions: VedicPlanetData[] = planetNames.map(
        ([name, sanskrit, pos, retro]) =>
          convertToVedicPlanet(name, sanskrit, pos, ascendant, jd, retro)
      );

      // --- 5. House cusps (Equal House from Ascendant) ---
      const houses = calculateHouseCusps(ascendant, jd);

      // --- 6. Moon nakshatra (for dasha) ---
      const moonVedic = planetPositions.find(p => p.name === 'Moon')!;
      const nakshatra = getNakshatra(moonVedic.siderealLongitude);

      // --- 7. Vimshottari Dasha ---
      const birthDateObj = new Date(year ?? 0, (month ?? 1) - 1, day ?? 1, hour ?? 0, minute ?? 0);
      const dashas = calculateVimshottariDasha(birthDateObj, moonPos.longitude, jd).map(d => ({
        planet: d.planet,
        startDate: d.startDate.toISOString(),
        endDate: d.endDate.toISOString(),
        years: d.years,
      }));

      // --- 8. Yoga detection ---
      const yogas = detectYogas(planetPositions);

      // --- 9. Ascendant sign name ---
      const siderealAsc = tropicalToSidereal(ascendant, jd);
      const ascSignIndex = Math.floor(siderealAsc / 30);
      const SIGNS = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
      const ascendantSign = SIGNS[ascSignIndex];

      // --- 10. Assemble kundli ---
      const kundli: OfflineKundliData = {
        id: this.generateId(),
        name: options.name,
        birthDate: options.birthDate,
        birthTime: options.birthTime,
        birthPlace: options.birthPlace,
        birthLat: options.birthLat,
        birthLng: options.birthLng,
        planetPositions,
        houses,
        nakshatra,
        dashas,
        yogas,
        ascendantSign,
        createdAt: Date.now(),
        synced: false,
      };

      // Save to local storage
      this.kundlis.push(kundli);
      await this.saveToStorage();

      Logger.info('Kundli generated offline successfully', { id: kundli.id, ascendantSign });
      return kundli;
    } catch (error) {
      Logger.error('Failed to generate kundli offline:', error);
      throw error;
    }
  }

  /**
   * Get all offline kundlis
   */
  async getAllKundlis(): Promise<OfflineKundliData[]> {
    await this.loadFromStorage();
    return [...this.kundlis];
  }

  /**
   * Get kundli by ID
   */
  async getKundliById(id: string): Promise<OfflineKundliData | null> {
    await this.loadFromStorage();
    return this.kundlis.find(k => k.id === id) || null;
  }

  /**
   * Delete kundli
   */
  async deleteKundli(id: string): Promise<boolean> {
    try {
      this.kundlis = this.kundlis.filter(k => k.id !== id);
      await this.saveToStorage();
      return true;
    } catch (error) {
      Logger.error('Failed to delete kundli:', error);
      return false;
    }
  }

  /**
   * Sync offline kundlis to server
   */
  async syncToServer(): Promise<{ synced: number; failed: number }> {
    const unsyncedKundlis = this.kundlis.filter(k => !k.synced);
    let synced = 0;
    let failed = 0;

    for (const kundli of unsyncedKundlis) {
      try {
        // Import supabase dynamically to avoid circular dependencies
        const { supabase } = await import('@/lib/supabase');
        
        const { error } = await supabase
          .from('kundlis')
          .insert({
            id: kundli.id,
            name: kundli.name,
            birth_date: kundli.birthDate,
            birth_time: kundli.birthTime,
            birth_place: kundli.birthPlace,
            birth_lat: kundli.birthLat,
            birth_lng: kundli.birthLng,
            planet_positions: kundli.planetPositions,
            houses: kundli.houses,
            nakshatra: kundli.nakshatra,
          });

        if (error) {
          Logger.error('Failed to sync kundli:', error);
          failed++;
        } else {
          // Mark as synced
          kundli.synced = true;
          synced++;
        }
      } catch (error) {
        Logger.error('Failed to sync kundli:', error);
        failed++;
      }
    }

    // Save updated sync status
    await this.saveToStorage();

    Logger.info('Kundli sync complete', { synced, failed });
    return { synced, failed };
  }

  /**
   * Get unsynced kundlis count
   */
  getUnsyncedCount(): number {
    return this.kundlis.filter(k => !k.synced).length;
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return prefixedSecureId('offline', 12);
  }
}

// Export singleton instance
export const offlineKundliService = new OfflineKundliService();

export default offlineKundliService;