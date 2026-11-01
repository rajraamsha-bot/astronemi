import React, { createContext, useContext, useState, useEffect, useMemo, useRef, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Logger } from '@/services/logger';
import { usePersist } from '@/hooks/usePersist';
import { generateUUID } from '@/utils/crypto';
import { getUserStorageKey } from '@/utils/user-storage-keys';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { openCheckout } from '@/services/payment';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  type: 'gemstone' | 'rudraksha' | 'yantra' | 'mala' | 'book' | 'other';
  quantity: number;
  weight?: string;
  certification?: boolean;
}

export interface Address {
  id: string;
  name: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
}

export interface Order {
  id: string;
  items: CartItem[];
  total: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  address: Address;
  paymentMethod: 'cod' | 'online';
  paymentStatus: 'pending' | 'paid' | 'failed';
  createdAt: string;
  estimatedDelivery?: string;
  trackingId?: string;
}

interface CartContextType {
  items: CartItem[];
  addresses: Address[];
  orders: Order[];
  totalItems: number;
  subtotal: number;
  discount: number;
  deliveryCharges: number;
  total: number;
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  addAddress: (address: Omit<Address, 'id'>) => Address;
  updateAddress: (id: string, address: Partial<Address>) => void;
  deleteAddress: (id: string) => void;
  setDefaultAddress: (id: string) => void;
  getDefaultAddress: () => Address | undefined;
  placeOrder: (addressId: string, paymentMethod: 'cod' | 'online') => Promise<Order>;
  cancelOrder: (orderId: string) => Promise<void>;
  refreshOrders: () => Promise<Order[]>;
  applyCoupon: (code: string) => boolean;
  appliedCoupon: string | null;
  removeCoupon: () => void;
}

interface CartProviderProps {
  children: ReactNode;
  /** The authenticated Supabase user id. Anonymous carts are never persisted. */
  userId?: string | null;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const DELIVERY_CHARGES = 50;
const FREE_DELIVERY_THRESHOLD = 500;
const MAX_ITEM_QUANTITY = 10;

// NOTE: client-side mock validation only — the Edge Function revalidates the
// coupon and recalculates the final amount from server-side catalog prices.
const COUPONS: Record<string, { discount: number; type: 'flat' | 'percent' }> = {
  ASTRO10: { discount: 10, type: 'percent' },
  FIRST100: { discount: 100, type: 'flat' },
  GEM20: { discount: 20, type: 'percent' },
};

const ORDER_SELECT = [
  'id',
  'user_id',
  'status',
  'items',
  'subtotal',
  'discount',
  'shipping',
  'total',
  'shipping_address',
  'payment_id',
  'payment_status',
  'payment_method',
  'tracking_number',
  'estimated_delivery',
  'created_at',
  'updated_at',
].join(',');

const VALID_ITEM_TYPES = new Set<CartItem['type']>([
  'gemstone',
  'rudraksha',
  'yantra',
  'mala',
  'book',
  'other',
]);

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? value as Record<string, unknown> : {};
}

function mapServerItem(value: unknown, index: number): CartItem {
  const item = asRecord(value);
  const rawType = String(item.type ?? 'other') as CartItem['type'];
  const type = VALID_ITEM_TYPES.has(rawType) ? rawType : 'other';
  const quantity = Math.max(1, Math.min(MAX_ITEM_QUANTITY, Math.floor(Number(item.quantity) || 1)));
  const price = Number(item.price ?? 0);

  return {
    id: String(item.id ?? `server-item-${index}`),
    name: String(item.name ?? 'Product'),
    price: Number.isFinite(price) ? price : 0,
    originalPrice: typeof item.originalPrice === 'number' ? item.originalPrice : undefined,
    image: String(item.image ?? item.image_url ?? ''),
    type,
    quantity,
    weight: typeof item.weight === 'string' ? item.weight : undefined,
    certification: item.certification === true,
  };
}

function mapServerAddress(value: unknown, orderId: string): Address {
  const address = asRecord(value);
  return {
    id: String(address.id ?? `order-address-${orderId}`),
    name: String(address.name ?? 'Delivery address'),
    phone: String(address.phone ?? ''),
    addressLine1: String(address.addressLine1 ?? address.address_line1 ?? ''),
    addressLine2: typeof address.addressLine2 === 'string'
      ? address.addressLine2
      : typeof address.address_line2 === 'string' ? address.address_line2 : undefined,
    city: String(address.city ?? ''),
    state: String(address.state ?? ''),
    pincode: String(address.pincode ?? ''),
    isDefault: address.isDefault === true || address.is_default === true,
  };
}

