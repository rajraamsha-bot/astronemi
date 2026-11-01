/**
 * Unit Tests - Cart Context
 * 
 * Tests for CartContext functionality
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { CartProvider, useCart } from '@/contexts/CartContext';
import { CartItem } from '@/contexts/CartContext';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}));

describe('CartContext', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <CartProvider>{children}</CartProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('addItem', () => {
    it('should add a new item to cart', async () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      const newItem: Omit<CartItem, 'quantity'> = {
        id: '1',
        name: 'Test Gemstone',
        price: 500,
        image: 'test.jpg',
        type: 'gemstone',
      };

      act(() => {
        result.current.addItem(newItem);
      });

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].quantity).toBe(1);
    });

    it('should increment quantity for existing item', async () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      const newItem: Omit<CartItem, 'quantity'> = {
        id: '1',
        name: 'Test Gemstone',
        price: 500,
        image: 'test.jpg',
        type: 'gemstone',
      };

      act(() => {
        result.current.addItem(newItem);
        result.current.addItem(newItem);
      });

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].quantity).toBe(2);
    });
  });

  describe('removeItem', () => {
    it('should remove item from cart', async () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      const newItem: Omit<CartItem, 'quantity'> = {
        id: '1',
        name: 'Test Gemstone',
        price: 500,
        image: 'test.jpg',
        type: 'gemstone',
      };

      act(() => {
        result.current.addItem(newItem);
      });

      expect(result.current.items).toHaveLength(1);

      act(() => {
        result.current.removeItem('1');
      });

      expect(result.current.items).toHaveLength(0);
    });
  });

  describe('updateQuantity', () => {
    it('should update item quantity', async () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      const newItem: Omit<CartItem, 'quantity'> = {
        id: '1',
        name: 'Test Gemstone',
        price: 500,
        image: 'test.jpg',
        type: 'gemstone',
      };

      act(() => {
        result.current.addItem(newItem);
      });

      act(() => {
        result.current.updateQuantity('1', 5);
      });

      expect(result.current.items[0].quantity).toBe(5);
    });

    it('should remove item when quantity is set to 0', async () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      const newItem: Omit<CartItem, 'quantity'> = {
        id: '1',
        name: 'Test Gemstone',
        price: 500,
        image: 'test.jpg',
        type: 'gemstone',
      };

      act(() => {
        result.current.addItem(newItem);
      });

      act(() => {
        result.current.updateQuantity('1', 0);
      });

      expect(result.current.items).toHaveLength(0);
    });

    it('should cap quantity at the maximum allowed', async () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      const newItem: Omit<CartItem, 'quantity'> = {
        id: '1',
        name: 'Test Gemstone',
        price: 500,
        image: 'test.jpg',
        type: 'gemstone',
      };

      act(() => {
        result.current.addItem(newItem);
      });

      act(() => {
        result.current.updateQuantity('1', 150);
      });

      // Matches MAX_ITEM_QUANTITY in CartContext.
      expect(result.current.items[0].quantity).toBe(10);
    });

    it('should prevent negative quantities', async () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      const newItem: Omit<CartItem, 'quantity'> = {
        id: '1',
        name: 'Test Gemstone',
        price: 500,
        image: 'test.jpg',
        type: 'gemstone',
      };

      act(() => {
        result.current.addItem(newItem);
      });

      act(() => {
        result.current.updateQuantity('1', -5);
      });

      expect(result.current.items).toHaveLength(0);
    });
  });

  describe('cart calculations', () => {
    it('should calculate subtotal correctly', async () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => {
        result.current.addItem({
          id: '1',
          name: 'Item 1',
          price: 100,
          image: 'test.jpg',
          type: 'gemstone',
        });
        result.current.addItem({
          id: '1',
          name: 'Item 1',
          price: 100,
          image: 'test.jpg',
          type: 'gemstone',
        });
        result.current.addItem({
          id: '2',
          name: 'Item 2',
          price: 200,
          image: 'test.jpg',
          type: 'gemstone',
        });
      });

      expect(result.current.subtotal).toBe(400); // 100*2 + 200*1
    });

    it('should apply free delivery above threshold', async () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => {
        result.current.addItem({
          id: '1',
          name: 'Expensive Item',
          price: 1000,
          image: 'test.jpg',
          type: 'gemstone',
        });
      });

      expect(result.current.deliveryCharges).toBe(0);
    });

    it('should charge delivery below threshold', async () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => {
        result.current.addItem({
          id: '1',
          name: 'Cheap Item',
          price: 100,
          image: 'test.jpg',
          type: 'gemstone',
        });
      });

      expect(result.current.deliveryCharges).toBe(50);
    });
  });

  describe('coupon application', () => {
    it('should apply valid coupon', async () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => {
        result.current.addItem({
          id: '1',
          name: 'Item',
          price: 1000,
          image: 'test.jpg',
          type: 'gemstone',
        });
      });

      let applied;
      act(() => {
        applied = result.current.applyCoupon('ASTRO10');
      });

      expect(result.current.appliedCoupon).toBe('ASTRO10');
      expect(result.current.discount).toBe(100); // 10% of 1000
    });

    it('should reject invalid coupon', async () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      let applied;
      act(() => {
        applied = result.current.applyCoupon('INVALID');
      });

      expect(applied).toBe(false);
      expect(result.current.appliedCoupon).toBeNull();
    });
  });

  describe('addresses', () => {
    it('should add new address', async () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => {
        result.current.addAddress({
          name: 'Test User',
          phone: '9876543210',
          addressLine1: '123 Test St',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400001',
          isDefault: true,
        });
      });

      expect(result.current.addresses).toHaveLength(1);
    });

    it('should get default address', async () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => {
        result.current.addAddress({
          name: 'Test User',
          phone: '9876543210',
          addressLine1: '123 Test St',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400001',
          isDefault: true,
        });
      });

      const defaultAddr = result.current.getDefaultAddress();
      expect(defaultAddr?.name).toBe('Test User');
    });
  });
});
