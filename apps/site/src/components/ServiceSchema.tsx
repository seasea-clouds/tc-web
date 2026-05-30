/**
 * Service JSON-LD Schema Component
 * Generates structured data for service pages to improve SEO and AI engine visibility.
 * Schema type: https://schema.org/Service
 */
interface ServiceSchemaProps {
  name: string;
  description: string;
  url: string;
  serviceType?: string;
  areaServed?: string | string[];
  providerName?: string;
  providerUrl?: string;
}

export default function ServiceSchema({
  name,
  description,
  url,
  serviceType = 'Regulatory Compliance Consulting',
  areaServed = 'Worldwide',
  providerName = 'SinoTrade Compliance',
  providerUrl = 'https://sinotradecompliance.com',
}: ServiceSchemaProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name,
    description,
    url,
    serviceType,
    areaServed: Array.isArray(areaServed) ? areaServed : [areaServed],
    provider: {
      '@type': 'Organization',
      name: providerName,
      url: providerUrl,
    },
    serviceAudience: {
      '@type': 'Audience',
      audienceType: 'Overseas manufacturers and exporters',
      geographicScope: {
        '@type': 'Place',
        name: 'Worldwide',
      },
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
