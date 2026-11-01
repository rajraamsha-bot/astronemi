import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Check, ShieldCheck } from 'lucide-react-native';
import { ErrorCode, useIAP, type Product, type Purchase } from 'expo-iap';
import Colors from '@/constants/colors';
import {
  getIapProducts,
  verifyIapPurchase,
  type IapProduct,
  type IapProductKind,
  type IapVerificationResult,
} from '@/services/iap';
import { Logger } from '@/services/logger';

interface Props {
  kind: Extract<IapProductKind, 'subscription' | 'astrologer_subscription'>;
  planId: string;
  durationDays: number;
  userId: string;
  onActivated: (result: IapVerificationResult) => void;
  onError: (message: string) => void;
}

export function IapPlanPurchase({
  kind,
  planId,
  durationDays,
  userId,
  onActivated,
  onError,
}: Props) {
  const [product, setProduct] = useState<IapProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const processedPurchases = useRef<Set<string>>(new Set());
  const purchaseHandlerRef = useRef<(purchase: Purchase) => void>(() => {});

  const iap = useIAP({
    onPurchaseSuccess: (purchase) => {
      purchaseHandlerRef.current(purchase);
    },
    onPurchaseError: (error) => {
      if (error.code === ErrorCode.UserCancelled) return;
      setProcessing(false);
      onError(error.message || 'Purchase failed');
    },
  });

  const {
    connected,
    products,
    fetchProducts,
    requestPurchase,
    finishTransaction,
    availablePurchases,
    getAvailablePurchases,
  } = iap;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getIapProducts(kind)
      .then((rows) => {
        if (cancelled) return;
        const match = rows.find(
          (row) => row.planId === planId && row.durationDays === durationDays,
        );
        setProduct(match ?? null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [durationDays, kind, planId]);

  useEffect(() => {
    if (!connected || !product) return;
    void fetchProducts({ skus: [product.productId], type: 'in-app' }).catch((error: unknown) => {
      Logger.error('Failed to fetch IAP plan product', error);
    });
  }, [connected, fetchProducts, product]);

  useEffect(() => {
    if (!connected) return;
    void getAvailablePurchases().catch((error: unknown) => {
      Logger.error('Failed to recover unfinished IAP plan purchase', error);
    });
  }, [connected, getAvailablePurchases]);

  const processPurchase = useCallback(
    async (purchase: Purchase) => {
      if (!product || purchase.productId !== product.productId) return;
      const purchaseKey = `${purchase.productId}:${(purchase as Purchase & { transactionId?: string | null }).transactionId ?? purchase.id}`;
      if (processedPurchases.current.has(purchaseKey)) return;
      processedPurchases.current.add(purchaseKey);

      setProcessing(true);
      setMessage(null);
      const result = await verifyIapPurchase(purchase, userId);
      if (!result.success) {
        processedPurchases.current.delete(purchaseKey);
        setProcessing(false);
        setMessage(result.error || 'Pass is pending verification.');
        onError(result.error || 'Pass is pending verification.');
        return;
      }

      try {
        await finishTransaction({ purchase, isConsumable: true });
      } catch (error) {
        Logger.warn('Store pass finalization failed; will retry on next launch', error);
      }
      setProcessing(false);
      setMessage('Pass activated.');
      onActivated(result);
    },
    [finishTransaction, onActivated, onError, product, userId],
  );

  purchaseHandlerRef.current = (purchase) => {
    void processPurchase(purchase);
  };

  useEffect(() => {
    if (availablePurchases.length === 0 || !product) return;
    for (const purchase of availablePurchases) {
      if (purchase.productId === product.productId) {
        void processPurchase(purchase);
      }
    }
  }, [availablePurchases, processPurchase, product]);

  const storeProduct: Product | undefined = product
    ? products.find((item) => item.id === product.productId)
    : undefined;

  if (loading) {
    return (
      <View style={styles.stateBox}>
        <ActivityIndicator color={Colors.primary} />
        <Text style={styles.stateText}>Loading store price...</Text>
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.stateBox}>
        <ShieldCheck size={32} color={Colors.textLight} />
        <Text style={styles.stateTitle}>This pass is not configured</Text>
        <Text style={styles.stateText}>
          The store product for this plan is not available in this build yet.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.notice}>
        <ShieldCheck size={16} color={Colors.primary} />
        <Text style={styles.noticeText}>
          Non-renewing pass. It does not auto-renew. Access ends after the period shown.
          Payment is handled by the App Store or Google Play.
        </Text>
      </View>

      <View style={styles.card}>
        <View style={styles.cardLeft}>
          <Text style={styles.cardTitle}>{product.title || 'Access pass'}</Text>
          <Text style={styles.cardDuration}>{durationDays} days of access</Text>
          <Text style={styles.cardPrice}>
            {storeProduct ? storeProduct.displayPrice : 'Loading store price...'}
          </Text>
        </View>
        <View style={styles.cardRight}>
          {processing ? (
            <ActivityIndicator color={Colors.primary} />
          ) : (
            <Check size={18} color={Colors.primary} />
          )}
        </View>
      </View>

      {!connected && (
        <View style={styles.connectingRow}>
          <ActivityIndicator size="small" color={Colors.primary} />
          <Text style={styles.connectingText}>Connecting to the store...</Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.buyButton, (!connected || processing) && styles.buyButtonDisabled]}
        disabled={!connected || processing}
        onPress={() => {
          setProcessing(true);
          setMessage(null);
          void requestPurchase({
            request: {
              apple: { sku: product.productId, appAccountToken: userId },
              google: { skus: [product.productId], obfuscatedAccountId: userId },
            },
            type: 'in-app',
          }).catch((error: unknown) => {
            setProcessing(false);
            Logger.error('IAP plan purchase request failed', error);
            onError('Could not open the store purchase sheet. Please try again.');
          });
        }}
      >
        {processing ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Text style={styles.buyButtonText}>
            Buy pass{storeProduct ? ` — ${storeProduct.displayPrice}` : ''}
          </Text>
        )}
      </TouchableOpacity>

      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#F3E8FF',
    borderRadius: 10,
    padding: 12,
  },
  noticeText: { flex: 1, fontSize: 12, lineHeight: 17, color: Colors.text },
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 16,
  },
  cardLeft: { flex: 1 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: Colors.text },
  cardDuration: { fontSize: 12, color: Colors.textLight, marginTop: 3 },
  cardPrice: { fontSize: 14, fontWeight: '600', color: Colors.primary, marginTop: 6 },
  cardRight: { width: 32, alignItems: 'flex-end' },
  connectingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  connectingText: { fontSize: 13, color: Colors.textLight },
  buyButton: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  buyButtonDisabled: { opacity: 0.5 },
  buyButtonText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  message: { fontSize: 13, color: Colors.primary, textAlign: 'center' },
  stateBox: { alignItems: 'center', paddingVertical: 28, gap: 10 },
  stateTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  stateText: { fontSize: 13, color: Colors.textLight, textAlign: 'center', lineHeight: 19 },
});
