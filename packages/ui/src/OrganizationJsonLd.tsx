interface Props {
  description?: string;
}

/**
 * JSON-LD structured data for Organization — shared by all three apps.
 * Uses hardcoded data instead of translations for simplicity, since
 * schema.org markup doesn't require language-specific content.
 * Accepts optional description override per app.
 */
export default function OrganizationJsonLd({ description }: Props) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'SinoTrade Compliance',
    description:
      description ??
      "China's one-stop import regulatory compliance service—GACC registration, Chinese labeling, CCC certification, NMPA cosmetics filing, cross-border e-commerce, and brand protection.",
    url: 'https://sinotradecompliance.com',
    logo: 'https://sinotradecompliance.com/logo.png',
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+86-21-xxxx-xxxx',
      email: 'david@sinotradecompliance.com',
      contactType: 'customer service',
      availableLanguage: [
        'Afrikaans', 'Arabic', 'Azerbaijani', 'Belarusian', 'Bengali', 'Bulgarian',
        'Catalan', 'Chinese', 'Croatian', 'Czech', 'Danish', 'Dutch', 'English',
        'Estonian', 'Finnish', 'French', 'German', 'Greek', 'Hebrew', 'Hindi',
        'Hungarian', 'Indonesian', 'Italian', 'Japanese', 'Korean', 'Latvian',
        'Lithuanian', 'Malay', 'Nepali', 'Norwegian', 'Persian', 'Polish',
        'Portuguese', 'Romanian', 'Russian', 'Serbian', 'Sinhala', 'Slovak',
        'Slovenian', 'Spanish', 'Swahili', 'Swedish', 'Tagalog', 'Tamil',
        'Thai', 'Turkish', 'Ukrainian', 'Urdu', 'Vietnamese',
      ],
    },

    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Shanghai',
      addressRegion: "Jing'an District",
      addressCountry: 'CN',
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
