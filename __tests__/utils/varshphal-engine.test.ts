import { generateVarshphal } from '../../utils/varshphal-engine';
import { generateKundli, KundliData } from '../../utils/kundli-generator';
import * as astronomy from '../../utils/astronomy';

jest.mock('../../utils/astronomy', () => ({
  calculateJulianDay: jest.fn(() => 2451545),
  calculateJulianCentury: jest.fn(() => 0),
  calculateSunPosition: jest.fn(() => ({ longitude: 50, latitude: 0, distance: 1, speed: 1 })),
}));

jest.mock('../../utils/kundli-generator', () => ({
  generateKundli: jest.fn(),
}));

describe('varshphal-engine', () => {
  const mockNatalData: KundliData = {
    personalInfo: {
      name: 'Test User',
      birthDate: '1995-11-19',
      birthTime: '12:00',
      birthPlace: 'Mumbai',
      dateTime: { year: 1995, month: 11, day: 19, hour: 12, minute: 0 },
    },
    ascendant: { sign: 'Scorpio', degree: 10, signIndex: 7 },
    calculationSource: 'vedic',
    planets: [
      { name: 'Sun', sanskritName: 'Surya', sign: 'Scorpio', nakshatra: 'Anuradha', house: 1, longitude: 230 },
    ],
    insights: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should generate solar return chart and calculate Muntha correctly', async () => {
    const mockReturnChart: KundliData = {
      personalInfo: {
        name: 'Varshphal 2025',
        birthDate: '19/11/2025',
        birthTime: '12:00',
        birthPlace: 'Mumbai',
        dateTime: { year: 2025, month: 11, day: 19, hour: 12, minute: 0 },
      },
      ascendant: { sign: 'Leo', degree: 15, signIndex: 4 },
      calculationSource: 'vedic',
      planets: [],
      insights: [],
    };

    (generateKundli as jest.Mock).mockResolvedValueOnce(mockReturnChart);

    const result = await generateVarshphal(mockNatalData, 2025);

    expect(result.year).toBe(2025);
    expect(result.munthaSign).toBe('Vrishabha');
    expect(result.yearlyThemes[0]).toContain('Muntha in Vrishabha');
    expect(generateKundli).toHaveBeenCalled();
  });
});
