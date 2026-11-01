/**
 * RPC Authorization Audit
 *
 * Static audit of every SECURITY DEFINER function in supabase/migrations.
 * For each function it reports:
 *   - the last definition (later migrations override earlier ones)
 *   - whether the body references auth.uid() / is_admin()
 *   - the effective GRANT EXECUTE audience
 *
 * A SECURITY DEFINER function that is executable by `authenticated`, takes a
 * caller-supplied identifier, and never references auth.uid() is a candidate
 * privilege-escalation hole and must be reviewed by hand.
 *
 * Usage: node scripts/audit-rpc-auth.js
 */

const fs = require('fs');
const path = require('path');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'supabase', 'migrations');

const files = fs
  .readdirSync(MIGRATIONS_DIR)
  .filter(f => f.endsWith('.sql'))
  .sort();

/**
 * Functions that are intentionally callable by `authenticated` despite taking
 * a resource id and having no auth.uid() check. Each entry needs a reason
 * explaining why the id parameter is not an authorization boundary.
 */
const ALLOWLIST = {
  update_astrologer_rating:
    'Recomputes rating/total_reviews purely by aggregating consultations.user_rating for the given astrologer. The caller supplies only which row to recompute — no value is injectable, and the result is re-derived from source data. Called by the reviewing user in services/chat.ts.',
};

/** Strip SQL comments so prose about grants is not mistaken for a grant. */
const stripComments = sql =>
  sql.replace(/\/\*[\s\S]*?\*\//g, '').replace(/--[^\n]*/g, '');

/** name -> { file, body, definer } (last definition wins) */
const functions = new Map();
/** name -> Set of granted roles */
const grants = new Map();
/** name -> Set of revoked roles */
const revokes = new Map();

const addRole = (map, name, roles) => {
  if (!map.has(name)) map.set(name, new Set());
  roles
    .split(',')
    .map(r => r.trim().replace(/;$/, ''))
    .filter(Boolean)
    .forEach(r => map.get(name).add(r));
};

for (const file of files) {
  const sql = stripComments(fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8'));

  // Function definitions: capture from the CREATE to the terminating $$
  const defRe = /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+(?:public\.)?([a-z0-9_]+)\s*\(/gi;
  let m;
  while ((m = defRe.exec(sql)) !== null) {
    const name = m[1];
    // Body runs to the closing $$ that terminates the function
    const rest = sql.slice(m.index);
    const dollarStart = rest.indexOf('$$');
    let body = rest;
    if (dollarStart !== -1) {
      const dollarEnd = rest.indexOf('$$', dollarStart + 2);
      body = dollarEnd !== -1 ? rest.slice(0, dollarEnd) : rest;
    }
    functions.set(name, {
      file,
      body,
      definer: /SECURITY\s+DEFINER/i.test(body),
      signature: rest.slice(0, rest.indexOf(')') + 1),
    });
  }

  const grantRe = /GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+(?:public\.)?([a-z0-9_]+)\s*(?:\([^)]*\))?\s*TO\s+([^;]+);/gi;
  while ((m = grantRe.exec(sql)) !== null) addRole(grants, m[1], m[2]);

  const revokeRe = /REVOKE\s+(?:EXECUTE|ALL)\s+ON\s+FUNCTION\s+(?:public\.)?([a-z0-9_]+)\s*(?:\([^)]*\))?\s*FROM\s+([^;]+);/gi;
  while ((m = revokeRe.exec(sql)) !== null) addRole(revokes, m[1], m[2]);

  // Dynamic lockdown: a DO block that revokes via format() over a name array
  // (migration 023). Treat every name in the array as revoked from the roles
  // named in the templated REVOKE.
  const doBlockRe = /DO\s+\$\$([\s\S]*?)\$\$\s*;/gi;
  while ((m = doBlockRe.exec(sql)) !== null) {
    const block = m[1];
    const templated = block.match(
      /REVOKE\s+(?:EXECUTE|ALL)\s+ON\s+FUNCTION\s+%s\s+FROM\s+([^']+)'/i
    );
    if (!templated) continue;
    const arrayLiteral = block.match(/ARRAY\s*\[([\s\S]*?)\]/i);
    if (!arrayLiteral) continue;
    const names = [...arrayLiteral[1].matchAll(/'([a-z0-9_]+)'/gi)].map(x => x[1]);
    for (const n of names) addRole(revokes, n, templated[1]);
  }

  if (/GRANT\s+EXECUTE\s+ON\s+ALL\s+FUNCTIONS\s+IN\s+SCHEMA\s+public\s+TO\s+authenticated/i.test(sql)) {
    console.log(`NOTE  ${file}: blanket GRANT EXECUTE ON ALL FUNCTIONS TO authenticated`);
  }
}

const findings = [];

for (const [name, fn] of [...functions].sort()) {
  if (!fn.definer) continue;

  const granted = grants.get(name) ?? new Set();
  const revoked = revokes.get(name) ?? new Set();

  // Blanket grant in 001 reaches anything defined at that point; treat every
  // function as authenticated-callable unless explicitly revoked.
  const authenticatedCallable =
    !revoked.has('authenticated') &&
    !(granted.size > 0 && !granted.has('authenticated') && granted.has('service_role'));

  const checksCaller = /auth\.uid\(\)/.test(fn.body);
  const checksAdmin = /is_admin\s*\(|is_super_admin/.test(fn.body);

  // Does it accept a caller-supplied principal/resource id?
  const takesIdParam = /\bp_(user_id|astrologer_id|consultation_id|payment_id|target)\b/i.test(
    fn.signature
  );

  if (authenticatedCallable && takesIdParam && !checksCaller && !checksAdmin) {
    findings.push({ name, file: fn.file, granted: [...granted], reason: 'no auth.uid()/is_admin() check' });
  }
}

const unexpected = findings.filter(f => !ALLOWLIST[f.name]);
const allowed = findings.filter(f => ALLOWLIST[f.name]);

console.log('\n=== SECURITY DEFINER functions callable by `authenticated` with an id param and no auth check ===');
if (unexpected.length === 0) {
  console.log('none');
} else {
  for (const f of unexpected) {
    console.log(`RISK  ${f.name}  (${f.file})  grants=[${f.granted.join(', ') || 'default PUBLIC'}]  -> ${f.reason}`);
  }
}

if (allowed.length > 0) {
  console.log('\n--- reviewed and accepted ---');
  for (const f of allowed) {
    console.log(`OK    ${f.name}  (${f.file})\n      ${ALLOWLIST[f.name]}`);
  }
}

console.log(`\ntotal definer functions: ${[...functions.values()].filter(f => f.definer).length}`);
console.log(`unexpected: ${unexpected.length}   accepted: ${allowed.length}`);

if (unexpected.length > 0) {
  console.error(
    '\nFAILED: the functions above need an auth.uid()/is_admin() check, a service_role-only\n' +
    'grant, or an ALLOWLIST entry in this script justifying why the id is not an\n' +
    'authorization boundary.'
  );
  process.exit(1);
}
console.log('\nPASSED: no unreviewed privilege-escalation candidates.');
