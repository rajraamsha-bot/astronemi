import { renderHook, act } from '@testing-library/react-native';
import { usePanchang } from '../usePanchang';
import * as prokeralaApi from '@/utils/prokerala-api';

// Mock the API and external utilities
jest.mock('@/utils/prokerala-api');
jest.mock('@/utils/hindu-calendar-engine', () => ({
  computePanchang: jest.fn(() => ({
    vara: 0,
    varaName: 'Sunday',
    tithi: 1,
    tithiName: 'Prathama',
    paksha: 'Shukla',
    nakshatra: 1,
    nakshatraName: 'Ashwini',
    yoga: 1,
    yogaName: 'Vishkumbha',
    karana: 'Bava',
    moonRashiName: 'Mesha',
    sunRashiName: 'Mesha',
    moonLongitude: 30, // Add missing properties
    sunLongitude: 60,
    karanaName: 'Bava',
  })),
  computeFestivalsForYear: jest.fn(() => []),
  computeMuhurtas: jest.fn(() => ({
    sunrise: new Date('2024-01-01T06:00:00'),
    sunset: new Date('2024-01-01T18:00:00'),
    rahuKaal: [new Date(), new Date()],
    gulikaKaal: [new Date(), new Date()],
    yamaghanta: [new Date(), new Date()],
    abhijit: [new Date(), new Date()],
    brahma: [new Date(), new Date()],
  })),
  RASHI_NAMES: [
    'Mesha', 'Vrishabha', 'Mithuna', 'Karka', 'Simha', 'Kanya',
    'Tula', 'Vrishchika', 'Dhanu', 'Makara', 'Kumbha', 'Meena'
  ],
}));

const mockLocation = { latitude: 28.6139, longitude: 77.2090, timezone: 5.5 };

describe('usePanchang', () => {
  it('should initialize with null panchang', () => {
    const { result } = renderHook(() => usePanchang(mockLocation));
    expect(result.current.panchang).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('should load local panchang when API fails', async () => {
    jest.setTimeout(15000);
    (prokeralaApi.fetchPanchang as jest.Mock).mockResolvedValue(null);
    
    const { result } = renderHook(() => usePanchang(mockLocation));
    
    await act(async () => {
      await result.current.loadPanchang(new Date('2024-01-01'));
    });

    expect(result.current.panchang).not.toBeNull();
    expect(result.current.dataSource).toBe('local');
    expect(result.current.panchang?.tithi).toBe('Prathama');
  });

  it('should load API panchang when available', async () => {
    (prokeralaApi.fetchPanchang as jest.Mock).mockResolvedValue({
      tithi: 'Dwitiya',
      nakshatra: 'Bharani',
      vara: 'Monday',
    });
    
    const { result } = renderHook(() => usePanchang(mockLocation));
    
    await act(async () => {
      await result.current.loadPanchang(new Date('2024-01-01'));
    });

    expect(result.current.panchang?.tithi).toBe('Dwitiya');
    expect(result.current.dataSource).toBe('prokerala');
  });
});
