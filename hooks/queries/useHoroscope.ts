import { useQuery } from '@tanstack/react-query';
import { horoscopeApi } from '@/services/api';
import { offlineStorage } from '@/services/offline-storage';

interface Horoscope {
  id?: string;
  sign?: string;
  period?: string;
  date?: string;
  prediction: string;
  content?: string;
  mood: string;
  luckyNumber: string;
  luckyColor: string;
  lucky_number?: string;
  lucky_color?: string;
  compatibility: string;
  rating: number;
  love?: string;
  career?: string;
  health?: string;
  finance?: string;
}

interface UseHoroscopeOptions {
  sign: string;
  timeframe?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  enabled?: boolean;
}

export function useHoroscope(
  signOrOptions?: string | UseHoroscopeOptions,
  timeframe?: 'daily' | 'weekly' | 'monthly' | 'yearly',
  fallbackData?: Horoscope
) {
  let options: UseHoroscopeOptions;
  
  if (typeof signOrOptions === 'string') {
    options = {
      sign: signOrOptions,
      timeframe: timeframe || 'daily',
      enabled: true,
    };
  } else if (signOrOptions) {
    options = signOrOptions;
  } else {
    options = { sign: '', timeframe: 'daily', enabled: false };
  }

  const { sign, timeframe: tf = 'daily', enabled = true } = options;

  return useQuery({
    queryKey: ['horoscope', sign, tf],
    queryFn: async () => {
      const response = await horoscopeApi.getHoroscope(sign, tf);

      if (response.error || !response.data) {
        // Offline fallback: last successfully-fetched horoscope.
        const cachedData = await offlineStorage.get<Horoscope>(`horoscope_${sign}_${tf}`);
        if (cachedData) {
          return cachedData;
        }
        // Throw so the UI renders its error state — fabricating a canned
        // "prediction" with Math.random() lucky numbers and presenting it as
        // today's real horoscope is worse than an honest failure. (The
        // daily-horoscope Edge Function + its schedule populate the table.)
        throw new Error(response.error || 'Horoscope unavailable');
      }

      const dbData = response.data;
      const horoscope: Horoscope = {
        id: dbData.id,
        sign: dbData.sign,
        period: dbData.period,
        date: dbData.date,
        prediction: dbData.prediction,
        // Present the DB values as-is; fields the generator does not supply
        // render as "—" in the UI instead of invented values.
        luckyColor: dbData.luck_color ?? '—',
        luckyNumber: dbData.luck_number ?? '—',
        mood: '—',
        compatibility: '—',
        rating: dbData.rating ?? 0,
      };

      // Cache the data
      await offlineStorage.save(`horoscope_${sign}_${tf}`, horoscope);

      return horoscope;
    },
    enabled: enabled && !!sign,
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
    initialData: fallbackData,
    retry: 1,
  });
}

export function useDailyHoroscope(sign: string) {
  return useHoroscope({ sign, timeframe: 'daily' });
}

export function useWeeklyHoroscope(sign: string) {
  return useHoroscope({ sign, timeframe: 'weekly' });
}

export function useMonthlyHoroscope(sign: string) {
  return useHoroscope({ sign, timeframe: 'monthly' });
}