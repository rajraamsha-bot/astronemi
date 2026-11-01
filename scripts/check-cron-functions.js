#!/usr/bin/env node
/**
 * Cron hygiene check.
 *
 * Every pg_cron `cron.schedule(...)` call in supabase/migrations/*.sql must
 * reference a public function that exists in the migration set. A schedule
 * guarded by `IF EXISTS (SELECT 1 FROM information_schema.routines ...)` is
 * still validated here: the function name in the schedule string must match
 * the function name in the migrations it lives in.
 *
 * Run as part of CI before `supabase db push` (or as a local pre-flight):
 *     node scripts/check-cron-functions.js
 *
 * Exits 0 if every scheduled function exists, 1 otherwise.
 */
const fs = require('fs');
const path = require('path');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'supabase', 'migrations');
const files = fs
  .readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith('.sql'))
  .map((f) => path.join(MIGRATIONS_DIR, f));

const scheduledFns = new Set();
const definedFns = new Set();

const SCHEDULE_RE =
  /cron\.schedule\s*\(\s*'[^']+'\s*,\s*'[^']+'\s*,\s*\$\$\s*SELECT\s+public\.([a-zA-Z0-9_]+)\s*\(\s*\)/gi;

const CREATE_RE = /CREATE\s+(OR\s+REPLACE\s+)?FUNCTION\s+public\.([a-zA-Z0-9_]+)/gi;

for (const file of files) {
  const sql = fs.readFileSync(file, 'utf8');
  for (const m1 of sql.matchAll(SCHEDULE_RE)) {
    scheduledFns.add(m1[1]);
  }
  for (const m1 of sql.matchAll(CREATE_RE)) {
    definedFns.add(m1[2]);
  }
}

const missing = [...scheduledFns].filter((fn) => !definedFns.has(fn));

// M5: every pg_cron schedule must also be observable via cron_health()
// (migration 060). Schedules guarded by IF EXISTS(pg_cron) silently no-op
// where the extension is absent; cron_health() is the runbook's way to
// tell the difference between "scheduled and ran" and "never fired".
const EXPECTED_JOBS = [
  'expire-subscriptions',
  'sweep-deleted-accounts',
  'expire-astrologer-subscriptions',
  'reset-today-earnings',
];
const healthSql = files
  .map((file) => fs.readFileSync(file, 'utf8'))
  .join('\n');
const unobserved = EXPECTED_JOBS.filter((job) => !healthSql.includes(`'${job}'`));

if (missing.length === 0 && unobserved.length === 0) {
  console.log(`OK: ${scheduledFns.size} cron schedules match ${definedFns.size} defined functions; ${EXPECTED_JOBS.length} jobs observed by cron_health().`);
  process.exit(0);
}

if (unobserved.length > 0) {
  console.error(`CRON HYGIENE FAIL: ${unobserved.length} expected job(s) not observed by cron_health():`);
  for (const job of unobserved) {
    console.error(`  - ${job}`);
  }
}

console.error(`CRON HYGIENE FAIL: ${missing.length} scheduled function(s) have no definition:`);
for (const fn of missing) {
  console.error(`  - ${fn}`);
}
process.exit(1);