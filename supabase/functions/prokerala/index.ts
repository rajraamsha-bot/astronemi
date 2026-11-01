/**
 * Prokerala API proxy — Supabase Edge Function.
 *
 * The Prokerala `client_secret` MUST stay server-side. This function is the
 * only place it is ever used. Clients send only the target endpoint + params
 * and their Supabase JWT (for rate-limiting / audit).
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const PRODUCTION_URL = Deno.env.get('PRODUCTION_URL');
const corsHeaders = {
  'Access-Control-Allow-Origin': PRODUCTION_URL || 'https://astronemi.app',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PROKERALA_BASE = 'https://api.prokerala.com/v2/astrology';
const TOKEN_URL = 'https://api.prokerala.com/token';

let cachedToken: string | null = null;
let tokenExpiry = 0;

async function getAccessToken(): Promise<string | null> {
  const clientId = Deno.env.get('PROKERALA_API_KEY');
  const clientSecret = Deno.env.get('PROKERALA_API_SECRET');

  if (!clientId || !clientSecret) {
    console.error('prokerala: PROKERALA_API_KEY / PROKERALA_API_SECRET not configured');
    return null;
  }

  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  try {
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    });

    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!res.ok) {
      console.error('prokerala token error:', res.status, await res.text());
      return null;
    }

    const data = await res.json();
    cachedToken = data.access_token;
    // Subtract 60s so we never use a token within its last minute.
    tokenExpiry = Date.now() + ((data.expires_in ?? 3600) - 60) * 1000;
    return cachedToken;
  } catch (err) {
    console.error('prokerala token fetch failed:', err);
    return null;
  }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // AUTHENTICATION + RATE LIMIT — this endpoint proxies a PAID API using
    // server credentials. It must never answer unauthenticated calls: the
    // previous code computed `callerId` and never checked it, leaving the
    // paid quota open to the whole internet.
    const authHeader = req.headers.get('Authorization') || '';
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    let callerId: string | null = null;
    if (authHeader.startsWith('Bearer ')) {
      const { data } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
      callerId = data.user?.id ?? null;
    }
    if (!callerId) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fail-closed per-caller rate limit (30/hour) via the service-role-only
    // check_rate_limit RPC (migration 025). Returns JSONB {allowed, ...}.
    const { data: rateLimit, error: rateLimitError } = await supabase.rpc(
      'check_rate_limit',
      { p_action: 'prokerala_proxy', p_identifier: callerId, p_max_attempts: 30, p_window_seconds: 3600 }
    );
    const rateLimitOk = !rateLimitError && (rateLimit as { allowed?: boolean } | null)?.allowed === true;
    if (rateLimitError || !rateLimitOk) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
        status: rateLimitError ? 500 : 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { endpoint, params } = (await req.json()) as {
      endpoint?: string;
      params?: Record<string, string>;
    };

    if (!endpoint || typeof endpoint !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing "endpoint"' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Reject unexpected endpoint names to avoid SSRF.
    const allowed = new Set([
      'planet-position', 'kundli', 'navamsa-chart', 'dasha-period',
      'yoga', 'kundli-matching', 'panchang', 'mangal-dosha', 'sade-sati',
    ]);
    if (!allowed.has(endpoint)) {
      return new Response(JSON.stringify({ error: 'Unknown endpoint' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = await getAccessToken();
    if (!token) {
      return new Response(JSON.stringify({ error: 'Prokerala auth failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(`${PROKERALA_BASE}/${endpoint}`);
    Object.entries(params ?? {}).forEach(([k, v]) => url.searchParams.set(k, String(v)));

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`prokerala ${endpoint} error:`, res.status, body.slice(0, 200));
      return new Response(
        JSON.stringify({ error: 'Prokerala upstream error', status: res.status }),
        { status: res.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const json = await res.json();
    return new Response(JSON.stringify(json), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('prokerala proxy error:', error);
    return new Response(JSON.stringify({ error: 'Proxy failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
