/**
 * useKundliData — shared hook that turns the saved birth details in
 * UserContext into a fully computed KundliData via the real Vedic engine.
 *
 * Used by feature screens (Shadbala, Ashtakvarga, Jaimini, etc.) so each
 * screen doesn't re-implement birth-details plumbing or caching. Returns a
 * tri-state result: `noBirthDetails` when the user hasn't entered DOB/time/
 * place yet, `isLoading` while generateKundli() runs, and `data` once ready.
 */

import { useQuery } from '@tanstack/react-query';
import { useUser } from '@/contexts/UserContext';
import { generateKundli, KundliData } from '@/utils/kundli-generator';
import type { BirthDetails } from '@/types/user';

export interface UseKundliDataResult {
  data: KundliData | undefined;
  isLoading: boolean;
  error: Error | null;
  noBirthDetails: boolean;
  birthDetails: BirthDetails | null;
}

function hasCompleteBirthDetails(b?: BirthDetails | null): b is BirthDetails {
  return Boolean(b && b.birthDate && b.birthTime && b.birthPlace);
}

export function useKundliData(): UseKundliDataResult {
  const { user } = useUser();
  const birth = user?.birthDetails ?? null;
  const complete = hasCompleteBirthDetails(birth);

  const query = useQuery<KundliData, Error>({
    queryKey: complete
      ? ['kundli', birth.name, birth.birthDate, birth.birthTime, birth.birthPlace]
      : ['kundli', 'no-details'],
    enabled: complete,
    staleTime: 1000 * 60 * 60, // 1 hour — birth details don't change
    gcTime: 1000 * 60 * 60 * 24,
    retry: 1,
    queryFn: async () => {
      if (!complete) throw new Error('Missing birth details');
      return generateKundli(
        birth.name || user?.name || 'User',
        birth.birthDate,
        birth.birthTime,
        birth.birthPlace,
        'standard',
      );
    },
  });

  return {
    data: query.data,
    isLoading: query.isLoading && complete,
    error: query.error ?? null,
    noBirthDetails: !complete,
    birthDetails: complete ? birth : null,
  };
}
