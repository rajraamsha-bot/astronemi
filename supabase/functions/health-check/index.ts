/**
 * Health Check Endpoint
 * 
 * Monitors the health of:
 * - Database connectivity
 * - Auth service
 * - External services (Razorpay, Agora)
 * 
 * Returns HTTP 200 if healthy, 503 if degraded
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  services: {
    database: ServiceStatus;
    auth: ServiceStatus;
    razorpay: ServiceStatus;
    agora: ServiceStatus;
    cron: ServiceStatus & { jobs?: unknown[] };
  };
  metrics: {
    uptime: number;
    responseTime: number;
  };
}

interface ServiceStatus {
  status: 'up' | 'down' | 'degraded';
  latency?: number;
  error?: string;
}

// Track server start time
const startTime = Date.now();

/**
 * Check database connectivity
 */
async function checkDatabase(supabase: SupabaseClient): Promise<ServiceStatus> {
  const start = Date.now();
  try {
    const { error } = await supabase
      .from('users')
      .select('id')
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 is "no rows returned" which is OK for health check
      return {
        status: 'down',
        latency: Date.now() - start,
        // Don't leak raw DB error text on a public endpoint
        error: 'Database check failed',
      };
    }

    return {
      status: 'up',
      latency: Date.now() - start,
    };
  } catch (error) {
    console.error('Health check DB error:', error);
    return {
      status: 'down',
      latency: Date.now() - start,
      error: 'Database check failed',
    };
  }
}

/**
 * Check auth service
 */
async function checkAuth(supabase: SupabaseClient): Promise<ServiceStatus> {
  const start = Date.now();
  try {
    const { error } = await supabase.auth.getSession();

    // Even if no session, auth service is working if no error
    return {
      status: error ? 'degraded' : 'up',
      latency: Date.now() - start,
      error: error?.message,
    };
  } catch (error) {
    console.error('Auth health check error:', error);
    return {
      status: 'down',
      latency: Date.now() - start,
      error: 'Auth check failed',
    };
  }
}

/**
 * Check Razorpay (payment service)
 */
async function checkRazorpay(): Promise<ServiceStatus> {
  // Edge Functions receive server-side secret names; accept both so the check
  // works whether the key id is provisioned as RAZORPAY_KEY_ID (server) or
  // mirrored under its EXPO_PUBLIC_ client name. Previously only the client
  // name was read here, so this service always reported 'degraded'.
  const razorpayKey =
    Deno.env.get('RAZORPAY_KEY_ID') ?? Deno.env.get('EXPO_PUBLIC_RAZORPAY_KEY_ID');
  
  if (!razorpayKey || razorpayKey === 'rzp_test_xxxxx') {
    return {
      status: 'degraded',
      error: 'Razorpay not configured',
    };
  }

  // In production, you might want to make a lightweight API call
  // For now, just check if the key is configured
  return {
    status: 'up',
  };
}

/**
 * Check Agora (video/audio service)
 */
async function checkAgora(): Promise<ServiceStatus> {
  const agoraAppId = Deno.env.get('AGORA_APP_ID') || Deno.env.get('EXPO_PUBLIC_AGORA_APP_ID');
  
  if (!agoraAppId || agoraAppId === 'your-agora-app-id') {
    return {
      status: 'degraded',
      error: 'Agora not configured',
    };
  }

  return {
    status: 'up',
  };
}

/**
 * Check cron schedules and execution via cron_health() RPC (migration 060)
 */
