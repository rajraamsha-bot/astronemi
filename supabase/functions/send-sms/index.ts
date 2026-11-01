/**
 * send-sms — Twilio OTP delivery.
 *
 * STATUS: reserved / manual-trigger only. Interactive OTPs are sent natively
 * by Supabase phone auth (services/auth-service.ts -> signInWithOtp), so no
 * client code calls this function today. It is kept as the operator path for
 * re-sending an OTP through Twilio (invoke with the service-role key) and is
 * the only place Twilio credentials are wired.
 */
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PRODUCTION_URL = Deno.env.get('PRODUCTION_URL');
const corsHeaders = {
  'Access-Control-Allow-Origin': PRODUCTION_URL || 'https://astronemi.app',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SmsPayload {
  phone: string;
  otp: string;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Security check: Only allow requests signed with service_role key
  const authHeader = req.headers.get('Authorization');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!authHeader || !serviceRoleKey || authHeader !== `Bearer ${serviceRoleKey}`) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { phone, otp } = await req.json() as SmsPayload;

    if (!phone || !otp) {
      return new Response(
        JSON.stringify({ error: "Phone number and OTP are required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Rate limiting: Max 5 requests per 5 minutes per phone number
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { data: rateLimitResult, error: rateLimitError } = await supabase.rpc('check_rate_limit', {
      p_action: 'otp_request',
      p_identifier: phone,
      p_max_attempts: 5,
      p_window_seconds: 300,
    });

    // SECURITY FIX: Fail closed if rate limit check fails
    if (rateLimitError) {
      console.error('Rate limit check error:', rateLimitError);
      return new Response(
        JSON.stringify({ error: "Unable to verify rate limit. Please try again." }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (rateLimitResult && !rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please try again in a few minutes." }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
    const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
    const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER');

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
      console.error("Twilio configuration missing. SMS cannot be sent.");
      return new Response(
        JSON.stringify({ success: false, error: "SMS service not configured" }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    const message = `Your AstroNemi verification code is ${otp}. Do not share this with anyone.`;
    
    // Format numeric phone cleanly (assuming E.164 without leading spaces)
    const toPhone = phone.startsWith('+') ? phone : `+91${phone}`;

    const body = new URLSearchParams({
      To: toPhone,
      From: TWILIO_PHONE_NUMBER,
      Body: message,
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)
      },
      body: body.toString(),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Twilio error:', result);
      // Do NOT return the raw Twilio message body to the caller — it can
      // embed the message (which contains the OTP) and internal error detail.
      return new Response(
        JSON.stringify({ error: "SMS delivery failed" }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Audit trail for the operator SMS path (H-9). No OTP or full phone is
    // logged — only the action and a truncated destination.
    await supabase.rpc('log_audit', {
      p_action: 'send_sms',
      p_resource: 'otp',
      p_success: true,
      p_details: { to: toPhone.slice(0, -4) + '****', sid: result.sid },
    }).then(({ error }) => {
      if (error) console.error('Failed to write send_sms audit row:', error.message);
    });

    return new Response(
      JSON.stringify({ success: true, messageId: result.sid }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error("SMS Sending Error:", error);
    return new Response(
      JSON.stringify({ error: "SMS delivery failed" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
