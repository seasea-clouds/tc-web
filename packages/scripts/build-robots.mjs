#!/usr/bin/env node
/**
 * build-robots.mjs - 生成主站 robots.txt
 * 统一引用 sitemap.xml 和 llms.txt
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function generateRobots(baseUrl, outDir) {
  const content = `# AI Content Signals
Content-Signal: ai-train=yes, search=yes, ai-input=yes

# AI crawlers
User-agent: GPTBot
Allow: /

User-agent: Claude-Web
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: Googlebot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Perplexity-User
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: anthropic-ai
Allow: /

User-agent: CCBot
Allow: /

User-agent: bingbot
Allow: /

User-agent: Applebot
Allow: /

# All other crawlers
User-agent: *
Allow: /

Sitemap: ${baseUrl}/sitemap.xml
Sitemap: ${baseUrl}/llms.txt
`;

  fs.writeFileSync(path.join(outDir, 'robots.txt'), content, 'utf-8');
  console.log('✅ robots.txt generated');
}

function parseArgs() {
  const args = {};
  for (const arg of process.argv.slice(2)) {
    const m = arg.match(/^--([^=]+)=(.*)/);
    if (m) args[m[1]] = m[2];
  }
  return args;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { 'base-url': baseUrl } = parseArgs();
  if (!baseUrl) { console.error('Usage: --base-url=...'); process.exit(1); }
  generateRobots(baseUrl, process.cwd());
}
