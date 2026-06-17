import { getTranslations } from 'next-intl/server';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { locales, defaultLocale } from '@/i18n/routing';
import { AutoBreadcrumb, buildAlternates, buildLanguages, sharedOpenGraph, sharedTwitter } from '@trade/ui';

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const filePath = path.join(process.cwd(), 'content', locale, `${slug}.mdx`);
  if (!fs.existsSync(filePath)) {
    return { title: 'Post Not Found' };
  }
  const raw = fs.readFileSync(filePath, 'utf-8');
  const { data } = matter(raw);
  const title = data.title || slug.replace(/-/g, ' ');
  const description = data.excerpt || '';
  const url = `https://sinotradecompliance.com/${locale}/blog/${slug}/`;
  return {
    title,
    description,
    openGraph: sharedOpenGraph({ title, description, locale, url }),
    twitter: sharedTwitter({ title, description }),
    alternates: {
      canonical: url,
      languages: buildLanguages(locale, [...locales], `/blog/${slug}/`),
    },
  };
}

export default async function BlogSlugLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const validLocale = locales.includes(locale as any) ? locale : defaultLocale;

  // Read translated title from MDX frontmatter
  const filePath = path.join(process.cwd(), 'content', validLocale, `${slug}.mdx`);
  let title: string | undefined;
  if (fs.existsSync(filePath)) {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const { data } = matter(raw);
    title = data.title || undefined;
  }

  return (
    <>
      <AutoBreadcrumb locale={validLocale} title={title} />
      {children}
    </>
  );
}
