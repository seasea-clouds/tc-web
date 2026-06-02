#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const dir = path.resolve(process.argv[2] || 'apps/portal/messages');
const en = JSON.parse(fs.readFileSync(path.join(dir, 'en.json'), 'utf-8'));

const files = fs.readdirSync(dir)
  .filter(f => f.endsWith('.json') && f !== 'en.json')
  .sort();

let totalAll = 0;
for (const file of files) {
  const filePath = path.join(dir, file);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  let changed = 0;

  for (const [ns, nsVal] of Object.entries(en)) {
    if (typeof nsVal !== 'object' || nsVal === null) continue;
    if (!data[ns]) data[ns] = {};
    for (const [key, enVal] of Object.entries(nsVal)) {
      if (typeof enVal !== 'string') continue;
      const cur = data[ns][key];
      if (cur === key || cur === undefined || cur === '') {
        data[ns][key] = enVal;
        changed++;
      }
    }
  }

  if (changed > 0) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
    console.log(`✅ ${file}: ${changed} keys synced`);
    totalAll += changed;
  } else {
    console.log(`⏭️  ${file}: unchanged`);
  }
}

console.log(`\nTotal: ${totalAll} keys synced across ${files.length} files.`);
