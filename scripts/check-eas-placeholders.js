#!/usr/bin/env node
/**
 * Pre-flight check for EAS submit placeholders.
 *
 * `eas.json` ships with `REPLACE_WITH_*` placeholders that must be replaced
 * before the operator runs `eas submit`. This script fails the CI build if
 * any placeholder remains, catching the case where a developer runs EAS
 * submit from a stale branch.
 *
 * Usage: node scripts/check-eas-placeholders.js
 * Exits 0 if all placeholders are replaced, 1 otherwise.
 */
const fs = require('fs');
const path = require('path');

const PLACEHOLDERS = [
  'REPLACE_WITH_APP_STORE_CONNECT_APP_ID',
  'REPLACE_WITH_APP_STORE_CONNECT_APP_ID_STAGING',
  'REPLACE_WITH_APPLE_TEAM_ID',
  'CONFIGURE_EAS_PROJECT_ID_HERE',
];

const easPath = path.join(__dirname, '..', 'eas.json');
if (!fs.existsSync(easPath)) {
  console.error('eas.json not found');
  process.exit(1);
}

const raw = fs.readFileSync(easPath, 'utf8');
// Strip comments before scanning so doc-comments don't false-positive.
const stripped = raw.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');

const found = PLACEHOLDERS.filter((p) => stripped.includes(p));
if (found.length === 0) {
  console.log('OK: no EAS placeholders remain in eas.json');
  process.exit(0);
}

console.error('EAS placeholders still present in eas.json:');
for (const p of found) console.error(`  - ${p}`);
console.error('See scripts/check-eas-placeholders.js for instructions.');
process.exit(1);