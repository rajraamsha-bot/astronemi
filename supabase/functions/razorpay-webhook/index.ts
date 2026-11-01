// File: supabase/functions/razorpay-webhook/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { crypto } from 'https://deno.land/std@0.168.0/crypto/mod.ts';

const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!RAZORPAY_KEY_SECRET || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    'razorpay-webhook misconfigured: RAZORPAY_KEY_SECRET, SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must all be set',
  );
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface RazorpayPaymentEntity {
  id: string;
  order_id: string;
  amount: number;
  currency?: string;
  method?: string;
  status?: string;
  error_description?: string;
}

interface RazorpayRefundEntity {
  payment_id: string;
  amount: number;
  status: string;
}

interface RazorpayOrderEntity {
  id: string;
}

interface RazorpaySubscriptionEntity {
  id: string;
}

interface FulfillmentResult {
  success?: boolean;
  error?: string;
  [key: string]: unknown;
}

async function verifySignature(body: string, signature: string, secret: string): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const digest = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
  const expected = Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
  if (signature.length !== expected.length) return false;
  let mismatch = 0;
  for (let index = 0; index < expected.length; index += 1) {
    mismatch |= signature.charCodeAt(index) ^ expected.charCodeAt(index);
  }
  return mismatch === 0;
}

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

serve(async (req: Request) => {
  const start = Date.now();
  let eventType = 'unknown';
  let eventId = 'unknown';

  try {
    if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

    const body = await req.text();
    const signature = req.headers.get('x-razorpay-signature');
    if (!signature) return jsonResponse({ error: 'Missing identity' }, 400);

    if (!await verifySignature(body, signature, RAZORPAY_KEY_SECRET)) {
      console.error('CRITICAL: Razorpay webhook signature verification failed');
      return jsonResponse({ error: 'Forbidden' }, 403);
    }

    const event = JSON.parse(body) as {
      id?: string;
      event?: string;
      payload?: {
        payment?: { entity?: RazorpayPaymentEntity };
        refund?: { entity?: RazorpayRefundEntity };
        order?: { entity?: RazorpayOrderEntity };
        subscription?: { entity?: RazorpaySubscriptionEntity };
      };
    };
    eventId = event.id || '';
    eventType = event.event || 'unknown';
    if (!eventId || !eventType) return jsonResponse({ error: 'Invalid webhook event' }, 400);

    // Insert-first remains the event audit anchor.  A duplicate event is not
    // returned as processed immediately: the same idempotent handler runs
    // again, because the first delivery may still be in flight or may have
    // failed after the insert.  fulfill_payment_v1 serializes payment work.
    const { error: trackError } = await supabase.from('webhook_events').insert({
      razorpay_event_id: eventId,
      event_type: eventType,
      payload: event,
      received_at: new Date().toISOString(),
      processed: false,
    });

    if (trackError) {
      const pgCode = (trackError as { code?: string }).code;
      if (pgCode !== '23505') {
        console.error('DB Error tracking webhook event:', trackError);
        throw trackError;
      }
      console.log(`DUPLICATE DELIVERY: retrying idempotent handler for ${eventId}`);
    }

    switch (eventType) {
      case 'payment.captured': {
        const payment = event.payload?.payment?.entity;
        if (!payment) throw new Error('payment.captured payload is missing');
        await handlePaymentCaptured(payment);
        break;
      }
      case 'payment.failed': {
        const payment = event.payload?.payment?.entity;
        if (!payment) throw new Error('payment.failed payload is missing');
        await handlePaymentFailed(payment);
        break;
      }
      case 'refund.processed':
      case 'refund.created': {
        const refund = event.payload?.refund?.entity;
        if (!refund) throw new Error('refund payload is missing');
        await handleRefundCreated(refund);
        break;
      }
      case 'order.paid': {
        const order = event.payload?.order?.entity;
        if (order) await handleOrderPaid(order);
        break;
      }
      case 'subscription.cancelled': {
        const subscription = event.payload?.subscription?.entity;
        if (!subscription) throw new Error('subscription.cancelled payload is missing');
        await handleSubscriptionCancelled(subscription);
        break;
      }
      default:
        console.warn(`WEBHOOK_EVENT: Unhandled event type: ${eventType}`);
    }

    const { error: markProcessedError } = await supabase
      .from('webhook_events')
      .update({ processed: true, processed_at: new Date().toISOString() })
      .eq('razorpay_event_id', eventId);
    if (markProcessedError) throw markProcessedError;

    console.info(`WEBHOOK_EVENT: SUCCESS ${eventType} (Duration: ${Date.now() - start}ms)`);
    return jsonResponse({ received: true, event: eventId });
  } catch (error) {
    console.error(`WEBHOOK_ERROR: ${eventType} (ID: ${eventId}):`, error);

    // Do not delete the event claim.  A failed row remains visible to support
    // reconciliation and the next Razorpay delivery can safely retry it.  The
    // payment transaction itself is rolled back when fulfill_payment_v1 fails.
    if (eventId) {
      const { error: markFailedError } = await supabase
        .from('webhook_events')
        .update({ processed: false })
        .eq('razorpay_event_id', eventId);
      if (markFailedError) console.error('Failed to retain failed webhook event:', markFailedError);
    }

    return jsonResponse({ error: 'Internal processing error. A report has been filed.' }, 500);
  }
});

