/**
 * Supabase Edge Function: Deduct Wallet
 *
 * Server-authoritative wallet debit. Called by the client
 * (services/payment-service.ts -> deductFromWallet) for consultation,
 * subscription-from-wallet, and similar in-app spends.
 *
 * SECURITY:
 * - The caller MUST be authenticated (JWT in the Authorization header).
 * - A user can only ever debit THEIR OWN wallet — the body `userId` is
 *   ignored in favour of the id derived from the verified token.
 * - The actual balance check + decrement happens atomically inside the
 *   `debit_wallet` SQL function (SELECT ... FOR UPDATE), preventing
 *   TOCTOU races.
 *
 * Deploy with: supabase functions deploy deduct-wallet
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const PRODUCTION_URL = Deno.env.get('PRODUCTION_URL');
const corsHeaders = {
  'Access-Control-Allow-Origin': PRODUCTION_URL || 'https://astronemi.app',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DeductRequest {
  amount: number;
  description?: string;
  source?: string;
  referenceId?: string;
  billingMinute?: number;
}

// Only sources with a server-validated amount AND a fulfillment side effect
// may debit here. subscription / product / pooja / gift / system are
// intentionally absent: accepting them would allow a wallet debit with no
// corresponding server-side validation or delivery.
const ALLOWED_SOURCES = new Set([
  'consultation',
  'call',
  'question',
]);

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, message: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Verify the caller's identity from the JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, message: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, message: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: DeductRequest = await req.json();
    let amount = Number(body.amount);
    const source = typeof body.source === 'string' ? body.source : '';
    const description = (body.description ?? 'Wallet payment').toString().slice(0, 255);

    if (!ALLOWED_SOURCES.has(source)) {
      return new Response(
        JSON.stringify({ success: false, message: 'Unsupported wallet source' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return new Response(
        JSON.stringify({ success: false, message: 'Invalid amount' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Service-role client performs the atomic debit. The user id comes from
    // the verified token — never from the request body.
    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Per-user server-side rate limit (fail-closed) via the service-role-only
    // RPC (migration 025). Legit per-minute billing is 1 call/minute; the cap
    // leaves headroom for retries and concurrent sessions while stopping
    // hammering/replay probing.
    {
      const { data: rlRow, error: rlError } = await serviceClient.rpc('check_rate_limit', {
        p_action: 'wallet_debit',
        p_identifier: user.id,
        p_max_attempts: 20,
        p_window_seconds: 60,
      });
      if (rlError) {
        console.error('Rate limit check failed for wallet_debit:', rlError);
        return new Response(
          JSON.stringify({ success: false, message: 'Payment failed. Please try again.' }),
          { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const rl = Array.isArray(rlRow) ? rlRow[0] : rlRow;
      if (rl && rl.allowed === false) {
        return new Response(
          JSON.stringify({ success: false, message: 'Too many payment attempts. Please try again shortly.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // PER-SOURCE AMOUNT VALIDATION
    // Consultation/call billing is a client-driven meter (the app invokes
    // this once per minute), so the client fully controlled the amount — a
    // doctored build could pay ₹0.01/minute or skip billing entirely.
    // The authoritative rate is the price snapshot stored on the
    // consultation row at booking time (secure_create_consultation).
    if (source === 'consultation' || source === 'call') {
      const referenceId = String(body.referenceId ?? '');
      const billingMinute = Number(body.billingMinute);
      const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!UUID_RE.test(referenceId)) {
        return new Response(
          JSON.stringify({ success: false, message: 'Invalid consultation reference' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (!Number.isInteger(billingMinute) || billingMinute < 1) {
        return new Response(
          JSON.stringify({ success: false, message: 'Invalid billing minute' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // The RPC derives the consultation's stored rate, authenticates the
      // payer, checks that the minute is due, and uses (consultation_id,
      // billing_minute) as the idempotency key. The client amount is retained
      // only for request-shape compatibility and is never trusted for money.
      const { data, error } = await authClient.rpc('debit_consultation_minute', {
        p_consultation_id: referenceId,
        p_billing_minute: billingMinute,
        p_source: source,
      });
      if (error) {
        console.error('debit_consultation_minute RPC error:', error.message);
        return new Response(
          JSON.stringify({ success: false, message: 'Payment failed. Please try again.' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const row = Array.isArray(data) ? data[0] : data;
      const success = row?.success === true;
      return new Response(
        JSON.stringify({
          success,
          message: row?.message ?? (success ? 'Payment successful' : 'Payment failed'),
          newBalance: row?.new_balance ?? null,
          alreadyProcessed: row?.already_processed === true,
        }),
        {
          status: success ? 200 : 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } else if (source === 'question') {
      // SECURITY (C-5): server-priced question tiers from public.question_prices.
      const priceSlug = String(body.referenceId ?? '').toLowerCase();
      if (!/^[a-z0-9_-]{1,64}$/.test(priceSlug)) {
        return new Response(
          JSON.stringify({ success: false, message: 'Invalid question tier' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const { data: qp, error: qpError } = await serviceClient
        .from('question_prices')
        .select('amount_inr, is_active')
        .eq('slug', priceSlug)
        .single();
      if (qpError || !qp || !qp.is_active) {
        return new Response(
          JSON.stringify({ success: false, message: 'Question tier not available' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const serverPrice = Number(qp.amount_inr);
      if (Math.abs(amount - serverPrice) > 0.001) {
        return new Response(
          JSON.stringify({ success: false, message: 'Amount does not match server price' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      amount = serverPrice;
    }

    const { data, error } = await serviceClient.rpc('debit_wallet', {
      p_user_id: user.id,
      p_amount: amount,
      p_source: source,
      p_description: description,
      p_reference_id: body.referenceId ?? null,
    });

    if (error) {
      console.error('debit_wallet RPC error:', error.message);
      return new Response(
        JSON.stringify({ success: false, message: 'Payment failed. Please try again.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // debit_wallet RETURNS TABLE(success, message, new_balance) -> array of one row
    const row = Array.isArray(data) ? data[0] : data;
    const success = row?.success === true;

    return new Response(
      JSON.stringify({
        success,
        message: row?.message ?? (success ? 'Payment successful' : 'Payment failed'),
        newBalance: row?.new_balance ?? null,
      }),
      {
        status: success ? 200 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('deduct-wallet error:', error);
    return new Response(
      JSON.stringify({ success: false, message: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
