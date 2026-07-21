/**
 * inject-version.mjs
 *
 * Prebuild script: reads VERSION from monorepo root (../../VERSION)
 * and injects it into the current app's package.json version field.
 * Falls back to the app's own package.json version if VERSION file is absent.
 *
 * Usage (in each app's package.json):
 *   "prebuild": "node ../../packages/scripts/inject-version.mjs"
 *
 * The authoritative version source is: <monorepo-root>/VERSION (or package.json)
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const cwd = process.cwd();
const versionFile = resolve(cwd, '../../VERSION');
const pkgFile = resolve(cwd, 'package.json');

const pkg = JSON.parse(readFileSync(pkgFile, 'utf-8'));

let version;
try {
  version = readFileSync(versionFile, 'utf-8').trim();
  if (!/^\d+\.\d+\.\d+/.test(version)) {
    console.warn(`⚠ VERSION file has invalid format "${version}", falling back to package.json`);
    version = pkg.version;
  }
} catch {
  console.log(`  (VERSION file absent, using package.json version ${pkg.version})`);
  version = pkg.version;
}

if (pkg.version !== version) {
  pkg.version = version;
  writeFileSync(pkgFile, JSON.stringify(pkg, null, 2) + '\n');
  console.log(`✓ ${pkg.name || 'app'}: version → ${version}`);
} else {
  console.log(`  ${pkg.name || 'app'}: version already ${version}`);
}