async function handlePaymentCaptured(payment: RazorpayPaymentEntity): Promise<void> {
  const { id: razorpayPaymentId, order_id: razorpayOrderId, amount, method, currency } = payment;
  if (!razorpayPaymentId || !razorpayOrderId || !Number.isInteger(amount) || amount <= 0) {
    throw new Error('Invalid captured payment payload');
  }

  const { data: record, error: findError } = await supabase
    .from('payments')
    .select('id, user_id, type, amount, amount_paise, currency, status, razorpay_payment_id')
    .eq('razorpay_order_id', razorpayOrderId)
    .maybeSingle();

  if (findError || !record) {
    throw new Error(`Orphaned payment: ${razorpayOrderId}`);
  }

  // Migration 054: amount_paise is the exact integer minor-unit mirror of
  // `amount`, maintained by a DB trigger in NUMERIC arithmetic. The string
  // split/parseInt dance previously used here broke when the driver
  // serialized the decimal without trailing zeros or with extra scale.
  // The fallback covers rows written before migration 054 was applied.
  const expectedPaise = typeof record.amount_paise === 'number'
    ? record.amount_paise
    : Math.round(Number(record.amount ?? 0) * 100);
  if (amount !== expectedPaise) {
    // SECURITY FIX: Throw error to prevent marking webhook as processed when
    // captured amount doesn't match expected. This triggers retry and manual
    // reconciliation while preventing false success response to Razorpay.
    throw new Error(
      `Captured amount ${amount} paise != expected ${expectedPaise} paise for payment ${record.id}`,
    );
  }
  if (currency && String(record.currency || 'INR').toUpperCase() !== currency.toUpperCase()) {
    throw new Error(`Captured currency mismatch for payment ${record.id}: expected ${record.currency}, got ${currency}`);
  }

  const { data, error } = await supabase.rpc('fulfill_payment_v1', {
    p_payment_id: record.id,
    p_razorpay_payment_id: razorpayPaymentId,
    p_method: mapPaymentMethod(method || 'razorpay'),
    p_amount_received: amount / 100,
    p_currency: currency || record.currency || 'INR',
  });
  if (error) {
    console.error('fulfill_payment_v1 error:', error);
    throw error;
  }

  const result = (Array.isArray(data) ? data[0] : data) as FulfillmentResult | null;
  if (!result?.success) throw new Error(result?.error || 'Payment fulfillment rejected');
}

async function handlePaymentFailed(payment: RazorpayPaymentEntity): Promise<void> {
  const { order_id: razorpayOrderId, error_description: errorDescription } = payment;
  if (!razorpayOrderId) return;

  const { data: record, error } = await supabase
    .from('payments')
    .select('id, metadata, status')
    .eq('razorpay_order_id', razorpayOrderId)
    .neq('status', 'completed')
    .maybeSingle();
  if (error) throw error;
  if (!record) return;

  const { error: updateError } = await supabase
    .from('payments')
    .update({
      status: 'failed',
      metadata: {
        ...((record.metadata as Record<string, unknown>) ?? {}),
        error: errorDescription,
        failed_at: new Date().toISOString(),
      },
    })
    .eq('id', record.id)
    .neq('status', 'completed');
  if (updateError) throw updateError;
}

async function handleRefundCreated(refund: RazorpayRefundEntity): Promise<void> {
  if (refund.status !== 'processed') return;

  const { data: record, error: findError } = await supabase
    .from('payments')
    .select('id')
    .eq('razorpay_payment_id', refund.payment_id)
    .maybeSingle();
  if (findError) throw findError;
  if (!record) return;

  const { data, error } = await supabase.rpc('process_payment_refund', {
    p_payment_id: record.id,
    p_amount: refund.amount / 100,
  });
  if (error) throw error;
  if (data && typeof data === 'object' && 'success' in data && data.success === false) {
    throw new Error(String(data.error || 'Refund rejected'));
  }
}

async function handleOrderPaid(order: RazorpayOrderEntity): Promise<void> {
  console.log(`ORDER_PAID: ${order.id}`);
}

async function handleSubscriptionCancelled(subscription: RazorpaySubscriptionEntity): Promise<void> {
  const { error } = await supabase.rpc('cancel_subscription_secure', {
    p_razorpay_sub_id: subscription.id,
  });
  if (error) throw error;
}

function mapPaymentMethod(method: string): string {
  const map: Record<string, string> = {
    upi: 'upi',
    card: 'card',
    netbanking: 'netbanking',
    wallet: 'wallet',
  };
  return map[method] || 'razorpay';
}
