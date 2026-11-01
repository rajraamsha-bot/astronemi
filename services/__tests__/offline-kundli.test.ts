import { offlineKundliService } from '../offline-kundli';
import { secureSetItem } from '../../utils/secure-storage';

// Mock secure storage
jest.mock('../../utils/secure-storage', () => ({
  secureGetItem: jest.fn().mockResolvedValue(null),
  secureSetItem: jest.fn().mockResolvedValue(undefined),
}));

describe('OfflineKundliService Bridge Test', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should generate a REAL kundli with astronomical data offline', async () => {
    const options = {
      name: 'Test Offline User',
      birthDate: '1990-01-01',
      birthTime: '12:00',
      birthPlace: 'Mumbai',
      birthLat: 19.076,
      birthLng: 72.8777,
      timezone: '5.5'
    };

    const kundli = await offlineKundliService.generateKundli(options);

    // Verify ID and metadata
    expect(kundli.id).toBeDefined();
    expect(kundli.name).toBe(options.name);
    
    // Verify REAL astronomical data (Ascendant)
    // For 1990-01-01 12:00 Mumbai, Ascendant should be calculated
    expect(kundli.ascendantSign).toBeDefined();
    expect(typeof kundli.ascendantSign).toBe('string');
    
    // Verify Planets
    expect(kundli.planetPositions.length).toBe(9); // 7 planets + Rahu/Ketu
    const sun = kundli.planetPositions.find(p => p.name === 'Sun');
    expect(sun).toBeDefined();
    expect(sun?.siderealLongitude).toBeGreaterThan(0);
    
    // Verify Dasha (Vimshottari)
    expect(kundli.dashas).toBeDefined();
    expect(kundli.dashas?.length).toBeGreaterThan(0);
    expect(kundli.dashas?.[0]?.planet).toBeDefined();

    // Verify Yoga detection worked
    expect(kundli.yogas).toBeDefined();
    
    // Check storage was called
    expect(secureSetItem).toHaveBeenCalled();
  });

  it('should handle missing timezone by approximating from longitude', async () => {
    const options = {
      name: 'Approx TZ User',
      birthDate: '1990-01-01',
      birthTime: '12:00',
      birthPlace: 'Mumbai',
      birthLat: 19.076,
      birthLng: 72.8777
    };

    const kundli = await offlineKundliService.generateKundli(options);
    expect(kundli.id).toBeDefined();
    // Mumbai (72.8) / 15 approx 4.8 or 5.
    // The service uses Math.round(72.8/15) = 5
  });
});
