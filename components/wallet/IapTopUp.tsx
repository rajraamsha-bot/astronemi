import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Check, CreditCard, ShieldCheck } from 'lucide-react-native';
import { ErrorCode, useIAP, type Product, type Purchase } from 'expo-iap';
import Colors from '@/constants/colors';
import { getIapProducts, verifyIapPurchase, type IapProduct } from '@/services/iap';
import { Logger } from '@/services/logger';

interface Props {
  userId: string;
  onCredited: (amount: number) => void;
  onError: (message: string) => void;
}

export function IapTopUp({ userId, onCredited, onError }: Props) {
  const [catalog, setCatalog] = useState<IapProduct[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [processingProductId, setProcessingProductId] = useState<string | null>(null);
  const [inlineMessage, setInlineMessage] = useState<string | null>(null);
  const processedPurchases = useRef<Set<string>>(new Set());
  const purchaseHandlerRef = useRef<(purchase: Purchase) => void>(() => {});

  const iap = useIAP({
    onPurchaseSuccess: (purchase) => {
      purchaseHandlerRef.current(purchase);
    },
    onPurchaseError: (error) => {
      if (error.code === ErrorCode.UserCancelled) return;
      setProcessingProductId(null);
      onError(error.message || 'Purchase failed');
    },
  });

  const { connected, products, fetchProducts, requestPurchase, finishTransaction, availablePurchases, getAvailablePurchases } = iap;

  useEffect(() => {
    let cancelled = false;
    getIapProducts('credits')
      .then((rows) => {
        if (!cancelled) setCatalog(rows);
      })
      .finally(() => {
        if (!cancelled) setCatalogLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!connected || catalog.length === 0) return;
    void fetchProducts({
      skus: catalog.map((item) => item.productId),
      type: 'in-app',
    }).catch((error: unknown) => {
      Logger.error('Failed to fetch IAP products', error);
    });
  }, [catalog, connected, fetchProducts]);

  useEffect(() => {
    if (!connected) return;
    void getAvailablePurchases().catch((error: unknown) => {
      Logger.error('Failed to recover unfinished IAP purchases', error);
    });
  }, [connected, getAvailablePurchases]);

  const processPurchase = useCallback(
    async (purchase: Purchase) => {
      const product = catalog.find((item) => item.productId === purchase.productId);
      if (!product) {
        onError('This credit pack is not configured. Please contact support.');
        return;
      }

      const purchaseKey = `${purchase.productId}:${(purchase as Purchase & { transactionId?: string | null }).transactionId ?? purchase.id}`;
      if (processedPurchases.current.has(purchaseKey)) return;
      processedPurchases.current.add(purchaseKey);

      setProcessingProductId(product.productId);
      setInlineMessage(null);

      const result = await verifyIapPurchase(purchase, userId);
      if (!result.success) {
        processedPurchases.current.delete(purchaseKey);
        setProcessingProductId(null);
        setInlineMessage(result.error || 'Purchase is pending verification. Please retry.');
        onError(result.error || 'Purchase is pending verification. Please retry.');
        return;
      }

      const credited = result.credited ?? product.creditInr + product.bonusInr;
      onCredited(credited);

      try {
        await finishTransaction({ purchase, isConsumable: true });
      } catch (error) {
        Logger.warn('Store transaction finalization failed; will retry on next launch', error);
      } finally {
        setProcessingProductId(null);
        setInlineMessage(`Added ${credited} AstroNemi Credits.`);
      }
    },
    [catalog, finishTransaction, onCredited, onError, userId],
  );

  purchaseHandlerRef.current = (purchase) => {
    void processPurchase(purchase);
  };

  useEffect(() => {
    if (availablePurchases.length === 0) return;
    for (const purchase of availablePurchases) {
      if (catalog.some((item) => item.productId === purchase.productId)) {
        void processPurchase(purchase);
      }
    }
  }, [availablePurchases, catalog, processPurchase]);

  const storeProductFor = (productId: string): Product | undefined =>
    products.find((product) => product.id === productId);

  const handleBuy = async (product: IapProduct) => {
    if (!connected) {
      onError('The store is not connected yet. Please try again.');
      return;
    }
    setProcessingProductId(product.productId);
    setInlineMessage(null);
    try {
      await requestPurchase({
        request: {
          apple: { sku: product.productId, appAccountToken: userId },
          google: { skus: [product.productId], obfuscatedAccountId: userId },
        },
        type: 'in-app',
      });
    } catch (error) {
      setProcessingProductId(null);
      Logger.error('IAP purchase request failed', error);
      onError('Could not open the store purchase sheet. Please try again.');
    }
  };

  if (catalogLoading) {
    return (
      <View style={styles.stateBox}>
        <ActivityIndicator color={Colors.primary} />
        <Text style={styles.stateText}>Loading credit packs...</Text>
      </View>
    );
  }

  if (catalog.length === 0) {
    return (
      <View style={styles.stateBox}>
        <CreditCard size={32} color={Colors.textLight} />
        <Text style={styles.stateTitle}>Credit packs are unavailable</Text>
        <Text style={styles.stateText}>
          In-app purchases are not configured for this build yet. Your existing credits can still be used.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.notice}>
        <ShieldCheck size={16} color={Colors.primary} />
        <Text style={styles.noticeText}>
          Purchases are processed by the App Store or Google Play. Credits are added after server verification.
        </Text>
      </View>

      {!connected && (
        <View style={styles.connectingRow}>
          <ActivityIndicator size="small" color={Colors.primary} />
          <Text style={styles.connectingText}>Connecting to the store...</Text>
        </View>
      )}

      {catalog.map((item) => {
        const storeProduct = storeProductFor(item.productId);
        const isProcessing = processingProductId === item.productId;
        const totalCredits = item.creditInr + item.bonusInr;
        return (
          <TouchableOpacity
            key={`${item.platform}:${item.productId}`}
            style={[styles.packCard, isProcessing && styles.packCardProcessing]}
            onPress={() => handleBuy(item)}
            disabled={isProcessing || !connected}
          >
            <View style={styles.packLeft}>
              <Text style={styles.packCredits}>{totalCredits} Credits</Text>
              {item.bonusInr > 0 && (
                <Text style={styles.packBonus}>Includes {item.bonusInr} bonus credits</Text>
              )}
              <Text style={styles.packPrice}>
                {storeProduct ? `Store price: ${storeProduct.displayPrice}` : 'Loading store price...'}
              </Text>
            </View>
            <View style={styles.packRight}>
              {isProcessing ? (
                <ActivityIndicator color={Colors.primary} />
              ) : (
                <Check size={18} color={Colors.primary} />
              )}
            </View>
          </TouchableOpacity>
        );
      })}

      {inlineMessage ? <Text style={styles.inlineMessage}>{inlineMessage}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10 },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#F3E8FF',
    borderRadius: 10,
    padding: 12,
    marginBottom: 4,
  },
  noticeText: { flex: 1, fontSize: 12, lineHeight: 17, color: Colors.text },
  connectingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  connectingText: { fontSize: 13, color: Colors.textLight },
  packCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 16,
  },
  packCardProcessing: { borderColor: Colors.primary, opacity: 0.8 },
  packLeft: { flex: 1 },
  packCredits: { fontSize: 17, fontWeight: '700', color: Colors.text },
  packBonus: { fontSize: 12, color: '#2E7D32', marginTop: 3 },
  packPrice: { fontSize: 13, color: Colors.textLight, marginTop: 4 },
  packRight: { width: 32, alignItems: 'flex-end' },
  inlineMessage: { fontSize: 13, color: Colors.primary, textAlign: 'center', marginTop: 4 },
  stateBox: { alignItems: 'center', paddingVertical: 32, gap: 10 },
  stateTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  stateText: { fontSize: 13, color: Colors.textLight, textAlign: 'center', lineHeight: 19 },
});
