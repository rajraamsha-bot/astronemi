/**
 * Ashtakvarga Engine (Parashari)
 *
 * Implements classical Bhinnashtakvarga (individual planet points per sign)
 * and Sarvashtakvarga (combined points per sign) per BPHS.
 *
 * Method:
 *   For each of the 7 planets (Sun, Moon, Mars, Mercury, Jupiter, Venus,
 *   Saturn), there are 8 reference points (the 7 planets themselves plus
 *   the Ascendant/Lagna). Each reference point has a classical set of
 *   "benefic houses" counted FROM that reference. A sign earns one bindu
 *   for each reference point whose benefic-house set covers that sign.
 *
 *   Total bindus per planet across the 12 signs typically sums to the
 *   classical totals (Sun 48, Moon 49, Mars 39, Mercury 54, Jupiter 56,
 *   Venus 52, Saturn 39), which is a useful self-check.
 *
 *   Sarvashtakvarga for a sign is the sum of bhinnashtak points of all 7
 *   planets in that sign. The 12-sign total equals the 7-planet sum (337).
 *
 * Inputs use the same `VedicPlanetData` / sign index convention as the rest
 * of the engine (Aries = 0 … Pisces = 11).
 */

import type { VedicPlanetData } from './vedic-astrology';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BhinnashtakRow {
  planet: string;
  /** 12-entry array, index = sign index (0=Aries). */
  values: number[];
  total: number;
}

export interface SarvashtakRow {
  /** 1..12, counted from the Ascendant. */
  house: number;
  /** Sign index 0..11 (Aries..Pisces). */
  signIndex: number;
  sign: string;
  sun: number;
  moon: number;
  mars: number;
  mercury: number;
  jupiter: number;
  venus: number;
  saturn: number;
  total: number;
}

export interface AshtakvargaResult {
  bhinnashtak: BhinnashtakRow[];
  /** Ordered by house from the ascendant (house 1 first). */
  sarvashtakByHouse: SarvashtakRow[];
  /** Ordered by sign index 0..11 (Aries first). */
  sarvashtakBySign: SarvashtakRow[];
  grandTotal: number;
}

// ─── Classical tables ────────────────────────────────────────────────────────
// Each entry lists the benefic house numbers (1..12) from the reference point.
// Source: BPHS Ashtakvarga adhyaya (standard tables used by all Vedic software).

type ReferenceSet = {
  sun: number[];
  moon: number[];
  mars: number[];
  mercury: number[];
  jupiter: number[];
  venus: number[];
  saturn: number[];
  lagna: number[];
};

const ASHTAKVARGA_TABLES: Record<string, ReferenceSet> = {
  Sun: {
    sun:     [1, 2, 4, 7, 8, 9, 10, 11],
    moon:    [3, 6, 10, 11],
    mars:    [1, 2, 4, 7, 8, 9, 10, 11],
    mercury: [3, 5, 6, 9, 10, 11, 12],
    jupiter: [5, 6, 9, 11],
    venus:   [6, 7, 12],
    saturn:  [1, 2, 4, 7, 8, 9, 10, 11],
    lagna:   [3, 4, 6, 10, 11, 12],
  },
  Moon: {
    sun:     [3, 6, 7, 8, 10, 11],
    moon:    [1, 3, 6, 7, 10, 11],
    mars:    [2, 3, 5, 6, 9, 10, 11],
    mercury: [1, 3, 4, 5, 7, 8, 10, 11],
    jupiter: [1, 4, 7, 8, 10, 11, 12],
    venus:   [3, 4, 5, 7, 9, 10, 11],
    saturn:  [3, 5, 6, 11],
    lagna:   [3, 6, 10, 11],
  },
  Mars: {
    sun:     [3, 5, 6, 10, 11],
    moon:    [3, 6, 11],
    mars:    [1, 2, 4, 7, 8, 10, 11],
    mercury: [3, 5, 6, 11],
    jupiter: [6, 10, 11, 12],
    venus:   [6, 8, 11, 12],
    saturn:  [1, 4, 7, 8, 9, 10, 11],
    lagna:   [1, 3, 6, 10, 11],
  },
  Mercury: {
    sun:     [5, 6, 9, 11, 12],
    moon:    [2, 4, 6, 8, 10, 11],
    mars:    [1, 2, 4, 7, 8, 9, 10, 11],
    mercury: [1, 3, 5, 6, 9, 10, 11, 12],
    jupiter: [6, 8, 11, 12],
    venus:   [1, 2, 3, 4, 5, 8, 9, 11],
    saturn:  [1, 2, 4, 7, 8, 9, 10, 11],
    lagna:   [1, 2, 4, 6, 8, 10, 11],
  },
  Jupiter: {
    sun:     [1, 2, 3, 4, 7, 8, 9, 10, 11],
    moon:    [2, 5, 7, 9, 11],
    mars:    [1, 2, 4, 7, 8, 10, 11],
    mercury: [1, 2, 4, 5, 6, 9, 10, 11],
    jupiter: [1, 2, 3, 4, 7, 8, 10, 11],
    venus:   [2, 5, 6, 9, 10, 11],
    saturn:  [3, 5, 6, 12],
    lagna:   [1, 2, 4, 5, 6, 7, 9, 10, 11],
  },
  Venus: {
    sun:     [8, 11, 12],
    moon:    [1, 2, 3, 4, 5, 8, 9, 11, 12],
    mars:    [3, 4, 6, 9, 11, 12],
    mercury: [3, 5, 6, 9, 11],
    jupiter: [5, 8, 9, 10, 11],
    venus:   [1, 2, 3, 4, 5, 8, 9, 10, 11],
    saturn:  [3, 4, 5, 8, 9, 10, 11],
    lagna:   [1, 2, 3, 4, 5, 8, 9, 11],
  },
  Saturn: {
    sun:     [1, 2, 4, 7, 8, 10, 11],
    moon:    [3, 6, 11],
    mars:    [3, 5, 6, 10, 11, 12],
    mercury: [6, 8, 9, 10, 11, 12],
    jupiter: [5, 6, 11, 12],
    venus:   [6, 11, 12],
    saturn:  [3, 5, 6, 11],
    lagna:   [1, 3, 4, 6, 10, 11],
  },
};

