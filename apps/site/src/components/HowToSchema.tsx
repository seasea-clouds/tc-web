/**
 * HowTo JSON-LD Schema Component
 * Generates structured data for step-by-step guide pages.
 * Schema type: https://schema.org/HowTo
 * Ideal for: GACC registration guides, CCC certification process, NMPA filing steps, etc.
 */
interface HowToStep {
  name: string;
  text: string;
  url?: string;
}

interface HowToSchemaProps {
  name: string;
  description: string;
  steps: HowToStep[];
  totalTime?: string; // ISO 8601 duration, e.g. "P30D"
  estimatedCost?: string;
  url?: string;
}

export default function HowToSchema({
  name,
  description,
  steps,
  totalTime,
  estimatedCost,
  url,
}: HowToSchemaProps) {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name,
    description,
    step: steps.map((step, index) => ({
      '@type': 'HowToStep',
      position: index + 1,
      name: step.name,
      text: step.text,
      ...(step.url ? { url: step.url } : {}),
    })),
  };

  if (totalTime) {
    schema.totalTime = totalTime;
  }
  if (estimatedCost) {
    schema.estimatedCost = {
      '@type': 'MonetaryAmount',
      currency: 'USD',
      value: estimatedCost,
    };
  }
  if (url) {
    schema.url = url;
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
