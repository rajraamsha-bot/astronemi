/*
 * Supabase Edge Function: Verify Payment
 *
 * Verifies the Razorpay signature and gateway state, then delegates every
 * payment type to the same transactional fulfillment RPC used by the webhook.
 * The database payment row is the concurrency boundary; this function never
 * creates orders, consultations, wallet entries, or notifications itself.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { crypto } from 'https://deno.land/std@0.168.0/crypto/mod.ts';

const RAZORPAY_KEY_ID = Deno.env.get('RAZORPAY_KEY_ID');
const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    'verify-payment misconfigured: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must all be set'
  );
}

const PRODUCTION_URL = Deno.env.get('PRODUCTION_URL');
const corsHeaders = {
  'Access-Control-Allow-Origin': PRODUCTION_URL || 'https://astronemi.app',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
};

type PaymentType = 'wallet' | 'subscription' | 'consultation' | 'product_order' | 'pooja_booking';

interface PaymentVerificationRequest {
  razorpay_order_id?: unknown;
  razorpay_payment_id?: unknown;
  razorpay_signature?: unknown;
}

interface GatewayPayment {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  status: string;
}

interface FulfillmentResult {
  success?: boolean;
  error?: string;
  payment_id?: string;
  payment_type?: string;
  fulfillment_status?: string;
  order_id?: string;
  order_record_id?: string;
  consultation_id?: string;
  pooja_booking_id?: string;
  subscription_id?: string;
  already_processed?: boolean;
  [key: string]: unknown;
}

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function verifySignature(orderId: string, paymentId: string, signature: string): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(RAZORPAY_KEY_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const digest = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(`${orderId}|${paymentId}`),
  );
  const expected = Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

  if (expected.length !== signature.length) return false;
  let mismatch = 0;
  for (let index = 0; index < expected.length; index += 1) {
    mismatch |= expected.charCodeAt(index) ^ signature.charCodeAt(index);
  }
  return mismatch === 0;
}

async function fetchCapturedPayment(orderId: string, paymentId: string): Promise<GatewayPayment> {
  const response = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`, {
    headers: {
      Authorization: `Basic ${btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`)}`,
    },
  });
  const gatewayPayment = await response.json() as Partial<GatewayPayment> & { error?: { description?: string } };

  if (!response.ok || !gatewayPayment.id) {
    throw new Error(gatewayPayment.error?.description || 'Unable to read Razorpay payment');
  }
  if (gatewayPayment.id !== paymentId || gatewayPayment.order_id !== orderId) {
    throw new Error('Razorpay payment/order mismatch');
  }
  if (gatewayPayment.status !== 'captured') {
    throw new Error('Razorpay payment is not captured');
  }
  if (!Number.isInteger(gatewayPayment.amount) || !gatewayPayment.currency) {
    throw new Error('Razorpay payment details are incomplete');
  }

  return gatewayPayment as GatewayPayment;
}

/**
 * Read-only evidence for records created by the pre-040 verifier.  It is not a
 * claim and never decides settlement; fulfill_payment_v1 performs the safe
 * recovery under the payment-row lock.  Keeping this observation makes legacy
 * payment reconciliation visible without reintroducing the old race.
 */
