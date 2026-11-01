/**
 * Supabase Edge Function: Verify IAP Purchase
 *
 * Wallet top-ups are consumable in-app purchases. This function:
 *   1. authenticates the caller,
 *   2. verifies the store transaction with Apple/Google,
 *   3. checks the purchase is bound to the caller's account,
 *   4. maps the store product ID to AstroNemi Credits server-side,
 *   5. calls the idempotent fulfill_iap_purchase RPC.
 *
 * The client must not finish the store transaction until this returns success.
 * If verification is not configured, the function fails closed and no credits
 * are issued.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { SignJWT, importPKCS8 } from 'https://esm.sh/jose@5.9.6';

const PRODUCTION_URL = Deno.env.get('PRODUCTION_URL');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const APPLE_BUNDLE_ID = Deno.env.get('APPLE_BUNDLE_ID') ?? 'com.astronemi.astronemi';
const APPLE_ISSUER_ID = Deno.env.get('APPLE_ISSUER_ID') ?? '';
const APPLE_KEY_ID = Deno.env.get('APPLE_KEY_ID') ?? '';
const APPLE_PRIVATE_KEY = Deno.env.get('APPLE_PRIVATE_KEY') ?? '';
const APPLE_ALLOW_SANDBOX = Deno.env.get('APPLE_ALLOW_SANDBOX') === 'true';
const GOOGLE_PLAY_PACKAGE_NAME =
  Deno.env.get('GOOGLE_PLAY_PACKAGE_NAME') ?? 'com.astronemi.astronemi';
const GOOGLE_SERVICE_ACCOUNT_JSON = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON') ?? '';

const corsHeaders = {
  'Access-Control-Allow-Origin': PRODUCTION_URL || 'https://astronemi.app',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type Platform = 'ios' | 'android';

interface RequestBody {
  platform?: unknown;
  productId?: unknown;
  transactionId?: unknown;
  purchaseToken?: unknown;
}

interface AppleTransactionPayload {
  bundleId?: string;
  productId?: string;
  transactionId?: string;
  originalTransactionId?: string;
  purchaseDate?: number;
  revocationDate?: number;
  appAccountToken?: string;
  environment?: string;
  type?: string;
  quantity?: number;
}

interface GooglePurchase {
  purchaseState?: number;
  consumptionState?: number;
  orderId?: string;
  obfuscatedExternalAccountId?: string;
  quantity?: number;
  purchaseType?: number;
}

interface IapProductRow {
  kind: string;
}

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function decodeJwtPayload(jws: string): Record<string, unknown> {
  const part = jws.split('.')[1];
  if (!part) throw new Error('Invalid signed transaction');
  const base64 = part.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const bytes = Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes)) as Record<string, unknown>;
}

async function createAppleJwt(): Promise<string> {
  if (!APPLE_ISSUER_ID || !APPLE_KEY_ID || !APPLE_PRIVATE_KEY) {
    throw new Error('Apple IAP verification is not configured');
  }
  const key = await importPKCS8(APPLE_PRIVATE_KEY.replace(/\\n/g, '\n'), 'ES256');
  return await new SignJWT({ bid: APPLE_BUNDLE_ID })
    .setProtectedHeader({ alg: 'ES256', kid: APPLE_KEY_ID, typ: 'JWT' })
    .setIssuer(APPLE_ISSUER_ID)
    .setIssuedAt()
    .setExpirationTime('5m')
    .setAudience('appstoreconnect-v1')
    .sign(key);
}

async function fetchAppleTransaction(transactionId: string): Promise<AppleTransactionPayload> {
  const jwt = await createAppleJwt();
  const endpoints = [
    'https://api.storekit.itunes.apple.com',
    ...(APPLE_ALLOW_SANDBOX ? ['https://api.storekit-sandbox.itunes.apple.com'] : []),
  ];

  for (const endpoint of endpoints) {
    const response = await fetch(
      `${endpoint}/inApps/v1/transactions/${encodeURIComponent(transactionId)}`,
      { headers: { Authorization: `Bearer ${jwt}` } },
    );
    if (response.status === 404) continue;
    if (!response.ok) {
      const detail = await response.text();
      console.error('Apple transaction lookup failed', response.status, detail.slice(0, 300));
      throw new Error('Apple transaction lookup failed');
    }
    const body = await response.json() as { signedTransactionInfo?: string };
    if (!body.signedTransactionInfo) throw new Error('Apple transaction response missing signature');
    return decodeJwtPayload(body.signedTransactionInfo) as AppleTransactionPayload;
  }

  throw new Error('Apple transaction not found in the configured environment');
}

async function getGoogleAccessToken(): Promise<string> {
  if (!GOOGLE_SERVICE_ACCOUNT_JSON) {
    throw new Error('Google IAP verification is not configured');
  }
  const account = JSON.parse(GOOGLE_SERVICE_ACCOUNT_JSON) as {
    client_email?: string;
    private_key?: string;
    token_uri?: string;
  };
  if (!account.client_email || !account.private_key) {
    throw new Error('Google service account is incomplete');
  }
  const tokenUri = account.token_uri ?? 'https://oauth2.googleapis.com/token';
  const key = await importPKCS8(account.private_key.replace(/\\n/g, '\n'), 'RS256');
  const now = Math.floor(Date.now() / 1000);
  const assertion = await new SignJWT({
    scope: 'https://www.googleapis.com/auth/androidpublisher',
  })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuer(account.client_email)
    .setAudience(tokenUri)
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(key);

  const response = await fetch(tokenUri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }).toString(),
  });
  if (!response.ok) {
    const detail = await response.text();
    console.error('Google token exchange failed', response.status, detail.slice(0, 300));
    throw new Error('Google authentication failed');
  }
  const body = await response.json() as { access_token?: string };
  if (!body.access_token) throw new Error('Google access token missing');
  return body.access_token;
}

async function fetchGooglePurchase(
  productId: string,
  purchaseToken: string,
): Promise<GooglePurchase> {
  const accessToken = await getGoogleAccessToken();
  const url =
    `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${
      encodeURIComponent(GOOGLE_PLAY_PACKAGE_NAME)
    }/purchases/products/${encodeURIComponent(productId)}/tokens/${
      encodeURIComponent(purchaseToken)
    }`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    const detail = await response.text();
    console.error('Google purchase lookup failed', response.status, detail.slice(0, 300));
    throw new Error('Google purchase lookup failed');
  }
  return await response.json() as GooglePurchase;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ success: false, error: 'Method not allowed' }, 405);

  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return jsonResponse({ success: false, error: 'Server configuration missing' }, 500);
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
      return jsonResponse({ success: false, error: 'Authorization header required' }, 401);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.slice(7).trim();
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return jsonResponse({ success: false, error: 'Invalid authentication' }, 401);

    // Per-user rate limit: receipt verification fans out to store APIs.
    const { data: rateLimitRow, error: rateLimitError } = await supabase.rpc('check_rate_limit', {
      p_action: 'iap_verify',
      p_identifier: user.id,
      p_max_attempts: 20,
      p_window_seconds: 300,
    });
    if (rateLimitError) {
      console.error('IAP rate limit check failed', rateLimitError);
      return jsonResponse({ success: false, error: 'Security service unavailable' }, 503);
    }
    const rateLimit = Array.isArray(rateLimitRow) ? rateLimitRow[0] : rateLimitRow;
    if (rateLimit && rateLimit.allowed === false) {
      return jsonResponse({ success: false, error: 'Too many verification attempts' }, 429);
    }

    const body = await req.json() as RequestBody;
    const platform = body.platform === 'ios' || body.platform === 'android'
      ? body.platform as Platform
      : null;
    const productId = typeof body.productId === 'string' ? body.productId.trim() : '';
    const transactionId = typeof body.transactionId === 'string' ? body.transactionId.trim() : '';
    const purchaseToken = typeof body.purchaseToken === 'string' ? body.purchaseToken : '';

    if (!platform || !productId) {
      return jsonResponse({ success: false, error: 'platform and productId are required' }, 400);
    }

    const { data: productData, error: productError } = await supabase
      .from('iap_products')
      .select('kind')
      .eq('platform', platform)
      .eq('product_id', productId)
      .eq('is_active', true)
      .maybeSingle();
    const product = productData as IapProductRow | null;
    if (productError || !product) {
      return jsonResponse({ success: false, error: 'Unknown or inactive IAP product' }, 400);
    }

    let verifiedTransactionId = transactionId;
    let originalTransactionId: string | null = null;
    let rawPayload: Record<string, unknown> = {};

    if (platform === 'ios') {
      if (!transactionId) {
        return jsonResponse({ success: false, error: 'transactionId is required' }, 400);
      }
      const transaction = await fetchAppleTransaction(transactionId);
      if (transaction.bundleId !== APPLE_BUNDLE_ID) {
        return jsonResponse({ success: false, error: 'Bundle ID mismatch' }, 400);
      }
      if (transaction.productId !== productId) {
        return jsonResponse({ success: false, error: 'Product mismatch' }, 400);
      }
      if (transaction.transactionId !== transactionId) {
        return jsonResponse({ success: false, error: 'Transaction mismatch' }, 400);
      }
      if (transaction.revocationDate) {
        return jsonResponse({ success: false, error: 'Transaction was revoked' }, 409);
      }
      if (String(transaction.appAccountToken ?? '').toLowerCase() !== user.id.toLowerCase()) {
        return jsonResponse({ success: false, error: 'Purchase is not bound to this account' }, 403);
      }
      if (Number(transaction.quantity ?? 1) !== 1) {
        return jsonResponse({ success: false, error: 'Unexpected purchase quantity' }, 400);
      }
      verifiedTransactionId = transaction.transactionId;
      originalTransactionId = transaction.originalTransactionId ?? null;
      rawPayload = {
        productId: transaction.productId,
        transactionId: transaction.transactionId,
        originalTransactionId,
        purchaseDate: transaction.purchaseDate,
        environment: transaction.environment,
        type: transaction.type,
      };
    } else {
      if (!purchaseToken) {
        return jsonResponse({ success: false, error: 'purchaseToken is required' }, 400);
      }
      const purchase = await fetchGooglePurchase(productId, purchaseToken);
      if (purchase.purchaseState !== 0) {
        return jsonResponse({ success: false, error: 'Purchase is not completed' }, 409);
      }
      if (purchase.consumptionState === 1) {
        return jsonResponse({ success: false, error: 'Purchase was already consumed' }, 409);
      }
      if (purchase.obfuscatedExternalAccountId !== user.id) {
        return jsonResponse({ success: false, error: 'Purchase is not bound to this account' }, 403);
      }
      if (Number(purchase.quantity ?? 1) !== 1) {
        return jsonResponse({ success: false, error: 'Unexpected purchase quantity' }, 400);
      }
      verifiedTransactionId = purchase.orderId || purchaseToken;
      rawPayload = {
        productId,
        orderId: purchase.orderId,
        purchaseState: purchase.purchaseState,
        consumptionState: purchase.consumptionState,
        purchaseType: purchase.purchaseType,
      };
    }

    const { data: fulfillmentData, error: fulfillmentError } = await supabase.rpc(
      'fulfill_iap_purchase_v2',
      {
        p_user_id: user.id,
        p_platform: platform,
        p_product_id: productId,
        p_transaction_id: verifiedTransactionId,
        p_raw: rawPayload,
      },
    );
    if (fulfillmentError) {
      console.error('fulfill_iap_purchase_v2 failed', fulfillmentError);
      return jsonResponse({ success: false, error: 'Purchase fulfillment failed' }, 500);
    }

    const result = (Array.isArray(fulfillmentData) ? fulfillmentData[0] : fulfillmentData) as {
      success?: boolean;
      message?: string;
      new_balance?: number;
      already_processed?: boolean;
      kind?: string;
      plan_id?: string;
      ends_at?: string;
      credited?: number;
    } | null;
    if (!result?.success) {
      return jsonResponse({ success: false, error: result?.message || 'Purchase fulfillment failed' }, 409);
    }

    return jsonResponse({
      success: true,
      kind: result.kind,
      planId: result.plan_id,
      endsAt: result.ends_at,
      credited: Number(result.credited ?? 0),
      balance: result.new_balance,
      alreadyProcessed: result.already_processed === true,
    });
  } catch (error) {
    console.error('verify-iap-purchase error', error);
    return jsonResponse({ success: false, error: 'Purchase verification failed' }, 502);
  }
});
