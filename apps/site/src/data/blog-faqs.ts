/**
 * Blog FAQ data — used for FAQPage JSON-LD schema.
 * Keys: blog post slug. Each item = { question, answer }.
 */

export const blogFaqs: Record<string, Array<{ question: string; answer: string }>> = {
  "gacc-registration-guide": [
    {
      question: "What is GACC registration and who needs it?",
      answer: "GACC registration is mandatory for all overseas food manufacturing, processing, and storage facilities exporting to China. Implemented under Decrees 248 and 249 (January 1, 2022), it covers all food products — dairy, seafood, wine, baked goods, health supplements. Unregistered facilities cannot ship to China.",
    },
    {
      question: "How long does GACC registration take?",
      answer: "For the 18 high-risk food categories, registration goes through your country's competent authority and takes 2-6 months. For non-18-category products, direct CIFER system registration typically takes 2-4 weeks.",
    },
    {
      question: "How long is a GACC registration valid?",
      answer: "GACC registrations are valid for 5 years. Renewal applications must be submitted well in advance of expiration. Missing the deadline means your products cannot enter China until renewed.",
    },
    {
      question: "What documents are required?",
      answer: "Business registration certificate, food production license, facility information (address, capacity, layout), product list with HS/CIQ codes, quality management certificates (ISO 22000, HACCP, FSSC 22000), and current product labels for each SKU.",
    },
    {
      question: "What happens if I don't register?",
      answer: "Since January 1, 2022, Chinese customs has rejected shipments from unregistered facilities without exception. Products are held at customs and returned or destroyed.",
    },
  ],
  "china-label-compliance": [
    {
      question: "What is Chinese label compliance?",
      answer: "Chinese label compliance means your product labels meet China's GB 7718 standard and other applicable regulations. It's mandatory for all imported food and consumer products. Non-compliant labels result in customs rejection, even with approved GACC registration.",
    },
    {
      question: "What must be on a Chinese food label?",
      answer: "Product name, ingredient list, net content, manufacturer name and address, production date, shelf life, storage conditions, GACC registration number, country of origin, and Chinese distributor information — all in Simplified Chinese.",
    },
    {
      question: "Can I use sticker labels?",
      answer: "Yes, sticker labels are accepted if they meet GB 7718 requirements and are securely attached. However, some distributors prefer direct printing for a more professional appearance.",
    },
    {
      question: "How long does label review take?",
      answer: "Professional label review typically takes 3-5 business days, including checking all required elements, verifying translations, and ensuring compliance with the latest GB standards.",
    },
  ],
  "ccc-certification-explained": [
    {
      question: "What is CCC certification?",
      answer: "CCC (China Compulsory Certification) is mandatory for products in 17 categories imported into or manufactured in China, including electronics, automotive parts, safety glass, and children's toys. Without CCC certification, products cannot be imported, sold, or used in China.",
    },
    {
      question: "Which products need CCC?",
      answer: "Products in 17 categories: wires and cables, circuit switches, low-voltage electrical apparatus, small power motors, electric tools, welding machines, household appliances, audio/video equipment, IT equipment, lighting equipment, motor vehicles, safety glass, agricultural machinery, latex products, medical devices, fire fighting equipment, and security products.",
    },
    {
      question: "How long does CCC certification take?",
      answer: "Typically 3-6 months, depending on product category and complexity. It involves factory inspection, product testing at a designated Chinese laboratory, and documentation review.",
    },
    {
      question: "How much does CCC cost?",
      answer: "Typical costs range from $3,000 to $15,000+, including testing fees, factory inspection fees, and annual maintenance fees. Exact cost depends on the number of product models and testing requirements.",
    },
  ],
  "cosmetics-nmpa-filing": [
    {
      question: "What is NMPA cosmetics filing?",
      answer: "NMPA (National Medical Products Administration) filing is mandatory for all cosmetics imported into China. Both general cosmetics and special-use cosmetics must be filed or registered before they can be sold.",
    },
    {
      question: "What's the difference between general and special-use cosmetics?",
      answer: "General cosmetics include skincare, makeup, hair care, and perfume. Special-use cosmetics include sunscreens, hair dyes, hair growth products, hair removal products, and whitening/anti-freckle products, which require a more rigorous registration process.",
    },
    {
      question: "How long does NMPA filing take?",
      answer: "General cosmetics filing: 4-6 months. Special-use cosmetics registration: 8-12 months due to additional safety assessments and testing requirements.",
    },
    {
      question: "Do I need a Chinese responsible person?",
      answer: "Yes, overseas cosmetics companies must appoint a Chinese responsible person who handles NMPA filing, serves as the legal contact point, and assumes joint liability for product safety.",
    },
  ],
  "cross-border-ecommerce-china": [
    {
      question: "What is cross-border e-commerce (CBEC) in China?",
      answer: "CBEC allows overseas brands to sell directly to Chinese consumers through online platforms without traditional import channels. Products enjoy simplified regulatory requirements and lower tax rates compared to general trade imports.",
    },
    {
      question: "What products can be sold through CBEC?",
      answer: "China's Positive List covers over 1,400 product categories including most food products, cosmetics, health supplements, maternal/baby products, electronics, and more.",
    },
    {
      question: "What are CBEC advantages vs general trade?",
      answer: "No CCC required for many products, simplified NMPA filing for cosmetics, no GACC registration for certain food categories, lower tax rates (9.1% comprehensive tax vs 13% VAT + consumption tax), and faster market entry.",
    },
    {
      question: "Which platforms support CBEC?",
      answer: "Major platforms include Tmall Global, JD Worldwide, Kaola, Pinduoduo Global, and Douyin (TikTok) Global. You can also set up your own cross-border e-commerce website.",
    },
  ],
};
