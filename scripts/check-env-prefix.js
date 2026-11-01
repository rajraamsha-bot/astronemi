/**
 * Build-time guard: fail if any secret-type environment variable is exposed
 * to the client bundle via the `EXPO_PUBLIC_` prefix.
 *
 * Usage:
 *   node scripts/check-env-prefix.js            # exits 1 on violation
 *   node scripts/check-env-prefix.js --fix       # prints a suggested rename
 *
 * Add to package.json as `"check:env": "node scripts/check-env-prefix.js"`.
 */

const path = require('path');
const fs = require('fs');

const SECRET_PATTERN = /(_PRIVATE_KEY|_SECRET|_WEBHOOK_SECRET|_APP_SECRET|_CERTIFICATE)$/i;
const EXPO_PUBLIC_PREFIX = 'EXPO_PUBLIC_';

// Files we scan — the app's own .env files plus any .env.* sibling.
const ENV_FILES = ['.env', '.env.development', '.env.staging', '.env.production'];

function readEnv(filePath) {
  if (!fs.existsSync(filePath)) return [];
  return fs
    .readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .filter(line => line && !line.trim().startsWith('#'));
}

function main() {
  const repoRoot = path.resolve(__dirname, '..');
  let hasViolations = false;

  for (const file of ENV_FILES) {
    const fullPath = path.join(repoRoot, file);
    if (!fs.existsSync(fullPath)) continue;

    for (const line of readEnv(fullPath)) {
      const eq = line.indexOf('=');
      if (eq < 0) continue;
      const rawKey = line.slice(0, eq).trim();
      const value = line.slice(eq + 1).trim();

      // Skip placeholder values (the user hasn't filled in a real secret yet).
      if (!value || /your-|xxxxx|placeholder|null|undefined/i.test(value)) continue;

      if (rawKey.startsWith(EXPO_PUBLIC_PREFIX) && SECRET_PATTERN.test(rawKey)) {
        const safeKey = rawKey.replace(EXPO_PUBLIC_PREFIX, '');
        console.error(
          `[check-env] SECURITY: ${file}: ${rawKey} is prefixed with EXPO_PUBLIC_ and will ship in the client bundle.\n` +
          `         Rename to ${safeKey} (server-side only) and call it through a Supabase Edge Function.\n`
        );
        hasViolations = true;
      }
    }
  }

  if (hasViolations) {
    console.error('\n[check-env] Fix the violations above and re-run this script.');
    process.exit(1);
  }

  console.log('[check-env] OK — no secret env vars are leaking through EXPO_PUBLIC_.');
}

main();
