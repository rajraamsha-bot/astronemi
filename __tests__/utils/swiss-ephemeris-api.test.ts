import { getAccuratePlanetaryPositions } from '../../utils/swiss-ephemeris-api';
import { DateTime, GeoLocation, PlanetPosition } from '../../utils/astronomy';

describe('swiss-ephemeris-api', () => {
  const mockDateTime: DateTime = { year: 2025, month: 1, day: 1, hour: 12, minute: 0, second: 0 };
  const mockLocation: GeoLocation = { latitude: 18.97, longitude: 72.82, timezone: 5.5 };

  const mockFallback: Record<string, PlanetPosition> = {
    sun: { longitude: 10, latitude: 0, distance: 1, speed: 1 },
    moon: { longitude: 20, latitude: 0, distance: 1, speed: 1 },
    mercury: { longitude: 30, latitude: 0, distance: 1, speed: 1 },
    venus: { longitude: 40, latitude: 0, distance: 1, speed: 1 },
    mars: { longitude: 50, latitude: 0, distance: 1, speed: 1 },
    jupiter: { longitude: 60, latitude: 0, distance: 1, speed: 1 },
    saturn: { longitude: 70, latitude: 0, distance: 1, speed: 1 },
    rahu: { longitude: 80, latitude: 0, distance: 1, speed: 1 },
    ketu: { longitude: 90, latitude: 0, distance: 1, speed: 1 },
  };

  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('should fetch and return accurate planetary positions from API', async () => {
    const mockApiResponse = {
      data: [
        { name: 'Sun', longitude: 15, latitude: 0, distance: 1, speed: 1 },
        { name: 'Moon', longitude: 25, latitude: 0, distance: 1, speed: 1 },
        { name: 'Mercury', longitude: 35, latitude: 0, distance: 1, speed: 1 },
        { name: 'Venus', longitude: 45, latitude: 0, distance: 1, speed: 1 },
        { name: 'Mars', longitude: 55, latitude: 0, distance: 1, speed: 1 },
        { name: 'Jupiter', longitude: 65, latitude: 0, distance: 1, speed: 1 },
        { name: 'Saturn', longitude: 75, latitude: 0, distance: 1, speed: 1 },
        { name: 'Rahu', longitude: 85, latitude: 0, distance: 1, speed: 1 },
        { name: 'Ketu', longitude: 95, latitude: 0, distance: 1, speed: 1 },
      ],
    };

    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockApiResponse),
    });

    const result = await getAccuratePlanetaryPositions(mockDateTime, mockLocation, mockFallback as any);

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('https://json.astrologyapi.com/v1/planets?'),
      expect.any(Object)
    );
    expect(result.source).toBe('swiss-ephemeris');
    expect(result.sun.longitude).toBe(15);
    expect(result.rahu.longitude).toBe(85);
  });

  it('should fallback to calculations on non-ok status', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const result = await getAccuratePlanetaryPositions(mockDateTime, mockLocation, mockFallback as any);

    expect(result.source).toBe('fallback');
    expect(result.sun.longitude).toBe(10);
  });

  it('should fallback to calculations on network error', async () => {
    global.fetch = jest.fn().mockRejectedValueOnce(new Error('Network error'));

    const result = await getAccuratePlanetaryPositions(mockDateTime, mockLocation, mockFallback as any);

    expect(result.source).toBe('fallback');
    expect(result.sun.longitude).toBe(10);
  });
});