function mapServerOrder(value: unknown): Order {
  const row = asRecord(value);
  const id = String(row.id ?? generateUUID());
  const rawItems = Array.isArray(row.items) ? row.items : [];
  const rawStatus = String(row.status ?? 'pending');
  const status: Order['status'] = rawStatus === 'shipped' || rawStatus === 'delivered' || rawStatus === 'cancelled'
    ? rawStatus
    : rawStatus === 'pending' ? 'pending' : 'confirmed';
  const rawPaymentStatus = String(row.payment_status ?? 'pending');
  const paymentStatus: Order['paymentStatus'] = rawPaymentStatus === 'completed' || rawPaymentStatus === 'paid'
    ? 'paid'
    : rawPaymentStatus === 'failed' ? 'failed' : 'pending';
  const paymentMethod: Order['paymentMethod'] = String(row.payment_method ?? '') === 'razorpay'
    || String(row.payment_method ?? '') === 'online' ? 'online' : 'cod';
  const total = Number(row.total ?? row.total_amount ?? 0);

  return {
    id,
    items: rawItems.map(mapServerItem),
    total: Number.isFinite(total) ? total : 0,
    status,
    address: mapServerAddress(row.shipping_address, id),
    paymentMethod,
    paymentStatus,
    createdAt: String(row.created_at ?? new Date().toISOString()),
    estimatedDelivery: typeof row.estimated_delivery === 'string' ? row.estimated_delivery : undefined,
    trackingId: typeof row.tracking_number === 'string' ? row.tracking_number : undefined,
  };
}

