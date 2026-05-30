import Image from 'next/image';

const partners = [
  { src: '/images/partners/agrosupply.webp', name: 'Agro Supply' },
  { src: '/images/partners/tiger-tea.webp', name: 'Tiger Tea Exports' },
  { src: '/images/partners/alpha-africa.webp', name: 'Alpha Group' },
  { src: '/images/partners/mambo-coffee.webp', name: 'Mambo Coffee' },
  { src: '/images/partners/eastern-produce.webp', name: 'Eastern Produce Kenya' },
  { src: '/images/partners/java-house.svg', name: 'Java House Africa' },
  { src: '/images/partners/aceli-africa.svg', name: 'Aceli Africa' },
  { src: '/images/partners/goldenpot.webp', name: 'Goldenpot' },
];

export default function TrustedBy({ t }: { t: (key: string) => string }) {
  return (
    <section className="py-16 bg-white">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold text-primary-navy text-center">
            {t('trustedByTitle')}
          </h2>
          <p className="mt-2 text-text-muted text-center">{t('trustedByDesc')}</p>
        </div>
        <div className="grid grid-cols-4 md:grid-cols-8 gap-6 items-center justify-items-center">
          {partners.map((p) => (
            <div
              key={p.name}
              className="w-20 h-14 md:w-24 md:h-16 flex items-center justify-center grayscale hover:grayscale-0 transition-all duration-300 opacity-70 hover:opacity-100"
              title={p.name}
            >
              <Image
                src={p.src}
                alt={p.name}
                width={120}
                height={60}
                className="max-w-full max-h-full object-contain"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
