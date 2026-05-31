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
    const cells: string[] = [];
    // Split by pipe, but handle escaped pipes
    let current = '';
    let inCell = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '|') {
        if (inCell) {
          cells.push(current.trim());
          current = '';
          inCell = false;
        } else {
          inCell = true;
        }
      } else if (inCell) {
        current += ch;
      }
    }
    // Handle last cell
    if (current.trim()) cells.push(current.trim());
    return cells;
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
 * Convert simple markdown (as used in blog MDX files) to HTML.
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
