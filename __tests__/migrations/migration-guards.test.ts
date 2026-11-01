/**
 * Migration & money-path guards â€” regression tripwires for the fixes made in
 * the 2026-08 production-readiness engagement. Each assertion pins a specific
 * defect that previously shipped; if a refactor reintroduces one, this suite
 * fails before merge.
 */
import fs from 'fs';
import path from 'path';

const MIGRATIONS_DIR = path.join(__dirname, '..', '..', 'supabase', 'migrations');
const FUNCTIONS_DIR = path.join(__dirname, '..', '..', 'supabase', 'functions');

function readMigration(name: string): string {
  return fs.readFileSync(path.join(MIGRATIONS_DIR, name), 'utf8');
}

function readFunction(name: string): string {
  return fs.readFileSync(path.join(FUNCTIONS_DIR, name, 'index.ts'), 'utf8');
}

function allMigrationFiles(): string[] {
  return fs.readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.sql'));
}

/**
 * Strip SQL `--` line comments. Header comments legitimately DESCRIBE the old
 * bugs (with the broken code in backticks); guards must only see executable
 * statements.
 */
function stripSqlComments(sql: string): string {
  return sql
    .split('\n')
    .filter(line => !line.trimStart().startsWith('--'))
    .join('\n');
}

/** Strip TS comments for the negative assertions below. */
function stripTsComments(ts: string): string {
  return ts
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter(line => !line.trimStart().startsWith('//'))
    .join('\n');
}

describe('migration chain deployability', () => {
  test('no migration references the nonexistent role "anonymous" (022 chain-breaker)', () => {
    for (const file of allMigrationFiles()) {
      const content = stripSqlComments(readMigration(file));
      // Only privilege statements matter â€” the word 'anonymous' elsewhere
      // (e.g. audit-log actor labels in 012) is a harmless string literal.
      if (/\b(?:GRANT|REVOKE)\b[^\n]*\banonymous\b/i.test(content)) {
        throw new Error(`${file} grants/revokes to role "anonymous" â€” Supabase only has "anon"; the statement errors and aborts the migration file.`);
      }
    }
  });

  test('migration numbering 031-034 exists (the reconciliation chain)', () => {
    const files = allMigrationFiles();
    for (const prefix of ['031_', '032_', '033_', '034_']) {
      expect(files.some(f => f.startsWith(prefix))).toBe(true);
    }
  });
});

