#!/usr/bin/env node
/**
 * Backend portability inventory.
 *
 * Reports where the app depends on Supabase-specific features so a future
 * move to AWS/Neon or another Postgres host can be scoped honestly.
 * This is a report, not a build gate.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const AREAS = [
  {
    name: 'Database migrations',
    paths: ['supabase/migrations'],
    extensions: ['.sql'],
  },
  {
    name: 'Edge Functions',
    paths: ['supabase/functions'],
    extensions: ['.ts'],
  },
  {
    name: 'Client code',
    paths: ['app', 'services', 'utils', 'contexts', 'hooks', 'components', 'lib', 'config', 'constants', 'types'],
    extensions: ['.ts', '.tsx'],
  },
];

const CHECKS = [
  { label: 'auth.uid()', regex: /auth\.uid\(\)/g },
  { label: 'auth.role()', regex: /auth\.role\(\)/g },
  { label: 'auth.jwt()', regex: /auth\.jwt\(\)/g },
  { label: 'pg_cron / cron.schedule', regex: /pg_cron|cron\.(schedule|unschedule|job)/gi },
  { label: 'pg_net / net.http_*', regex: /pg_net|net\.http_(get|post)/gi },
  { label: 'storage.*', regex: /storage\./g },
  { label: 'vault.*', regex: /vault\./g },
  { label: 'realtime.*', regex: /realtime\./g },
  { label: 'supabase.from', regex: /supabase\.from\(/g },
  { label: 'supabase.rpc', regex: /supabase\.rpc\(/g },
  { label: 'supabase.functions.invoke', regex: /functions\.invoke\(/g },
  { label: 'supabase.auth.*', regex: /supabase\.auth\./g },
];

function collectFiles(area) {
  const files = [];
  for (const relative of area.paths) {
    const absolute = path.join(ROOT, relative);
    if (!fs.existsSync(absolute)) continue;
    const stack = [absolute];
    while (stack.length > 0) {
      const current = stack.pop();
      const entries = fs.readdirSync(current, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(current, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === '__tests__' || entry.name === 'node_modules') continue;
          stack.push(full);
        } else if (area.extensions.includes(path.extname(entry.name))) {
          files.push(full);
        }
      }
    }
  }
  return files;
}

function countMatches(content, regex) {
  return (content.match(regex) || []).length;
}

const report = {};
for (const area of AREAS) {
  const files = collectFiles(area);
  report[area.name] = { files: files.length, counts: {} };
  for (const check of CHECKS) {
    let total = 0;
    for (const file of files) {
      total += countMatches(fs.readFileSync(file, 'utf8'), check.regex);
    }
    report[area.name].counts[check.label] = total;
  }
}

const functionsDir = path.join(ROOT, 'supabase/functions');
const functions = fs.existsSync(functionsDir)
  ? fs.readdirSync(functionsDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort()
  : [];

console.log('Backend portability inventory');
console.log('==============================');
console.log('');

for (const [area, data] of Object.entries(report)) {
  console.log(`${area} (${data.files} files)`);
  for (const [label, count] of Object.entries(data.counts)) {
    if (count > 0) console.log(`  ${label}: ${count}`);
  }
  console.log('');
}

console.log(`Edge Functions (${functions.length}): ${functions.join(', ')}`);
console.log('');
console.log('Notes:');
console.log('- auth.uid()/auth.role()/auth.jwt() must be replaced with a JWT-claims helper');
console.log('  if the database moves off Supabase.');
console.log('- pg_cron/pg_net jobs need EventBridge/Lambda or an external scheduler.');
console.log('- client supabase.* calls are the API adapter surface; keep new access in services/.');
console.log('- storage.* / vault.* are the hardest to port if they grow; avoid adding them casually.');
