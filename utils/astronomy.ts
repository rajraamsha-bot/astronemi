export interface GeoLocation {
  latitude: number;
  longitude: number;
  timezone: number;
}

export interface DateTime {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

export interface PlanetPosition {
  longitude: number;
  latitude: number;
  distance: number;
  speed: number;
}

export const DEG_TO_RAD = Math.PI / 180;
export const RAD_TO_DEG = 180 / Math.PI;

/**
 * Horner's method for polynomial evaluation.
 */
function evaluatePolynomial(T: number, coeffs: number[]): number {
  let result = 0;
  for (let i = coeffs.length - 1; i >= 0; i--) {
    result = result * T + coeffs[i]!;
  }
  return result;
}

// 60 terms for Moon Longitude and Distance (Table 47.A from Meeus)
// Format: [D, M, M', F, Longitude_Coeff, Distance_Coeff]
type MoonCoeffL = [number, number, number, number, number, number];
const MOON_COEFFS_L: MoonCoeffL[] = [
  [0, 0, 1, 0, 6288774, -20905355],
  [2, 0, -1, 0, 1274027, -3699111],
  [2, 0, 0, 0, 658314, -2955968],
  [0, 0, 2, 0, 213618, -569925],
  [0, 1, 0, 0, -185116, 48888],
  [0, 0, 0, 2, -114332, -3149],
  [2, 0, -2, 0, 58793, 246158],
  [2, -1, -1, 0, 57066, -152138],
  [2, 0, 1, 0, 53322, -170733],
  [2, -1, 0, 0, 45758, -204586],
  [0, 1, -1, 0, -40923, -129620],
  [1, 0, 0, 0, -34720, 108743],
  [0, 1, 1, 0, -30383, 104755],
  [2, 0, 0, -2, 15327, 10321],
  [0, 0, 1, 2, -12528, 0],
  [0, 0, 1, -2, 10980, 79661],
  [4, 0, -1, 0, 10675, -34782],
  [0, 0, 3, 0, 10034, -23210],
  [4, 0, -2, 0, 8548, -21636],
  [2, 1, -1, 0, -7888, 24208],
  [2, 1, 0, 0, -6766, 30824],
  [1, 0, -1, 0, -5163, -8379],
  [1, 1, 0, 0, 4987, -16675],
  [2, -1, 1, 0, 4036, -12831],
  [2, 0, 2, 0, 3994, -10445],
  [4, 0, 0, 0, 3861, -11650],
  [2, 0, -3, 0, 3665, 14403],
  [0, 1, -2, 0, -2689, -7003],
  [2, 0, -1, 2, -2602, 0],
  [2, -1, -2, 0, 2390, 10056],
  [1, 0, 1, 0, -2348, 6322],
  [2, -2, 0, 0, 2236, -9884],
  [0, 1, 2, 0, -2120, 5751],
  [0, 2, 0, 0, -2069, 0],
  [2, -2, -1, 0, 2048, -4950],
  [2, 0, 1, -2, -1773, 4130],
  [2, 0, 0, 2, -1595, 0],
  [4, -1, -1, 0, 1215, -3958],
  [0, 0, 2, 2, -1110, 0],
  [3, 0, -1, 0, -892, 3258],
  [2, 1, 1, 0, -810, 2616],
  [4, -1, -2, 0, 759, -1897],
  [0, 2, -1, 0, -713, -2117],
  [2, 2, -1, 0, -700, 2354],
  [2, 1, -2, 0, 691, 0],
  [2, -1, 0, -2, 596, 0],
  [4, 0, 1, 0, 549, -1423],
  [0, 0, 4, 0, 537, -1117],
  [4, -1, 0, 0, 520, -1571],
  [1, 0, -2, 0, -487, -1739],
  [2, 1, 0, -2, -399, 0],
  [0, 0, 2, -2, -381, -4421],
  [1, 1, 1, 0, 351, 0],
  [3, 0, -2, 0, -340, 0],
  [4, 0, -3, 0, 330, 0],
  [2, -1, 2, 0, 327, 0],
  [0, 2, 1, 0, -323, 1165],
  [1, 1, -1, 0, 299, 0],
  [2, 0, 3, 0, 294, 0],
  [2, 0, -1, -2, 0, 8752]
];

// 60 terms for Moon Latitude (Table 47.B from Meeus)
// Format: [D, M, M', F, Latitude_Coeff]
type MoonCoeffB = [number, number, number, number, number];
const MOON_COEFFS_B: MoonCoeffB[] = [
  [0, 0, 0, 1, 5128122],
  [0, 0, 1, 1, 280602],
  [0, 0, 1, -1, 277693],
  [2, 0, 0, -1, 173237],
  [2, 0, -1, 1, 55413],
  [2, 0, -1, -1, 46271],
  [2, 0, 0, 1, 32573],
  [0, 0, 2, 1, 17198],
  [2, 0, 1, -1, 9266],
  [0, 0, 2, -1, 8822],
  [2, -1, 0, -1, 8216],
  [2, 0, -2, -1, 4324],
  [2, 0, 1, 1, 4200],
  [2, 1, 0, -1, -3359],
  [2, -1, -1, 1, 2463],
  [2, -1, 0, 1, 2211],
  [2, -1, -1, -1, 2065],
  [0, 1, -1, -1, -1870],
  [4, 0, -1, -1, 1828],
  [0, 1, 0, 1, -1794],
  [0, 0, 0, 3, -1749],
  [0, 1, -1, 1, -1565],
  [1, 0, 0, 1, -1491],
  [0, 1, 1, 1, -1475],
  [0, 1, 1, -1, -1410],
  [0, 1, 0, -1, -1344],
  [1, 0, 0, -1, -1335],
  [0, 0, 3, 1, 1107],
  [4, 0, 0, -1, 1021],
  [4, 0, -1, 1, 833],
  [0, 0, 1, -3, 777],
  [4, 0, -2, 1, 671],
  [2, 0, 0, -3, 607],
  [2, 0, 2, -1, 596],
  [2, -1, 1, -1, 491],
  [2, 0, -2, 1, -451],
  [0, 0, 3, -1, 439],
  [2, 0, 2, 1, 422],
  [2, 0, -3, -1, 421],
  [2, 1, -1, 1, -366],
  [2, 1, 0, 1, -351],
  [4, 0, 0, 1, 331],
  [2, -1, 1, 1, 315],
  [2, -2, 0, -1, 302],
  [0, 0, 1, 3, -283],
  [2, 1, 1, -1, -229],
  [1, 1, 0, -1, 223],
  [1, 1, 0, 1, 223],
  [0, 1, -2, -1, -220],
  [2, 1, -1, -1, -220],
  [1, 0, 1, 1, -185],
  [2, -1, -2, -1, 181],
  [0, 1, 2, 1, -177],
  [4, 0, -2, -1, 176],
  [4, -1, -1, -1, 166],
  [1, 0, 1, -1, -164],
  [4, 0, 1, -1, 132],
  [1, 0, -1, -1, -119],
  [4, -1, 0, -1, 115],
  [2, -2, 0, 1, 107]
];

interface PlanetElement {
  a: number[];
  e: number[];
  I: number[];
  L: number[];
  pi: number[];
  Omega: number[];
  perturb?: {
    b: number;
    c: number;
    s: number;
    f: number;
  };
}

/**
 * Planetary Orbital Elements (Table 31.A from Meeus / Simon et al. 1994)
 * Reference: Mean ecliptic and equinox of J2000.0
 */
const PLANET_ELEMENTS: Record<string, PlanetElement> = {
  mercury: {
    a: [0.38709843, 0],
    e: [0.20563661, 0.00002123],
    I: [7.00559432, -0.00590158],
    L: [252.25166724, 149472.67486623],
    pi: [77.45771895, 0.15940013],
    Omega: [48.33961819, -0.12214182]
  },
  venus: {
    a: [0.72332102, -0.00000026],
    e: [0.00677192, -0.00004777],
    I: [3.39466189, -0.00085683],
    L: [181.97970850, 58517.81560260],
    pi: [131.76755713, 0.05679648],
    Omega: [76.67069074, -0.27769418]
  },
  earth: {
    a: [1.00000018, -0.00000003],
    e: [0.01670863, -0.00004204],
    I: [0.00005434, -0.01337178],
    L: [100.46645683, 35999.37285119],
    pi: [102.93734765, 0.32255474],
    Omega: [0, 0]
  },
  mars: {
    a: [1.52367930, 0.00000067],
    e: [0.09340065, 0.00009048],
    I: [1.84972648, -0.00814794],
    L: [-4.56813164, 19140.29934243],
    pi: [-23.91744784, 0.45223625],
    Omega: [49.55809321, -0.29498464]
  },
  jupiter: {
    a: [5.20260321, 0.00019130],
    e: [0.04849485, 0.00016323],
    I: [1.30326698, -0.00540656],
    L: [34.35151874, 3034.90567464],
    pi: [14.33120687, 0.21555241],
    Omega: [100.46440702, 0.20352841],
    perturb: { b: -0.00012452, c: 0.06064060, s: -0.35635438, f: 38.35125 }
  },
  saturn: {
    a: [9.55490959, -0.00021390],
    e: [0.05550862, -0.00034681],
    I: [2.48887878, 0.00255403],
    L: [50.07744430, 1222.11379404],
    pi: [93.05723748, 0.56654967],
    Omega: [113.66550252, -0.23666633],
    perturb: { b: 0.00025899, c: -0.13434469, s: 0.87320147, f: 38.35125 }
  }
};

/**
 * Solve Kepler's Equation M = E - e * sin(E) for E.
 * @returns Eccentric Anomaly in degrees.
 */
function solveKepler(M: number, e: number): number {
  let mRad = M * DEG_TO_RAD;
  let E = mRad;
  for (let i = 0; i < 15; i++) {
    const deltaE = (E - e * Math.sin(E) - mRad) / (1 - e * Math.cos(E));
    E -= deltaE;
    if (Math.abs(deltaE) < 1e-12) break;
  }
  return E * RAD_TO_DEG;
}

/**
 * Calculate Heliocentric Coordinates (x, y, z) for a planet.
 */
function calculateHeliocentricPosition(T: number, planetName: string): { x: number, y: number, z: number } {
  const el = PLANET_ELEMENTS[planetName];
  if (!el) throw new Error(`Unknown planet: ${planetName}`);

  const a = evaluatePolynomial(T, el.a);
  const e = evaluatePolynomial(T, el.e);
  const i = evaluatePolynomial(T, el.I) * DEG_TO_RAD;
  let L = evaluatePolynomial(T, el.L);
  const pi = evaluatePolynomial(T, el.pi);
  const Omega = evaluatePolynomial(T, el.Omega) * DEG_TO_RAD;

  // Apply Great Inequality perturbations for Jupiter and Saturn
  if (el.perturb) {
    const { b, c, s, f } = el.perturb;
    L += b * T * T + c * Math.cos(f * T * DEG_TO_RAD) + s * Math.sin(f * T * DEG_TO_RAD);
  }

  const M = normalizeAngle(L - pi);
  const E = solveKepler(M, e) * DEG_TO_RAD;

  // Coordinates in the orbital plane
  const x_orb = a * (Math.cos(E) - e);
  const y_orb = a * Math.sqrt(1 - e * e) * Math.sin(E);

  // Transform to heliocentric ecliptic coordinates
  const pRad = pi * DEG_TO_RAD;
  const w = pRad - Omega; // Argument of perihelion

  const cosOmega = Math.cos(Omega);
  const sinOmega = Math.sin(Omega);
  const cosW = Math.cos(w);
  const sinW = Math.sin(w);
  const cosI = Math.cos(i);
  const sinI = Math.sin(i);

  const x = x_orb * (cosOmega * cosW - sinOmega * sinW * cosI) - y_orb * (cosOmega * sinW + sinOmega * cosW * cosI);
  const y = x_orb * (sinOmega * cosW + cosOmega * sinW * cosI) - y_orb * (sinOmega * sinW - cosOmega * cosW * cosI);
  const z = x_orb * (sinW * sinI) + y_orb * (cosW * sinI);

  return { x, y, z };
}

/**
 * Calculate Geocentric Position from Heliocentric coordinates.
 */
function calculatePlanetGeocentric(T: number, planetName: string): PlanetPosition {
  const earth = calculateHeliocentricPosition(T, 'earth');
  const planet = calculateHeliocentricPosition(T, planetName);

  const dx = planet.x - earth.x;
  const dy = planet.y - earth.y;
  const dz = planet.z - earth.z;

  const delta = Math.sqrt(dx * dx + dy * dy + dz * dz);
  let longitude = Math.atan2(dy, dx) * RAD_TO_DEG;
  let latitude = Math.asin(dz / delta) * RAD_TO_DEG;

  // Simple speed calculation (delta over 1 hour)
  const T_next = T + 1 / (36525.0 * 24.0);
  const earth_next = calculateHeliocentricPosition(T_next, 'earth');
  const planet_next = calculateHeliocentricPosition(T_next, planetName);
  const dx_next = planet_next.x - earth_next.x;
  const dy_next = planet_next.y - earth_next.y;
  const lon_next = Math.atan2(dy_next, dx_next) * RAD_TO_DEG;
  const speed = normalizeAngle(lon_next - longitude + 180) - 180;

  return {
    longitude: normalizeAngle(longitude),
    latitude: latitude,
    distance: delta,
    speed: speed * 24.0 // Daily speed
  };
}

/**
 * Calculate the obliquity of the ecliptic for a given Julian Day.
 * This is the tilt of Earth's axis — essential for house calculations.
 */
export function calculateObliquity(jd: number): number {
  const T = (jd - 2451545.0) / 36525.0;
  // IAU 1980 expression for mean obliquity
  return 23.4392911 - (46.8150/3600)*T - (0.00059/3600)*T*T + (0.001813/3600)*T*T*T;
}

/**
 * Calculate Nutation in Longitude and Obliquity (IAU 1980)
 * Essential for correcting mean positions to true positions of date.
 */
export function calculateNutation(jd: number): { dPsi: number; dEpsilon: number } {
  // Julian centuries from J2000.0
  const T = (jd - 2451545.0) / 36525.0;
  
  // Fundamental arguments of the Nutation series (IAU 1980)
  const meanLongMoon = normalizeAngle(218.3165 + 481267.8813 * T); 
  const meanElongMoon = normalizeAngle(297.8502 + 445267.1115 * T); 
  const meanAnomSun = normalizeAngle(357.5291 + 35999.0503 * T); 
  const argLatMoon = meanLongMoon - normalizeAngle(125.0445 - 1934.1363 * T); 
  const longNodeMoon = normalizeAngle(125.0445 - 1934.1363 * T); 

  // Simplified Nutation series (top 5 terms from IAU 1980)
  const dPsi = (-17.1996 * Math.sin(longNodeMoon * DEG_TO_RAD) 
               - 1.3187 * Math.sin((2 * argLatMoon - 2 * meanElongMoon + 2 * longNodeMoon) * DEG_TO_RAD)
               - 0.2274 * Math.sin((2 * argLatMoon + 2 * longNodeMoon) * DEG_TO_RAD)
               + 0.2062 * Math.sin((2 * longNodeMoon) * DEG_TO_RAD)
               + 0.1426 * Math.sin(meanAnomSun * DEG_TO_RAD)) / 3600;

  const dEpsilon = (9.2025 * Math.cos(longNodeMoon * DEG_TO_RAD)
                   + 0.5736 * Math.cos((2 * argLatMoon - 2 * meanElongMoon + 2 * longNodeMoon) * DEG_TO_RAD)
                   + 0.0977 * Math.cos((2 * argLatMoon + 2 * longNodeMoon) * DEG_TO_RAD)
                   - 0.0895 * Math.cos((2 * longNodeMoon) * DEG_TO_RAD)
                   + 0.0054 * Math.cos(meanAnomSun * DEG_TO_RAD)) / 3600;

  return { dPsi, dEpsilon };
}

/**
 * Calculate the Right Ascension of the Midheaven (RAMC) in degrees.
 * RAMC = Local Sidereal Time (in degrees). This is the foundation for
 * all quadrant house systems including Placidus.
 */
export function calculateRAMC(jd: number, geoLongitude: number): number {
  const lst = calculateSiderealTime(jd, geoLongitude);
  return lst; // LST in degrees IS the RAMC
}

export function calculateJulianDay(dt: DateTime, tz: number): number {
  const utcHour = dt.hour - tz;
  
  let year = dt.year;
  let month = dt.month;
  
  if (month <= 2) {
    year -= 1;
    month += 12;
  }
  
  const A = Math.floor(year / 100);

  // Use the Gregorian correction only on/after 1582-10-15 (the date of the
  // papal reform). Before that, the Julian calendar was in effect across
  // Europe; applying the Gregorian formula introduces a multi-day error for
  // historical birth dates.
  const isGregorian = (year > 1582) || (year === 1582 && (month > 10 || (month === 10 && dt.day >= 15)));
  const B = isGregorian ? 2 - A + Math.floor(A / 4) : 0;
  
  const JD = Math.floor(365.25 * (year + 4716)) + 
             Math.floor(30.6001 * (month + 1)) + 
             dt.day + B - 1524.5 + 
             (utcHour + dt.minute / 60 + dt.second / 3600) / 24;
  
  // if (__DEV__) console.log(`[Astronomy] JD: ${JD} for ${dt.year}-${dt.month}-${dt.day} ${dt.hour}:${dt.minute}`);
  return JD;
}

export function calculateJulianCentury(jd: number): number {
  return (jd - 2451545.0) / 36525.0;
}

function normalizeAngle(angle: number): number {
  angle = angle % 360;
  if (angle < 0) angle += 360;
  return angle;
}

export function calculateSunPosition(T: number): PlanetPosition {
  const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
  const M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
  
  const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(M * DEG_TO_RAD) +
            (0.019993 - 0.000101 * T) * Math.sin(2 * M * DEG_TO_RAD) +
            0.000289 * Math.sin(3 * M * DEG_TO_RAD);
  
  const sunLongitude = normalizeAngle(L0 + C);
  
  const e = 0.016708634 - 0.000042037 * T - 0.0000001267 * T * T;
  const distance = (1.000001018 * (1 - e * e)) / (1 + e * Math.cos((M + C) * DEG_TO_RAD));
  
  return {
    longitude: sunLongitude,
    latitude: 0,
    distance: distance,
    speed: 0.9856
  };
}

/**
 * ELITE FEATURE: Multi-standard Ayanamsa Engine
 * Calculates the offset between the Tropical and Sidereal zodiac.
 */
export function calculateAyanamsa(jd: number, type: 'lahiri' | 'kp' | 'raman' = 'lahiri'): number {
  const T = (jd - 2451545.0) / 36525.0;
  
  // Standard Government of India (Lahiri) formula
  const baseLahiri = 23.85306 + (50.27972 / 3600) * (T * 100) + (0.000111 / 3600) * Math.pow(T * 100, 2);
  
  switch(type) {
    case 'kp':
      return baseLahiri + (6 / 60);
    case 'raman':
      return 22.423333 + (50.238847 / 3600) * (jd - 2433282.423) / 365.25;
    case 'lahiri':
    default:
      return baseLahiri;
  }
}

export function calculateMoonPosition(T: number): PlanetPosition {
  const p = DEG_TO_RAD;

  // Fundamental arguments for the Moon (Meeus 1998, Chapter 47)
  const Lprime = normalizeAngle(evaluatePolynomial(T, [218.3164477, 481267.88123421, -0.0015786, 1/538841, -1/65194000]));
  const D = normalizeAngle(evaluatePolynomial(T, [297.8501921, 445267.1114034, -0.0018819, 1/545868, -1/113065000]));
  const M = normalizeAngle(evaluatePolynomial(T, [357.5291092, 35999.0502909, -0.0001536, 1/24490000]));
  const Mprime = normalizeAngle(evaluatePolynomial(T, [134.9633964, 477198.8675055, 0.0087414, 1/69699, -1/14712000]));
  const F = normalizeAngle(evaluatePolynomial(T, [93.2720950, 483202.0175233, -0.0036539, -1/3526000, 1/863310000]));

  const A1 = normalizeAngle(119.75 + 131.849 * T);
  const A2 = normalizeAngle(53.09 + 479264.29 * T);
  const A3 = normalizeAngle(313.45 + 481266.484 * T);
  
  const E = evaluatePolynomial(T, [1, -0.002516, -0.0000074]);
  const E2 = E * E;

  // Additive terms for longitude and latitude
  let sumL = 3958 * Math.sin(A1 * p) + 1962 * Math.sin((Lprime - F) * p) + 318 * Math.sin(A2 * p);
  let sumR = 0;
  let sumB = -2235 * Math.sin(Lprime * p) + 382 * Math.sin(A3 * p) + 175 * Math.sin((A1 - F) * p) +
             175 * Math.sin((A1 + F) * p) + 127 * Math.sin((Lprime - Mprime) * p) - 115 * Math.sin((Lprime + Mprime) * p);

  // Periodic terms for longitude and distance
  for (const term of MOON_COEFFS_L) {
    const angle = (term[0] * D + term[1] * M + term[2] * Mprime + term[3] * F) * p;
    const sinAngle = Math.sin(angle);
    const cosAngle = Math.cos(angle);
    
    let factor = 1;
    if (Math.abs(term[1]) === 1) factor = E;
    else if (Math.abs(term[1]) === 2) factor = E2;
    
    sumL += term[4] * sinAngle * factor;
    sumR += term[5] * cosAngle * factor;
  }

  // Periodic terms for latitude
  for (const term of MOON_COEFFS_B) {
    const angle = (term[0] * D + term[1] * M + term[2] * Mprime + term[3] * F) * p;
    const sinAngle = Math.sin(angle);
    
    let factor = 1;
    if (Math.abs(term[1]) === 1) factor = E;
    else if (Math.abs(term[1]) === 2) factor = E2;
    
    sumB += term[4] * sinAngle * factor;
  }

  const moonLongitude = normalizeAngle(Lprime + sumL / 1000000);
  const moonLatitude = sumB / 1000000;
  const distance = 385000.56 + sumR / 1000;

  // Speed calculation (delta over 1 hour). Do NOT pass the tiny signed delta
  // through normalizeAngle: near the 0°/360° boundary -0.5° normalizes to
  // 359.5°, which after ×24 reports a bogus ~8600°/day and flips retrograde
  // detection. Keep the delta signed.
  const T_next = T + 1 / (36525.0 * 24.0);
  const Lprime_next = normalizeAngle(evaluatePolynomial(T_next, [218.3164477, 481267.88123421, -0.0015786, 1/538841, -1/65194000]));
  let dLon = Lprime_next - Lprime;
  if (dLon > 180) dLon -= 360;
  if (dLon < -180) dLon += 360;
  const speed = dLon * 24.0; // Daily speed approximation

  return {
    longitude: moonLongitude,
    latitude: moonLatitude,
    distance: distance,
    speed: speed
  };
}

export function calculateMercuryPosition(T: number): PlanetPosition {
  return calculatePlanetGeocentric(T, 'mercury');
}

export function calculateVenusPosition(T: number): PlanetPosition {
  return calculatePlanetGeocentric(T, 'venus');
}

export function calculateMarsPosition(T: number): PlanetPosition {
  return calculatePlanetGeocentric(T, 'mars');
}

export function calculateJupiterPosition(T: number): PlanetPosition {
  return calculatePlanetGeocentric(T, 'jupiter');
}

export function calculateSaturnPosition(T: number): PlanetPosition {
  return calculatePlanetGeocentric(T, 'saturn');
}

export function calculateRahuKetuPosition(T: number): { rahu: PlanetPosition; ketu: PlanetPosition } {
  // Mean longitude of the ascending node (Meeus Chapter 47)
  const omega = normalizeAngle(evaluatePolynomial(T, [125.0445479, -1934.1362891, 0.0020754, 1/467441, -1/60616000]));
  
  const rahuLongitude = normalizeAngle(omega);
  const ketuLongitude = normalizeAngle(rahuLongitude + 180);
  
  // Daily speed is approx -0.053 degrees
  const speed = -0.05295;

  return {
    rahu: {
      longitude: rahuLongitude,
      latitude: 0,
      distance: 0,
      speed: speed
    },
    ketu: {
      longitude: ketuLongitude,
      latitude: 0,
      distance: 0,
      speed: speed
    }
  };
}

export function calculateSiderealTime(jd: number, longitude: number): number {
  const T = (jd - 2451545.0) / 36525.0;
  const theta0 = 280.46061837 + 360.98564736629 * (jd - 2451545.0) + 
                 0.000387933 * T * T - T * T * T / 38710000.0;
  
  const lst = normalizeAngle(theta0 + longitude);
  return lst;
}

export function calculateAscendant(jd: number, location: GeoLocation): number {
  const T = calculateJulianCentury(jd);
  const epsilon = 23.439291 - 0.0130042 * T;
  
  const lst = calculateSiderealTime(jd, location.longitude);
  
  const tanLat = Math.tan(location.latitude * DEG_TO_RAD);
  const sinEpsilon = Math.sin(epsilon * DEG_TO_RAD);
  const cosEpsilon = Math.cos(epsilon * DEG_TO_RAD);
  
  const y = Math.sin(lst * DEG_TO_RAD);
  const x = Math.cos(lst * DEG_TO_RAD) * cosEpsilon + tanLat * sinEpsilon;
  
  let ascendant = Math.atan2(y, x) * RAD_TO_DEG;
  ascendant = normalizeAngle(ascendant);
  
  return ascendant;
}

export function calculateMC(jd: number, location: GeoLocation): number {
  const lst = calculateSiderealTime(jd, location.longitude);
  return normalizeAngle(lst);
}