describe('wallet RPC integrity (031)', () => {
  const m031 = () => readMigration('031_deployability_and_wallet_fixes.sql');

  test('__assert_service_role LIKE pattern actually matches a service-role JWT', () => {
    // The 027 pattern used a literal `*` (not a wildcard) so the guard threw
    // for EVERY caller and wallet top-ups captured money without crediting.
    const body = stripSqlComments(m031());
    expect(body).not.toMatch(/service_role"\*/);
    expect(body).toMatch(/NOT LIKE '%"role":"service_role"%'/);
  });

  test('debit_wallet regains its FOR UPDATE row lock', () => {
    expect(m031()).toMatch(
      /SELECT wallet_balance INTO v_balance FROM users WHERE id = p_user_id FOR UPDATE/
    );
  });

  test('process_payment_refund passes text args in the right positions', () => {
    const raw = m031();
    const start = raw.indexOf('CREATE OR REPLACE FUNCTION public.process_payment_refund');
    const end = raw.indexOf('CREATE OR REPLACE FUNCTION public.send_tip');
    const refundFn = stripSqlComments(raw.slice(start, end));
    expect(refundFn).toMatch(/p_source\s+=>\s+'refund'/);
    expect(refundFn).toMatch(/p_reference_id => p_payment_id::TEXT/);
    expect(refundFn).toMatch(/FOR UPDATE/);
    expect(refundFn).toContain('refunds_total');
  });

  test('apply_referral_code exists (the RPC AuthContext calls) and writes the referrals ledger', () => {
    const content = m031();
    expect(content).toMatch(/CREATE OR REPLACE FUNCTION public\.apply_referral_code/);
    expect(content).toMatch(/INSERT INTO public\.referrals/);
    expect(content).toMatch(/ON CONFLICT \(referred_id\) DO NOTHING/);
    // Redeemer row is locked â€” the 023/026 check-then-credit raced.
    expect(content).toMatch(/WHERE id = p_user_id FOR UPDATE/);
  });

  test('astrologers payout PII is excluded from client column grants', () => {
    const raw = m031();
    const grant = raw.slice(
      raw.indexOf('GRANT SELECT ('),
      raw.indexOf(') ON public.astrologers TO anon, authenticated;')
    );
    expect(grant).not.toContain('bank_account');
    expect(grant).not.toContain('upi_id');
    expect(grant).not.toContain('payout_details');
    expect(grant).not.toContain('total_earnings');
    expect(grant).not.toContain('withdrawn_amount');
  });

  test('payments/subscriptions client INSERT is revoked (033)', () => {
    const m033 = readMigration('033_payment_path_integrity.sql');
    expect(m033).toContain('DROP POLICY IF EXISTS "Users insert own payments"');
    expect(m033).toContain('REVOKE INSERT ON public.payments');
    expect(m033).toContain('REVOKE INSERT, UPDATE ON public.subscriptions');
  });
});

describe('astrologer integrity (032)', () => {
  const m032 = () => readMigration('032_astrologer_integrity.sql');

  test('trust columns are frozen for non-admin writes', () => {
    const content = m032();
    expect(content).toMatch(/NEW\.is_verified\s+:=\s+false/);
    expect(content).toMatch(/NEW\.rating\s+:=\s+OLD\.rating/);
    expect(content).toMatch(/NEW\.total_earnings\s+:=\s+OLD\.total_earnings/);
  });

  test('complete_consultation no longer trusts the client duration', () => {
    expect(stripSqlComments(m032())).not.toMatch(/COALESCE\(\s*p_duration_minutes/);
  });

  test('double-booking is constrained', () => {
    expect(m032()).toMatch(/consultations_unique_active_slot/);
  });
});

describe('edge-function money paths', () => {
  test('create-razorpay-order prices product orders from the products table', () => {
    const raw = readFunction('create-razorpay-order');
    const fn = stripTsComments(raw);
    expect(fn).toMatch(/type === 'product_order'/);
    expect(fn).toContain("from('products')");
    // hourly_rate does not exist on astrologers â€” selecting it broke checkout.
    expect(fn).not.toContain('hourly_rate');
  });

  test('verify-payment fulfills from STORED metadata, not the request body', () => {
    const fn = readFunction('verify-payment');
    // Migration 054: the select includes the exact integer amount_paise.
    expect(fn).toContain("select('id, amount, amount_paise, order_id, user_id, type, status, metadata')");
    // Consultation insert uses schema-real columns and a real enum value.
    expect(fn).not.toContain("status: 'scheduled'");
    expect(fn).not.toContain('review_count');
    // Webhook-race recovery re-runs fulfillment when the marker is missing.
    expect(fn).toMatch(/storedMeta\.consultation_id/);
  });

  test('migration 054 keeps amount_paise in lockstep with amount (trigger + CHECK)', () => {
    const m054 = readMigration('054_payments_amount_paise.sql');
    expect(stripSqlComments(m054)).toMatch(
      /NEW\.amount_paise := ROUND\(NEW\.amount \* 100\)::BIGINT/
    );
    expect(m054).toMatch(/ALTER COLUMN amount_paise SET NOT NULL/);
    expect(m054).toMatch(/payments_amount_paise_matches/);
    // Backfill runs before the NOT NULL is enforced.
    expect(m054.indexOf('UPDATE public.payments')).toBeLessThan(
      m054.indexOf('ALTER COLUMN amount_paise SET NOT NULL')
    );
  });

  test('both payment surfaces compare against amount_paise, not parsed strings', () => {
    for (const name of ['verify-payment', 'razorpay-webhook']) {
      const fn = stripTsComments(readFunction(name));
      expect(fn).toMatch(/amount_paise/);
      expect(fn).not.toMatch(/padEnd\(2, '0'\)/);
      expect(fn).not.toMatch(/split\('\.'\)/);
    }
  });

  test('razorpay-webhook claims events insert-first and retains them for retry on failure', () => {
    const fn = readFunction('razorpay-webhook');
    // Duplicate delivery is idempotently re-handled (never double-processed).
    expect(fn).toMatch(/23505/);
    expect(fn).toMatch(/from\('webhook_events'\)/);
    // A failed event is deliberately NOT deleted: the claim is kept with
    // processed=false so the next Razorpay delivery can safely retry and the
    // failed row stays visible to support reconciliation.
    expect(fn).toMatch(/\.update\(\{ processed: false \}\)/);
  });

  test('deduct-wallet derives consultation rates server-side and rejects bad question prices', () => {
    const fn = readFunction('deduct-wallet');
    // consultation/call debits run through debit_consultation_minute (041),
    // which authenticates the payer and derives the stored rate + billing
    // minute server-side; the client amount is never trusted for money.
    expect(fn).toMatch(/rpc\('debit_consultation_minute'/);
    expect(fn).toMatch(/never trusted for money/);
    // Question tier is server-priced from public.question_prices (046).
    expect(fn).toMatch(/question_prices/);
    expect(fn).toMatch(/Question tier not available/);
  });

  test('prokerala rejects unauthenticated callers (open paid-proxy fix)', () => {
    const fn = readFunction('prokerala');
    expect(fn).toMatch(/Authentication required/);
    expect(fn).toMatch(/check_rate_limit/);
  });

  test('interpret-dream rate limit is fail-closed on the service client', () => {
    const fn = readFunction('interpret-dream');
    expect(fn).toContain('SUPABASE_SERVICE_ROLE_KEY');
    expect(fn).toMatch(/Rate limit check failed/);
  });

  test('agora-token only mints tokens for the caller\u2019s own consultation', () => {
    const fn = readFunction('agora-token');
    expect(fn).toMatch(/Consultation not found for this caller/);
  });

  test('daily-horoscope writes the shape the client reads, on an IST day', () => {
    const fn = stripTsComments(readFunction('daily-horoscope'));
    expect(fn).toMatch(/WESTERN_SIGNS/);
    expect(fn).toContain("period: 'daily'");
    expect(fn).not.toContain('sign_index');
    expect(fn).toContain("onConflict: 'sign,period,date'");
    expect(fn).toMatch(/5\.5 \* 3600 \* 1000/);
    // base64url JWT header/payload (standard base64 was rejected by Google).
    expect(fn).toMatch(/const b64url/);
  });
});

describe('scheduling', () => {
  test('config.toml schedules the daily-horoscope function', () => {
    const config = fs.readFileSync(path.join(__dirname, '..', '..', 'supabase', 'config.toml'), 'utf8');
    expect(config).toMatch(/\[functions\.daily-horoscope\]/);
    expect(config).toMatch(/schedule = "/);
  });

  test('migration 034 registers the sweeper cron jobs', () => {
    const m034 = readMigration('034_job_scheduling.sql');
    expect(m034).toContain('CREATE EXTENSION IF NOT EXISTS pg_cron');
    expect(m034).toMatch(/cron\.schedule\('expire-subscriptions'/);
    expect(m034).toMatch(/cron\.schedule\('sweep-deleted-accounts'/);
  });

  test('migration 038 registers the today_earnings IST-midnight reset', () => {
    const m038 = readMigration('038_signup_bonus_and_earnings_reset.sql');
    expect(m038).toMatch(/cron\.schedule\('reset-today-earnings', '30 18 \* \* \*'/);
    expect(stripSqlComments(m038)).toMatch(/CREATE OR REPLACE FUNCTION public\.reset_today_earnings/);
  });
});

describe('signup bonus integrity (038)', () => {
  const m038 = () => readMigration('038_signup_bonus_and_earnings_reset.sql');

  test('a unique partial index anchors one signup_bonus ledger row per user', () => {
    expect(m038()).toMatch(/CREATE UNIQUE INDEX IF NOT EXISTS ux_wallet_tx_signup_bonus/);
    expect(m038()).toMatch(/WHERE reference_type = 'signup_bonus'/);
  });

  test('apply_signup_bonus locks the user row BEFORE the EXISTS probe', () => {
    const raw = m038();
    const start = raw.indexOf('CREATE OR REPLACE FUNCTION public.apply_signup_bonus');
    const fn = stripSqlComments(raw.slice(start));
    // The lock must precede the idempotency probe â€” that ordering is the fix.
    const lockAt = fn.indexOf('FROM public.users WHERE id = p_user_id FOR UPDATE');
    const probeAt = fn.indexOf("SELECT EXISTS (\n    SELECT 1 FROM wallet_transactions");
    expect(lockAt).toBeGreaterThan(-1);
    expect(probeAt).toBeGreaterThan(lockAt);
  });

  test('credit_wallet rejects NULL and non-positive amounts like debit_wallet', () => {
    const raw = m038();
    const start = raw.indexOf('CREATE OR REPLACE FUNCTION public.credit_wallet');
    const fn = stripSqlComments(raw.slice(start));
    expect(fn).toMatch(/IF p_amount IS NULL OR p_amount <= 0 THEN/);
    expect(fn).toMatch(/'Invalid amount'/);
  });
});

describe('payment fulfillment dedupe (verify-payment)', () => {
  test('product-order replay dedupe is scoped to THIS payment, not any same-total order', () => {
    const fn = readFunction('verify-payment');
    // orders.payment_id stores the internal payments.id written on insert.
    expect(fn).toMatch(/\.eq\('payment_id', paymentId\)/);
    // The old user+total probe must be gone from the executable path.
    const stripped = stripTsComments(fn);
    expect(stripped).not.toMatch(/\.eq\('total', amount\)/);
  });

  test('consultation adoption only claims consultations no other payment owns', () => {
    const fn = stripTsComments(readFunction('verify-payment'));
    expect(fn).toMatch(/metadata->>consultation_id/);
    expect(fn).toMatch(/\.neq\('id', paymentId\)/);
  });
});

describe('reviews sync + bounded queries', () => {
  test('migration 039 pins the strict reviews INSERT policy and earnings aggregates', () => {
    const m039 = readMigration('039_user_reviews_and_analytics.sql');
    // The consultation_id column reconciliation lives in 019 (pinned above).
    expect(stripSqlComments(m039)).toMatch(
      /CREATE POLICY "Users create own reviews" ON public\.reviews/
    );
    expect(m039).toMatch(/CREATE OR REPLACE FUNCTION public\.astrologer_earnings_summary/);
    expect(m039).toMatch(/GRANT EXECUTE ON FUNCTION public\.astrologer_earnings_summary\(UUID\) TO authenticated/);
  });

  test('migration 019 no longer aborts on a fresh chain (consultation_id added before use)', () => {
    const m019 = readMigration('019_astrologer_dashboard.sql');
    const alterAt = m019.indexOf('ADD COLUMN IF NOT EXISTS consultation_id');
    const indexAt = m019.indexOf('idx_reviews_consultation');
    expect(alterAt).toBeGreaterThan(-1);
    expect(indexAt).toBeGreaterThan(alterAt);
  });

  test('api.submitReview supplies the NOT NULL astrologer_id', () => {
    const api = fs
      .readFileSync(path.join(__dirname, '..', '..', 'services', 'api.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '');
    expect(api).toMatch(/select\('user_id, astrologer_id'\)/);
    expect(api).toMatch(/astrologer_id: consultation\.astrologer_id/);
  });

  test('GDPR export pages instead of issuing unbounded selects', () => {
    const svc = fs
      .readFileSync(path.join(__dirname, '..', '..', 'services', 'account-management.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '');
    expect(svc).toMatch(/fetchAllPages/);
    expect(svc).toMatch(/EXPORT_PAGE_SIZE/);
    // The old shape selected whole tables directly from exportUserData.
    expect(svc).not.toMatch(/from\('consultations'\)\.select\('\*'\)\.eq\('user_id'/);
  });

  test('analytics aggregates are windowed and use real columns', () => {
    const analytics = fs
      .readFileSync(path.join(__dirname, '..', '..', 'services', 'astrologer-analytics.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '');
    // Schema-real columns (the old amount/duration selects always errored).
    expect(analytics).not.toMatch(/select\('amount, start_time/);
    expect(analytics).not.toMatch(/select\('duration, user_id'\)/);
    expect(analytics).toMatch(/duration_minutes/);
    expect(analytics).toMatch(/astrologer_earnings_summary/);
    // Every aggregate path is time-bounded.
    expect(analytics).toMatch(/365 \* 24 \* 60 \* 60 \* 1000/);
  });

  test('UserContext syncs reviews from the server table', () => {
    const ctx = fs
      .readFileSync(path.join(__dirname, '..', '..', 'contexts', 'UserContext.tsx'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '');
    expect(ctx).toMatch(/from\('reviews'\)/);
    expect(ctx).toMatch(/consultation_id: review\.consultationId/);
  });
});

// ============================================================================
// 2026-09 production-readiness fix tripwires
// ============================================================================

describe('rls WITH CHECK closure (052)', () => {
  const m052 = () => readMigration('052_rls_with_check_and_grants_reconciliation.sql');

  test('consultations UPDATE policy has WITH CHECK locking user_id + astrologer_id', () => {
    expect(m052()).toMatch(/CREATE POLICY "Users update own consultations"[\s\S]*WITH CHECK/);
  });

  test('users UPDATE policy has WITH CHECK locking id', () => {
    expect(m052()).toMatch(/CREATE POLICY "Users update own"[\s\S]*WITH CHECK/);
  });

  test('users SELECT grant covers every column the app profile fetch reads', () => {
    // The column list contains inline SQL comments; strip them so each
    // split element is a bare column name.
    const grant = stripSqlComments(m052()).match(/GRANT SELECT \(([\s\S]*?)\)\s*ON public\.users/);
    expect(grant).not.toBeNull();
    const cols = grant![1].split(',').map(s => s.trim()).filter(Boolean);
    for (const col of ['phone', 'birth_date', 'birth_lat', 'birth_lng', 'zodiac_sign', 'nakshatra', 'wallet_balance', 'referral_code', 'referred_by']) {
      expect(cols).toContain(col);
    }
  });

  test('is_admin / is_super_admin remain invisible to authenticated clients', () => {
    expect(m052()).not.toMatch(/GRANT SELECT[^)]*is_admin/);
    expect(m052()).not.toMatch(/GRANT SELECT[^)]*is_super_admin/);
  });

  test('app user-profile update goes through the RPC, not raw users.update()', () => {
    const api = fs
      .readFileSync(path.join(__dirname, '..', '..', 'services', 'api.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '');
    // updateProfile calls the RPC and re-fetches.
    expect(api).toMatch(/rpc\('update_user_profile'/);
    // The raw UPDATE path is gone from services/api.ts.
    expect(api).not.toMatch(/\.from\('users'\)\.update\(sanitizedUpdates/);
  });
});

describe('consultation status state machine (053)', () => {
  const m053 = () => readMigration('053_consultation_status_state_machine.sql');

  test('consultations UPDATE column grant no longer includes status', () => {
    expect(m053()).toMatch(/GRANT UPDATE \(notes, user_rating, user_review, updated_at\)/);
    expect(m053()).not.toMatch(/GRANT UPDATE \([^)]*\bstatus\b/);
  });

  test('migration file has no dangling WITH CHECK outside CREATE POLICY', () => {
    // C1: a stray "WITH CHECK (...);" after a COMMENT statement is a
    // syntax error that aborts `supabase db push`.
    for (const file of allMigrationFiles()) {
      const lines = stripSqlComments(readMigration(file)).split('\n');
      let inPolicy = false;
      for (const line of lines) {
        if (/CREATE POLICY/i.test(line)) inPolicy = true;
        if (/^\s*WITH CHECK/i.test(line) && !inPolicy) {
          throw new Error(`${file} has WITH CHECK outside CREATE POLICY — db push will fail.`);
        }
        if (/;\s*$/.test(line)) inPolicy = false;
      }
    }
  });

  test('every GRANT column list on users references real columns only', () => {
    // C2/C3: GRANT SELECT/UPDATE (col, ...) on a missing column aborts the
    // migration. Canonical users columns per 001/001c/012/014 + 057.
    const real = new Set([
      'id', 'phone', 'email', 'name', 'display_name', 'avatar_url',
      'birth_date', 'birth_time', 'birth_place', 'birth_lat', 'birth_lng',
      'zodiac_sign', 'nakshatra', 'role', 'wallet_balance',
      'subscription_tier', 'subscription_ends_at',
      'referral_code', 'referral_earnings', 'referred_by',
      'notifications_enabled', 'language', 'created_at', 'updated_at',
      'is_admin', 'is_super_admin', 'deletion_scheduled_at',
    ]);
    for (const file of allMigrationFiles()) {
      const body = stripSqlComments(readMigration(file));
      for (const m of body.matchAll(/GRANT\s+(?:SELECT|UPDATE)\s*\(([\s\S]*?)\)\s*ON public\.users/gi)) {
        for (const col of m[1].split(',').map(s => s.trim()).filter(Boolean)) {
          if (!real.has(col)) {
            throw new Error(`${file} grants on nonexistent users column "${col}".`);
          }
        }
      }
    }
  });

  test('update_user_profile writes canonical columns only (057)', () => {
    const m057 = readMigration('057_users_display_column_reconciliation.sql');
    expect(m057).toMatch(/ADD COLUMN IF NOT EXISTS display_name/);
    // No UPDATE ... SET full_name / country / timezone — those columns do
    // not exist; the RPC maps aliases onto canonical columns instead.
    const body = stripSqlComments(m057);
    expect(body).not.toMatch(/SET full_name =/);
    expect(body).not.toMatch(/SET country =/);
    expect(body).not.toMatch(/SET timezone =/);
    expect(body).toMatch(/display_name/);
  });

  test('consultation_status enum covers every value the state machine allows (058)', () => {
    const m058 = readMigration('058_consultation_status_enum_values.sql');
    expect(m058).toMatch(/ADD VALUE 'scheduled'/);
    expect(m058).toMatch(/ADD VALUE 'failed'/);
  });

  test('astrologer_earnings has a one-row-per-consultation backstop (059)', () => {
    const m059 = readMigration('059_astrologer_earnings_idempotency.sql');
    expect(m059).toMatch(/ux_astrologer_earnings_consultation/);
    expect(m059).toMatch(/UNIQUE/);
  });

  test('cron_health observes every pg_cron job (060)', () => {
    const m060 = readMigration('060_cron_health_check.sql');
    for (const job of ['expire-subscriptions', 'sweep-deleted-accounts', 'expire-astrologer-subscriptions', 'reset-today-earnings']) {
      expect(m060).toContain(`'${job}'`);
    }
    expect(m060).toMatch(/GRANT EXECUTE ON FUNCTION public\.cron_health\(\) TO service_role/);
  });

  test('status trigger rejects refunds by non-admins', () => {
    const fn = stripSqlComments(m053().match(/CREATE OR REPLACE FUNCTION validate_consultation_status_change[\s\S]*?LANGUAGE plpgsql/)?.[0] ?? '');
    expect(fn).toMatch(/WHEN 'refunded'[\s\S]*AND v_is_admin/);
  });

  test('start_consultation RPC exists and is callable by authenticated', () => {
    expect(m053()).toMatch(/CREATE OR REPLACE FUNCTION public\.start_consultation\(p_consultation_id UUID\)/);
    expect(m053()).toMatch(/GRANT EXECUTE ON FUNCTION public\.start_consultation\(UUID\) TO authenticated/);
  });
});

// ============================================================================
// Modules 7â€“14 (2026-09 pass)
// ============================================================================

describe('operational & product-truth fixes (modules 7-14)', () => {
  test('health-check rate-limits the public endpoint (M7)', () => {
    const fn = readFunction('health-check');
    expect(fn).toMatch(/check_rate_limit/);
    expect(fn).toMatch(/p_action: 'health_check'/);
    expect(fn).toMatch(/x-forwarded-for/);
  });

  test('payout copy no longer promises a 7-day timeline (M8)', () => {
    const dashboard = fs.readFileSync(path.join(__dirname, '..', '..', 'app', 'astrologer-dashboard.tsx'), 'utf8');
    expect(dashboard).not.toMatch(/7 business days/);
    const en = fs.readFileSync(path.join(__dirname, '..', '..', 'locales', 'en.ts'), 'utf8');
    expect(en).not.toMatch(/7 business days/);
  });

  test('production check rejects both mock flags (M9)', () => {
    const checker = fs.readFileSync(path.join(__dirname, '..', '..', 'scripts', 'check-production-ready.js'), 'utf8');
    expect(checker).toMatch(/EXPO_PUBLIC_USE_MOCK_API/);
    expect(checker).toMatch(/EXPO_PUBLIC_USE_MOCK_DATA/);
  });

  test('send-sms writes an audit row without the OTP (M11)', () => {
    const fn = stripTsComments(readFunction('send-sms'));
    expect(fn).toMatch(/p_action: 'send_sms'/);
    expect(fn).toMatch(/log_audit/);
    expect(fn).toContain('****'); // truncated destination
    expect(fn).not.toMatch(/log_audit[\\s\\S]*otp:/); // never log the otp value
  });

  test('sync-manager caps and dead-letters pending-action retries (M13)', () => {
    const svc = fs
      .readFileSync(path.join(__dirname, '..', '..', 'services', 'sync-manager.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '');
    expect(svc).toMatch(/MAX_PENDING_ACTION_RETRIES/);
    expect(svc).toMatch(/dropped after \$/);
  });

  test('live gift price is derived server-side, client amount rejected on mismatch (M14)', () => {
    const m056 = readMigration('056_server_priced_live_gifts.sql');
    expect(m056).toMatch(/live_gift_catalog/);
    expect(m056).toMatch(/p_amount_inr IS DISTINCT FROM v_catalog_amount/);
    expect(m056).toMatch(/debit_wallet\(\s*p_user_id := v_caller,\s*p_amount\s+:= v_catalog_amount/);
  });
});

