/**
 * inject-version.mjs
 *
 * Prebuild script: reads VERSION from monorepo root (../../VERSION)
 * and injects it into the current app's package.json version field.
 *
 * Usage (in each app's package.json):
 *   "prebuild": "node ../../packages/scripts/inject-version.mjs"
 *
 * The authoritative version source is: <monorepo-root>/VERSION
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const cwd = process.cwd();
const versionFile = resolve(cwd, '../../VERSION');
const pkgFile = resolve(cwd, 'package.json');

let version;
try {
  version = readFileSync(versionFile, 'utf-8').trim();
} catch {
  console.error(`✗ Cannot read VERSION file at ${versionFile}`);
  process.exit(1);
}

if (!/^\d+\.\d+\.\d+/.test(version)) {
  console.error(`✗ Invalid version format in VERSION: "${version}"`);
  process.exit(1);
}

const pkg = JSON.parse(readFileSync(pkgFile, 'utf-8'));

if (pkg.version !== version) {
  pkg.version = version;
  writeFileSync(pkgFile, JSON.stringify(pkg, null, 2) + '\n');
  console.log(`✓ ${pkg.name || 'app'}: version → ${version}`);
} else {
  console.log(`  ${pkg.name || 'app'}: version already ${version}`);
}
