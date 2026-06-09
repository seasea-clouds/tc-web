import { getTranslations } from 'next-intl/server';
import { sharedOpenGraph, sharedTwitter, buildLanguages } from '@trade/ui/seo';
import { splitByComma } from '@/lib/utils';
import { locales } from '@/i18n/routing';
import Hero from '@/components/Hero';
import ServicesGrid from '@/components/ServicesGrid';
import IndustriesPreview from '@/components/IndustriesPreview';
import TrustedBy from '@/components/TrustedBy';
import WhyUsCards from '@/components/WhyUsCards';
import ProcessSteps from '@/components/ProcessSteps';
import SocialProof from '@/components/SocialProof';
import AboutExpert from '@/components/AboutExpert';
import CTASection from '@/components/CTASection';
import FAQPreview from '@/components/FAQPreview';
import ContactForm from '@/components/ContactForm';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const locale = (await params).locale;
  const t = await getTranslations({ locale, namespace: 'Home' });

  return {
    title: t('metaTitle') || t('heroTitle'),
    description: t('metaDescription') || t('heroSubtitle'),
    openGraph: sharedOpenGraph({
      title: t('metaTitle') || t('heroTitle'),
      description: t('metaDescription') || t('heroSubtitle'),
      locale,
      url: `https://sinotradecompliance.com/${locale}/`,
    }),
    twitter: sharedTwitter({
      title: t('heroTitle'),
      description: t('heroSubtitle'),
    }),
    alternates: {
      canonical: `https://sinotradecompliance.com/${locale}/`,
      languages: buildLanguages(locale, [...locales], '/'),
    },
  };
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = (await params).locale;
  const homeT = await getTranslations({ locale, namespace: 'Home' });

  return (
    <main>
      <Hero />
      <ServicesGrid />
      <IndustriesPreview />
      <WhyUsCards count={4} t={homeT} />
      <SocialProof />
      <TrustedBy t={homeT} />
      <ProcessSteps t={homeT} />
      <AboutExpert />
      <CTASection t={homeT} />
      <FAQPreview locale={locale} t={homeT} />
      <ContactForm />
      <script id="jsonld-homepage" type="application/ld+json">
        {JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'ProfessionalService',
          name: 'SinoTrade Compliance',
          description: homeT('jsonldDescription'),
          url: 'https://sinotradecompliance.com',
          logo: 'https://sinotradecompliance.com/logo.png',
          image: 'https://sinotradecompliance.com/og-image.png',
          address: {
            '@type': 'PostalAddress',
            addressLocality: 'Shanghai',
            addressRegion: 'Jing\'an District',
            addressCountry: 'CN',
          },
          contactPoint: {
            '@type': 'ContactPoint',
            email: 'david@sinotradecompliance.com',
            telephone: '+86-21-XXXX-XXXX',
            contactType: 'customer service',
            availableLanguage: ['English', 'Chinese'],
          },
          areaServed: 'Worldwide',
          serviceType: splitByComma(homeT('jsonldServiceType')),
        })}
      </script>
    </main>
  );
}
