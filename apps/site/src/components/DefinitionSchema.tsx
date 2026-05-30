import { getTranslations } from 'next-intl/server';

/**
 * T21: Definition (DefinedTerm) JSON-LD schema for key compliance terms.
 * Helps generative engines understand and cite domain terminology.
 * Renders as invisible <script> tags — no visual output.
 */
export default async function DefinitionSchema({
  locale,
  terms,
}: {
  locale: string;
  terms: { nameKey: string; definitionKey: string }[];
}) {
  const t = await getTranslations({ locale, namespace: 'DefinitionSchema' });

  const definitions = terms
    .filter(({ nameKey, definitionKey }) => t.has(nameKey) && t.has(definitionKey))
    .map(({ nameKey, definitionKey }) => ({
      '@context': 'https://schema.org',
      '@type': 'DefinedTerm',
      name: t(nameKey),
      termCode: nameKey.replace('Name', '').toUpperCase(),
      description: t(definitionKey),
      inDefinedTermSet: {
        '@type': 'DefinedTermSet',
        name: 'China Trade Compliance Glossary',
        url: `https://sinotradecompliance.com/${locale}/faq/`,
      },
    }));

  if (definitions.length === 0) return null;

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'DefinedTermSet',
        name: 'China Trade Compliance Glossary',
        url: `https://sinotradecompliance.com/${locale}/faq/`,
        hasDefinedTerm: definitions,
      }) }}
    />
  );
}