function parseArray<T>(value: string | null): T[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed as T[] : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children, userId = null }: CartProviderProps) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [hydratedUserId, setHydratedUserId] = useState<string | null>(null);
  const activeUserIdRef = useRef<string | null>(userId);
  const orderInFlightRef = useRef(false);

  useEffect(() => {
    activeUserIdRef.current = userId;
  }, [userId]);

  const storageKeys = useMemo(() => userId ? {
    cart: getUserStorageKey('cart_items', userId),
    addresses: getUserStorageKey('addresses', userId),
    orders: getUserStorageKey('orders', userId),
  } : null, [userId]);

  const fetchOrdersForUser = useCallback(async (uid: string): Promise<Order[]> => {
    if (!isSupabaseConfigured()) return [];

    const { data, error } = await supabase
      .from('orders')
      .select(ORDER_SELECT)
      .eq('user_id', uid)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []).map(mapServerOrder);
  }, []);

  const refreshOrders = useCallback(async (): Promise<Order[]> => {
    const uid = userId;
    if (!uid || !isSupabaseConfigured()) {
      if (!uid && activeUserIdRef.current === null) setOrders([]);
      return [];
    }

    try {
      const serverOrders = await fetchOrdersForUser(uid);
      if (activeUserIdRef.current === uid) setOrders(serverOrders);
      return serverOrders;
    } catch (error) {
      Logger.warn('Failed to reconcile server orders; retaining cached orders', error);
      return [];
    }
  }, [fetchOrdersForUser, userId]);

  // Hydrate only the active account's namespace. The previous global keys made
  // account B inherit account A's cart, addresses, and order cache on a shared
  // device. Anonymous state is memory-only and is never written to storage.
  useEffect(() => {
    let cancelled = false;
    const uid = userId;
    setHydratedUserId(null);
    setItems([]);
    setAddresses([]);
    setOrders([]);
    setAppliedCoupon(null);

    if (!uid || !storageKeys) {
      setHydratedUserId(null);
      return () => { cancelled = true; };
    }

    (async () => {
      try {
        const [savedItems, savedAddresses, savedOrders] = await Promise.all([
          AsyncStorage.getItem(storageKeys.cart),
          AsyncStorage.getItem(storageKeys.addresses),
          AsyncStorage.getItem(storageKeys.orders),
        ]);
        if (cancelled || activeUserIdRef.current !== uid) return;

        setItems(parseArray<CartItem>(savedItems));
        setAddresses(parseArray<Address>(savedAddresses));
        setOrders(parseArray<Order>(savedOrders));
        setHydratedUserId(uid);

        // A successful server read replaces the cache; a failed read leaves the
        // cached list visible but never makes it the source of truth.
        await refreshOrders();
      } catch (error) {
        if (!cancelled) {
          Logger.error('Error loading account-scoped cart data:', error);
          setHydratedUserId(uid);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [refreshOrders, storageKeys, userId]);

  usePersist(storageKeys?.cart ?? 'cart_items', items, 500, {
    enabled: !!storageKeys && hydratedUserId === userId,
  });
  usePersist(storageKeys?.addresses ?? 'addresses', addresses, 500, {
    enabled: !!storageKeys && hydratedUserId === userId,
  });
  usePersist(storageKeys?.orders ?? 'orders', orders, 500, {
    enabled: !!storageKeys && hydratedUserId === userId,
  });

  const totalItems = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items]);
  const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.price * item.quantity, 0), [items]);
  const deliveryCharges = useMemo(
    () => subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_CHARGES,
    [subtotal],
  );
  const discount = useMemo(() => {
    if (!appliedCoupon) return 0;
    const coupon = COUPONS[appliedCoupon];
    if (!coupon) return 0;
    const raw = coupon.type === 'flat'
      ? coupon.discount
      : Math.round(subtotal * coupon.discount / 100);
    return Math.min(raw, subtotal);
  }, [appliedCoupon, subtotal]);
  const total = useMemo(
    () => Math.max(0, subtotal - discount + deliveryCharges),
    [subtotal, discount, deliveryCharges],
  );

  const addItem = (item: Omit<CartItem, 'quantity'>) => {
    setItems(prev => {
      const existingIndex = prev.findIndex(current => current.id === item.id);
      if (existingIndex >= 0) {
        return prev.map((current, index) => index === existingIndex
          ? { ...current, quantity: Math.min(current.quantity + 1, MAX_ITEM_QUANTITY) }
          : current);
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeItem = (id: string) => setItems(prev => prev.filter(item => item.id !== id));

  const updateQuantity = (id: string, quantity: number) => {
    const validQuantity = Math.max(0, Math.min(Math.floor(quantity), MAX_ITEM_QUANTITY));
    if (validQuantity <= 0) {
      removeItem(id);
      return;
    }
    setItems(prev => prev.map(item => item.id === id ? { ...item, quantity: validQuantity } : item));
  };

  const clearCart = () => {
    setItems([]);
    setAppliedCoupon(null);
  };

  const addAddress = (address: Omit<Address, 'id'>): Address => {
    const newAddress: Address = {
      ...address,
      id: generateUUID(),
      isDefault: address.isDefault || addresses.length === 0,
    };
    setAddresses(prev => [
      ...prev.map(existing => newAddress.isDefault ? { ...existing, isDefault: false } : existing),
      newAddress,
    ]);
    return newAddress;
  };

  const updateAddress = (id: string, updates: Partial<Address>) => {
    setAddresses(prev => prev.map(address => {
      if (address.id === id) return { ...address, ...updates };
      return updates.isDefault ? { ...address, isDefault: false } : address;
    }));
  };

  const deleteAddress = (id: string) => {
    setAddresses(prev => {
      const deleted = prev.find(address => address.id === id);
      const remaining = prev.filter(address => address.id !== id);
      const first = remaining[0];
      if (deleted?.isDefault && first) {
        // When the default address is removed and others remain, the new default
        // is the first survivor. `remaining[0]` is Address | undefined under
        // noUncheckedIndexedAccess, so we hoist it into a narrowed local.
        remaining[0] = { ...first, isDefault: true };
      }
      return remaining;
    });
  };

  const setDefaultAddress = (id: string) => {
    setAddresses(prev => prev.map(address => ({ ...address, isDefault: address.id === id })));
  };

  const getDefaultAddress = () => addresses.find(address => address.isDefault) || addresses[0];

  const applyCoupon = (code: string): boolean => {
    const normalized = code.toUpperCase().trim();
    if (!COUPONS[normalized]) return false;
    setAppliedCoupon(normalized);
    return true;
  };

  const removeCoupon = () => setAppliedCoupon(null);

  const placeOrder = async (addressId: string, paymentMethod: 'cod' | 'online'): Promise<Order> => {
    if (orderInFlightRef.current) throw new Error('An order is already being processed');
    if (!userId) throw new Error('Please login to place an order');
    if (!isSupabaseConfigured()) throw new Error('Order service unavailable');
    if (items.length === 0) throw new Error('Cannot place an order with an empty cart');

    const address = addresses.find(candidate => candidate.id === addressId);
    if (!address) throw new Error('Address not found');

    orderInFlightRef.current = true;
    const checkoutStartedAt = Date.now();
    const cartItems = items.map(item => ({ ...item }));
    const cartTotal = total;
    const cartSubtotal = subtotal;
    const cartDiscount = discount;
    const cartDelivery = deliveryCharges;
    const cartTotalItems = totalItems;

    try {
      if (paymentMethod === 'online') {
        const result = await openCheckout('razorpay', {
          amount: Math.round(cartTotal * 100),
          currency: 'INR',
          description: `Order for ${cartTotalItems} items`,
          type: 'product_order',
          notes: {
            type: 'product_order',
            address_id: addressId,
            item_count: cartTotalItems.toString(),
          },
          metadata: {
            type: 'product_order',
            items: cartItems.map(item => ({ id: item.id, quantity: item.quantity })),
            address,
            coupon: appliedCoupon,
            subtotal: cartSubtotal,
            discount: cartDiscount,
            deliveryCharges: cartDelivery,
          },
        });

        if (!result.success) throw new Error(result.error || 'Payment failed');

        // The server creates the order during payment fulfillment. Re-read it
        // by the server-returned record id, with a short retry for webhook/DB
        // propagation, and never create a client-authoritative paid row.
        for (let attempt = 0; attempt < 4; attempt += 1) {
          const serverOrders = await fetchOrdersForUser(userId);
          const serverOrder = serverOrders.find(candidate =>
            result.serverOrderId ? candidate.id === result.serverOrderId : (
              candidate.paymentMethod === 'online'
              && Math.abs(candidate.total - cartTotal) < 0.01
              && new Date(candidate.createdAt).getTime() >= checkoutStartedAt - 30_000
            )
          );
          if (serverOrder) {
            setOrders(serverOrders);
            clearCart();
            return serverOrder;
          }
          if (attempt < 3) await new Promise(resolve => setTimeout(resolve, 250 * (attempt + 1)));
        }

        throw new Error('Payment verified, but the order is still being finalized. Please check My Orders shortly.');
      }

      const orderId = generateUUID();
      const { data, error } = await supabase
        .from('orders')
        .insert({
          id: orderId,
          user_id: userId,
          items: cartItems,
          subtotal: cartSubtotal,
          discount: cartDiscount,
          shipping: cartDelivery,
          total: cartTotal,
          status: 'pending',
          shipping_address: address,
          payment_method: 'cod',
          payment_status: 'pending',
          estimated_delivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .select(ORDER_SELECT)
        .single();

      if (error || !data) throw new Error(error?.message || 'Failed to record order');
      const serverOrder = mapServerOrder(data);
      setOrders(prev => [serverOrder, ...prev.filter(order => order.id !== serverOrder.id)]);
      clearCart();
      return serverOrder;
    } finally {
      orderInFlightRef.current = false;
    }
  };

  const cancelOrder = async (orderId: string): Promise<void> => {
    if (!userId) throw new Error('Please login to cancel an order');
    if (!isSupabaseConfigured()) throw new Error('Order service unavailable');

    const { data, error } = await supabase.rpc('cancel_order', { p_order_id: orderId });
    if (!error) {
      const result = Array.isArray(data) ? data[0] : data;
      if (!result?.success) throw new Error(result?.message || 'Order cannot be cancelled');
    } else if ((error as { code?: string }).code === 'PGRST202') {
      // Compatibility path for databases before migration 040. The RLS
      // policy only permits pending, unpaid rows, so this cannot cancel paid
      // orders even if a client is modified.
      const { error: fallbackError } = await supabase
        .from('orders')
        .update({ status: 'cancelled' })
        .eq('id', orderId)
        .eq('user_id', userId)
        .eq('status', 'pending')
        .eq('payment_status', 'pending');
      if (fallbackError) throw fallbackError;
    } else {
      throw error;
    }

    await refreshOrders();
  };

  return (
    <CartContext.Provider value={{
      items,
      addresses,
      orders,
      totalItems,
      subtotal,
      discount,
      deliveryCharges,
      total,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      addAddress,
      updateAddress,
      deleteAddress,
      setDefaultAddress,
      getDefaultAddress,
      placeOrder,
      cancelOrder,
      refreshOrders,
      applyCoupon,
      appliedCoupon,
      removeCoupon,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) throw new Error('useCart must be used within a CartProvider');
  return context;
}
