#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const dir = path.resolve('apps/portal/messages');
const en = JSON.parse(fs.readFileSync(path.join(dir, 'en.json'), 'utf-8'));

const files = fs.readdirSync(dir)
  .filter(f => f.endsWith('.json') && f !== 'en.json')
  .sort();

for (const file of files) {
  const filePath = path.join(dir, file);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  let totalChanges = 0;

  for (const [ns, nsVal] of Object.entries(en)) {
    if (typeof nsVal !== 'object' || nsVal === null) continue;

    if (!data[ns]) data[ns] = {};

    let nsChanges = 0;
    for (const [key, enVal] of Object.entries(nsVal)) {
      if (typeof enVal !== 'string') continue;
      const cur = data[ns][key];
      if (cur === key) {
        data[ns][key] = enVal;
        nsChanges++;
      } else if (cur === undefined || cur === '') {
        data[ns][key] = enVal;
        nsChanges++;
      }
    }

    if (nsChanges > 0) {
      totalChanges += nsChanges;
    }
  }

  if (totalChanges > 0) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
    console.log(`✅ ${file}: ${totalChanges} keys synced`);
  } else {
    console.log(`⏭️  ${file}: unchanged`);
  }
}

console.log('\nDone.');
