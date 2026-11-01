/**
 * VedAstro API Integration - Free, no API key required
 */

import { DateTime, GeoLocation } from './astronomy';
const BASE = 'https://api.vedastro.org/api/Calculate';

const ZODIAC_SIGNS = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
const SIGN_INDEX: Record<string, number> = { Aries:0, Taurus:1, Gemini:2, Cancer:3, Leo:4, Virgo:5, Libra:6, Scorpio:7, Sagittarius:8, Capricorn:9, Aquarius:10, Pisces:11 };

function buildTimeStr(dt: DateTime, tz: number): string {
  const sign = tz >= 0 ? '+' : '-';
  const abs = Math.abs(tz);
  return `${String(dt.hour).padStart(2,'0')}:${String(dt.minute).padStart(2,'0')}/${String(dt.day).padStart(2,'0')}/${String(dt.month).padStart(2,'0')}/${dt.year}/${sign}${String(Math.floor(abs)).padStart(2,'0')}:${String(Math.round((abs%1)*60)).padStart(2,'0')}`;
}
function buildUrl(calc: string, dt: DateTime, loc: GeoLocation, extra=''): string {
  return `${BASE}/${calc}${extra}/Location/${loc.latitude.toFixed(4)},${loc.longitude.toFixed(4)}/Time/${buildTimeStr(dt,loc.timezone)}/Ayanamsa/LAHIRI`;
}

async function get<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { headers: { Accept:'application/json' } });
    if (!res.ok) return null;
    const json: any = await res.json();
    return json?.Status === 'Pass' ? json as T : null;
  } catch { return null; }
}

export interface VedAstroPlanet {
  name: string; sign: string; signIndex: number; house: number; longitude: number; degree: number;
  nakshatra: string; nakshatraPada: number; nakshatraLord: string; isRetrograde: boolean;
  d3Sign: string; d9Sign: string; d10Sign: string; shadbalaPinda: number; isPowerful: boolean; speed: number;
}
export interface VedAstroKundli {
  ascendant: { sign: string; signIndex: number; longitude: number; degree: number; nakshatra: string; nakshatraPada: number; };
  planets: VedAstroPlanet[]; mangalDosha: boolean; arudhaPadas: Record<string, string>;
}
export interface VedAstroDasha {
  planet: string; startDate: Date; endDate: Date; years: number; nature: string; description: string; subDasas: VedAstroDasha[];
}

const PLANET_YEARS: Record<string, number> = { Sun:6, Moon:10, Mars:7, Rahu:18, Jupiter:16, Saturn:19, Mercury:17, Ketu:7, Venus:20 };

function parsePlanetData(name: string, p: any): VedAstroPlanet | null {
  if (!p) return null;
  const sign = p.PlanetRasiD1Sign?.Name ?? '';
  const long = parseFloat(p.PlanetNirayanaLongitude?.TotalDegrees ?? '0');
  const constParts: string = p.PlanetConstellation ?? '';
  const cp = constParts.split(' - ');
  return {
    name, sign, signIndex: SIGN_INDEX[sign] ?? 0, house: parseInt((p.HousePlanetOccupiesBasedOnSign ?? 'House1').replace('House',''),10)||1,
    longitude: long, degree: long % 30, nakshatra: cp[0]?.trim() ?? '', nakshatraPada: parseInt(cp[1] ?? '1',10)||1,
    nakshatraLord: p.PlanetLordOfConstellation?.Name ?? '', isRetrograde: p.PlanetMotionName === 'Retrograde',
    d3Sign: p.PlanetDrekkanaD3Sign?.Name ?? sign, d9Sign: p.PlanetNavamshaD9Sign?.Name ?? sign, d10Sign: p.PlanetDashamamshaD10Sign?.Name ?? sign,
    shadbalaPinda: parseFloat(p.PlanetShadbalaPinda ?? '0'), isPowerful: p.IsPlanetStrongInShadbala === 'True', speed: 0,
  };
}

