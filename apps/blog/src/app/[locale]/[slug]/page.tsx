import { getTranslations } from 'next-intl/server';
import fs from 'fs';
import path from 'path';
const LOCALES = ['en','zh','es','fr','de','ja','pt','ru','ar','ko','it','nl','tr','vi','id','th','hi','pl','sv','el','cs','ro','hu','fi','da','no','nb','uk','bg','hr','sr','sk','sl','ms','ka','he','sw','bn','ca','fa','ur','ta','af','sq','az','hy','be','ne','si','tl','te'];
export async function generateStaticParams() {
  const params: { locale: string; slug: string }[] = [];
  const base = path.join(process.cwd(), 'content');
  for (const locale of LOCALES) {
    const dir = path.join(base, locale);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
      if (f.endsWith('.mdx')) params.push({ locale, slug: f.replace(/\.mdx$/, '') });
    }
  }
  return params;
}
export default async function Post({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const files = fs.readdirSync(path.join(process.cwd(), 'content', locale)).filter(f => f.endsWith('.mdx')).map(f => f.replace(/\.mdx$/, ''));
  return (<main><h1>{slug.replace(/-/g, ' ')}</h1><p>Locale: {locale}</p></main>);
}
