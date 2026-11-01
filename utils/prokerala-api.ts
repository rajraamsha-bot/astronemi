/**
 * Prokerala API Integration
 *
 * All Prokerala calls are proxied through the `prokerala` Supabase Edge
 * Function so the Prokerala `client_secret` is never shipped to the client.
 * The only things this module sends to the proxy are:
 *   - the Prokerala endpoint name (from an allow-listed set)
 *   - the query params for that endpoint
 * Supabase's `functions.invoke` attaches the caller's JWT, which the proxy
 * uses for rate-limiting / audit, NOT to access Prokerala.
 */

import { DateTime, GeoLocation } from './astronomy';
import {
  RawProkeralaPlanet,
  RawProkeralaDasha,
} from '@/types/api/raw-responses';
import { supabase } from '@/lib/supabase';

// ─── Proxy helper ─────────────────────────────────────────────────────────────
// The edge function returns the Prokerala response body directly, or
// `{ error: string }` on failure.

async function prokeralaProxy<T = any>(
  endpoint: string,
  params: Record<string, string>
): Promise<T | null> {
  try {
    const { data, error } = await supabase.functions.invoke('prokerala', {
      body: { endpoint, params },
    });

    if (error || !data) {
      return null;
    }

    // The proxy forwards Prokerala's JSON shape (including `{ error: ... }`
    // on upstream failure). We only treat the payload as a valid response
    // when the proxy itself returned successfully.
    if (data && typeof data === 'object' && 'error' in data && data.error) {
      return null;
    }

    return data as T;
  } catch {
    return null;
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDateTimeForAPI(dt: DateTime, tz: number): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const tzSign = tz >= 0 ? '+' : '-';
  const tzAbs = Math.abs(tz);
  const tzHH = Math.floor(tzAbs);
  const tzMM = Math.round((tzAbs - tzHH) * 60);
  return `${dt.year}-${pad(dt.month)}-${pad(dt.day)}T${pad(dt.hour)}:${pad(dt.minute)}:${pad(dt.second)}${tzSign}${pad(tzHH)}:${pad(tzMM)}`;
}

function formatCoords(loc: GeoLocation): string {
  return `${loc.latitude},${loc.longitude}`;
}

// ─── Exported Types ──────────────────────────────────────────────────────────

export interface ProkeralaPlanet {
  name: string; longitude: number; sign: string; signIndex: number; degree: number;
  nakshatra: string; nakshatraPada: number; nakshatraLord: string; house: number;
  isRetrograde: boolean; speed: number;
}

export interface PlanetPositionResult {
  planets: ProkeralaPlanet[];
  ascendant: { sign: string; signIndex: number; degree: number; longitude: number };
  source: 'prokerala' | 'fallback';
}

export interface KundliResult {
  planets: ProkeralaPlanet[];
  ascendant: { sign: string; signIndex: number; degree: number; longitude: number };
  mangalDosha: boolean;
  source: 'prokerala' | 'fallback';
}

export interface NavamsaResult {
  planets: ProkeralaPlanet[];
  ascendant: { sign: string; signIndex: number; degree: number };
  source: 'prokerala' | 'fallback';
}

export interface DashaEntry {
  planet: string; startDate: string; endDate: string; years: number;
  antardasha?: DashaEntry[];
}

export interface YogaEntry {
  name: string; description: string; hasYoga: boolean;
}

export interface KundliMatchResult {
  totalPoints: number; maxPoints: number; compatibility: string;
  details: { name: string; points: number; maxPoints: number; description: string }[];
  mangalDosha: { boy: boolean; girl: boolean; cancelled: boolean };
}

export interface PanchangResult {
  tithi: string; nakshatra: string; yoga: string; karana: string; vara: string;
  sunrise: string; sunset: string; moonrise: string; moonset: string;
  rahuKalam: string; gulikaKalam: string; yamaghantaKalam: string;
}

export interface MangalDoshaResult {
  hasDosha: boolean; doshaType: string; description: string; remedies: string[];
}

export interface SadeSatiResult {
  isInSadeSati: boolean; phase: string; startDate: string; endDate: string; description: string;
}

// ─── Planet Positions (D1 Rashi Chart) ───────────────────────────────────────

export async function fetchPlanetPositions(
  dt: DateTime, loc: GeoLocation
): Promise<PlanetPositionResult | null> {
  const datetime = formatDateTimeForAPI(dt, loc.timezone);
  const coordinates = formatCoords(loc);
  const data: any = await prokeralaProxy('planet-position', { datetime, coordinates, ayanamsa: '1' });
  if (!data) return null;
  try {
    const planets: ProkeralaPlanet[] = (data.planet_position ?? []).map((p: RawProkeralaPlanet) => ({
      name: p.name ?? '', longitude: p.longitude ?? 0, sign: p.rasi?.name ?? '',
      signIndex: (p.rasi?.id ?? 1) - 1, degree: p.degree ?? 0,
      nakshatra: p.nakshatra?.name ?? '', nakshatraPada: p.nakshatra?.pada ?? 1,
      nakshatraLord: p.nakshatra?.lord?.name ?? '', house: p.house ?? 1,
      isRetrograde: p.is_retrograde ?? false, speed: p.speed ?? 0,
    }));
    const asc = data.ascendant ?? { rasi: { name: 'Aries', id: 1 }, degree: 0, longitude: 0 };
    return { planets, ascendant: { sign: asc.rasi?.name ?? 'Aries', signIndex: (asc.rasi?.id ?? 1) - 1, degree: asc.degree ?? 0, longitude: asc.longitude ?? 0 }, source: 'prokerala' };
  } catch { return null; }
}

// ─── Kundli / Birth Chart ─────────────────────────────────────────────────────

export async function fetchKundli(
  dt: DateTime, loc: GeoLocation
): Promise<KundliResult | null> {
  const datetime = formatDateTimeForAPI(dt, loc.timezone);
  const coordinates = formatCoords(loc);
  const data: any = await prokeralaProxy('kundli', { datetime, coordinates, ayanamsa: '1' });
  if (!data) return null;
  try {
    const planets: ProkeralaPlanet[] = (data.planet_position ?? []).map((p: RawProkeralaPlanet) => ({
      name: p.name ?? '', longitude: p.longitude ?? 0, sign: p.rasi?.name ?? '',
      signIndex: (p.rasi?.id ?? 1) - 1, degree: p.degree ?? 0,
      nakshatra: p.nakshatra?.name ?? '', nakshatraPada: p.nakshatra?.pada ?? 1,
      nakshatraLord: p.nakshatra?.lord?.name ?? '', house: p.house ?? 1,
      isRetrograde: p.is_retrograde ?? false, speed: p.speed ?? 0,
    }));
    const asc = data.ascendant ?? { rasi: { name: 'Aries', id: 1 }, degree: 0, longitude: 0 };
    return { planets, ascendant: { sign: asc.rasi?.name ?? 'Aries', signIndex: (asc.rasi?.id ?? 1) - 1, degree: asc.degree ?? 0, longitude: asc.longitude ?? 0 }, mangalDosha: data.mangal_dosha?.has_dosha ?? false, source: 'prokerala' };
  } catch { return null; }
}

// ─── Navamsa (D9) Chart ───────────────────────────────────────────────────────

export async function fetchNavamsa(
  dt: DateTime, loc: GeoLocation
): Promise<NavamsaResult | null> {
  const datetime = formatDateTimeForAPI(dt, loc.timezone);
  const coordinates = formatCoords(loc);
  const data: any = await prokeralaProxy('navamsa-chart', { datetime, coordinates, ayanamsa: '1' });
  if (!data) return null;
  try {
    const planets: ProkeralaPlanet[] = (data.planet_position ?? []).map((p: RawProkeralaPlanet) => ({
      name: p.name ?? '', longitude: p.longitude ?? 0, sign: p.rasi?.name ?? '',
      signIndex: (p.rasi?.id ?? 1) - 1, degree: p.degree ?? 0,
      nakshatra: '', nakshatraPada: 1, nakshatraLord: '', house: p.house ?? 1,
      isRetrograde: false, speed: 0,
    }));
    const asc = data.ascendant ?? {};
    return { planets, ascendant: { sign: asc.rasi?.name ?? 'Aries', signIndex: (asc.rasi?.id ?? 1) - 1, degree: asc.degree ?? 0 }, source: 'prokerala' };
  } catch { return null; }
}

// ─── Vimshottari Dasha ────────────────────────────────────────────────────────

export async function fetchVimshottariDasha(
  dt: DateTime, loc: GeoLocation
): Promise<DashaEntry[] | null> {
  const datetime = formatDateTimeForAPI(dt, loc.timezone);
  const coordinates = formatCoords(loc);
  const data: any = await prokeralaProxy('dasha-period', { datetime, coordinates, ayanamsa: '1' });
  if (!data) return null;
  try {
    return (data.dasha_periods ?? []).map((d: RawProkeralaDasha) => ({
      planet: d.planet?.name ?? d.name ?? '', startDate: d.start ?? '', endDate: d.end ?? '',
      years: d.duration ?? 0,
      antardasha: (d.antardasha ?? []).map((a: RawProkeralaDasha) => ({
        planet: a.planet?.name ?? a.name ?? '', startDate: a.start ?? '', endDate: a.end ?? '', years: a.duration ?? 0,
      })),
    }));
  } catch { return null; }
}

// ─── Yoga Detection ───────────────────────────────────────────────────────────

export async function fetchYogas(
  dt: DateTime, loc: GeoLocation
): Promise<YogaEntry[] | null> {
  const datetime = formatDateTimeForAPI(dt, loc.timezone);
  const coordinates = formatCoords(loc);
  const data: any = await prokeralaProxy('yoga', { datetime, coordinates, ayanamsa: '1' });
  if (!data) return null;
  try {
    return (data.yoga_list ?? []).map((y: any) => ({
      name: y.name ?? '', description: y.description ?? '', hasYoga: y.has_yoga ?? false,
    }));
  } catch { return null; }
}

// ─── Kundli Matching (Ashtakoot) ─────────────────────────────────────────────

export async function fetchKundliMatching(
  boy: { dt: DateTime; loc: GeoLocation },
  girl: { dt: DateTime; loc: GeoLocation }
): Promise<KundliMatchResult | null> {
  const data: any = await prokeralaProxy('kundli-matching', {
    'boy_datetime': formatDateTimeForAPI(boy.dt, boy.loc.timezone),
    'boy_coordinates': formatCoords(boy.loc),
    'girl_datetime': formatDateTimeForAPI(girl.dt, girl.loc.timezone),
    'girl_coordinates': formatCoords(girl.loc),
    ayanamsa: '1',
  });
  if (!data) return null;
  try {
    const score = data.ashtakoot_points ?? {};
    return { totalPoints: score.total_points ?? 0, maxPoints: 36, compatibility: getCompatibilityLabel(score.total_points ?? 0),
      details: (data.ashtakoot ?? []).map((k: any) => ({ name: k.name ?? '', points: k.received_points ?? 0, maxPoints: k.total_points ?? 0, description: k.description ?? '' })),
      mangalDosha: { boy: data.mangal_dosha?.boy?.has_dosha ?? false, girl: data.mangal_dosha?.girl?.has_dosha ?? false, cancelled: data.mangal_dosha?.is_cancelled ?? false },
    };
  } catch { return null; }
}

function getCompatibilityLabel(points: number): string {
  if (points >= 32) return 'Excellent Match';
  if (points >= 28) return 'Very Good Match';
  if (points >= 24) return 'Good Match';
  if (points >= 18) return 'Average Match';
  if (points >= 12) return 'Below Average';
  return 'Not Recommended';
}

// ─── Panchang ─────────────────────────────────────────────────────────────────

export async function fetchPanchang(
  dt: DateTime, loc: GeoLocation
): Promise<PanchangResult | null> {
  const datetime = formatDateTimeForAPI(dt, loc.timezone);
  const coordinates = formatCoords(loc);
  const data: any = await prokeralaProxy('panchang', { datetime, coordinates, ayanamsa: '1' });
  if (!data) return null;
  try {
    return {
      tithi: data.tithi?.name ?? '', nakshatra: data.nakshatra?.name ?? '',
      yoga: data.yoga?.name ?? '', karana: data.karana?.name ?? '', vara: data.vaara?.name ?? '',
      sunrise: data.sunrise ?? '', sunset: data.sunset ?? '', moonrise: data.moonrise ?? '', moonset: data.moonset ?? '',
      rahuKalam: data.rahu_kalam ?? '', gulikaKalam: data.gulika_kalam ?? '', yamaghantaKalam: data.yamaghanta_kalam ?? '',
    };
  } catch { return null; }
}

// ─── Mangal Dosha ─────────────────────────────────────────────────────────────

export async function fetchMangalDosha(
  dt: DateTime, loc: GeoLocation
): Promise<MangalDoshaResult | null> {
  const datetime = formatDateTimeForAPI(dt, loc.timezone);
  const coordinates = formatCoords(loc);
  const data: any = await prokeralaProxy('mangal-dosha', { datetime, coordinates, ayanamsa: '1' });
  if (!data) return null;
  try {
    return { hasDosha: data.has_dosha ?? false, doshaType: data.dosha_type ?? '', description: data.description ?? '', remedies: data.remedies ?? [] };
  } catch { return null; }
}

// ─── Sade Sati ────────────────────────────────────────────────────────────────

export async function fetchSadeSati(
  dt: DateTime, loc: GeoLocation
): Promise<SadeSatiResult | null> {
  const datetime = formatDateTimeForAPI(dt, loc.timezone);
  const coordinates = formatCoords(loc);
  const data: any = await prokeralaProxy('sade-sati', { datetime, coordinates, ayanamsa: '1' });
  if (!data) return null;
  try {
    return { isInSadeSati: data.is_in_sade_sati ?? false, phase: data.phase ?? '', startDate: data.start_date ?? '', endDate: data.end_date ?? '', description: data.description ?? '' };
  } catch { return null; }
}