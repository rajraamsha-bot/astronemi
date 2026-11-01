import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Package,
  Truck,
  CheckCircle,
  XCircle,
  Clock,
  MapPin,
  CreditCard,
} from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Colors from '@/constants/colors';
import { useCart } from '@/contexts/CartContext';

const statusConfig = {
  pending: { color: '#FF9800', icon: Clock, label: 'Pending' },
  confirmed: { color: '#2196F3', icon: CheckCircle, label: 'Confirmed' },
  shipped: { color: '#9C27B0', icon: Truck, label: 'Shipped' },
  delivered: { color: '#4CAF50', icon: CheckCircle, label: 'Delivered' },
  cancelled: { color: '#F44336', icon: XCircle, label: 'Cancelled' },
};

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { orders, cancelOrder, refreshOrders } = useCart();
  const [cancelling, setCancelling] = useState(false);
  const [loadingOrder, setLoadingOrder] = useState(true);

  useEffect(() => {
    let active = true;
    setLoadingOrder(true);
    refreshOrders().finally(() => {
      if (active) setLoadingOrder(false);
    });
    return () => { active = false; };
  }, [refreshOrders]);

  const order = orders.find(o => o.id === id);

  if (!order && loadingOrder) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.emptyText}>Loading order…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Package size={48} color={Colors.textLight} />
          <Text style={styles.emptyText}>Order not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const config = statusConfig[order.status];
  const StatusIcon = config.icon;
  const canCancel = (order.status === 'pending' || order.status === 'confirmed')
    && order.paymentMethod === 'cod'
    && order.paymentStatus === 'pending';

  const handleCancel = () => {
    Alert.alert(
      'Cancel Order',
      'Are you sure you want to cancel this order?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            setCancelling(true);
            try {
              await cancelOrder(order.id);
            } catch (error) {
              Alert.alert(
                'Unable to cancel order',
                error instanceof Error ? error.message : 'Please try again.'
              );
            } finally {
              setCancelling(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order {order.id}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.statusBanner, { backgroundColor: config.color + '15' }]}>
          <StatusIcon size={28} color={config.color} />
          <View style={{ marginLeft: 12 }}>
            <Text style={[styles.statusLabel, { color: config.color }]}>{config.label}</Text>
            <Text style={styles.statusSub}>
              Placed on {new Date(order.createdAt).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'long', year: 'numeric',
              })}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Items</Text>
          {order.items.map((item, index) => (
            <View key={`${item.id}-${index}`} style={styles.itemRow}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemMeta}>Qty {item.quantity} · ₹{item.price}</Text>
              </View>
              <Text style={styles.itemTotal}>₹{item.price * item.quantity}</Text>
            </View>
          ))}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>₹{order.total}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MapPin size={16} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Delivery Address</Text>
          </View>
          <Text style={styles.addressText}>{order.address.name}</Text>
          <Text style={styles.addressText}>
            {order.address.addressLine1}
            {order.address.addressLine2 ? `, ${order.address.addressLine2}` : ''}
          </Text>
          <Text style={styles.addressText}>
            {order.address.city}, {order.address.state} - {order.address.pincode}
          </Text>
          <Text style={styles.addressText}>{order.address.phone}</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <CreditCard size={16} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Payment</Text>
          </View>
          <Text style={styles.addressText}>
            Method: {order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online'}
          </Text>
          <Text style={styles.addressText}>
            Status: {(order.paymentStatus ?? 'pending').toUpperCase()}
          </Text>
          {order.trackingId && (
            <Text style={styles.addressText}>Tracking: {order.trackingId}</Text>
          )}
          {order.estimatedDelivery && (
            <Text style={styles.addressText}>
              Est. delivery: {new Date(order.estimatedDelivery).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'long',
              })}
            </Text>
          )}
        </View>

        {canCancel && (
          <TouchableOpacity
            style={[styles.cancelButton, cancelling && styles.cancelButtonDisabled]}
            onPress={handleCancel}
            disabled={cancelling}
          >
            <Text style={styles.cancelButtonText}>
              {cancelling ? 'Cancelling…' : 'Cancel Order'}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.white,
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, flex: 1, textAlign: 'center' },
  content: { padding: 16, paddingBottom: 40 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { fontSize: 16, color: Colors.textLight },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  statusLabel: { fontSize: 18, fontWeight: '700' },
  statusSub: { fontSize: 13, color: Colors.textLight, marginTop: 2 },
  section: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.text },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 14, fontWeight: '600', color: Colors.text },
  itemMeta: { fontSize: 12, color: Colors.textLight, marginTop: 2 },
  itemTotal: { fontSize: 14, fontWeight: '700', color: Colors.text },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  totalLabel: { fontSize: 15, fontWeight: '700', color: Colors.text },
  totalValue: { fontSize: 17, fontWeight: '800', color: Colors.primary },
  addressText: { fontSize: 14, color: Colors.text, lineHeight: 20 },
  cancelButton: {
    backgroundColor: Colors.error,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  cancelButtonDisabled: { opacity: 0.6 },
  cancelButtonText: { color: Colors.white, fontSize: 15, fontWeight: '700' },
});
