/**
 * useAstrologerPro — React hooks for AstroPro subscription data.
 *
 * Wraps astrologerProService with sane defaults + loading/error state.
 */

import { useCallback, useEffect, useState } from 'react';
import { astrologerProService, type AstrologerPlan, type AstrologerSubscription } from '@/services/astrologer-pro';

export function useAstrologerProPlans() {
  const [plans, setPlans] = useState<AstrologerPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await astrologerProService.listPlans();
      setPlans(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load plans');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  return { plans, loading, error, refresh };
}

export function useAstrologerSubscription(astrologerId: string | null) {
  const [subscription, setSubscription] = useState<AstrologerSubscription | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!astrologerId) {
      setSubscription(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await astrologerProService.getCurrentSubscription(astrologerId);
      setSubscription(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load subscription');
    } finally {
      setLoading(false);
    }
  }, [astrologerId]);

  useEffect(() => { void refresh(); }, [refresh]);

  return { subscription, loading, error, refresh };
}

export function useMarketplaceRanking(opts: {
  specialty?: string;
  language?: string;
  minRating?: number;
  limit?: number;
} = {}) {
  const [rows, setRows] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await astrologerProService.getMarketplaceRanking(opts);
      setRows(data);
    } finally {
      setLoading(false);
    }
  }, [opts.specialty, opts.language, opts.minRating, opts.limit]);

  useEffect(() => { void refresh(); }, [refresh]);

  return { rows, loading, refresh };
}
