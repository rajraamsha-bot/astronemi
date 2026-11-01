import { 
  findMuhurats, 
  getNextMuhurat, 
  getMuhuratsForDate, 
  checkTimeAuspiciousness, 
  getMuhuratCategories,
  muhuratTypes
} from '../../utils/muhurat-engine';

describe('muhurat-engine', () => {
  const mockLocation = { lat: 19.076, lon: 72.877, timezone: 5.5 };
  const mockDate = new Date('2025-01-01T12:00:00+05:30');

  it('should find Muhurats for a date range', () => {
    const endDate = new Date(mockDate);
    endDate.setDate(endDate.getDate() + 2); // 2 days range

    const result = findMuhurats('vivah', mockDate, endDate, mockLocation);
    
    expect(result.muhurats).toBeDefined();
    expect(Array.isArray(result.muhurats)).toBe(true);
    expect(result.searchParams.type).toBe('vivah');
  });

  it('should throw error for unknown muhurat type', () => {
    expect(() => {
      findMuhurats('unknown_type', mockDate, mockDate, mockLocation);
    }).toThrow('Unknown muhurat type: unknown_type');
  });

  it('should get next available Muhurat', () => {
    const next = getNextMuhurat('griha_pravesh', mockLocation, 5);
    expect(next === null || typeof next === 'object').toBe(true);
  });

  it('should get Muhurats for a specific date', () => {
    const list = getMuhuratsForDate(mockDate, mockLocation);
    expect(Array.isArray(list)).toBe(true);
  });

  it('should check time auspiciousness', () => {
    const check = checkTimeAuspiciousness(mockDate, mockLocation);
    expect(check).toHaveProperty('isAuspicious');
    expect(typeof check.score).toBe('number');
    expect(check.warnings).toBeDefined();
    expect(check.recommendations).toBeDefined();
  });

  it('should return muhurat categories', () => {
    const categories = getMuhuratCategories();
    expect(categories).toHaveLength(9);
    expect(categories[0].id).toBe('marriage');
  });

  it('should export muhuratTypes', () => {
    expect(muhuratTypes.length).toBeGreaterThan(0);
  });
});
