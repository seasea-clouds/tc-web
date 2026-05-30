/**
 * Generate llms-{locale}.txt files for all 48 languages
 * Following llmstxt.org standard
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const messagesDir = path.join(__dirname, "../messages");
const outputDir = path.join(__dirname, "../public");
const outDir = path.join(__dirname, "../out");

// Get all locale files
const locales = fs
  .readdirSync(messagesDir)
  .filter((f) => f.endsWith(".json"))
  .map((f) => f.replace(".json", ""));

console.log(`Generating llms.txt for ${locales.length} languages...`);

for (const locale of locales) {
  const messages = JSON.parse(
    fs.readFileSync(path.join(messagesDir, `${locale}.json`), "utf-8")
  );

  // Helper to safely get nested translation
  const t = (namespace, key, fallback = "") => {
    try {
      return messages[namespace]?.[key] || fallback;
    } catch {
      return fallback;
    }
  };

  // Helper to get all FAQ Q&A from categorized structure
  const faqQa = [];
  const faq = messages.Faq || {};
  const categories = ["brand", "ccc", "cosmetics", "ecommerce", "gacc", "general", "label"];
  
  // Collect all Q&A pairs grouped by category
  const qaByCategory = {};
  for (const key of Object.keys(faq)) {
    for (const cat of categories) {
      const prefix = cat;
      const catUpper = cat.charAt(0).toUpperCase() + cat.slice(1);
      
      if (key.startsWith(`${prefix}Q`)) {
        const num = key.replace(`${prefix}Q`, "");
        const aKey = `${prefix}A${num}`;
        const q = faq[key];
        const a = faq[aKey];
        if (q && a) {
          if (!qaByCategory[catUpper]) qaByCategory[catUpper] = [];
          qaByCategory[catUpper].push({ q, a });
        }
      }
    }
  }
  
  // Flatten in order
  for (const cat of Object.keys(qaByCategory)) {
    faqQa.push({ category: cat, items: qaByCategory[cat] });
  }

  // Helper to get glossary terms
  const terms = [];
  for (const key of Object.keys(messages.DefinitionSchema || {})) {
    if (key.endsWith("Name")) {
      const nameKey = key;
      const defKey = key.replace("Name", "Definition");
      const name = t("DefinitionSchema", nameKey);
      const def = t("DefinitionSchema", defKey);
      if (name && def) {
        terms.push({ name, def });
      }
    }
  }

  // Build llms.txt content
  const companyName = t("OrganizationJsonLd", "name", "SinoTrade Compliance");
  const companyDesc = t("OrganizationJsonLd", "description", "");
  const heroTitle = t("Home", "heroTitle", "");
  const heroSubtitle = t("Home", "heroSubtitle", "");

  // Services
  const services = [
    {
      name: t("Services", "gaccTitle"),
      desc: t("ServiceGacc", "heroSubtitle"),
      url: "/services/gacc",
    },
    {
      name: t("Services", "labelTitle"),
      desc: t("ServiceLabel", "heroSubtitle"),
      url: "/services/label",
    },
    {
      name: t("Services", "cccTitle"),
      desc: t("ServiceCcc", "heroSubtitle"),
      url: "/services/ccc",
    },
    {
      name: t("Services", "cosmeticsTitle"),
      desc: t("ServiceCosmetics", "heroSubtitle"),
      url: "/services/cosmetics",
    },
    {
      name: t("Services", "ecommerceTitle"),
      desc: t("ServiceEcommerce", "heroSubtitle"),
      url: "/services/ecommerce",
    },
    {
      name: t("Services", "brandTitle"),
      desc: t("ServiceBrand", "heroSubtitle"),
      url: "/services/brand",
    },
  ].filter((s) => s.name);

  // Why choose us cards
  const whyCards = [];
  for (let i = 1; i <= 4; i++) {
    const title = t("Home", `whyCard${i}Title`);
    const desc = t("Home", `whyCard${i}Desc`);
    if (title && desc) {
      whyCards.push({ title, desc });
    }
  }

  // Packages info
  const packages = [];
  for (const pkg of ["basic", "advanced", "premium"]) {
    const name = t("Packages", `${pkg}Name`);
    const desc = t("Packages", `${pkg}Desc`);
    if (name && desc) {
      packages.push({ name, desc });
    }
  }

  // Build the text
  let lines = [];

  // Header
  lines.push(`# ${companyName}`);
  lines.push("");
  if (companyDesc) lines.push(companyDesc);
  lines.push("");
  if (heroTitle) lines.push(`## ${heroTitle}`);
  if (heroSubtitle) lines.push(heroSubtitle);
  lines.push("");

  // Website info
  lines.push("## Website");
  lines.push("https://sinotradecompliance.com");
  lines.push("");

  // Services section
  lines.push("## Services");
  lines.push("");
  for (const service of services) {
    lines.push(`### ${service.name}`);
    lines.push(service.desc);
    lines.push(`URL: https://sinotradecompliance.com${service.url}`);
    lines.push("");
  }

  // Why choose us
  if (whyCards.length > 0) {
    lines.push("## Why Choose Us");
    lines.push("");
    for (const card of whyCards) {
      lines.push(`- **${card.title}**: ${card.desc}`);
    }
    lines.push("");
  }

  // Packages
  if (packages.length > 0) {
    lines.push("## Compliance Packages");
    lines.push("");
    for (const pkg of packages) {
      lines.push(`### ${pkg.name}`);
      lines.push(pkg.desc);
      lines.push("");
    }
  }

  // Key terms / Glossary
  if (terms.length > 0) {
    lines.push("## Key Regulatory Terms");
    lines.push("");
    for (const term of terms) {
      lines.push(`- **${term.name}**: ${term.def}`);
    }
    lines.push("");
  }

  // FAQ grouped by category
  if (faqQa.length > 0) {
    lines.push("## Frequently Asked Questions");
    lines.push("");
    for (const group of faqQa) {
      lines.push(`### ${group.category}`);
      lines.push("");
      for (const qa of group.items) {
        lines.push(`Q: ${qa.q}`);
        lines.push(`A: ${qa.a}`);
        lines.push("");
      }
    }
  }

  // Contact
  lines.push("## Contact");
  const contactType = t("OrganizationJsonLd", "contactType", "customer service");
  lines.push(`${contactType}: ${companyName}`);
  lines.push("URL: https://sinotradecompliance.com");
  lines.push("");

  const content = lines.join("\n");
  const outputPath = path.join(outputDir, `llms-${locale}.txt`);
  fs.writeFileSync(outputPath, content, "utf-8");
  // Also write to out/ for CF Pages deployment
  const outPath = path.join(outDir, `llms-${locale}.txt`);
  fs.writeFileSync(outPath, content, "utf-8");
  console.log(`  ✅ llms-${locale}.txt (${content.length} chars)`);
}

// Generate aggregated llms-full.txt (all languages merged)
const sections = locales.map(locale => {
  const fp = path.join(outputDir, `llms-${locale}.txt`);
  if (fs.existsSync(fp)) {
    return `## ${locale}\n\n${fs.readFileSync(fp, 'utf-8')}`;
  }
  return '';
}).filter(Boolean);
const fullContent = sections.join('\n\n---\n\n');
fs.writeFileSync(path.join(outputDir, 'llms-full.txt'), fullContent, 'utf-8');
fs.writeFileSync(path.join(outDir, 'llms-full.txt'), fullContent, 'utf-8');
console.log(`  ✅ llms-full.txt (${fullContent.length} chars, ${sections.length} languages)`);

console.log(`\nDone: Generated ${locales.length} llms.txt files`);
