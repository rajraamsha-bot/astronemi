import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

// Firebase Cloud Messaging v1 API (legacy FCM API deprecated June 2024)
const FCM_V1_URL = 'https://fcm.googleapis.com/v1/projects/{project_id}/messages:send';

const PRODUCTION_URL = Deno.env.get('PRODUCTION_URL');
const corsHeaders = {
  'Access-Control-Allow-Origin': PRODUCTION_URL || 'https://astronemi.app',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Sign identifiers the CLIENT reads: services/api.ts queries
// .eq('sign', sign.toLowerCase()) with the western zodiac ids from
// mocks/horoscopes zodiacSigns ('aries'...'pisces'). The previous version
// wrote Vedic rashi names ('Mesha'...) — no client query could ever match,
// so users always fell back to mock content. Content generation still uses
// the Vedic sidereal transits above; only the identifier vocabulary changes.
const WESTERN_SIGNS = [
  'aries', 'taurus', 'gemini', 'cancer',
  'leo', 'virgo', 'libra', 'scorpio',
  'sagittarius', 'capricorn', 'aquarius', 'pisces',
];

const DAY_COLORS = ['Orange', 'White', 'Red', 'Green', 'Yellow', 'Pink', 'Black'];

// Simple stable string hash (FNV-1a, 32-bit) for pseudo-deterministic values.
function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // Force unsigned 32-bit
  return h >>> 0;
}

// Lahiri ayanamsa approximation for 2024-2026
function getAyanamsa(jd: number): number {
  const T = (jd - 2451545.0) / 36525.0;
  const precessionArcsec = 5038.47875 * T - 1.07259 * T * T - 0.001147 * T * T * T;
  return precessionArcsec / 3600.0 + 23.8534;
}

function normalizeAngle(deg: number): number {
  let angle = deg % 360;
  if (angle < 0) angle += 360;
  return angle;
}

// Simplified Meeus formula for mean planetary positions
function getMeanLongitude(jd: number, meanLon0: number, dailyMotion: number): number {
  return normalizeAngle(meanLon0 + dailyMotion * (jd - 2451545.0));
}

// Calculate sidereal positions for all planets (simplified for Edge Function)
function calculateTransits(jd: number) {
  const ayanamsa = getAyanamsa(jd);

  const tropical = {
    sun: getMeanLongitude(jd, 280.46646, 0.98564736),
    moon: getMeanLongitude(jd, 218.3164, 13.17639648),
    mars: getMeanLongitude(jd, 355.433, 0.5240327),
    mercury: getMeanLongitude(jd, 252.251, 4.0923388),
    jupiter: getMeanLongitude(jd, 34.351, 0.0830912),
    venus: getMeanLongitude(jd, 181.979, 1.6021302),
    saturn: getMeanLongitude(jd, 50.077, 0.0334442),
  };

  return {
    sun: normalizeAngle(tropical.sun - ayanamsa),
    moon: normalizeAngle(tropical.moon - ayanamsa),
    mars: normalizeAngle(tropical.mars - ayanamsa),
    mercury: normalizeAngle(tropical.mercury - ayanamsa),
    jupiter: normalizeAngle(tropical.jupiter - ayanamsa),
    venus: normalizeAngle(tropical.venus - ayanamsa),
    saturn: normalizeAngle(tropical.saturn - ayanamsa),
  };
}

function getSign(longitude: number): number {
  return Math.floor(longitude / 30) % 12;
}

function getHouse(planetSign: number, ascendantSign: number): number {
  return ((planetSign - ascendantSign + 12) % 12) + 1;
}

