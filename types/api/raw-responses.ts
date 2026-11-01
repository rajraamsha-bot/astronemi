/**
 * Raw API Response Types for External Providers
 * 
 * These interfaces match the literal JSON structures returned by our providers
 * (Prokerala, VedAstro, etc.) to allow for type-safe mapping without 'any'.
 */

// ─── Prokerala API ──────────────────────────────────────────────────────────

export interface RawProkeralaPlanet {
  name: string;
  longitude: number;
  rasi: { id: number; name: string };
  degree: number;
  nakshatra: { name: string; pada: number; lord?: { name: string } };
  house: number;
  is_retrograde: boolean;
  speed: number;
}

export interface RawProkeralaAscendant {
  rasi: { id: number; name: string };
  degree: number;
  longitude: number;
}

export interface RawProkeralaDasha {
  planet: { name: string };
  name?: string; // fallback
  start: string;
  end: string;
  duration: number;
  antardasha?: RawProkeralaDasha[];
}

export interface RawProkeralaYoga {
  name: string;
  description: string;
  has_yoga: boolean;
}

export interface RawProkeralaPanchang {
  tithi: { name: string };
  nakshatra: { name: string };
  yoga: { name: string };
  karana: { name: string };
  vaara: { name: string };
  sunrise: string;
  sunset: string;
  moonrise: string;
  moonset: string;
  rahu_kalam: string;
  gulika_kalam: string;
  yamaghanta_kalam: string;
}

// ─── VedAstro API ───────────────────────────────────────────────────────────

export interface RawVedAstroPlanet {
  Name: string;
  Longitude: number;
  Rasi: string;
  Nakshatra: string;
  Pada: number;
}

export interface RawVedAstroDasha {
  Start: string;
  End: string;
  Nature: string;
  Description: string;
  SubDasas?: Record<string, RawVedAstroDasha>;
}
