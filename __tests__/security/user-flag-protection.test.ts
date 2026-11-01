/**
 * User Flag Protection — client-side regression guard
 *
 * SCOPE & LIMITATION (read before trusting this test):
 * The actual P0 fix lives in the DATABASE (migration 017), not in client
 * code. It is enforced by a BEFORE UPDATE trigger + column-level revokes
 * on public.users. Those cannot be validated by Jest with a mocked client.
 *
 * The authoritative regression guard is therefore the CI step in
 * .github/workflows/ci-cd.yml -> "Verify user-flag protection (P0 fix,
 * migration 017)", which runs `SELECT * FROM verify_user_flag_protection()`
 * against live Postgres after `supabase db push`.
 *
 * WHAT THIS TEST DOES:
 * Scans all client .ts/.tsx source for any attempt to write the protected
 * columns via the Supabase client. Such a call would now throw at runtime
 * ("is_admin cannot be modified directly..."). If a future change rewrites
 * app code to bypass the RPCs, this test fails loudly — surfacing the bug
 * before it reaches a device. This is a static contract check, NOT a test
 * of the database enforcement itself.
 *
 * Protected columns (must match migration 017):
 *   is_admin, is_super_admin, subscription_tier, subscription_ends_at,
 *   subscription_plan, role, wallet_balance
 */

import * as fs from 'fs';
import * as path from 'path';

const SRC_DIRS = ['app', 'services', 'contexts', 'components', 'hooks', 'utils', 'lib'];
const PROTECTED_COLUMNS = [
  'is_admin',
  'is_super_admin',
  'subscription_tier',
  'subscription_ends_at',
  'subscription_plan',
  'role',
  'wallet_balance',
];

function listSourceFiles(dir: string, acc: string[] = []): string[] {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      listSourceFiles(full, acc);
    } else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith('.d.ts')) {
      acc.push(full);
    }
  }
  return acc;
}

describe('User flag protection — client contract (migration 017)', () => {
  const violations: string[] = [];

  beforeAll(() => {
    for (const src of SRC_DIRS) {
      for (const file of listSourceFiles(src)) {
        const text = fs.readFileSync(file, 'utf8');
        const lines = text.split('\n');

        // Find each `from('users')` occurrence, then check whether a
        // `.update({...})` appears within the next few lines carrying a
        // protected column. The update payload is often multi-line.
        for (let i = 0; i < lines.length; i++) {
          if (!/from\(['"]users['"]\)/.test(lines[i])) continue;

          const window = lines.slice(i, i + 12).join('\n');
          const updateMatch = window.match(/\.update\(\{([\s\S]*?)\}\)/);
          if (!updateMatch) continue;

          const payload = updateMatch[1];
          for (const col of PROTECTED_COLUMNS) {
            const colPattern = new RegExp(`\\b${col}\\b\\s*:`);
            if (colPattern.test(payload)) {
              violations.push(
                `${file}:${i + 1} — direct update({ ${col}: ... }) on users table; use the server-side RPC instead`,
              );
            }
          }
        }
      }
    }
  });

  it('no client code writes protected user columns directly', () => {
    if (violations.length > 0) {
      throw new Error(
        `\nClient code attempts to write protected columns directly. ` +
          `These calls will be rejected at runtime by migration 017. ` +
          `Use set_admin_status() / activate_subscription() / debit_wallet() instead.\n\n` +
          violations.join('\n'),
      );
    }
  });

  it('protected column list is in sync with migration 017', () => {
    // Guards against drift between this test and the SQL. If a column is
    // added/removed from the protected set, both files must change together.
    const migrationPath = path.join(
      'supabase',
      'migrations',
      '017_enforce_user_flag_protection.sql',
    );
    const sql = fs.existsSync(migrationPath)
      ? fs.readFileSync(migrationPath, 'utf8')
      : '';

    expect(sql.length).toBeGreaterThan(0);

    for (const col of PROTECTED_COLUMNS) {
      // Each protected column must be checked by the trigger body.
      expect(sql).toMatch(new RegExp(`NEW\\.${col} IS DISTINCT FROM OLD\\.${col}`));
      // And must be present in the REVOKE statement.
      expect(sql.toLowerCase()).toContain(col.toLowerCase());
    }
  });

  it('rate_consultation has SET search_path (P1 fix in 015)', () => {
    // Migration 015 defines a SECURITY DEFINER function. Without
    // `SET search_path = public` it's vulnerable to search_path hijack
    // (a malicious user creates `public.consultations` that overrides
    // the legitimate table reference inside the function body).
    const migration015 = path.join(
      'supabase',
      'migrations',
      '015_rate_consultation.sql',
    );
    const sql = fs.existsSync(migration015)
      ? fs.readFileSync(migration015, 'utf8')
      : '';

    expect(sql.length).toBeGreaterThan(0);

    // Locate the function definition block and assert the GUC is set on
    // the CREATE OR REPLACE FUNCTION line (not inside the body).
    const functionDecl = sql.match(
      /CREATE OR REPLACE FUNCTION\s+rate_consultation[\s\S]*?AS \$\$/,
    );
    expect(functionDecl).not.toBeNull();
    expect(functionDecl![0]).toMatch(/SET search_path\s*=\s*public/);
  });

  it('every SECURITY DEFINER function in supabase/migrations/015+ sets search_path', () => {
    // Belt-and-suspenders: enforce the rule going forward so any future
    // SECURITY DEFINER function without SET search_path = public fails
    // the build. This is the P1 pattern from the audit.
    //
    // SCOPE: migrations 001-014 are grandfathered (they predate this rule
    // and a comprehensive retrofit is a separate, larger audit item).
    // A future migration 018+ may add a `018_search_path_retrofit.sql` to
    // bring the old ones into compliance; until then, we only enforce
    // the rule for new code.
    const migrationsDir = path.join('supabase', 'migrations');
    if (!fs.existsSync(migrationsDir)) {
      throw new Error(`migrations dir missing: ${migrationsDir}`);
    }

    const files = fs
      .readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort()
      .filter(f => {
        // Only enforce for migrations 015 and later. 001-014 are excluded
        // because retrofitting search_path on every existing SECURITY
        // DEFINER function is a separate (large) audit item.
        const m = f.match(/^(\d{3})_/);
        return m ? parseInt(m[1], 10) >= 15 : true;
      });

    const offenders: string[] = [];

    for (const file of files) {
      const text = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      const funcRegex =
        /CREATE(?:\s+OR\s+REPLACE)?\s+FUNCTION[\s\S]*?LANGUAGE\s+\w+([\s\S]*?)\s+AS \$\$/g;

      let match: RegExpExecArray | null;
      while ((match = funcRegex.exec(text)) !== null) {
        if (!/SECURITY\s+DEFINER/i.test(match[0])) continue;
        const header = match[1] ?? '';
        if (!/SET\s+search_path/i.test(header)) {
          const nameMatch = match[0].match(/FUNCTION\s+(?:public\.)?(\w+)/);
          offenders.push(`${file}: ${nameMatch?.[1] ?? '?'}`);
        }
      }
    }

    if (offenders.length > 0) {
      throw new Error(
        `\nSECURITY DEFINER functions in 015+ missing SET search_path:\n  - ` +
          offenders.join('\n  - ') +
          `\n\nAdd \`SET search_path = public\` to the function header.\n` +
          `See supabase/migrations/015_rate_consultation.sql for the pattern.`,
      );
    }
  });
});
