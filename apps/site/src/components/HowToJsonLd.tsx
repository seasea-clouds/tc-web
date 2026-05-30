import { getTranslations } from 'next-intl/server';

/**
 * JSON-LD HowTo structured data for service pages.
 * Generates HowTo schema from process step translations.
 * Used by GEO engines (ChatGPT, Perplexity, Google AI Overview).
 */
export default async function HowToJsonLd({
  locale,
  namespace,
  url,
}: {
  locale: string;
  namespace: string;
  url: string;
}) {
  const t = await getTranslations({ locale, namespace });

  // Check if howtoTitle exists; if not, skip
  if (!t.has('howtoTitle')) return null;

  const howtoSteps = [];
  for (let i = 1; i <= 10; i++) {
    const nameKey = `howtoStep${i}Name`;
    const textKey = `howtoStep${i}Text`;
    if (t.has(nameKey) && t.has(textKey)) {
      howtoSteps.push({
        '@type': 'HowToStep',
        name: t(nameKey),
        text: t(textKey),
        position: i,
      });
    }
  }

  if (howtoSteps.length === 0) return null;

  const data = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: t('howtoTitle'),
    description: t('howtoDescription'),
    url,
    step: howtoSteps,
    provider: {
      '@type': 'Organization',
      name: 'SinoTrade Compliance',
      url: 'https://sinotradecompliance.com',
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
