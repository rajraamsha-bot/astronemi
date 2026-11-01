/**
 * Supabase Edge Function: Cancel Subscription
 *
 * Server-authoritative subscription cancellation. Called by the client
 * (services/subscription.ts -> cancelSubscription) when a user cancels
 * their active subscription.
 *
 * SECURITY:
 * - The caller MUST be authenticated (JWT in the Authorization header).
 * - The user can only cancel their OWN subscription.
 * - The subscription_tier reset is performed via the service-role-only
 *   `activate_subscription` RPC, which is the server-side source of truth.
 * - The `subscriptions` table row is marked inactive via the service-role
 *   client (bypassing RLS to avoid missing-policy failures).
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

interface CancelRequest {
  subscriptionId: string;
}

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

    const body: CancelRequest = await req.json();
    const subscriptionId = (body.subscriptionId ?? '').toString().slice(0, 64);

    if (!subscriptionId) {
      return new Response(
        JSON.stringify({ success: false, message: 'subscriptionId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Service-role client: bypasses RLS for subscription row update and
    // calls the service-role-only activate_subscription RPC.
    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Mark the subscription row as inactive. Service-role so we don't need
    // a separate authenticated UPDATE policy on the subscriptions table.
    // H-8: only update active subscriptions; reject already-cancelled so we
    // do not silently downgrade a user's other live subscription.
    const { data: subRows, error: subError } = await serviceClient
      .from('subscriptions')
      .update({ is_active: false, cancelled_at: new Date().toISOString() })
      .eq('id', subscriptionId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .select('id');

    if (subError) {
      console.error('cancel-subscription: failed to mark inactive:', subError.message);
      return new Response(
        JSON.stringify({ success: false, message: 'Failed to cancel subscription' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (!subRows || subRows.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: 'No active subscription with that id' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Reset tier to 'free' via the server-authoritative RPC.
    const { data: rpcData, error: rpcError } = await serviceClient.rpc(
      'activate_subscription', {
        p_user_id: user.id,
        p_tier: 'free',
        p_duration_days: 0,
        p_source: 'user_cancel',
        p_payment_id: null,
      }
    );

    if (rpcError) {
      console.error('cancel-subscription: RPC error:', rpcError.message);
      return new Response(
        JSON.stringify({ success: false, message: 'Failed to reset subscription tier' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const success = rpcData?.[0]?.success === true;
    return new Response(
      JSON.stringify({
        success,
        message: success ? 'Subscription cancelled successfully' : 'Failed to cancel subscription',
      }),
      { status: success ? 200 : 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('cancel-subscription error:', error);
    return new Response(
      JSON.stringify({ success: false, message: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
