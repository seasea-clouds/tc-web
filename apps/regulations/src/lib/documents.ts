import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

export interface DocMeta {
  slug: string;
  /** 本语言标题 */
  title: string;
  /** 发文字号，例如「海关总署令第 280 号」/「GACC Decree No. 280」 */
  docNumber: string;
  /** 发布机关代码：GACC / SAMR / NMPA / MOFCOM / STATE_COUNCIL */
  issuer: string;
  /** 发布日期 YYYY-MM-DD */
  publishedAt: string;
  publishedLabel: string;
  /** 施行日期 YYYY-MM-DD（可空） */
  effectiveAt: string;
  effectiveLabel: string;
  /** in_force | upcoming | amended | repealed | draft */
  status: string;
  /** 官方原文链接 */
  sourceUrl: string;
  /** 产品/业务类别（用于筛选），如 food / cosmetics / labelling */
  category: string;
  /** 一句话摘要（列表页与 SEO description） */
  excerpt: string;
  /** 关联的服务页，如 /services/gacc/ */
  relatedService?: string;
  /** 是否收录了官方原文（content/_source/<slug>.md） */
}

const CONTENT_DIR = () => path.join(process.cwd(), 'content');

/**
 * 政策文档按约定不使用封面图；保留函数以便将来需要时启用
 * （public/images/regulations/<slug>/cover.webp）。
 */
export function getCoverPath(slug: string): string | undefined {
  const file = path.join(process.cwd(), 'public', 'images', 'regulations', slug, 'cover.webp');
  if (!fs.existsSync(file)) return undefined;
  return `/images/regulations/${slug}/cover.webp`;
}

export interface Heading {
  level: number;
  text: string;
  id: string;
}

/**
 * Get all documents for a locale, sorted by publication date desc
 * (ties broken by doc number so the order is stable across builds).
 */
export function getDocuments(locale: string): DocMeta[] {
  const dir = path.join(CONTENT_DIR(), locale);
  if (!fs.existsSync(dir)) return [];

  return fs.readdirSync(dir)
    .filter((f) => f.endsWith('.mdx'))
    .map((f) => {
      const slug = f.replace(/\.mdx$/, '');
      const raw = fs.readFileSync(path.join(dir, f), 'utf-8');
      return parseDocument(slug, raw, locale);
    })
    .sort((a, b) => {
      const d = new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
      return d !== 0 ? d : b.docNumber.localeCompare(a.docNumber);
    });
}

/**
 * Locale tag for Intl. Chinese needs an explicit region, the other 47 codes
 * work as-is in Node's ICU and in browsers.
 */
function intlTag(locale: string): string {
  return locale === 'zh' ? 'zh-CN' : locale;
}

