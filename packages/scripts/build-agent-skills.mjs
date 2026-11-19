#!/usr/bin/env node
/**
 * build-agent-skills.mjs — 生成 /.well-known/agent-skills/index.json
 *
 * 为什么改成构建期生成：
 *   这份文件原本是手写静态文件（apps/site/public/.well-known/agent-skills/index.json），
 *   写完就没人管，最终漂移成「Decree 248/249」—— 而站内正文早在 280 号令生效后
 *   就全面改口了，机器可读层成了唯一的错误残留。
 *   手写的会漂移，生成的不漂移。
 *
 * 数据来源（全部派生，不另抄一份）：
 *   服务清单   → apps/site/src/app/(site)/[locale]/services/ 下的目录名
 *   服务名称   → packages/ui/messages/en.json  Navbar.servicesDropdown.<key>
 *   服务描述   → apps/site/messages/en.json    Service<Key>.heroSubtitle
 *
 * 维护点只剩一个：SERVICE_TAGS（每个服务的检索标签）。
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');

/** 每个服务的检索标签（唯一需要人工维护的部分） */
const SERVICE_TAGS = {
  gacc: ['gacc', 'decree-280', 'food-registration', 'cifer', 'china-import'],
  label: ['gb-7718', 'food-label', 'nutrition-label', 'gb-28050', 'packaging'],
  ccc: ['ccc', 'compulsory-certification', 'cnca', 'product-safety', 'testing'],
  cosmetics: ['nmpa', 'cosmetics', 'csar', 'filing', 'special-use'],
  ecommerce: ['cbec', 'cross-border', 'positive-list', 'tmall-global', 'bonded'],
  brand: ['trademark', 'cnipa', 'madrid-system', 'ip-protection', 'squatting'],
};

/** 站点级描述（稳定不变，不随服务增删） */
const SITE_DESCRIPTION =
  'China regulatory compliance consulting — GACC food registration, Chinese label compliance, ' +
  'CCC certification, NMPA cosmetics filing, cross-border e-commerce and trademark registration.';

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

/** 从文件系统读真实存在的服务页，而不是维护一份手写清单 */
function discoverServices() {
  const dir = path.join(ROOT, 'apps/site/src/app/(site)/[locale]/services');
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .filter((name) => fs.existsSync(path.join(dir, name, 'page.tsx')))
    .sort();
}

export function buildAgentSkills(baseUrl, outDir) {
  const uiMessages = readJson(path.join(ROOT, 'packages/ui/messages/en.json'));
  const siteMessages = readJson(path.join(ROOT, 'apps/site/messages/en.json'));
  const serviceNames = uiMessages.Navbar.servicesDropdown;

  const services = discoverServices();
  const skills = [];
  const missing = [];

  for (const key of services) {
    const ns = 'Service' + key.charAt(0).toUpperCase() + key.slice(1);
    const name = serviceNames[key];
    const nsData = siteMessages[ns];
    const description = nsData?.heroSubtitle;

    if (!name || !description) {
      missing.push(`${key} (name=${!!name}, desc=${!!description})`);
      continue;
    }

    skills.push({
      name,
      type: 'service',
      description,
      url: `${baseUrl}/en/services/${key}/`,
      tags: SERVICE_TAGS[key] || [key],
    });
  }

  if (missing.length) {
    throw new Error(
      `agent-skills: 以下服务缺名称或描述，请补 packages/ui/messages/en.json 的 ` +
        `Navbar.servicesDropdown 或 apps/site/messages/en.json 的 heroSubtitle：${missing.join(', ')}`
    );
  }

  const payload = {
    $schema: 'https://agentskills.io/schema/v0.2.0',
    name: 'SinoTrade Compliance',
    description: SITE_DESCRIPTION,
    homepage: baseUrl,
    skills,
  };

  const dir = path.join(outDir, '.well-known/agent-skills');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.json'), JSON.stringify(payload, null, 2) + '\n', 'utf-8');

  console.log(`  ✅ agent-skills/index.json（${skills.length} 个服务）`);
  return payload;
}

// CLI 直跑（调试用）
if (process.argv[1] && process.argv[1].endsWith('build-agent-skills.mjs')) {
  const baseUrl = 'https://sinotradecompliance.com';
  buildAgentSkills(baseUrl, path.join(ROOT, 'apps/site/out'));
}
