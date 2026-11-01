#!/usr/bin/env node
/**
 * Dependency audit gate.
 *
 * `npm audit` currently reports advisories in Expo's build toolchain that
 * cannot be fixed without moving off Expo SDK 54 (or, for node-forge, without
 * a fixed upstream release). Failing every CI run on those makes the gate
 * useless, so they are explicitly allowlisted here with a reason. Anything
 * new, and every critical advisory, still fails the build.
 *
 * Keep this list short and re-check it on every Expo SDK upgrade.
 */

const { execSync } = require('child_process');

const ALLOWED = {
  'node-forge':
    'Build-time only (@expo/cli code signing). No fixed node-forge release; ' +
    'not shipped in the app bundle.',
  'image-size':
    'Build-time only (Metro asset sizing). The fix requires an Expo/Metro ' +
    'upgrade outside the SDK 54 line.',
  'decode-uri-component':
    'Runtime URL parsing via expo-router/query-string. The fix requires a ' +
    'breaking expo-router major unrelated to app code.',
};

function readAudit() {
  try {
    return JSON.parse(
      execSync('npm audit --json', {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        maxBuffer: 20 * 1024 * 1024,
      }),
    );
  } catch (error) {
    // npm exits non-zero when advisories exist; the JSON report is still on
    // stdout and is what this gate evaluates.
    if (error.stdout) {
      try {
        return JSON.parse(error.stdout);
      } catch {
        // fall through
      }
    }
    throw error;
  }
}

let report;
try {
  report = readAudit();
} catch (error) {
  console.error('Unable to run npm audit:', error.message);
  process.exit(1);
}

const vulnerabilities = report.vulnerabilities || {};

/**
 * A parent package is reported as "vulnerable" when one of its dependencies
 * is vulnerable. Resolve the chain so allowlisting the actual upstream
 * package (node-forge) also covers Expo → @expo/cli → ... A package with its
 * own advisory object (not just a dependency name) is never inherited.
 */
function chainIsAllowlisted(name, seen = new Set()) {
  if (ALLOWED[name]) return true;
  if (seen.has(name)) return false;
  seen.add(name);

  const entry = vulnerabilities[name];
  if (!entry || !Array.isArray(entry.via) || entry.via.length === 0) return false;
  if (entry.via.some((via) => typeof via === 'object')) return false;
  return entry.via.every((dependency) => chainIsAllowlisted(dependency, seen));
}

const findings = Object.entries(vulnerabilities).filter(([, entry]) =>
  ['high', 'critical'].includes(entry.severity),
);

const critical = findings.filter(([name]) => vulnerabilities[name].severity === 'critical');
const accepted = findings.filter(
  ([name]) => vulnerabilities[name].severity === 'high' && chainIsAllowlisted(name),
);
const blocking = findings.filter(
  ([name]) => vulnerabilities[name].severity === 'high' && !chainIsAllowlisted(name),
);

for (const [name, entry] of accepted) {
  const directReason = ALLOWED[name];
  console.warn(
    `ACCEPTED ${entry.severity.toUpperCase()} ${name}: ` +
    (directReason || 'inherited from an allowlisted build-tooling dependency'),
  );
}

if (critical.length > 0) {
  for (const [name] of critical) console.error(`BLOCKING CRITICAL ${name}`);
  console.error('Dependency audit failed: critical vulnerabilities are never allowed.');
  process.exit(1);
}

if (blocking.length > 0) {
  for (const [name] of blocking) console.error(`BLOCKING HIGH ${name}`);
  console.error(
    'Dependency audit failed: new high-severity advisories. ' +
    'Fix them or document a time-boxed exception in scripts/check-npm-audit.js.',
  );
  process.exit(1);
}

console.log('Dependency audit passed (allowlisted toolchain advisories only).');