/** Long-form localised date: "24. Oktober 2026", "2026年10月24日", … */
export function formatDate(dateStr: string, locale: string): string {
  if (!dateStr) return '';
  const d = new Date(`${dateStr}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return dateStr;
  try {
    return d.toLocaleDateString(intlTag(locale), {
      year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC',
    });
  } catch {
    return dateStr;
  }
}

/** YAML 会把不带引号的 `2026-10-24` 解析成 Date，统一规范化成 YYYY-MM-DD。 */
function normaliseDate(raw: unknown): string {
  if (!raw) return '';
  if (raw instanceof Date) {
    return `${raw.getUTCFullYear()}-${String(raw.getUTCMonth() + 1).padStart(2, '0')}-${String(raw.getUTCDate()).padStart(2, '0')}`;
  }
  return String(raw);
}

export function parseDocument(slug: string, raw: string, locale = 'en'): DocMeta {
  const { data } = matter(raw);

  const publishedAt = normaliseDate(data.published_at ?? data.date);
  const effectiveAt = normaliseDate(data.effective_at);

  return {
    slug,
    title: data.title || slug.replace(/-/g, ' '),
    docNumber: data.doc_number || '',
    issuer: data.issuer || 'GACC',
    publishedAt,
    publishedLabel: formatDate(publishedAt, locale),
    effectiveAt,
    effectiveLabel: formatDate(effectiveAt, locale),
    status: data.status || 'in_force',
    sourceUrl: data.source_url || '',
    category: data.category || 'general',
    excerpt: data.excerpt || '',
    relatedService: data.related_service || undefined,
  };
}

/**
 * 正文按 `<!-- original -->` 切成两段：
 *   第 1 段 = 本站分析（analysis），第 2 段 = 该文书在本语言下的全文译本（translation）。
 * 没有分隔标记时整篇都算分析，页面上就不会出现译本区。
 */
export function splitBody(raw: string): { analysis: string; translation: string } {
  const { content } = matter(raw);
  const MARKER = '<!-- original -->';
  const idx = content.indexOf(MARKER);
  if (idx === -1) return { analysis: content.trim(), translation: '' };
  return {
    analysis: content.slice(0, idx).trim(),
    translation: content.slice(idx + MARKER.length).trim(),
  };
}

/**
 * Parse headings from MDX content for TOC.
 */
export function parseHeadings(raw: string): Heading[] {
  const { content } = matter(raw);
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
 * Apply inline markdown formatting (bold, italic, code, links) to a text string.
 */
function applyInlineFormatting(text: string): string {
  let result = text;
  // Inline code
  result = result.replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1.5 py-0.5 rounded text-sm text-[#1B365D]">$1</code>');
  // Bold
  result = result.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Italic
  result = result.replace(/\*(.+?)\*/g, '<em>$1</em>');
  // Images — must run before links, otherwise the leading "!" is left behind
  result = result.replace(
    /!\[([^\]]*)\]\(([^)]+)\)/g,
    (_m, alt: string, src: string) =>
      `<img src="${src.replace(/"/g, '&quot;')}" alt="${alt.replace(/"/g, '&quot;')}" loading="lazy" decoding="async" class="rounded-lg w-full my-6 border border-gray-200" />`,
  );
  // Links
  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-[#2563EB] hover:underline font-medium">$1</a>');
  return result;
}

/**
 * Process a pipe-separated table block into an HTML table.
 */
function processTableBlock(block: string): string {
  const lines = block.trim().split('\n').map(l => l.trim()).filter(l => l.startsWith('|'));
  if (lines.length < 3) return block; // Need at least header, separator, data rows

  // Skip separator line
  const headerLine = lines[0];
  const dataLines = lines.filter((l, i) => i > 0 && !/^\|[\s:-]+\|[\s:-]+\|/.test(l));

  const parseRow = (line: string): string[] => {
    const parts = line.split('|');
    // Remove empty first/last (from leading/trailing pipes)
    if (parts.length > 0 && parts[0].trim() === '') parts.shift();
    if (parts.length > 0 && parts[parts.length - 1].trim() === '') parts.pop();
    return parts.map(p => p.trim());
  };

  const headers = parseRow(headerLine);
  const rows = dataLines.map(parseRow);

  if (headers.length < 2) return block;

  let html = '<div class="overflow-x-auto mb-6">';
  html += '<table class="min-w-full border-collapse text-sm">';
  html += '<thead><tr>';
  for (const h of headers) {
    html += `<th class="bg-primary-navy text-white px-4 py-2 text-left font-semibold">${applyInlineFormatting(h)}</th>`;
  }
  html += '</tr></thead><tbody>';
  for (const row of rows) {
    if (row.length === 0) continue;
    html += '<tr class="border-b border-[#F4F6F9]">';
    for (let i = 0; i < headers.length; i++) {
      const cell = row[i] || '';
      html += `<td class="px-4 py-2 text-gray-700 border border-[#F4F6F9]">${applyInlineFormatting(cell)}</td>`;
    }
    html += '</tr>';
  }
  html += '</tbody></table></div>';
  return html;
}

/**
 * Check if a block is a pipe-separated table.
 */
function isTableBlock(block: string): boolean {
  const lines = block.trim().split('\n').map(l => l.trim()).filter(l => l.startsWith('|'));
  if (lines.length < 3) return false;
  // Check for separator line (|---| pattern)
  const hasSeparator = lines.some(l => /^\|[\s:-]+\|[\s:-]+\|/.test(l));
  if (!hasSeparator) return false;
  // Each line should have at least 2 pipes
  return lines.every(l => (l.match(/\|/g) || []).length >= 2);
}

/**
 * Check if a block is an ordered list (lines starting with "N. ").
 */
function isOrderedListBlock(block: string): boolean {
  const lines = block.trim().split('\n').filter(l => l.trim());
  if (lines.length < 1) return false;
  // Check if at least the first line matches "N. "
  return /^\d+\.\s/.test(lines[0].trim());
}

/**
 * Process an ordered list block into HTML.
 */
function processOrderedListBlock(block: string): string {
  const lines = block.trim().split('\n');
  let html = '<ol class="list-decimal pl-6 mb-6 space-y-2 text-gray-700 leading-relaxed">';
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    // Remove the "N. " prefix
    const content = trimmed.replace(/^\d+\.\s+/, '');
    html += `<li class="mb-1">${applyInlineFormatting(content)}</li>`;
  }
  html += '</ol>';
  return html;
}

/**
 * Check if a block is a checkbox list (lines starting with "- [ ]" or "- [x]").
 */
function isCheckboxBlock(block: string): boolean {
  const lines = block.trim().split('\n').filter(l => l.trim());
  if (lines.length < 1) return false;
  return /^-\s\[[ x]\]/i.test(lines[0].trim());
}

/**
 * Process a checkbox list block into HTML.
 */
function processCheckboxBlock(block: string): string {
  const lines = block.trim().split('\n');
  let html = '<ul class="list-none pl-0 mb-6 space-y-2">';
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const matches = trimmed.match(/^-\s+\[([ x])\]\s+(.+)$/i);
    if (!matches) continue;
    const checked = matches[1].toLowerCase() === 'x';
    const content = matches[2];
    html += '<li class="flex items-start gap-2">';
    html += `<input type="checkbox" disabled ${checked ? 'checked' : ''} class="mt-1.5 h-4 w-4 shrink-0 rounded border-gray-300 text-[#1B365D] focus:ring-[#1B365D]" />`;
    html += `<span class="text-gray-700">${applyInlineFormatting(content)}</span>`;
    html += '</li>';
  }
  html += '</ul>';
  return html;
}

/**
 * Process an unordered list block into HTML.
 */
function processUnorderedListBlock(block: string): string {
  const lines = block.trim().split('\n');
  let html = '<ul class="list-disc pl-6 mb-6 space-y-1 text-gray-700 leading-relaxed">';
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    // Remove "- " prefix
    const content = trimmed.replace(/^-\s+/, '');
    html += `<li class="mb-1">${applyInlineFormatting(content)}</li>`;
  }
  html += '</ul>';
  return html;
}

/**
 * Convert simple markdown (as used in regulation MDX files) to HTML.
 * Supports: headings (h2/h3), bold, italic, links, inline code, code blocks,
 * tables, ordered lists, unordered lists, checkboxes, blockquotes, horizontal rules.
 */
export function mdToHtml(md: string): string {
  let headingIdx = 0;

  // 1. Protect code blocks (placeholder tokens)
  const codeBlocks: string[] = [];
  let text = md.replace(/```(\w*)\n([\s\S]*?)```/g, (_m, _lang, code) => {
    const id = `%%CB${codeBlocks.length}%%`;
    codeBlocks.push(`<pre class="bg-gray-100 rounded-lg p-4 overflow-x-auto text-sm mb-6 border border-gray-200"><code>${escapeHtml(code.trim())}</code></pre>`);
    return id;
  });

  // 2. Process blocks line-by-line
  const lines = text.split('\n');
  const outputBlocks: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Empty line — skip
    if (!trimmed) {
      i++;
      continue;
    }

    // Code block placeholder — pass through
    if (/^%%CB\d+%%$/.test(trimmed)) {
      outputBlocks.push(trimmed);
      i++;
      continue;
    }

    // Heading h2
    const h2Match = trimmed.match(/^##\s+(.+)$/);
    if (h2Match) {
      const text = h2Match[1].trim();
      outputBlocks.push(`<h2 id="section-${headingIdx++}" class="text-2xl font-bold mt-10 mb-4 text-[#1B365D] scroll-mt-20">${applyInlineFormatting(text)}</h2>`);
      i++;
      continue;
    }

    // Heading h3
    const h3Match = trimmed.match(/^###\s+(.+)$/);
    if (h3Match) {
      const text = h3Match[1].trim();
      outputBlocks.push(`<h3 id="section-${headingIdx++}" class="text-xl font-bold mt-8 mb-3 text-[#1B365D] scroll-mt-20">${applyInlineFormatting(text)}</h3>`);
      i++;
      continue;
    }

    // Horizontal rule
    if (/^---\s*$/.test(trimmed)) {
      outputBlocks.push('<hr class="my-8 border-gray-300" />');
      i++;
      continue;
    }

    // Blockquote (single line)
    const bqMatch = trimmed.match(/^>\s+(.+)$/);
    if (bqMatch) {
      outputBlocks.push(`<blockquote class="border-l-4 border-[#D4AF37] pl-4 py-2 my-6 bg-[#F4F6F9] italic text-gray-600">${applyInlineFormatting(bqMatch[1])}</blockquote>`);
      i++;
      continue;
    }

    // Collect multi-line block for table / ordered list / unordered list / checkbox list / paragraph
    const blockLines: string[] = [trimmed];
    i++;
    while (i < lines.length) {
      const next = lines[i].trim();
      if (!next) break;
      if (/^##\s/.test(next) || /^###\s/.test(next)) break; // Next heading
      if (/^---\s*$/.test(next)) break; // Next hr
      blockLines.push(next);
      i++;
    }

    const block = blockLines.join('\n');

    // Determine block type and process
    if (isTableBlock(block)) {
      outputBlocks.push(processTableBlock(block));
    } else if (isOrderedListBlock(block)) {
      outputBlocks.push(processOrderedListBlock(block));
    } else if (isCheckboxBlock(block)) {
      outputBlocks.push(processCheckboxBlock(block));
    } else if (blockLines.every(l => /^-\s/.test(l))) {
      // All lines are unordered list items
      outputBlocks.push(processUnorderedListBlock(block));
    } else if (blockLines.length === 1 && /^\*\*(.+)\*\*:/.test(trimmed)) {
      // Bold label like "**Advantages:** text..."
      outputBlocks.push(`<p class="mb-6 leading-relaxed text-gray-700">${applyInlineFormatting(trimmed)}</p>`);
    } else {
      // Paragraph
      outputBlocks.push(`<p class="mb-6 leading-relaxed text-gray-700">${applyInlineFormatting(block)}</p>`);
    }
  }

  // 3. Restore code blocks
  let html = outputBlocks.join('\n');
  html = html.replace(/%%CB(\d+)%%/g, (_m, i) => codeBlocks[parseInt(i)]);

  return html;
}
