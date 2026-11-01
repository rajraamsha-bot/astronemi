/**
 * Razorpay Order Creation Edge Function
 * 
 * Creates a Razorpay order securely on the server side
 * Uses RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET from Supabase secrets
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const PRODUCTION_URL = Deno.env.get('PRODUCTION_URL');
const corsHeaders = {
  'Access-Control-Allow-Origin': PRODUCTION_URL || 'https://astronemi.app',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // Validate request method
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? Deno.env.get('EXPO_PUBLIC_SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    if (!supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({ error: 'Database configuration missing' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Per-user server-side rate limit (fail-closed). Order creation fans out
    // to gateway calls and ledger writes; throttle abuse here rather than
    // trusting the client's local limiter.
    {
      const { data: rlRow, error: rlError } = await supabase.rpc('check_rate_limit', {
        p_action: 'razorpay_order',
        p_identifier: user.id,
        p_max_attempts: 10,
        p_window_seconds: 300,
      });
      if (rlError) {
        console.error('Rate limit check failed for razorpay_order:', rlError);
        return new Response(
          JSON.stringify({ error: 'Security service unavailable' }),
          { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const rl = Array.isArray(rlRow) ? rlRow[0] : rlRow;
      if (rl && rl.allowed === false) {
        return new Response(
          JSON.stringify({ error: 'Too many payment attempts. Please try again shortly.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Get request body
    const body = await req.json();
    const { amount: clientAmountMinorUnits, currency = 'INR', description, metadata } = body;
    const type = metadata?.type || 'unknown';
    const planId = normalizePlanId(metadata?.plan_id, metadata?.duration);

    // SECURITY: Allowlist payment types to prevent client-controlled uncapturable payments
    // Only these types have server-priced branches and settlement handlers
    // Digital goods are deliberately excluded: wallet credits, subscription
    // passes, AstroPro passes, courses, gift cards, and paid questions must be
    // bought through Apple IAP / Google Play Billing and fulfilled by
    // verify-iap-purchase. Razorpay remains for physical orders and eligible
    // person-to-person consultations.
    const ALLOWED_PAYMENT_TYPES = ['pooja_booking', 'consultation', 'product_order'];
    if (!ALLOWED_PAYMENT_TYPES.includes(type)) {
      return new Response(
        JSON.stringify({ error: `Invalid payment type: ${type}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // PLAN ENFORCEMENT: the server is the single source of truth for amounts.
    // Plan, pooja, and coupon prices live in the public.pricing table
    // (migration 037), so a price change is a database update — no code deploy
    // and no client<->edge drift.

    let amountRupees = Number(clientAmountMinorUnits) / 100;
    // For product orders: the server-computed breakdown persisted into
    // payments.metadata so verify-payment fulfills from authoritative data.
    let serverFulfillment: Record<string, unknown> | undefined;
    if (type === 'subscription') {
      if (!planId) {
        return new Response(
          JSON.stringify({ error: 'Invalid plan selected' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const { data: planRow, error: planError } = await supabase
        .from('pricing')
        .select('price_rupees')
        .eq('id', planId)
        .eq('kind', 'plan')
        .eq('is_active', true)
        .single();
      if (planError || !planRow) {
        return new Response(
          JSON.stringify({ error: 'Invalid plan selected' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      amountRupees = Number(planRow.price_rupees);
    } else if (type === 'astrologer_subscription') {
      const planSlug = String(metadata?.plan_slug ?? '');
      const billingCycle = String(metadata?.billing_cycle ?? '');
      const astrologerId = String(metadata?.astrologer_id ?? '');
      if (!['pro', 'elite'].includes(planSlug)) {
        return new Response(JSON.stringify({ error: 'Invalid plan' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      if (!['monthly', 'quarterly', 'yearly'].includes(billingCycle)) {
        return new Response(JSON.stringify({ error: 'Invalid billing cycle' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      if (!isUuid(astrologerId)) {
        return new Response(JSON.stringify({ error: 'Invalid astrologer ID' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const { data: priceRow, error: priceError } = await supabase
        .from('astrologer_subscription_pricing')
        .select('amount_inr')
        .eq('plan_slug', planSlug)
        .eq('billing_cycle', billingCycle)
        .eq('is_active', true)
        .single();
      if (priceError || !priceRow) {
        return new Response(JSON.stringify({ error: 'Subscription plan not available' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      amountRupees = Number(priceRow.amount_inr);
    } else if (type === 'question') {
      // SECURITY (C-5): server-priced question tiers from public.question_prices.
      const priceSlug = String(metadata?.price_slug ?? '');
      const { data: qp, error: qpError } = await supabase
        .from('question_prices')
        .select('amount_inr, is_active')
        .eq('slug', priceSlug)
        .single();
      if (qpError || !qp || !qp.is_active) {
        return new Response(JSON.stringify({ error: 'Invalid question tier' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      amountRupees = Number(qp.amount_inr);
    } else if (type === 'pooja_booking') {
      const poojaId = metadata?.pooja_id;
      if (!poojaId) {
        return new Response(
          JSON.stringify({ error: 'Invalid pooja selection' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const { data: poojaRow, error: poojaError } = await supabase
        .from('pricing')
        .select('price_rupees')
        .eq('id', 'pooja_' + String(poojaId))
        .eq('kind', 'pooja')
        .eq('is_active', true)
        .single();
      if (poojaError || !poojaRow) {
        return new Response(
          JSON.stringify({ error: 'Invalid pooja selection' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      amountRupees = Number(poojaRow.price_rupees);
    } else if (type === 'consultation') {
      const astrologerId = metadata?.astrologer_id;
      if (!astrologerId) {
        return new Response(
          JSON.stringify({ error: 'Astrologer ID required for consultation' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: astro, error: astroError } = await supabase
        .from('astrologers')
        .select('price_per_minute')
        .eq('id', astrologerId)
        .single();

      if (astroError || !astro) {
        return new Response(
          JSON.stringify({ error: 'Astrologer not found or rate unconfigured' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Clamp duration — a malicious client could pass a huge value to fabricate
      // an enormous order, which downstream flows might then credit on.
      const rawDuration = Number(metadata?.duration_minutes);
      const duration = Number.isFinite(rawDuration) && rawDuration > 0
        ? Math.min(Math.max(Math.floor(rawDuration), 1), 120)
        : 30;

      // `hourly_rate` does not exist on the astrologers table (no migration
      // defines it) — selecting it failed every consultation order against a
      // migrations-built database. price_per_minute is the only source.
      const pricePerMinute = astro.price_per_minute;
      if (!pricePerMinute || !Number.isFinite(pricePerMinute) || pricePerMinute <= 0) {
        return new Response(
          JSON.stringify({ error: 'Astrologer rate unconfigured' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      amountRupees = pricePerMinute * duration;
    } else if (type === 'product_order') {
      // Server-side catalog pricing. The client's cart total is untrusted —
      // previously this type had no branch at all, so the client-sent amount
      // fell through to the generic sanity check (pay ₹10 for a ₹5,000 cart).
      // Pricing rules mirror contexts/CartContext.ts exactly until they move
      // into a server table: selling price = discount_price ?? price,
      // ₹50 delivery under ₹500, and the coupon list below.
      const rawItems: unknown = Array.isArray(metadata?.items) ? metadata.items : [];
      if (rawItems.length === 0 || rawItems.length > 50) {
        return new Response(
          JSON.stringify({ error: 'Invalid order items' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const items = rawItems as Array<{ id?: unknown; quantity?: unknown }>;
      const ids: string[] = [];
      const quantities = new Map<string, number>();
      for (const item of items) {
        const id = String(item.id ?? '');
        const qty = Math.floor(Number(item.quantity));
        if (!UUID_RE.test(id)) {
          return new Response(
            JSON.stringify({ error: 'Invalid product id' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        if (!Number.isFinite(qty) || qty < 1 || qty > 10) {
          return new Response(
            JSON.stringify({ error: 'Invalid quantity' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        if (!ids.includes(id)) ids.push(id);
        quantities.set(id, (quantities.get(id) ?? 0) + qty);
      }

      const { data: dbProducts, error: productsError } = await supabase
        .from('products')
        .select('id, name, price, discount_price, is_available')
        .in('id', ids);

      if (productsError) {
        console.error('Product lookup failed:', productsError);
        return new Response(
          JSON.stringify({ error: 'Failed to price order' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const byId = new Map((dbProducts ?? []).map((p: { id: string }) => [p.id, p]));
      let subtotal = 0;
      const serverItems: Array<{ id: string; name: string; price: number; quantity: number }> = [];
      for (const id of ids) {
        const product = byId.get(id) as
          | { name: string; price: number; discount_price: number | null; is_available: boolean }
          | undefined;
        if (!product || !product.is_available) {
          return new Response(
            JSON.stringify({ error: 'A product in your cart is unavailable' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const qty = quantities.get(id) ?? 0;
        const unitPrice = product.discount_price ?? product.price;
        subtotal += unitPrice * qty;
        serverItems.push({ id, name: product.name, price: unitPrice, quantity: qty });
      }
      subtotal = Math.round(subtotal * 100) / 100;

      const delivery = subtotal >= 500 ? 0 : 50;

      const couponCode = typeof metadata?.coupon === 'string'
        ? metadata.coupon.toUpperCase().trim()
        : '';
      let coupon: { discount_amount: number; discount_type: 'flat' | 'percent' } | null = null;
      if (couponCode) {
        const { data: couponRow, error: couponError } = await supabase
          .from('pricing')
          .select('discount_amount, discount_type')
          .eq('id', couponCode)
          .eq('kind', 'coupon')
          .eq('is_active', true)
          .single();
        if (couponError || !couponRow) {
          return new Response(
            JSON.stringify({ error: 'Invalid coupon' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        coupon = couponRow as { discount_amount: number; discount_type: 'flat' | 'percent' };
      }
      const rawDiscount = coupon
        ? coupon.discount_type === 'flat'
          ? Number(coupon.discount_amount)
          : Math.round(subtotal * Number(coupon.discount_amount) / 100)
        : 0;
      const discount = Math.min(rawDiscount, subtotal);

      amountRupees = Math.round((subtotal - discount + delivery) * 100) / 100;
      serverFulfillment = {
        server_items: serverItems,
        server_subtotal: subtotal,
        server_discount: discount,
        server_delivery: delivery,
      };
    }

    // Input sanity checks (defense-in-depth on top of the branch validation above)
    if (!Number.isFinite(amountRupees) || amountRupees <= 0 || amountRupees > 1_000_000) {
      return new Response(
        JSON.stringify({ error: 'Invalid amount' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Currency must be explicitly allowlisted — never pass arbitrary client-supplied values.
    const ALLOWED_CURRENCIES = ['INR'];
    if (!ALLOWED_CURRENCIES.includes(String(currency).toUpperCase())) {
      return new Response(
        JSON.stringify({ error: 'Unsupported currency' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Razorpay credentials
    const razorpayKeyId = Deno.env.get('RAZORPAY_KEY_ID');
    const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET');

    if (!razorpayKeyId || !razorpayKeySecret) {
      return new Response(
        JSON.stringify({ error: 'Payment configuration missing' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create order options
    const orderOptions = {
      amount: Math.round(amountRupees * 100),
      currency,
      receipt: `receipt_${crypto.randomUUID()}`,
      notes: {
        user_id: user.id,
        ...metadata,
        ...(planId ? { plan_id: planId } : {}),
      },
    };

    // Call Razorpay API to create order
    const razorpayResponse = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${btoa(`${razorpayKeyId}:${razorpayKeySecret}`)}`,
      },
      body: JSON.stringify(orderOptions),
    });

    const razorpayOrder = await razorpayResponse.json();

    if (!razorpayOrder.id) {
      console.error('Razorpay order creation failed:', razorpayOrder);
      return new Response(
        JSON.stringify({ error: 'Failed to create payment order', details: razorpayOrder }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Store order in Supabase for idempotency and tracking
    const { error: dbError } = await supabase.from('payments').insert({
      user_id: user.id,
      order_id: `order_${user.id.substring(0, 8)}_${Date.now()}`,
      razorpay_order_id: razorpayOrder.id,
      amount: orderOptions.amount / 100,
      currency,
      status: 'pending',
      method: 'razorpay',
      type: type,
      reference_id: metadata?.reference_id,
      metadata: {
        description,
        ...metadata,
        ...(planId ? { plan_id: planId } : {}),
        // Server-authoritative amount actually charged — verify-payment and
        // support reconciliation compare against this, not client claims.
        server_amount_rupees: amountRupees,
        ...serverFulfillment,
      },
    });

    if (dbError) {
      // Fail HARD. Returning the gateway order id after a failed persistence
      // write lets the user pay for a payment row that will never exist —
      // verify-payment 404s and the webhook finds nothing to reconcile
      // (captured money, undeliverable). The client treats this as a failed
      // order attempt and never opens the Razorpay checkout.
      console.error('Failed to store payment order:', dbError);
      return new Response(
        JSON.stringify({ error: 'Failed to record payment order' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Return only the order details needed by client
    return new Response(
      JSON.stringify({
        id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        key_id: razorpayKeyId, // Only expose key_id, never the secret
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function normalizePlanId(planId: unknown, duration: unknown): string | undefined {
  if (typeof planId !== 'string' || !planId) return undefined;
  if (planId.includes('_')) return planId;
  const period = duration === 'yearly' ? 'yearly' : 'monthly';
  return `${planId}_${period}`;
}

function isUuid(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