const PLANETS_IN_ORDER = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'] as const;

const ZODIAC = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
];

// ─── Calculation ─────────────────────────────────────────────────────────────

function getSignIndex(planets: VedicPlanetData[], name: string): number | null {
  const p = planets.find(pl => pl.name === name);
  return p ? p.signIndex : null;
}

/**
 * Count bindus for a single planet across all 12 signs using its classical
 * benefic-house table. Each reference point contributes one bindu to every
 * sign that falls within its benefic-house set (measured as the house number
 * 1..12 from the reference point's own sign).
 */
function computeBhinnashtak(
  planetName: string,
  references: Record<string, number>
): number[] {
  const table = ASHTAKVARGA_TABLES[planetName];
  if (!table) return new Array(12).fill(0);

  const values = new Array<number>(12).fill(0);

  (Object.keys(table) as (keyof ReferenceSet)[]).forEach(ref => {
    const refSign = references[ref];
    if (refSign == null) return;

    const beneficHouses = table[ref];
    beneficHouses.forEach(houseNum => {
      // House N from reference sign = (refSign + N - 1) % 12
      const targetSign = (refSign + houseNum - 1) % 12;
      values[targetSign] = (values[targetSign] ?? 0) + 1;
    });
  });

  return values;
}

/**
 * Compute complete Ashtakvarga (Bhinnashtak + Sarvashtak) from a kundli.
 *
 * @param planets Vedic planet data (must include Sun..Saturn with signIndex)
 * @param ascSignIndex 0..11 sign index of the ascendant
 */
export function calculateAshtakvarga(
  planets: VedicPlanetData[],
  ascSignIndex: number,
): AshtakvargaResult {
  // Build the reference-point → sign index map (Lagna + 7 planets)
  const refs: Record<string, number> = {
    lagna: ((ascSignIndex % 12) + 12) % 12,
    sun: getSignIndex(planets, 'Sun') ?? 0,
    moon: getSignIndex(planets, 'Moon') ?? 0,
    mars: getSignIndex(planets, 'Mars') ?? 0,
    mercury: getSignIndex(planets, 'Mercury') ?? 0,
    jupiter: getSignIndex(planets, 'Jupiter') ?? 0,
    venus: getSignIndex(planets, 'Venus') ?? 0,
    saturn: getSignIndex(planets, 'Saturn') ?? 0,
  };

  // Bhinnashtak per planet
  const bhinnashtak: BhinnashtakRow[] = PLANETS_IN_ORDER.map(name => {
    const values = computeBhinnashtak(name, refs);
    const total = values.reduce((a, b) => a + b, 0);
    return { planet: name, values, total };
  });

  // Sarvashtak: per-sign sum of all planets' values
  const sarvashtakBySign: SarvashtakRow[] = ZODIAC.map((sign, signIndex) => {
    const row = {
      sun: bhinnashtak[0]!.values[signIndex] ?? 0,
      moon: bhinnashtak[1]!.values[signIndex] ?? 0,
      mars: bhinnashtak[2]!.values[signIndex] ?? 0,
      mercury: bhinnashtak[3]!.values[signIndex] ?? 0,
      jupiter: bhinnashtak[4]!.values[signIndex] ?? 0,
      venus: bhinnashtak[5]!.values[signIndex] ?? 0,
      saturn: bhinnashtak[6]!.values[signIndex] ?? 0,
    };
    const total = row.sun + row.moon + row.mars + row.mercury + row.jupiter + row.venus + row.saturn;
    // House count from ascendant
    const house = ((signIndex - refs.lagna! + 12) % 12) + 1;
    return { house, signIndex, sign, ...row, total };
  });

  const sarvashtakByHouse = [...sarvashtakBySign].sort((a, b) => a.house - b.house);
  const grandTotal = sarvashtakBySign.reduce((sum, r) => sum + r.total, 0);

  return { bhinnashtak, sarvashtakByHouse, sarvashtakBySign, grandTotal };
}

/**
 * Strength classification for a Sarvashtak house total (out of max 56).
 * Ranges reflect BPHS guidance: 30+ excellent, 25-29 good, 20-24 average,
 * below 20 weak.
 */
export function classifySarvashtakStrength(total: number): 'Excellent' | 'Good' | 'Average' | 'Weak' {
  if (total >= 30) return 'Excellent';
  if (total >= 25) return 'Good';
  if (total >= 20) return 'Average';
  return 'Weak';
}