async function inspectLegacyFulfillment(
  supabaseClient: ReturnType<typeof createClient>,
  paymentId: string,
  paymentType: string,
  storedMeta: Record<string, unknown>,
): Promise<void> {
  try {
    if (paymentType === 'product_order') {
      await supabaseClient
        .from('orders')
        .select('id')
        .eq('payment_id', paymentId)
        .limit(1);
    }
    if (paymentType === 'consultation' && storedMeta.consultation_id) {
      await supabaseClient
        .from('payments')
        .select('id')
        .neq('id', paymentId)
        .eq('metadata->>consultation_id', String(storedMeta.consultation_id))
        .limit(1);
    }
  } catch (error) {
    // This diagnostic read must never block the authoritative transaction.
    console.warn('Legacy fulfillment inspection failed:', error);
  }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ success: false, error: 'Method not allowed' }, 405);

  try {
    const body = await req.json() as PaymentVerificationRequest;
    const razorpayOrderId = typeof body.razorpay_order_id === 'string' ? body.razorpay_order_id : '';
    const razorpayPaymentId = typeof body.razorpay_payment_id === 'string' ? body.razorpay_payment_id : '';
    const razorpaySignature = typeof body.razorpay_signature === 'string' ? body.razorpay_signature : '';

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return jsonResponse({ success: false, error: 'Payment verification fields are required' }, 400);
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
      return jsonResponse({ success: false, error: 'Authorization header required' }, 401);
    }

    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.slice(7).trim();
    const { data: { user: caller }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !caller) return jsonResponse({ success: false, error: 'Invalid authentication' }, 401);

    // Keep this select authoritative and deliberately ignore client-supplied
    // type, amount, metadata, and user_id values. amount_paise is the exact
    // integer minor-unit mirror of `amount` maintained by the DB trigger
    // from migration 054 — no string/float parsing.
    const { data: dbPayment, error: dbError } = await supabaseClient
      .from('payments')
      .select('id, amount, amount_paise, order_id, user_id, type, status, metadata')
      .eq('razorpay_order_id', razorpayOrderId)
      .maybeSingle();

    if (dbError || !dbPayment) {
      console.error('Payment record not found:', razorpayOrderId, dbError);
      return jsonResponse({ success: false, error: 'Payment record not found' }, 404);
    }

    if (dbPayment.user_id !== caller.id) {
      console.error('Unauthorized payment verification attempt', {
        caller: caller.id,
        owner: dbPayment.user_id,
        order: razorpayOrderId,
      });
      return jsonResponse({ success: false, error: 'Unauthorized: payment does not belong to caller' }, 403);
    }

    if (!await verifySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature)) {
      return jsonResponse({ success: false, error: 'Invalid signature' }, 400);
    }

    const gatewayPayment = await fetchCapturedPayment(razorpayOrderId, razorpayPaymentId);
    
    // Migration 054: amount_paise is maintained by a DB trigger as
    // ROUND(amount * 100) in exact NUMERIC arithmetic — no IEEE-754 or
    // string-parsing precision loss. The fallback covers rows written
    // before migration 054 was applied.
    const expectedPaise = typeof dbPayment.amount_paise === 'number'
      ? dbPayment.amount_paise
      : Math.round(Number(dbPayment.amount ?? 0) * 100);

    if (gatewayPayment.amount !== expectedPaise) {
      return jsonResponse({ success: false, error: 'Payment amount mismatch' }, 400);
    }

    const paymentType = String(dbPayment.type) as PaymentType;
    const storedMeta = (dbPayment.metadata ?? {}) as Record<string, unknown>;
    await inspectLegacyFulfillment(supabaseClient, dbPayment.id, paymentType, storedMeta);

    const { data, error: fulfillmentError } = await supabaseClient.rpc('fulfill_payment_v1', {
      p_payment_id: dbPayment.id,
      p_razorpay_payment_id: razorpayPaymentId,
      p_method: 'razorpay',
      p_amount_received: gatewayPayment.amount / 100,
      p_currency: gatewayPayment.currency,
    });

    if (fulfillmentError) {
      console.error('fulfill_payment_v1 failed:', fulfillmentError);
      return jsonResponse({ success: false, error: 'Payment fulfillment is pending retry' }, 409);
    }

    const result = (Array.isArray(data) ? data[0] : data) as FulfillmentResult | null;
    if (!result?.success) {
      return jsonResponse({ success: false, error: result?.error || 'Payment fulfillment failed' }, 409);
    }

    // Preserve the public client contract while exposing the canonical order
    // record returned by the shared transaction.
    return jsonResponse({
      ...result,
      success: true,
      payment_id: razorpayPaymentId,
      order_record_id: result.order_record_id || result.order_id,
      message: result.already_processed ? 'Payment already processed' : 'Payment verified and fulfilled',
    });
  } catch (error) {
    console.error('Payment verification error:', error);
    return jsonResponse({ success: false, error: 'Payment verification failed' }, 500);
  }
});
