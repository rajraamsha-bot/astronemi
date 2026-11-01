/**
 * Agora Token Generator - Supabase Edge Function
 * 
 * SECURITY: This function MUST be deployed as a Supabase Edge Function.
 * It generates Agora tokens server-side to keep the App Certificate secure.
 * 
 * Setup:
 * 1. Set these secrets in Supabase Dashboard > Edge Functions > Secrets:
 *    - AGORA_APP_ID: Your Agora App ID
 *    - AGORA_APP_CERTIFICATE: Your Agora App Certificate (NEVER expose this!)
 * 
 * 2. Deploy this function:
 *    supabase functions deploy agora-token
 * 
 * 3. Test locally:
 *    supabase functions serve agora-token --env-file supabase/.env.local
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

// Agora Token Builder (using built-in RtcTokenBuilder)
// Note: In production, use the official Agora Dynamic Key library
// https://github.com/AgoraIO/Tools/tree/master/DynamicKey/AgoraDynamicKey

interface TokenRequest {
  channelName: string;
  astrologerId: string; // Required to check price
  uid?: number;
  role?: 'publisher' | 'subscriber';
}



serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': Deno.env.get('PRODUCTION_URL') || 'https://astronemi.app',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    // Verify authentication
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization') ?? '' },
        },
      }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get request body
    const body: TokenRequest = await req.json();
    const { channelName, astrologerId, uid = 0, role = 'publisher' } = body;

    // Validate input
    if (!channelName || !astrologerId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // SECURITY: the client sends channelName = consultationId
    // (app/call/[id].tsx). Previously any authenticated user with one minute
    // of balance could mint publisher tokens for ARBITRARY channel names and
    // inject themselves into other sessions. The query runs through the
    // caller's RLS ("Participants view consultations"), so a row comes back
    // only if the caller is the booking user or the assigned astrologer.
    // H-9: also include astrologer_id so we can derive it server-side rather
    // than trusting the body field for rate lookups.
    const { data: consultation } = await supabaseClient
      .from('consultations')
      .select('id, status, type, astrologer_id, user_id')
      .eq('id', channelName)
      .maybeSingle();

    if (!consultation) {
      return new Response(
        JSON.stringify({ error: 'Consultation not found for this caller' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }
    if (!['pending', 'accepted', 'active', 'in_progress', 'confirmed'].includes(consultation.status)) {
      return new Response(
        JSON.stringify({ error: 'Consultation is not joinable' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // H-9: ignore the body's astrologerId and use the consultation's stored
    // astrologer. A caller who is a participant of one consultation can no
    // longer target any astrologer by passing a foreign id.
    const derivedAstrologerId = consultation.astrologer_id as string | null;
    if (!derivedAstrologerId) {
      return new Response(
        JSON.stringify({ error: 'Consultation has no assigned astrologer' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }
    const effectiveAstrologerId = derivedAstrologerId;
    const payingUserId = consultation.user_id as string | null;
    if (!payingUserId) {
      return new Response(
        JSON.stringify({ error: 'Consultation has no booking user' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // SECURITY: Calculate expireTime based on the booking client's wallet balance
    // (the party who pays for the consultation). Previously checked user.id (caller),
    // which caused astrologers with 0 personal balance to be 403-locked out of calls.
    const { data: userData, error: userError } = await adminClient
      .from('users')
      .select('wallet_balance')
      .eq('id', payingUserId)
      .single();

    const { data: astroData, error: astroError } = await adminClient
      .from('astrologers')
      .select('price_per_minute')
      .eq('id', effectiveAstrologerId)
      .single();

    if (userError || astroError || !userData || !astroData) {
      return new Response(
        JSON.stringify({ error: 'Failed to verify session potential' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // SECURITY: A missing/zero/invalid price_per_minute used to silently default
    // to 20, which let newly-created astrologers run unauthorized sessions (or
    // charged users a fictitious rate). Hard-fail instead.
    const pricePerMin = astroData.price_per_minute;
    if (typeof pricePerMin !== 'number' || !Number.isFinite(pricePerMin) || pricePerMin <= 0) {
      console.error('agora-token: astrologer has invalid price_per_minute', { astrologerId: effectiveAstrologerId, pricePerMin });
      return new Response(
        JSON.stringify({ error: 'Astrologer rate unconfigured' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }
    const balance = userData.wallet_balance || 0;
    
    if (balance < pricePerMin) {
       return new Response(
        JSON.stringify({ error: 'Insufficient balance to start session' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Max session duration in seconds
    // We add a 30s buffer, but expireTime should be strict
    let expireTime = Math.floor((balance / pricePerMin) * 60);
    
    // Safety cap at 1 hour (3600s) even if user has millions
    if (expireTime > 3600) expireTime = 3600; 
    
    if (expireTime < 60) expireTime = 60; // Min 1 min token

    // Server-side per-user rate limit (fail-closed) via the service-role-only
    // RPC (migration 025). Token minting is cheap for us but expensive to
    // abuse; the "in-memory check" described below never existed — this
    // replaces that comment with an actual limiter.
    {
      const { data: rlRow, error: rlError } = await adminClient.rpc('check_rate_limit', {
        p_action: 'agora_token',
        p_identifier: user.id,
        p_max_attempts: 30,
        p_window_seconds: 60,
      });
      if (rlError) {
        console.error('Rate limit check failed for agora_token:', rlError);
        return new Response(
          JSON.stringify({ error: 'Security service unavailable' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
      }
      const rl = Array.isArray(rlRow) ? rlRow[0] : rlRow;
      if (rl && rl.allowed === false) {
        return new Response(
          JSON.stringify({ error: 'Too many session requests. Please retry shortly.' }),
          { status: 429, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // Get Agora credentials from environment
    const appId = Deno.env.get('AGORA_APP_ID');
    const appCertificate = Deno.env.get('AGORA_APP_CERTIFICATE');

    if (!appId || !appCertificate) {
      console.error('Agora credentials not configured');
      return new Response(
        JSON.stringify({ error: 'Service not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Calculate expiration timestamp
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expireTime;

    // Map role
    const agoraRole = role === 'publisher' ? 1 : 2; // RtcRole.PUBLISHER : RtcRole.SUBSCRIBER

    // Generate token
    // NOTE: For production, install and use the agora-access-token package:
    // import { RtcTokenBuilder, RtcRole } from 'https://esm.sh/agora-access-token@2.0.4';
    // const token = RtcTokenBuilder.buildTokenWithUid(
    //   appId, appCertificate, channelName, uid, agoraRole, privilegeExpiredTs
    // );
    
    // Placeholder implementation - replace with actual token generation
    // Real token generation
    // We use esm.sh to import the official Agora token builder
    const { RtcTokenBuilder, RtcRole } = await import('https://esm.sh/agora-access-token@2.0.4');
    
    const token = RtcTokenBuilder.buildTokenWithUid(
      appId,
      appCertificate,
      channelName,
      uid,
      agoraRole === 1 ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER,
      privilegeExpiredTs
    );

    return new Response(
      JSON.stringify({
        token,
        channelName,
        uid,
        expireAt: privilegeExpiredTs * 1000, // Convert to milliseconds for client
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': Deno.env.get('PRODUCTION_URL') || 'https://astronemi.app',
        },
      }
    );
  } catch (error) {
    console.error('Error generating Agora token:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
