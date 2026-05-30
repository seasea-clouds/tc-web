import { getTranslations } from 'next-intl/server';
import { Link } from '@/src/i18n/navigation';
import fs from 'fs';
import path from 'path';
const LOCALES = ['en','zh','es','fr','de','ja','pt','ru','ar','ko','it','nl','tr','vi','id','th','hi','pl','sv','el','cs','ro','hu','fi','da','no','nb','uk','bg','hr','sr','sk','sl','ms','ka','he','sw','bn','ca','fa','ur','ta','af','sq','az','hy','be','ne','si','tl','te'];
export async function generateStaticParams() { return LOCALES.map(l => ({ locale: l })); }
export default async function BlogHome({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Blog' });
  const contentDir = path.join(process.cwd(), 'content', locale);
  let posts: string[] = [];
  if (fs.existsSync(contentDir)) posts = fs.readdirSync(contentDir).filter(f => f.endsWith('.mdx')).map(f => f.replace(/\.mdx$/, ''));
  return (<main><h1>{t('title')}</h1><ul>{posts.map(s => <li key={s}><Link href={`/${s}`}>{s.replace(/-/g, ' ')}</Link></li>)}</ul></main>);
}
