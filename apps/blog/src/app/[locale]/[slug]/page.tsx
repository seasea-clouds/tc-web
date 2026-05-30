import fs from 'fs';
import path from 'path';

const LOCALES = [
  'en','zh','es','fr','de','ja','pt','ru','ar','ko','it','nl','tr','vi','id','th',
  'hi','pl','sv','el','cs','ro','hu','fi','da','no','nb','uk','bg','hr','sr','sk',
  'sl','ms','ka','he','sw','bn','ca','fa','ur','ta','af','sq','az','hy','be','ne','si','tl','te',
];

export async function generateStaticParams() {
  const params = [];
  for (const locale of LOCALES) {
    const dir = path.join(process.cwd(), 'content', locale);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
      if (f.endsWith('.mdx')) params.push({ locale, slug: f.replace(/\.mdx$/, '') });
    }
  }
  return params;
}

export default async function Post({ params }) {
  const { locale, slug } = await params;
  const filePath = path.join(process.cwd(), 'content', locale, `${slug}.mdx`);
  let title = slug.replace(/-/g, ' ');
  let content = '';
  if (fs.existsSync(filePath)) {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const m = raw.match(/^title:\s*(.+)$/m);
    if (m) title = m[1].replace(/^["']|["']$/g, '');
    content = raw.replace(/^---[\s\S]*?---\n*/, '').trim();
  }
  return (
    <article className="max-w-3xl mx-auto px-4 py-12">
      <a href={`/${locale}/`} className="text-[#2563EB] hover:underline mb-4 inline-block">&larr; Back</a>
      <h1 className="text-3xl font-bold text-[#1B365D] mb-6">{title}</h1>
      <div className="prose max-w-none leading-relaxed whitespace-pre-wrap text-gray-700">{content}</div>
    </article>
  );
}