function parseDasaNode(name: string, node: any): VedAstroDasha {
  const subDasas: VedAstroDasha[] = [];
  if (node?.SubDasas) {
    for (const [sn, sv] of Object.entries(node.SubDasas)) subDasas.push(parseDasaNode(sn, sv));
  }
  return {
    planet: name, startDate: new Date(node?.Start ?? Date.now()), endDate: new Date(node?.End ?? Date.now()),
    years: PLANET_YEARS[name] ?? 0, nature: node?.Nature ?? 'Neutral', description: node?.Description ?? '', subDasas,
  };
}

export async function fetchAllPlanetData(dt: DateTime, loc: GeoLocation): Promise<VedAstroKundli | null> {
  const raw: any = await get(buildUrl('AllPlanetData', dt, loc, '/PlanetName/All'));
  if (!raw?.Payload?.AllPlanetData) return null;
  const planets: VedAstroPlanet[] = [];
  for (const item of raw.Payload.AllPlanetData) {
    for (const name of ['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn','Rahu','Ketu']) {
      if (item[name]) { const p = parsePlanetData(name, item[name]); if (p) planets.push(p); }
    }
  }
  const mars = planets.find(p => p.name === 'Mars');
  return { ascendant: { sign:'Aries', signIndex:0, longitude:0, degree:0, nakshatra:'', nakshatraPada:1 }, planets, mangalDosha: mars ? [1,2,4,7,8,12].includes(mars.house) : false, arudhaPadas: {} };
}

export async function fetchAllHouseData(dt: DateTime, loc: GeoLocation): Promise<any | null> {
  const raw: any = await get(buildUrl('AllHouseData', dt, loc, '/HouseName/All'));
  if (!raw?.Payload?.AllHouseData) return null;
  const arudhaPadas: Record<string,string> = {};
  for (const item of raw.Payload.AllHouseData) {
    for (let i=1; i<=12; i++) {
      const key = `House${i}`;
      if (item[key]?.ArudhaOfHouse) arudhaPadas[key] = item[key].ArudhaOfHouse;
    }
  }
  // CAUTION: do NOT fabricate an ascendant here. Before this fix a hardcoded
  // Aries-at-0° was returned unconditionally, so EVERY kundli generated on the
  // VedAstro path silently used an Aries ascendant regardless of birth time.
  // The caller (kundli-generator) computes the ascendant locally when this is
  // null. If the payload ever carries real ascendant data it should be parsed
  // here instead of synthesized.
  return { ascendant: null, arudhaPadas };
}

export async function fetchCurrentDasha(dt: DateTime, loc: GeoLocation): Promise<VedAstroDasha | null> {
  const raw: any = await get(buildUrl('DasaForNow', dt, loc, '/PlanetName/Sun'));
  if (!raw?.Payload?.DasaForNow) return null;
  const name = Object.keys(raw.Payload.DasaForNow)[0];
  return name ? parseDasaNode(name, raw.Payload.DasaForNow[name]) : null;
}

export async function fetchSinglePlanet(planetName: string, dt: DateTime, loc: GeoLocation): Promise<VedAstroPlanet | null> {
  const raw: any = await get(buildUrl('AllPlanetData', dt, loc, `/PlanetName/${planetName}`));
  if (!raw?.Payload?.AllPlanetData) return null;
  const item = raw.Payload.AllPlanetData.find((i: any) => i[planetName]);
  return item?.[planetName] ? parsePlanetData(planetName, item[planetName]) : null;
}

export async function checkVedAstroAvailability(): Promise<boolean> {
  try {
    const raw: any = await get(`${BASE}/AllPlanetData/PlanetName/Sun/Location/21.6408,69.6093/Time/07:11/02/10/1869/+05:30/Ayanamsa/LAHIRI`);
    return raw?.Status === 'Pass';
  } catch { return false; }
}

export { ZODIAC_SIGNS, SIGN_INDEX };