/**
 * Generate per-locale search index JSON files.
 * Reads messages/*.json + content/blog/{locale}/*.mdx
 * Outputs public/search-index-{locale}.json
 *
 * Run: node scripts/build-search-index.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const messagesDir = path.join(root, 'messages');
const blogDir = path.join(root, 'content', 'blog');
const outDir = path.join(root, 'public');

// Service info — keys match Navbar servicesDropdown + translation namespaces
const services = [
  { slug: 'gacc', ns: 'ServiceGacc', descNs: 'ServiceGacc' },
  { slug: 'label', ns: 'ServiceLabel', descNs: 'ServiceLabel' },
  { slug: 'ccc', ns: 'ServiceCcc', descNs: 'ServiceCcc' },
  { slug: 'cosmetics', ns: 'ServiceCosmetics', descNs: 'ServiceCosmetics' },
  { slug: 'ecommerce', ns: 'ServiceEcommerce', descNs: 'ServiceEcommerce' },
  { slug: 'brand', ns: 'ServiceBrand', descNs: 'ServiceBrand' },
];

// Map from Navbar servicesDropdown key → service slug
const navServiceKeys = ['gacc', 'label', 'ccc', 'cosmetics', 'ecommerce', 'brand'];

function getLocaleFiles() {
  return fs.readdirSync(messagesDir).filter(f => f.endsWith('.json'));
}

function loadMessages(locale) {
  const file = path.join(messagesDir, locale);
  const fullPath = fs.existsSync(`${file}.json`) ? `${file}.json` : file;
  return JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
}

function extractServices(msg) {
  return services.map(s => {
    const ns = msg[s.ns] || {};
    const title = ns.heroTitle || ns.title || s.slug;
    // Description: use heroSubtitle or first few words of description
    let desc = ns.heroSubtitle || ns.description || '';
    // Limit description length for index size
    if (desc.length > 200) desc = desc.slice(0, 200) + '…';
    return {
      type: 'service',
      title,
      desc,
      href: `/services/${s.slug}/`,
      searchable: `${title} ${desc} ${s.slug}`.toLowerCase(),
    };
  });
}

function extractBlog(locale, msg) {
  const localeBlogDir = path.join(blogDir, locale);
  if (!fs.existsSync(localeBlogDir)) return [];

  const blogT = msg.Blog || {};
  const posts = [];

  for (const file of fs.readdirSync(localeBlogDir).filter(f => f.endsWith('.mdx'))) {
    const content = fs.readFileSync(path.join(localeBlogDir, file), 'utf-8');
    const { data } = matter(content);
    const slug = data.slug || file.replace('.mdx', '');
    const title = data.title || '';
    const excerpt = data.excerpt || '';
    const category = data.category || '';
    const categoryKey = blogT[category] || category;

    if (!title) continue;

    posts.push({
      type: 'blog',
      title,
      desc: excerpt.slice(0, 200),
      href: `/blog/${slug}/`,
      category: categoryKey,
      searchable: `${title} ${excerpt} ${category}`.toLowerCase(),
    });
  }
  return posts;
}

function extractFAQ(msg) {
  const faq = msg.Faq || {};
  const items = [];
  const categories = ['general', 'gacc', 'label', 'ccc', 'cosmetics', 'ecommerce', 'brand'];

  for (const cat of categories) {
    const title = faq[`${cat}Title`] || '';
    // Collect all Q/A pairs
    for (let i = 1; i <= 20; i++) {
      const q = faq[`${cat}Q${i}`];
      const a = faq[`${cat}A${i}`];
      if (q && a) {
        items.push({
          type: 'faq',
          title: q,
          desc: a.slice(0, 200),
          href: '/faq/',
          category: title,
          searchable: `${q} ${a} ${title}`.toLowerCase(),
        });
      }
      // Sub-answers (Q3a/A3a)
      const qa = faq[`${cat}Q${i}a`];
      const aa = faq[`${cat}A${i}a`];
      if (qa && aa) {
        items.push({
          type: 'faq',
          title: qa,
          desc: aa.slice(0, 200),
          href: '/faq/',
          category: title,
          searchable: `${qa} ${aa} ${title}`.toLowerCase(),
        });
      }
    }
  }
  return items;
}

function generateIndex(locale) {
  const msg = loadMessages(locale);
  const services = extractServices(msg);
  const blog = extractBlog(locale, msg);
  const faq = extractFAQ(msg);

  return { services, blog, faq, generated: new Date().toISOString() };
}

// Main
const locales = getLocaleFiles().map(f => f.replace('.json', ''));
console.log(`Generating search index for ${locales.length} locales...`);

for (const locale of locales) {
  try {
    const index = generateIndex(locale);
    const outFile = path.join(outDir, `search-index-${locale}.json`);
    fs.writeFileSync(outFile, JSON.stringify(index), 'utf-8');
    const total = index.services.length + index.blog.length + index.faq.length;
    console.log(`  ${locale}: ${total} items (${index.services.length}S + ${index.blog.length}B + ${index.faq.length}F)`);
  } catch (err) {
    console.error(`  ${locale}: FAILED — ${err.message}`);
  }
}

console.log('Done.');
