/**
 * interpret-dream — Supabase Edge Function.
 *
 * Accepts `{ description: string }`, calls OpenAI's Chat Completions API
 * with a strict JSON schema, and returns the parsed interpretation.
 * The client has a local offline fallback if this function is
 * unreachable, so errors here are fine to surface as HTTP 5xx.
 *
 * Required env:
 *   - OPENAI_API_KEY   (secret — set via `supabase secrets set`)
 *   - PRODUCTION_URL   (optional CORS allowlist)
 *   - DREAM_MODEL      (optional, defaults to gpt-4o-mini)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('PRODUCTION_URL') ?? 'https://astronemi.app',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SYSTEM_PROMPT = `You are a thoughtful dream interpreter grounded in Vedic astrology and Jungian symbolism. For each dream you:
- Identify 2-6 concrete symbols and their concise meaning.
- Name the overall emotional mood in one or two words.
- Describe the underlying narrative in plain, warm language (no fatalism, no medical claims).
- Offer practical guidance the dreamer can act on in the next few days.
- Optionally add a gentle cautionary note and a specific opportunity.
Keep the whole response compact. Always respond with valid JSON.`;

// The JSON schema we hand to the model so it returns exactly what the
// client expects. `opportunity` and `warning` are nullable so the model
// can omit them without violating the schema.
const RESPONSE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['symbols', 'mood', 'overallMeaning', 'guidance', 'warning', 'opportunity'],
  properties: {
    symbols: {
      type: 'array',
      minItems: 2,
      maxItems: 6,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['symbol', 'meaning'],
        properties: {
          symbol: { type: 'string', maxLength: 60 },
          meaning: { type: 'string', maxLength: 300 },
        },
      },
    },
    mood: { type: 'string', maxLength: 40 },
    overallMeaning: { type: 'string', maxLength: 900 },
    guidance: { type: 'string', maxLength: 700 },
    warning: { type: ['string', 'null'], maxLength: 400 },
    opportunity: { type: ['string', 'null'], maxLength: 400 },
  },
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  // Authenticate user via Supabase JWT
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return json({ error: 'Authorization header required' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!supabaseUrl || !supabaseKey) {
    return json({ error: 'Database configuration missing' }, 500);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return json({ error: 'Invalid authentication' }, 401);
  }

  // Rate limiting: 10 requests per hour per user.
  // check_rate_limit is service-role-only (migration 025 REVOKEs it from
  // anon/authenticated), so this MUST run on a service-role client — the
  // anon-key call below used to error, and the old code logged the error
  // and continued, silently disabling the cap on paid OpenAI spend.
  // Fail-closed: no working rate limit → no interpretation.
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const adminClient = serviceRoleKey ? createClient(supabaseUrl, serviceRoleKey) : null;
  if (!adminClient) {
    console.error('SUPABASE_SERVICE_ROLE_KEY not configured — cannot enforce rate limit');
    return json({ error: 'Service configuration error' }, 500);
  }
  const { data: rateLimitResult, error: rateLimitError } = await adminClient.rpc('check_rate_limit', {
    p_action: 'interpret_dream',
    p_identifier: user.id,
    p_max_attempts: 10,
    p_window_seconds: 3600,
  });

  if (rateLimitError) {
    console.error('Rate limit check error:', rateLimitError);
    return json({ error: 'Rate limit check failed. Please try again later.' }, 500);
  }
  if (!rateLimitResult || !rateLimitResult.allowed) {
    return json({ error: 'Rate limit exceeded. Please try again later.' }, 429);
  }

  const openaiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openaiKey) {
    return json({ error: 'OPENAI_API_KEY not configured' }, 500);
  }

  let description = '';
  try {
    const body = await req.json();
    description = typeof body?.description === 'string' ? body.description.trim() : '';
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  if (!description) return json({ error: 'description is required' }, 400);
  if (description.length > 4000) return json({ error: 'description too long' }, 400);

  const model = Deno.env.get('DREAM_MODEL') ?? 'gpt-4o-mini';

  try {
    const response = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: 0.6,
        max_tokens: 700,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: description },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'dream_interpretation',
            strict: true,
            schema: RESPONSE_SCHEMA,
          },
        },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('OpenAI error', response.status, text);
      return json({ error: 'Upstream AI call failed' }, 502);
    }

    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content;
    if (typeof content !== 'string') {
      return json({ error: 'Malformed AI response' }, 502);
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      return json({ error: 'AI returned invalid JSON' }, 502);
    }

    return json(parsed, 200);
  } catch (err) {
    console.error('interpret-dream failed', err);
    return json({ error: 'Internal error' }, 500);
  }
});

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
