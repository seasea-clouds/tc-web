import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { locales, defaultLocale } from '@/i18n/routing';
import { buildLanguages, sharedOpenGraph, sharedTwitter } from '@trade/ui';

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const filePath = path.join(process.cwd(), 'content', locale, `${slug}.mdx`);
  if (!fs.existsSync(filePath)) {
    return { title: 'Document Not Found' };
  }
  const { data } = matter(fs.readFileSync(filePath, 'utf-8'));
  const title = data.title || slug.replace(/-/g, ' ');
  const description = data.excerpt || '';
  const url = `https://sinotradecompliance.com/${locale}/regulations/${slug}/`;
  return {
    title,
    description,
    openGraph: sharedOpenGraph({ title, description, locale, url }),
    twitter: sharedTwitter({ title, description }),
    alternates: {
      canonical: url,
      languages: buildLanguages(locale, [...locales], `/regulations/${slug}/`),
    },
  };
}

export default async function RegulationSlugLayout({
  children,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string; slug: string }>;
}) {
  return <>{children}</>;
}
