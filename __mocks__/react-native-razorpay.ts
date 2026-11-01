/**
 * Mock for react-native-razorpay
 *
 * The real native module requires a paid Razorpay merchant account and
 * a native build. This mock lets unit tests run without those
 * dependencies. The test suite stubs `RazorpayCheckout.open` to return
 * a fake success response.
 */

export interface RazorpayOptions {
  description?: string;
  image?: string;
  currency?: string;
  key: string;
  amount: number;
  name?: string;
  order_id?: string;
  prefill?: { name?: string; email?: string; contact?: string };
  theme?: { color?: string };
  modal?: { ondismiss?: () => void };
}

export interface RazorpaySuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export interface RazorpayError {
  code: number;
  description: string;
  source?: string;
  step?: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}

export interface RazorpayCheckoutType {
  open: (options: RazorpayOptions) => Promise<RazorpaySuccessResponse>;
  on: (event: string, handler: (response: unknown) => void) => void;
}

const RazorpayCheckout: RazorpayCheckoutType = {
  open: (options: RazorpayOptions) => {
    return Promise.resolve({
      razorpay_payment_id: `mock_pay_${Date.now()}`,
      razorpay_order_id: options.order_id ?? `mock_order_${Date.now()}`,
      razorpay_signature: 'mock_signature_for_unit_tests',
    });
  },
  on: () => {
    /* no-op */
  },
};

export default RazorpayCheckout;