async function checkCron(supabase: SupabaseClient): Promise<ServiceStatus & { jobs?: unknown[] }> {
  const start = Date.now();
  try {
    const { data, error } = await supabase.rpc('cron_health');

    if (error) {
      return {
        status: 'degraded',
        latency: Date.now() - start,
        error: 'cron_health RPC error or extension absent',
      };
    }

    const jobs = Array.isArray(data) ? data : [];
    const inactiveJobs = jobs.filter(
      (j: { active?: boolean; job_name?: string }) =>
        j.active === false && !String(j.job_name || '').includes(':evidence')
    );

    return {
      status: inactiveJobs.length > 0 ? 'degraded' : 'up',
      latency: Date.now() - start,
      error: inactiveJobs.length > 0 ? `${inactiveJobs.length} cron job(s) inactive` : undefined,
      jobs,
    };
  } catch (error) {
    console.error('Cron health check error:', error);
    return {
      status: 'degraded',
      latency: Date.now() - start,
      error: 'Cron health check failed',
    };
  }
}

/**
 * Determine overall health status
 */
function determineOverallStatus(services: HealthStatus['services']): 'healthy' | 'degraded' | 'unhealthy' {
  const statuses = Object.values(services).map(s => s.status);
  
  if (statuses.includes('down')) {
    return 'unhealthy';
  }
  
  if (statuses.includes('degraded')) {
    return 'degraded';
  }
  
  return 'healthy';
}

/**
 * Health check handler
 */
serve(async (req: Request): Promise<Response> => {
  const requestStart = Date.now();

  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': Deno.env.get('PRODUCTION_URL') || 'https://astronemi.app',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  // CORS headers
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': Deno.env.get('PRODUCTION_URL') || 'https://astronemi.app',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
  };

  // Only allow GET requests
  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { headers, status: 405 }
    );
  }

  // Module 7 (H-7): cheap per-IP rate limit on a public, unauthenticated
  // endpoint. The endpoint leaks deployment state (which integrations are
  // configured) and hammers the DB; cap it. Fail open on RPC error: a
  // misfiring limiter must not flip a healthy service to 503 for monitors.
  try {
    const supabaseForLimit = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const forwarded = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const clientIp = String(forwarded).split(',')[0].trim().slice(0, 64);
    const { data: limit, error: limitError } = await supabaseForLimit.rpc('check_rate_limit', {
      p_action: 'health_check',
      p_identifier: `ip:${clientIp}`,
      p_max_attempts: 60,
      p_window_seconds: 60,
    });
    if (!limitError && limit && limit.allowed === false) {
      return new Response(
        JSON.stringify({ error: 'Too many requests' }),
        { headers, status: 429 }
      );
    }
  } catch (limitExc) {
    console.error('Health check rate limit check failed (failing open):', limitExc);
  }

  try {
    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Run all health checks in parallel
    const [database, auth, razorpay, agora, cron] = await Promise.all([
      checkDatabase(supabase),
      checkAuth(supabase),
      checkRazorpay(),
      checkAgora(),
      checkCron(supabase),
    ]);

    const services = { database, auth, razorpay, agora, cron };
    const overallStatus = determineOverallStatus(services);

    const healthStatus: HealthStatus = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: Deno.env.get('APP_VERSION') || '1.0.0',
      services,
      metrics: {
        uptime: Math.floor((Date.now() - startTime) / 1000), // seconds
        responseTime: Date.now() - requestStart,
      },
    };

    // Return appropriate status code
    const httpStatus = overallStatus === 'unhealthy' ? 503 : 200;

    return new Response(
      JSON.stringify(healthStatus, null, 2),
      { headers, status: httpStatus }
    );
  } catch (error) {
    console.error('Health check failed:', error);

    const errorResponse: HealthStatus = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      version: 'unknown',
      services: {
        database: { status: 'down', error: 'Health check failed' },
        auth: { status: 'down', error: 'Health check failed' },
        razorpay: { status: 'down', error: 'Health check failed' },
        agora: { status: 'down', error: 'Health check failed' },
        cron: { status: 'down', error: 'Health check failed' },
      },
      metrics: {
        uptime: Math.floor((Date.now() - startTime) / 1000),
        responseTime: Date.now() - requestStart,
      },
    };

    return new Response(
      JSON.stringify(errorResponse, null, 2),
      { headers, status: 503 }
    );
  }
});