/**
 * FAQPage JSON-LD schema for Google rich snippets.
 * Renders structured data so Google can show Q&A in search results.
 * Props: items — array of { question, answer } (already translated).
 */

interface FaqPageSchemaProps {
  items: { question: string; answer: string }[];
}

export default function FaqPageSchema({ items }: FaqPageSchemaProps) {
  if (!items.length) return null;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
