/**
 * Vedic Aspect (Drishti) Engine
 * 
 * Calculates planetary glances based on Parashara's classical rules.
 * All planets look at the 7th house. 
 * Mars, Jupiter, and Saturn have "Full Special Drishti".
 */

export interface PlanetaryAspect {
  fromPlanet: string;
  toHouse: number;
  toPlanet?: string;
  type: 'Full' | 'Special' | 'Conjunction';
  strength: number; // 0-100
}

export interface AspectAnalysis {
  directAspects: PlanetaryAspect[];
  mutualAspects: Array<{ planets: [string, string]; houseAxis: [number, number] }>;
  conjunctions: Array<{ planets: string[]; house: number }>;
}

/**
 * Calculates all aspects cast by planets in a Vedic chart.
 */
export function calculateAspects(planets: Array<{ name: string; house: number; signIndex: number }>): AspectAnalysis {
  const aspects: PlanetaryAspect[] = [];
  const conjunctionMap: Record<number, string[]> = {};

  planets.forEach(p => {
    const fromHouse = p.house;
    
    // 1. Conjunctions (Same House)
    if (!conjunctionMap[fromHouse]) conjunctionMap[fromHouse] = [];
    conjunctionMap[fromHouse].push(p.name);

    // 2. Standard 7th House Aspect (All planets)
    const seventhHouse = ((fromHouse - 1 + 6) % 12) + 1;
    aspects.push({
      fromPlanet: p.name,
      toHouse: seventhHouse,
      type: 'Full',
      strength: 100,
    });

    // 3. Special Aspects
    if (p.name === 'Mars') {
      // 4th and 8th
      [3, 7].forEach(offset => {
        const toHouse = ((fromHouse - 1 + offset) % 12) + 1;
        aspects.push({ fromPlanet: 'Mars', toHouse, type: 'Special', strength: 100 });
      });
    }

    if (p.name === 'Jupiter' || p.name === 'Rahu' || p.name === 'Ketu') {
      // 5th and 9th
      [4, 8].forEach(offset => {
        const toHouse = ((fromHouse - 1 + offset) % 12) + 1;
        aspects.push({ fromPlanet: p.name, toHouse, type: 'Special', strength: 100 });
      });
    }

    if (p.name === 'Saturn') {
      // 3rd and 10th
      [2, 9].forEach(offset => {
        const toHouse = ((fromHouse - 1 + offset) % 12) + 1;
        aspects.push({ fromPlanet: 'Saturn', toHouse, type: 'Special', strength: 100 });
      });
    }
  });

  // Identify planetary targets of aspects
  aspects.forEach(asp => {
    const targetPlanet = planets.find(p => p.house === asp.toHouse);
    if (targetPlanet) {
      asp.toPlanet = targetPlanet.name;
    }
  });

  // Mutual Aspects (Planet A looks at B AND B looks at A)
  const mutualAspects: AspectAnalysis['mutualAspects'] = [];
  for (let i = 0; i < planets.length; i++) {
    for (let j = i + 1; j < planets.length; j++) {
      const p1 = planets[i];
      const p2 = planets[j];
      
      if (!p1 || !p2) continue;
      
      const p1LooksAtP2 = aspects.some(a => a.fromPlanet === p1.name && a.toHouse === p2.house);
      const p2LooksAtP1 = aspects.some(a => a.fromPlanet === p2.name && a.toHouse === p1.house);

      if (p1LooksAtP2 && p2LooksAtP1) {
        mutualAspects.push({
          planets: [p1.name, p2.name],
          houseAxis: [p1.house, p2.house]
        });
      }
    }
  }

  const conjunctions = Object.entries(conjunctionMap)
    .filter(([_, planets]) => planets.length > 1)
    .map(([house, planets]) => ({ house: parseInt(house), planets }));

  return { directAspects: aspects, mutualAspects, conjunctions };
}
