import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

export interface PostMeta {
  slug: string;
  title: string;
  date: string;
  category: string;
  excerpt: string;
  readTime: number;
  references?: { title: string; url: string }[];
}

export interface Heading {
  level: number;
  text: string;
  id: string;
}

/**
 * Get all posts for a locale, sorted by date descending.
 */
export function getPosts(locale: string): PostMeta[] {
  const contentDir = path.join(process.cwd(), 'content', locale);
  if (!fs.existsSync(contentDir)) return [];

  return fs.readdirSync(contentDir)
    .filter(f => f.endsWith('.mdx'))
    .map(f => {
      const slug = f.replace(/\.mdx$/, '');
      const raw = fs.readFileSync(path.join(contentDir, f), 'utf-8');
      return parsePost(slug, raw);
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

/**
 * Parse a single post from MDX content.
 */
export function parsePost(slug: string, raw: string): PostMeta {
  const { data, content } = matter(raw);

  const title = data.title || slug.replace(/-/g, ' ');
  const date = data.date || '';
  const category = data.category || 'Uncategorized';
  const excerpt = data.excerpt || '';
  const references = data.references || [];
  const wordCount = content.split(/\s+/).length;
  const readTime = Math.max(1, Math.ceil(wordCount / 200));

  return {
    slug,
    title,
    date,
    category,
    excerpt,
    readTime,
    references,
  };
}

/**
 * Parse headings from MDX content for TOC.
 */
export function parseHeadings(raw: string): Heading[] {
  const { content } = matter(raw);
  // Remove code blocks first to match mdToHtml behavior
  const noCode = content.replace(/```[\s\S]*?```/g, '');
  const headings: Heading[] = [];
  let idx = 0;
  const lines = noCode.split('\n');
  for (const line of lines) {
    const h2 = line.match(/^##\s+(.+)$/);
    const h3 = line.match(/^###\s+(.+)$/);
    if (h2) {
      headings.push({ level: 2, text: h2[1].replace(/[`*]/g, '').trim(), id: `section-${idx++}` });
    } else if (h3) {
      headings.push({ level: 3, text: h3[1].replace(/[`*]/g, '').trim(), id: `section-${idx++}` });
    }
  }
  return headings;
}

/**
 * Escape HTML special characters.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Convert simple markdown (as used in blog MDX files) to HTML.
 */
export function mdToHtml(md: string): string {
  let headingIdx = 0;
  let html = md;

  // Code blocks (fenced) — keep before other transformations
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_match, _lang, code) => {
    return `<pre class="bg-gray-100 rounded-lg p-4 overflow-x-auto text-sm mb-6 border border-gray-200"><code>${escapeHtml(code.trim())}</code></pre>`;
  });

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1.5 py-0.5 rounded text-sm text-[#1B365D]">$1</code>');

  // Headings (process line by line)
  const lines = html.split('\n');
  html = lines.map(line => {
    const h2 = line.match(/^##\s+(.+)$/);
    const h3 = line.match(/^###\s+(.+)$/);
    if (h2) {
      const text = h2[1].trim();
      return `<h2 id="section-${headingIdx++}" class="text-2xl font-bold mt-10 mb-4 text-[#1B365D] scroll-mt-20">${text}</h2>`;
    }
    if (h3) {
      const text = h3[1].trim();
      return `<h3 id="section-${headingIdx++}" class="text-xl font-bold mt-8 mb-3 text-[#1B365D] scroll-mt-20">${text}</h3>`;
    }
    return line;
  }).join('\n');

  // Bold & italic
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-[#2563EB] hover:underline font-medium">$1</a>');

  // Horizontal rules
  html = html.replace(/^---\s*$/gm, '<hr class="my-8 border-gray-300" />');

  // Unordered lists
  html = html.replace(/^- (.+)$/gm, '<li class="mb-1">$1</li>');
  html = html.replace(/((?:<li class="mb-1">.*<\/li>\n?)+)/g, '<ul class="list-disc pl-6 mb-6 space-y-1 text-gray-700 leading-relaxed">$1</ul>');

  // Blockquotes
  html = html.replace(/^> (.+)$/gm, '<blockquote class="border-l-4 border-[#D4AF37] pl-4 py-2 my-6 bg-[#F4F6F9] italic text-gray-600">$1</blockquote>');

  // Paragraphs — wrap remaining text blocks that aren't already HTML
  const finalBlocks = html.split(/\n\n+/);
  html = finalBlocks.map(block => {
    block = block.trim();
    if (!block) return '';
    // Already an HTML element
    if (block.startsWith('<')) return block;
    return `<p class="mb-6 leading-relaxed text-gray-700">${block}</p>`;
  }).join('\n');

  return html;
}
