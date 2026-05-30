import { Shield, ArrowRight, DollarSign, Users } from 'lucide-react';

const icons = [Shield, ArrowRight, DollarSign, Users];

interface WhyUsCardsProps {
  count?: number;
  t: (key: string) => string;
}

export default function WhyUsCards({ count = 3, t }: WhyUsCardsProps) {
  const title = t('whyTitle');

  const cards = [];
  for (let i = 1; i <= count; i++) {
    cards.push({
      title: t(`whyCard${i}Title`),
      desc: t(`whyCard${i}Desc`),
      icon: (i - 1) % icons.length,
    });
  }

  const gridClass = count <= 2 ? 'md:grid-cols-2' : count === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2 lg:grid-cols-4';

  return (
    <section className="py-16 bg-bg-ice">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl md:text-3xl font-bold text-primary-navy mb-10 text-center">{title}</h2>
        <div className={`grid ${gridClass} gap-8`}>
          {cards.map((card, i) => {
            const Icon = icons[card.icon];
            return (
              <div key={i} className="bg-white rounded-lg shadow-md p-6 text-center">
                <div className="w-12 h-12 bg-accent-blue/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Icon className="w-6 h-6 text-accent-blue" />
                </div>
                <h3 className="text-lg font-bold text-primary-navy mb-2">{card.title}</h3>
                <p className="text-text-muted text-sm">{card.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
