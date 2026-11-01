/**
 * Business-time helpers. AstroNemi is India-first (Razorpay, IST business
 * calendar). All date bucketing for reports, "today's earnings", and
 * consultation expiry checks must run in Asia/Kolkata on the server. The
 * client formats UTC timestamps received from the server using `Intl`
 * with the `en-IN` locale + `Asia/Kolkata` timezone.
 */

const IST = 'Asia/Kolkata';

export function formatBusinessDate(
  utcIso: string | null | undefined,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' },
): string {
  if (!utcIso) return '';
  const d = new Date(utcIso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-IN', { ...options, timeZone: IST }).format(d);
}

export function formatBusinessDateTime(utcIso: string | null | undefined): string {
  return formatBusinessDate(utcIso, { dateStyle: 'medium', timeStyle: 'short' });
}

export function formatBusinessTime(utcIso: string | null | undefined): string {
  return formatBusinessDate(utcIso, { timeStyle: 'short' });
}

/**
 * Returns YYYY-MM-DD for the given UTC timestamp in IST. Used for client
 * grouping that mirrors server-side bucketing. Prefer the server view/RPC
 * for any money figure; this helper is for display only.
 */
export function istDateKey(utcIso: string | null | undefined): string {
  if (!utcIso) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: IST,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(utcIso));
  const y = parts.find(p => p.type === 'year')?.value ?? '';
  const m = parts.find(p => p.type === 'month')?.value ?? '';
  const d = parts.find(p => p.type === 'day')?.value ?? '';
  return `${y}-${m}-${d}`;
}

/**
 * Server-computed subscription gate. The previous client implementation
 * compared the subscription's `end_date` to `new Date().toISOString()` on the
 * phone, which is wrong (C-2 audit finding). Always read server-computed
 * status via `getUserSubscriptionStatus` for any feature gating.
 */
export async function fetchUserSubscriptionStatus(
  userId: string,
  supabase: { rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }> },
): Promise<{
  isPremium: boolean;
  tier: string;
  endsAt: string | null;
  startsAt: string | null;
}> {
  const { data, error } = await supabase.rpc('get_user_subscription_status', { p_user_id: userId });
  if (error || !data) {
    return { isPremium: false, tier: 'free', endsAt: null, startsAt: null };
  }
  const row = Array.isArray(data) ? data[0] : data;
  return {
    isPremium: Boolean(row?.is_premium),
    tier: String(row?.tier ?? 'free'),
    endsAt: (row?.ends_at as string | null) ?? null,
    startsAt: (row?.starts_at as string | null) ?? null,
  };
}

export async function fetchAstrologerProStatus(
  astrologerId: string,
  supabase: { rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }> },
): Promise<{
  isActive: boolean;
  planSlug: string | null;
  billingCycle: string | null;
  currentPeriodEnd: string | null;
}> {
  const { data, error } = await supabase.rpc('get_astrologer_pro_status', {
    p_astrologer_id: astrologerId,
  });
  if (error || !data) {
    return { isActive: false, planSlug: null, billingCycle: null, currentPeriodEnd: null };
  }
  const row = Array.isArray(data) ? data[0] : data;
  return {
    isActive: Boolean(row?.is_active),
    planSlug: (row?.plan_slug as string | null) ?? null,
    billingCycle: (row?.billing_cycle as string | null) ?? null,
    currentPeriodEnd: (row?.current_period_end as string | null) ?? null,
  };
}