// Generate prediction based on transit rules
function generatePrediction(signIndex: number, transits: ReturnType<typeof calculateTransits>): {
  overview: string;
  career: string;
  love: string;
  health: string;
  finance: string;
  focusArea: string;
  intensity: string;
} {
  const houses = {
    sun: getHouse(getSign(transits.sun), signIndex),
    moon: getHouse(getSign(transits.moon), signIndex),
    mars: getHouse(getSign(transits.mars), signIndex),
    mercury: getHouse(getSign(transits.mercury), signIndex),
    jupiter: getHouse(getSign(transits.jupiter), signIndex),
    venus: getHouse(getSign(transits.venus), signIndex),
    saturn: getHouse(getSign(transits.saturn), signIndex),
  };

  // Rule-based predictions
  const rules: Array<{ category: string; text: string; intensity: number }> = [];

  if (houses.jupiter === 1) rules.push({ category: 'overview', text: 'Optimism and wisdom guide your decisions. A fortunate day.', intensity: 3 });
  if (houses.jupiter === 2) rules.push({ category: 'finance', text: 'Financial growth opportunities appear. Wise investments favored.', intensity: 3 });
  if (houses.jupiter === 10) rules.push({ category: 'career', text: 'Professional expansion and recognition. Career growth indicated.', intensity: 3 });

  if (houses.saturn === 10) rules.push({ category: 'career', text: 'Career demands persistence. Do not cut corners.', intensity: 2 });
  if (houses.saturn === 12) rules.push({ category: 'finance', text: 'Expenses may be higher. Budget carefully.', intensity: 2 });

  if (houses.mars === 1) rules.push({ category: 'overview', text: 'High energy and drive. Channel it constructively.', intensity: 3 });
  if (houses.mars === 10) rules.push({ category: 'career', text: 'Ambition drives career actions. Take bold steps at work.', intensity: 3 });

  if (houses.venus === 5) rules.push({ category: 'love', text: 'Romance and creative expression flourish.', intensity: 3 });
  if (houses.venus === 7) rules.push({ category: 'love', text: 'Harmony in partnerships. Excellent day for marriage matters.', intensity: 3 });

  if (houses.mercury === 10) rules.push({ category: 'career', text: 'Strategic thinking benefits career. Present ideas confidently.', intensity: 2 });
  if (houses.mercury === 2) rules.push({ category: 'finance', text: 'Financial discussions and planning yield insights.', intensity: 2 });

  if (houses.moon === 7) rules.push({ category: 'love', text: 'Emotional connections with partners deepen.', intensity: 2 });
  if (houses.moon === 4) rules.push({ category: 'love', text: 'Domestic harmony brings peace of mind.', intensity: 1 });

  if (houses.mars === 6) rules.push({ category: 'health', text: 'Energy directed towards overcoming obstacles. Good for health regimens.', intensity: 2 });
  if (houses.saturn === 6) rules.push({ category: 'health', text: 'Health requires discipline. Stick to routines.', intensity: 2 });

  // Categorize
  const byCat: Record<string, Array<{ text: string; intensity: number }>> = { overview: [], career: [], love: [], health: [], finance: [] };
  for (const r of rules) {
    if (!byCat[r.category]) byCat[r.category] = [];
    byCat[r.category].push({ text: r.text, intensity: r.intensity });
  }

  function pick(category: string, fallback: string): string {
    const items = byCat[category] ?? [];
    if (items.length === 0) return fallback;
    items.sort((a, b) => b.intensity - a.intensity);
    return items[0].text;
  }

  const catScores = {
    career: byCat.career.reduce((s, r) => s + r.intensity, 0),
    love: byCat.love.reduce((s, r) => s + r.intensity, 0),
    health: byCat.health.reduce((s, r) => s + r.intensity, 0),
    finance: byCat.finance.reduce((s, r) => s + r.intensity, 0),
  };

  const focusArea = Object.entries(catScores).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'career';
  const totalIntensity = rules.reduce((s, r) => s + r.intensity, 0);
  const intensity = totalIntensity >= 8 ? 'high' : totalIntensity >= 4 ? 'moderate' : 'low';

  return {
    overview: pick('overview', 'A balanced day ahead. Focus on steady progress.'),
    career: pick('career', 'Maintain your current pace at work. Patience brings results.'),
    love: pick('love', 'Stability in relationships. Small gestures strengthen bonds.'),
    health: pick('health', 'Moderate energy levels. Regular routines serve you well.'),
    finance: pick('finance', 'Conservative approach to money is advised today.'),
    focusArea,
    intensity,
  };
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Security check: Only allow requests signed with service_role key
  const authHeader = req.headers.get('Authorization');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!authHeader || !serviceRoleKey || authHeader !== `Bearer ${serviceRoleKey}`) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const FCM_SERVICE_ACCOUNT_JSON = Deno.env.get('FCM_SERVICE_ACCOUNT_JSON');
    const FIREBASE_PROJECT_ID = Deno.env.get('FIREBASE_PROJECT_ID');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({ error: 'Missing environment variables' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const today = new Date();
    // Bucket the day in IST (UTC+5:30) — the market is India; a UTC bucket
    // published a new "day" at 05:30 IST, splitting the local morning.
    const istDate = new Date(today.getTime() + 5.5 * 3600 * 1000);
    const dateStr = istDate.toISOString().split('T')[0];

    // Idempotency: Check if horoscopes have already been generated for today
    const { data: existingHoroscopes, error: checkError } = await supabase
      .from('horoscopes')
      .select('date')
      .eq('date', dateStr)
      .limit(1);

    if (checkError) {
      console.error('Error checking existing horoscopes:', checkError);
    }

    if (existingHoroscopes && existingHoroscopes.length > 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Horoscopes already generated for today. Skipping.',
          date: dateStr,
          skipped: true,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const jd = 2451545.0 + (today.getTime() / 86400000 - 10957.5);

    // Calculate transits once
    const transits = calculateTransits(jd);

    // Generate and store horoscopes for all 12 signs
    const generatedHoroscopes = [];
    for (let signIndex = 0; signIndex < 12; signIndex++) {
      const prediction = generatePrediction(signIndex, transits);
      const signName = WESTERN_SIGNS[signIndex];

      generatedHoroscopes.push({
        sign: signName,
        // The client requires period = 'daily' (api.ts .eq('period', ...));
        // `period` is NOT NULL with no default, so omitting it failed the
        // insert. `sign_index` was also written but no such column exists.
        period: 'daily',
        date: dateStr,
        prediction: prediction.overview,
        career: prediction.career,
        love: prediction.love,
        health: prediction.health,
        finance: prediction.finance,
        focus_area: prediction.focusArea,
        intensity: prediction.intensity,
        lucky_number: (((hashString(dateStr) + signIndex * 7919) % 9 + 9) % 9) + 1,
        lucky_color: DAY_COLORS[today.getDay()],
        transit_data: transits,
      });
    }

    // Upsert into horoscopes table (unique constraint is (sign, period, date))
    const { error: upsertError } = await supabase
      .from('horoscopes')
      .upsert(generatedHoroscopes, { onConflict: 'sign,period,date' });

    if (upsertError) {
      console.error('Failed to store horoscopes:', upsertError);
      return new Response(
        JSON.stringify({ error: 'Failed to store horoscopes', details: upsertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send push notifications. The mobile client registers Expo push tokens
    // (ExponentPushToken[...]) in horoscope_subscriptions; FCM is kept for
    // legacy/raw tokens. Previously the loop only ran when FCM credentials
    // were configured, so Expo-first clients never received server pushes.
    const pushResults = {
      expo: { sent: 0, failed: 0 },
      fcm: { sent: 0, failed: 0 },
    };
    let accessToken: string | null = null;

    // Get OAuth2 access token for FCM v1 API
    if (FCM_SERVICE_ACCOUNT_JSON && FIREBASE_PROJECT_ID) {
      try {
        const serviceAccount = JSON.parse(FCM_SERVICE_ACCOUNT_JSON);
        // Create JWT for Google OAuth2. Header and payload MUST be base64url
        // (standard btoa emits +/= which Google's token endpoint rejects).
        const b64url = (s: string) =>
          btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        const now = Math.floor(Date.now() / 1000);
        const jwtHeader = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
        const jwtPayload = b64url(JSON.stringify({
          iss: serviceAccount.client_email,
          scope: 'https://www.googleapis.com/auth/firebase.messaging',
          aud: 'https://oauth2.googleapis.com/token',
          iat: now,
          exp: now + 3600,
        }));
        const jwtUnsigned = `${jwtHeader}.${jwtPayload}`;
        // Note: In production, sign with RS256 using the private_key
        // For Deno, use the Web Crypto API
        const privateKeyPem = serviceAccount.private_key;
        const pemContents = privateKeyPem
          .replace('-----BEGIN PRIVATE KEY-----', '')
          .replace('-----END PRIVATE KEY-----', '')
          .replace(/\s/g, '');
        const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
        const privateKey = await crypto.subtle.importKey(
          'pkcs8',
          binaryKey,
          { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
          false,
          ['sign']
        );
        const signature = await crypto.subtle.sign(
          'RSASSA-PKCS1-v1_5',
          privateKey,
          new TextEncoder().encode(jwtUnsigned)
        );
        const jwtSig = btoa(String.fromCharCode(...new Uint8Array(signature)))
          .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        const jwt = `${jwtUnsigned}.${jwtSig}`;

        // Exchange JWT for access token
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
        });
        const tokenData = await tokenResponse.json();
        accessToken = tokenData.access_token;
      } catch (authError) {
        console.error('Failed to get FCM access token:', authError);
      }
    }

    interface HoroscopeSubscriptionRow {
      user_id: string;
      zodiac_sign: string;
      push_token: string;
      last_pushed_date: string | null;
    }

    const { data: subscriptionRows, error: subError } = await supabase
      .from('horoscope_subscriptions')
      .select('user_id, zodiac_sign, push_token, last_pushed_date')
      .eq('is_active', true);

    if (subError) {
      console.error('Failed to fetch subscriptions:', subError);
    } else {
      const subscriptions = (subscriptionRows ?? []) as HoroscopeSubscriptionRow[];
      const fcmUrl = FIREBASE_PROJECT_ID
        ? FCM_V1_URL.replace('{project_id}', FIREBASE_PROJECT_ID)
        : null;
      const expoBatch: Array<{
        sub: HoroscopeSubscriptionRow;
        message: Record<string, unknown>;
      }> = [];

      for (const sub of subscriptions) {
        const signIndex = WESTERN_SIGNS.indexOf(String(sub.zodiac_sign).toLowerCase());
        if (signIndex === -1) continue;

        // Migration 055: per-row push watermark. A platform retry of this
        // invocation after a mid-loop timeout previously re-pushed to
        // every subscriber. Skip rows already stamped with today's IST
        // business day.
        if (sub.last_pushed_date === dateStr) continue;

        const horoscope = generatedHoroscopes[signIndex];
        const title = `Good Morning! ${horoscope.sign}`;
        const body = `${horoscope.prediction} Lucky number: ${horoscope.lucky_number}`;

        if (/^(Exponent|Expo)PushToken\[/.test(sub.push_token)) {
          expoBatch.push({
            sub,
            message: {
              to: sub.push_token,
              title,
              body,
              data: { type: 'horoscope', sign: horoscope.sign, date: dateStr },
              sound: 'default',
              priority: 'high',
            },
          });
          continue;
        }

        if (!accessToken || !fcmUrl) continue;

        // FCM v1 API payload format (legacy raw tokens)
        const fcmPayload = {
          message: {
            token: sub.push_token,
            notification: { title, body },
            data: {
              type: 'horoscope',
              sign: horoscope.sign,
              date: dateStr,
            },
          },
        };

        try {
          const response = await fetch(fcmUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify(fcmPayload),
          });

          if (response.ok) {
            pushResults.fcm.sent++;
            // Stamp the watermark only after the provider accepted the
            // message, so a failed send is retried next invocation but a
            // sent one is never duplicated.
            await supabase
              .from('horoscope_subscriptions')
              .update({ last_pushed_date: dateStr })
              .eq('user_id', sub.user_id)
              .eq('zodiac_sign', sub.zodiac_sign);
          } else {
            pushResults.fcm.failed++;
            const errorText = await response.text();
            console.error(`FCM error for ${sub.user_id}:`, errorText);
            // Deactivate invalid tokens (UNREGISTERED or INVALID_ARGUMENT)
            if (response.status === 404 || response.status === 400) {
              await supabase
                .from('horoscope_subscriptions')
                .update({ is_active: false })
                .eq('user_id', sub.user_id)
                .eq('zodiac_sign', sub.zodiac_sign);
            }
          }
        } catch (fcmError) {
          pushResults.fcm.failed++;
          console.error(`FCM exception for ${sub.user_id}:`, fcmError);
        }
      }

      // Expo Push API accepts up to 100 messages per request.
      for (let offset = 0; offset < expoBatch.length; offset += 100) {
        const batch = expoBatch.slice(offset, offset + 100);
        try {
          const response = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'Accept-Encoding': 'gzip, deflate',
            },
            body: JSON.stringify(batch.map((entry) => entry.message)),
          });

          if (!response.ok) {
            pushResults.expo.failed += batch.length;
            console.error('Expo push request failed:', await response.text());
            continue;
          }

          const result = await response.json() as {
            data?: Array<{ status?: string; details?: { error?: string } }>;
          };
          for (let index = 0; index < batch.length; index += 1) {
            const ticket = result.data?.[index];
            const entry = batch[index];
            if (ticket?.status === 'ok') {
              pushResults.expo.sent++;
              await supabase
                .from('horoscope_subscriptions')
                .update({ last_pushed_date: dateStr })
                .eq('user_id', entry.sub.user_id)
                .eq('zodiac_sign', entry.sub.zodiac_sign);
            } else {
              pushResults.expo.failed++;
              console.error(
                `Expo push error for ${entry.sub.user_id}:`,
                ticket?.details?.error ?? 'unknown',
              );
              if (ticket?.details?.error === 'DeviceNotRegistered') {
                await supabase
                  .from('horoscope_subscriptions')
                  .update({ is_active: false })
                  .eq('user_id', entry.sub.user_id)
                  .eq('zodiac_sign', entry.sub.zodiac_sign);
              }
            }
          }
        } catch (expoError) {
          pushResults.expo.failed += batch.length;
          console.error('Expo push exception:', expoError);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        date: dateStr,
        horoscopesGenerated: generatedHoroscopes.length,
        pushResults,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Daily horoscope generation error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
