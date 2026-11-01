/**
 * useTips — React hooks for in-app tips.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { tipsService, type TipPreset, type Tip } from '@/services/tips';

export function useTipPresets() {
  const [presets, setPresets] = useState<TipPreset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      const data = await tipsService.getPresets();
      if (mounted) {
        setPresets(data);
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  return { presets, loading };
}

export function useSendTip() {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = useCallback(async (opts: {
    userId: string;
    astrologerId: string;
    amountInr: number;
    consultationId?: string;
    message?: string;
  }) => {
    setSending(true);
    setError(null);
    try {
      const result = await tipsService.sendTip(opts);
      if (!result.success) {
        setError(result.message);
      }
      return result;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Tip failed';
      setError(msg);
      return { success: false, message: msg };
    } finally {
      setSending(false);
    }
  }, []);

  return { send, sending, error };
}

export function useMyTips(userId: string | null) {
  const [tips, setTips] = useState<Tip[]>([]);
  const [loading, setLoading] = useState(false);
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  const refresh = useCallback(async () => {
    if (!userId) {
      setTips([]);
      return;
    }
    setLoading(true);
    const data = await tipsService.getMyTips(userId);
    if (mountedRef.current) {
      setTips(data);
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { void refresh(); }, [refresh]);

  return { tips, loading, refresh };
}

export function useReceivedTips(astrologerId: string | null) {
  const [tips, setTips] = useState<Tip[]>([]);
  const [loading, setLoading] = useState(false);
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  const refresh = useCallback(async () => {
    if (!astrologerId) {
      setTips([]);
      return;
    }
    setLoading(true);
    const data = await tipsService.getReceivedTips(astrologerId);
    if (mountedRef.current) {
      setTips(data);
      setLoading(false);
    }
  }, [astrologerId]);

  useEffect(() => { void refresh(); }, [refresh]);

  return { tips, loading, refresh };
}
