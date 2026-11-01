/* eslint-disable no-console */
import { DateTime, GeoLocation, PlanetPosition } from './astronomy';
import { Logger } from '@/services/logger';

export interface SwissEphemerisResponse {
  data: {
    name: string;
    longitude: number;
    latitude: number;
    distance: number;
    speed: number;
  }[];
}

const SWISS_EPHEMERIS_ENDPOINT = 'https://json.astrologyapi.com/v1/planets';

async function fetchSwissEphemeris(
  dateTime: DateTime,
  location: GeoLocation
): Promise<SwissEphemerisResponse | null> {
  try {
    const params = new URLSearchParams({
      date: `${dateTime.day}/${dateTime.month}/${dateTime.year}`,
      time: `${String(dateTime.hour).padStart(2, '0')}:${String(dateTime.minute).padStart(2, '0')}:${String(dateTime.second).padStart(2, '0')}`,
      latitude: location.latitude.toString(),
      longitude: location.longitude.toString(),
      timezone: location.timezone.toString(),
      ayanamsa: '1',
    });

    const response = await fetch(`${SWISS_EPHEMERIS_ENDPOINT}?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      return data;
    }

    Logger.warn('Swiss Ephemeris API returned non-OK status:', { status: response.status });
    return null;
  } catch {
    Logger.warn('Swiss Ephemeris API unavailable, using fallback calculations');
    return null;
  }
}

export async function getAccuratePlanetaryPositions(
  dateTime: DateTime,
  location: GeoLocation,
  fallbackCalculations: {
    sun: PlanetPosition;
    moon: PlanetPosition;
    mercury: PlanetPosition;
    venus: PlanetPosition;
    mars: PlanetPosition;
    jupiter: PlanetPosition;
    saturn: PlanetPosition;
    rahu: PlanetPosition;
    ketu: PlanetPosition;
  }
): Promise<{
  sun: PlanetPosition;
  moon: PlanetPosition;
  mercury: PlanetPosition;
  venus: PlanetPosition;
  mars: PlanetPosition;
  jupiter: PlanetPosition;
  saturn: PlanetPosition;
  rahu: PlanetPosition;
  ketu: PlanetPosition;
  source: 'swiss-ephemeris' | 'fallback';
}> {
  const ephemerisData = await fetchSwissEphemeris(dateTime, location);

  if (!ephemerisData || !ephemerisData.data) {
    return {
      ...fallbackCalculations,
      source: 'fallback' as const,
    };
  }

  try {
    const getPlanetData = (name: string): PlanetPosition | null => {
      const planet = ephemerisData.data.find(
        (p) => p.name.toLowerCase() === name.toLowerCase()
      );
      if (!planet) return null;
      return {
        longitude: planet.longitude,
        latitude: planet.latitude,
        distance: planet.distance,
        speed: planet.speed,
      };
    };

    const sun = getPlanetData('Sun') || fallbackCalculations.sun;
    const moon = getPlanetData('Moon') || fallbackCalculations.moon;
    const mercury = getPlanetData('Mercury') || fallbackCalculations.mercury;
    const venus = getPlanetData('Venus') || fallbackCalculations.venus;
    const mars = getPlanetData('Mars') || fallbackCalculations.mars;
    const jupiter = getPlanetData('Jupiter') || fallbackCalculations.jupiter;
    const saturn = getPlanetData('Saturn') || fallbackCalculations.saturn;
    const rahu = getPlanetData('Rahu') || getPlanetData('North Node') || fallbackCalculations.rahu;
    const ketu = getPlanetData('Ketu') || getPlanetData('South Node') || fallbackCalculations.ketu;

    return {
      sun,
      moon,
      mercury,
      venus,
      mars,
      jupiter,
      saturn,
      rahu,
      ketu,
      source: 'swiss-ephemeris' as const,
    };
  } catch {
    return {
      ...fallbackCalculations,
      source: 'fallback' as const,
    };
  }
}
