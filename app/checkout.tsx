import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  MapPin,
  Plus,
  CreditCard,
  Wallet,
  Truck,
  Check,
  ChevronRight,
  Shield,
  X,
} from 'lucide-react-native';
import { router } from 'expo-router';
import Colors from '@/constants/colors';
import { useCart, Address } from '@/contexts/CartContext';
import { createButtonA11yProps } from '@/utils/accessibility-helpers';
import ErrorBoundary from '@/components/ErrorBoundary';
import { FeatureErrorBoundary } from '@/components/FeatureErrorBoundary';

export default function CheckoutScreen() {
  const {
    items,
    subtotal,
    discount,
    deliveryCharges,
    total,
    addresses,
    addAddress,
    getDefaultAddress,
    placeOrder,
  } = useCart();

  const [selectedAddress, setSelectedAddress] = useState<Address | undefined>(undefined);
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'online'>('online');
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showAddressSelector, setShowAddressSelector] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isAddressLoaded, setIsAddressLoaded] = useState(false);

  // effect:audited — Initialization: Initialize default address from context after mount
  // This sets up default address once when addresses become available
  useEffect(() => {
    if (!isAddressLoaded && addresses.length > 0) {
      const defaultAddr = getDefaultAddress();
      if (defaultAddr) {
        setSelectedAddress(defaultAddr);
      }
      setIsAddressLoaded(true);
    }
  }, [addresses, getDefaultAddress, isAddressLoaded]);

  // New address form
  const [newAddress, setNewAddress] = useState({
    name: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    pincode: '',
  });

  const handleAddAddress = () => {
    if (!newAddress.name || !newAddress.phone || !newAddress.addressLine1 || 
        !newAddress.city || !newAddress.state || !newAddress.pincode) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    const createdAddress = addAddress({
      ...newAddress,
      isDefault: addresses.length === 0,
    });
    setSelectedAddress(createdAddress);
    setShowAddressModal(false);
    setNewAddress({
      name: '',
      phone: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      pincode: '',
    });
  };

  const handlePlaceOrder = async () => {
    if (loading) return;
    if (!selectedAddress) {
      Alert.alert('Error', 'Please select a delivery address');
      return;
    }

    setLoading(true);
    try {
      const order = await placeOrder(selectedAddress.id, paymentMethod);
      
      Alert.alert(
        'Order Placed!',
        `Your order ${order.id} has been placed successfully.`,
        [
          {
            text: 'View Orders',
            onPress: () => router.push('/orders'),
          },
          {
            text: 'Continue Shopping',
            onPress: () => router.push('/shop'),
          },
        ]
      );
    } catch (err) {
      // Surface the real reason (empty cart, payment failure, missing
      // address) instead of a generic message.
      const message = err instanceof Error && err.message
        ? err.message
        : 'Failed to place order. Please try again.';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <FeatureErrorBoundary featureName="Checkout">
    <ErrorBoundary>
      <View style={styles.container}>
        <SafeAreaView edges={['top']}>
          <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            {...createButtonA11yProps(
            'Go back',
            'Return to previous screen'
          )}
        >
          <ArrowLeft color={Colors.text} size={24} />
        </TouchableOpacity>
          <Text style={styles.headerTitle}>Checkout</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Delivery Address */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Delivery Address</Text>
            <TouchableOpacity 
              onPress={() => setShowAddressModal(true)}
              {...createButtonA11yProps(
                'Add new address',
                'Open form to add a new delivery address'
              )}
            >
              <Plus color={Colors.primary} size={20} />
            </TouchableOpacity>
          </View>

          {selectedAddress ? (
            <TouchableOpacity
              style={styles.addressCard}
              onPress={() => setShowAddressSelector(true)}
              {...createButtonA11yProps(
                `Selected address: ${selectedAddress.name}, ${selectedAddress.addressLine1}, ${selectedAddress.city}`,
                'Double tap to change delivery address'
              )}
            >
              <View style={styles.addressHeader}>
                <MapPin color={Colors.primary} size={20} />
                <Text style={styles.addressName}>{selectedAddress.name}</Text>
                {selectedAddress.isDefault && (
                  <View style={styles.defaultBadge}>
                    <Text style={styles.defaultBadgeText}>Default</Text>
                  </View>
                )}
              </View>
              <Text style={styles.addressText}>
                {selectedAddress.addressLine1}
                {selectedAddress.addressLine2 && `, ${selectedAddress.addressLine2}`}
              </Text>
              <Text style={styles.addressText}>
                {selectedAddress.city}, {selectedAddress.state} - {selectedAddress.pincode}
              </Text>
              <Text style={styles.addressPhone}>Phone: {selectedAddress.phone}</Text>
              <ChevronRight color={Colors.textLight} size={20} style={styles.addressChevron} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.addAddressCard}
              onPress={() => setShowAddressModal(true)}
              {...createButtonA11yProps(
                'Add Delivery Address',
                'Open form to add a new delivery address'
              )}
            >
              <Plus color={Colors.primary} size={24} />
              <Text style={styles.addAddressText}>Add Delivery Address</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Order Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          <View style={styles.orderSummaryCard}>
            {items.map((item) => (
              <View key={item.id} style={styles.orderItem}>
                <Text style={styles.orderItemName} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.orderItemQty}>x{item.quantity}</Text>
                <Text style={styles.orderItemPrice}>
                  Rs.{item.price * item.quantity}
                </Text>
              </View>
            ))}
            <View style={styles.orderDivider} />
            <View style={styles.orderRow}>
              <Text style={styles.orderLabel}>Subtotal</Text>
              <Text style={styles.orderValue}>Rs.{subtotal}</Text>
            </View>
            {discount > 0 && (
              <View style={styles.orderRow}>
                <Text style={[styles.orderLabel, { color: '#4CAF50' }]}>Discount</Text>
                <Text style={[styles.orderValue, { color: '#4CAF50' }]}>-Rs.{discount}</Text>
              </View>
            )}
            <View style={styles.orderRow}>
              <Text style={styles.orderLabel}>Delivery</Text>
              <Text style={[
                styles.orderValue,
                deliveryCharges === 0 && { color: '#4CAF50' }
              ]}>
                {deliveryCharges === 0 ? 'FREE' : `Rs.${deliveryCharges}`}
              </Text>
            </View>
            <View style={styles.orderDivider} />
            <View style={styles.orderRow}>
              <Text style={styles.orderTotalLabel}>Total</Text>
              <Text style={styles.orderTotalValue}>Rs.{total}</Text>
            </View>
          </View>
        </View>

        {/* Payment Method */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          <TouchableOpacity
            style={[
              styles.paymentOption,
              paymentMethod === 'online' && styles.paymentOptionActive,
            ]}
            onPress={() => setPaymentMethod('online')}
            {...createButtonA11yProps(
              `Pay Online, ${paymentMethod === 'online' ? 'selected' : 'not selected'}`,
              'Select credit card, debit card, UPI, or net banking payment'
            )}
          >
            <View style={styles.paymentIconContainer}>
              <CreditCard 
                size={24} 
                color={paymentMethod === 'online' ? Colors.primary : Colors.text} 
              />
            </View>
            <View style={styles.paymentDetails}>
              <Text style={styles.paymentTitle}>Pay Online</Text>
              <Text style={styles.paymentSubtitle}>
                Credit/Debit Card, UPI, Net Banking
              </Text>
            </View>
            <View style={[
              styles.radioButton,
              paymentMethod === 'online' && styles.radioButtonActive,
            ]}>
              {paymentMethod === 'online' && <Check color="#FFF" size={14} />}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.paymentOption,
              paymentMethod === 'cod' && styles.paymentOptionActive,
            ]}
            onPress={() => setPaymentMethod('cod')}
            {...createButtonA11yProps(
              `Cash on Delivery, ${paymentMethod === 'cod' ? 'selected' : 'not selected'}`,
              'Select to pay when you receive the order'
            )}
          >
            <View style={styles.paymentIconContainer}>
              <Wallet 
                size={24} 
                color={paymentMethod === 'cod' ? Colors.primary : Colors.text} 
              />
            </View>
            <View style={styles.paymentDetails}>
              <Text style={styles.paymentTitle}>Cash on Delivery</Text>
              <Text style={styles.paymentSubtitle}>
                Pay when you receive the order
              </Text>
            </View>
            <View style={[
              styles.radioButton,
              paymentMethod === 'cod' && styles.radioButtonActive,
            ]}>
              {paymentMethod === 'cod' && <Check color="#FFF" size={14} />}
            </View>
          </TouchableOpacity>
        </View>

        {/* Trust Badges */}
        <View style={styles.trustSection}>
          <View style={styles.trustItem}>
            <Shield color="#4CAF50" size={20} />
            <Text style={styles.trustText}>100% Secure Payments</Text>
          </View>
          <View style={styles.trustItem}>
            <Truck color="#2196F3" size={20} />
            <Text style={styles.trustText}>Free Delivery Above Rs.500</Text>
          </View>
          <View style={styles.trustItem}>
            <Check color="#FF9800" size={20} />
            <Text style={styles.trustText}>Easy Returns</Text>
          </View>
        </View>
      </ScrollView>

      {/* Place Order Button */}
      <View style={styles.footer}>
        <View style={styles.footerTotal}>
          <Text style={styles.footerTotalLabel}>Total Amount</Text>
          <Text style={styles.footerTotalValue}>Rs.{total}</Text>
        </View>
        <TouchableOpacity
          style={styles.placeOrderButton}
          onPress={handlePlaceOrder}
          disabled={loading}
          {...createButtonA11yProps(
            `Place Order, total Rs.${total}`,
            'Confirm and place your order',
            loading
          )}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Text style={styles.placeOrderText}>Place Order</Text>
              <Check size={20} color="#FFF" />
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Select Address Modal */}
      <Modal
        visible={showAddressSelector}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddressSelector(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Delivery Address</Text>
            <TouchableOpacity
              onPress={() => setShowAddressSelector(false)}
              {...createButtonA11yProps('Close address selector', 'Close delivery address selection')}
            >
              <X size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            {addresses.map(address => (
              <TouchableOpacity
                key={address.id}
                style={[styles.addressCard, selectedAddress?.id === address.id && styles.selectedAddressCard]}
                onPress={() => {
                  setSelectedAddress(address);
                  setShowAddressSelector(false);
                }}
                {...createButtonA11yProps(
                  `Use address: ${address.name}, ${address.addressLine1}, ${address.city}`,
                  'Select this delivery address'
                )}
              >
                <View style={styles.addressHeader}>
                  <MapPin color={Colors.primary} size={20} />
                  <Text style={styles.addressName}>{address.name}</Text>
                  {selectedAddress?.id === address.id && <Check color={Colors.success} size={20} />}
                </View>
                <Text style={styles.addressText}>{address.addressLine1}</Text>
                <Text style={styles.addressText}>
                  {address.city}, {address.state} - {address.pincode}
                </Text>
                <Text style={styles.addressPhone}>Phone: {address.phone}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.addAddressCard}
              onPress={() => {
                setShowAddressSelector(false);
                setShowAddressModal(true);
              }}
              {...createButtonA11yProps('Add a new address', 'Open form to add a new delivery address')}
            >
              <Plus color={Colors.primary} size={24} />
              <Text style={styles.addAddressText}>Add New Address</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Add Address Modal */}
      <Modal
        visible={showAddressModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddressModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add New Address</Text>
            <TouchableOpacity 
              onPress={() => setShowAddressModal(false)}
              {...createButtonA11yProps(
                'Close address form',
                'Close the add address form without saving'
              )}
            >
              <X size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.inputLabel}>Full Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your name"
              placeholderTextColor={Colors.textLight}
              value={newAddress.name}
              onChangeText={(text) => setNewAddress({ ...newAddress, name: text })}
            />

            <Text style={styles.inputLabel}>Phone Number *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter phone number"
              placeholderTextColor={Colors.textLight}
              keyboardType="phone-pad"
              value={newAddress.phone}
              onChangeText={(text) => setNewAddress({ ...newAddress, phone: text })}
            />

            <Text style={styles.inputLabel}>Address Line 1 *</Text>
            <TextInput
              style={styles.input}
              placeholder="House/Flat No., Building Name"
              placeholderTextColor={Colors.textLight}
              value={newAddress.addressLine1}
              onChangeText={(text) => setNewAddress({ ...newAddress, addressLine1: text })}
            />

            <Text style={styles.inputLabel}>Address Line 2</Text>
            <TextInput
              style={styles.input}
              placeholder="Street, Area, Landmark"
              placeholderTextColor={Colors.textLight}
              value={newAddress.addressLine2}
              onChangeText={(text) => setNewAddress({ ...newAddress, addressLine2: text })}
            />

            <View style={styles.rowInputs}>
              <View style={styles.halfInput}>
                <Text style={styles.inputLabel}>City *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="City"
                  placeholderTextColor={Colors.textLight}
                  value={newAddress.city}
                  onChangeText={(text) => setNewAddress({ ...newAddress, city: text })}
                />
              </View>
              <View style={styles.halfInput}>
                <Text style={styles.inputLabel}>State *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="State"
                  placeholderTextColor={Colors.textLight}
                  value={newAddress.state}
                  onChangeText={(text) => setNewAddress({ ...newAddress, state: text })}
                />
              </View>
            </View>

            <Text style={styles.inputLabel}>Pincode *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter pincode"
              placeholderTextColor={Colors.textLight}
              keyboardType="number-pad"
              maxLength={6}
              value={newAddress.pincode}
              onChangeText={(text) => setNewAddress({ ...newAddress, pincode: text })}
            />

            <TouchableOpacity
              style={styles.saveAddressButton}
              onPress={handleAddAddress}
              {...createButtonA11yProps(
                'Save Address',
                'Save the new delivery address'
              )}
            >
              <Text style={styles.saveAddressText}>Save Address</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
    </ErrorBoundary>
    </FeatureErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: Colors.white,
    margin: 16,
    borderRadius: 16,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },
  addressCard: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    position: 'relative',
  },
  selectedAddressCard: {
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  addressName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
  },
  defaultBadge: {
    backgroundColor: Colors.primary + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  defaultBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.primary,
  },
  addressText: {
    fontSize: 14,
    color: Colors.text,
    marginBottom: 4,
  },
  addressPhone: {
    fontSize: 13,
    color: Colors.textLight,
    marginTop: 4,
  },
  addressChevron: {
    position: 'absolute',
    right: 16,
    top: '50%',
  },
  addAddressCard: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    gap: 8,
  },
  addAddressText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  orderSummaryCard: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
  },
  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderItemName: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
  },
  orderItemQty: {
    fontSize: 13,
    color: Colors.textLight,
    marginHorizontal: 12,
  },
  orderItemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  orderDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 12,
  },
  orderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  orderLabel: {
    fontSize: 14,
    color: Colors.text,
  },
  orderValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  orderTotalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  orderTotalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  paymentOptionActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  paymentIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  paymentDetails: {
    flex: 1,
  },
  paymentTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  paymentSubtitle: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 2,
  },
  radioButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  trustSection: {
    backgroundColor: Colors.white,
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    marginBottom: 100,
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  trustText: {
    fontSize: 13,
    color: Colors.text,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerTotal: {},
  footerTotalLabel: {
    fontSize: 12,
    color: Colors.textLight,
  },
  footerTotalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  placeOrderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  placeOrderText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: Colors.text,
    marginBottom: 16,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  saveAddressButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  saveAddressText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
