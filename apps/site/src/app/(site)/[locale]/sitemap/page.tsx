import { getTranslations } from 'next-intl/server';
import { locales } from '@/i18n/routing';
import { sharedOpenGraph, sharedTwitter, buildLanguages } from '@trade/ui/seo';
import { getAllPostSlugs } from '@/lib/blog';
import { industries } from '@/data/industries';
import Breadcrumb from '@/components/Breadcrumb';
import Link from 'next/link';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const locale = (await params).locale;
  const t = await getTranslations({ locale, namespace: 'Sitemap' });
  const title = t('metaTitle') || `Site Map - SinoTrade Compliance`;
  const description = t('metaDescription') || `Complete site map of SinoTrade Compliance - all services, industries, blog posts and pages.`;
  const url = `https://sinotradecompliance.com/${locale}/sitemap/`;
  return {
    title,
    description,
    openGraph: sharedOpenGraph({ title, description, locale, url }),
    twitter: sharedTwitter({ title, description }),
    alternates: {
      canonical: url,
      languages: buildLanguages(locale, [...locales], '/sitemap/'),
    },
  };
}

export default async function SitemapPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = (await params).locale;
  const t = await getTranslations({ locale, namespace: 'Sitemap' });
  const bcT = await getTranslations({ locale, namespace: 'breadcrumb' });
  const blogT = await getTranslations({ locale, namespace: 'Blog' });
  const svcT = await getTranslations({ locale, namespace: 'Services' });
  const indT = await getTranslations({ locale, namespace: 'IndustriesCommon' });

  // Blog posts
  const blogSlugs = getAllPostSlugs(locale);

  // Sections definition
  const sections = [
    {
      id: 'services',
      titleKey: 'servicesTitle',
      defaultTitle: 'Services',
      items: [
        { titleKey: 'gaccTitle', defaultTitle: 'GACC Food Registration', href: `/${locale}/services/gacc/` },
        { titleKey: 'labelTitle', defaultTitle: 'Chinese Label Compliance', href: `/${locale}/services/label/` },
        { titleKey: 'cccTitle', defaultTitle: 'CCC Certification', href: `/${locale}/services/ccc/` },
        { titleKey: 'cosmeticsTitle', defaultTitle: 'Cosmetics Filing (NMPA)', href: `/${locale}/services/cosmetics/` },
        { titleKey: 'ecommerceTitle', defaultTitle: 'Cross-border E-commerce', href: `/${locale}/services/ecommerce/` },
        { titleKey: 'brandTitle', defaultTitle: 'Brand Protection', href: `/${locale}/services/brand/` },
      ],
    },
    {
      id: 'industries',
      titleKey: 'industriesTitle',
      defaultTitle: 'Industries',
      items: industries.map((ind) => ({
        titleKey: `${ind.namespace.replace('Industry', '').toLowerCase()}Title`,
        defaultTitle: ind.slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        href: `/${locale}/industries/${ind.slug}/`,
        emoji: ind.emoji,
      })),
    },
    {
      id: 'blog',
      titleKey: 'blogTitle',
      defaultTitle: 'Blog',
      items: blogSlugs.map((slug) => ({
        titleKey: `post.${slug}.title`,
        defaultTitle: slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        href: `/${locale}/blog/${slug}/`,
      })),
    },
    {
      id: 'pages',
      titleKey: 'pagesTitle',
      defaultTitle: 'Other Pages',
      items: [
        { titleKey: 'home', defaultTitle: 'Home', href: `/${locale}/` },
        { titleKey: 'about', defaultTitle: 'About Us', href: `/${locale}/about/` },
        { titleKey: 'contact', defaultTitle: 'Contact', href: `/${locale}/#contact` },
        { titleKey: 'quote', defaultTitle: 'Get a Quote', href: `/${locale}/quote/` },
        { titleKey: 'faq', defaultTitle: 'FAQ', href: `/${locale}/faq/` },
        { titleKey: 'packages', defaultTitle: 'Packages', href: `/${locale}/packages/` },
        { titleKey: 'testimonials', defaultTitle: 'Testimonials', href: `/${locale}/testimonials/` },
      ],
    },
  ];

  return (
    <main>
      <Breadcrumb
        locale={locale}
        items={[
          { label: bcT('home'), href: `/${locale}/` },
          { label: t('pageTitle') || 'Site Map' },
        ]}
      />

      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl md:text-4xl font-bold text-primary-navy mb-2">
          {t('pageTitle') || 'Site Map'}
        </h1>
        <p className="text-text-muted mb-10 text-lg">
          {t('pageSubtitle') || 'Complete overview of all pages on our website.'}
        </p>

        <div className="space-y-10">
          {sections.map((section) => (
            <section key={section.id} id={section.id}>
              <h2 className="text-xl font-bold text-primary-navy mb-4 pb-2 border-b border-gray-200">
                {t(section.titleKey) || section.defaultTitle}
              </h2>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {section.items.map((item, idx) => (
                  <li key={idx}>
                    <Link
                      href={item.href}
                      className="text-accent-blue hover:text-primary-navy transition-colors inline-flex items-center gap-2 py-1"
                    >
                      {'emoji' in item && item.emoji && (
                        <span className="text-lg">{item.emoji as string}</span>
                      )}
                      <span>{item.defaultTitle}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
