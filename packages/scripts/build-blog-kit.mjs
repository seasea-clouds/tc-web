#!/usr/bin/env node
/**
 * build-blog-kit.mjs — 打包投稿工具包（博客 + 法规同一包）
 *
 *   node packages/scripts/build-blog-kit.mjs
 *   → docs/blog-submission/dist/submission-kit.zip
 *
 * 内容：README.md / SPEC.md / locales.json / submitter_check.py / template/ / sample/
 * 打完后会对 sample/ 自动跑一次自检，确认工具包自带样例是合格的。
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');
const kitDir = path.join(repoRoot, 'docs/blog-submission');
const distDir = path.join(kitDir, 'dist');
const zipPath = path.join(distDir, 'submission-kit.zip');

const python = (() => {
  for (const bin of ['python3', '/root/.venv/bin/python']) {
    try {
      execFileSync(bin, ['-V'], { stdio: 'ignore' });
      return bin;
    } catch {
      /* next */
    }
  }
  throw new Error('找不到 python3');
})();

console.log('▶ 自查样例');
execFileSync(python, [path.join(kitDir, 'submitter_check.py'), path.join(kitDir, 'sample')], {
  stdio: 'inherit',
});

fs.rmSync(zipPath, { force: true });
fs.mkdirSync(distDir, { recursive: true });

const entries = ['README.md', 'SPEC.md', 'locales.json', 'glossary.json', 'submitter_check.py', 'template', 'template-regulation', 'sample'];
console.log('▶ 打包');
execFileSync(
  python,
  [
    '-c',
    `import zipfile, os, sys
root, out = sys.argv[1], sys.argv[2]
entries = sys.argv[3:]
with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    for entry in entries:
        p = os.path.join(root, entry)
        if os.path.isfile(p):
            z.write(p, entry)
            continue
        for dirpath, dirnames, filenames in os.walk(p):
            dirnames.sort()
            for f in sorted(filenames):
                full = os.path.join(dirpath, f)
                z.write(full, os.path.relpath(full, root))
print('files:', len(z.namelist()) if False else 'ok')`,
    kitDir,
    zipPath,
    ...entries,
  ],
  { stdio: 'inherit' },
);

const size = fs.statSync(zipPath).size;
console.log(`✓ ${path.relative(repoRoot, zipPath)}  ${(size / 1024).toFixed(1)} KB`);
