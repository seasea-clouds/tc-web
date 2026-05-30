"use client";

import useSubsiteHref from '@/lib/useSubsiteHref';

const services = [
  {
    id: "gacc",
    title: "GACC Food Registration",
    desc: "Check if your food product needs GACC Decree 248 registration",
    icon: "🍷",
    price: "$1",
  },
  {
    id: "label",
    title: "Chinese Label Compliance",
    desc: "Verify your product label meets GB 7718 requirements",
    icon: "🏷️",
    price: "$1",
  },
  {
    id: "ccc",
    title: "CCC Certification",
    desc: "Find out if your product requires China Compulsory Certification",
    icon: "🔒",
    price: "$1",
  },
  {
    id: "nmpa",
    title: "Cosmetics Filing (NMPA)",
    desc: "Determine if your cosmetics need NMPA registration or filing",
    icon: "💄",
    price: "$1",
  },
  {
    id: "crossborder",
    title: "Cross-Border E-commerce",
    desc: "Check compliance requirements for selling on Tmall/JD/WeChat",
    icon: "🛒",
    price: "$1",
  },
  {
    id: "trademark",
    title: "Brand Protection",
    desc: "Assess your trademark registration needs in China",
    icon: "🛡️",
    price: "$1",
  },
];

export default function HomePage() {
  const subsiteHref = useSubsiteHref();
  return (
    <main className="min-h-screen bg-bg-ice">
      {/* Hero */}
      <section className="bg-primary-navy text-white py-16 text-center">
        <div className="max-w-4xl mx-auto px-4">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            China Compliance Self-Check
          </h1>
          <p className="text-white/80 text-lg max-w-2xl mx-auto">
            Find out in 3 steps what compliance requirements apply to your product
            before exporting to China.
          </p>
        </div>
      </section>

      {/* Service Cards */}
      <section className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((svc) => (
            <a
              key={svc.id}
              href={subsiteHref(`/check/${svc.id}`)}
              className="block bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md hover:border-gold/50 transition-all p-6 group"
            >
              <div className="text-3xl mb-3">{svc.icon}</div>
              <h2 className="font-semibold text-primary-navy text-lg mb-2 group-hover:text-gold transition-colors">
                {svc.title}
              </h2>
              <p className="text-sm text-gray-500 mb-4">{svc.desc}</p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Starts at</span>
                <span className="font-bold text-gold">{svc.price}</span>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-white py-12 border-t border-gray-200">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold text-primary-navy mb-8">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: "1", title: "Tell us about your product", desc: "Fill in category, origin, and product details" },
              { step: "2", title: "Get your free assessment", desc: "Instant result — no payment or registration needed" },
              { step: "3", title: "Unlock the full report", desc: "Pay $0.99 for a comprehensive compliance report" },
            ].map((item) => (
              <div key={item.step} className="space-y-2">
                <div className="w-10 h-10 bg-gold text-primary-navy rounded-full flex items-center justify-center font-bold mx-auto">
                  {item.step}
                </div>
                <h3 className="font-semibold text-primary-navy">{item.title}</h3>
                <p className="text-sm text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-12">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold text-primary-navy mb-8">Simple Pricing</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="font-bold text-lg text-primary-navy">Free</h3>
              <p className="text-3xl font-bold text-primary-navy my-4">$0</p>
              <p className="text-sm text-gray-500">Basic assessment result</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border-2 border-gold p-6 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gold text-primary-navy text-xs font-semibold px-3 py-1 rounded-full">Popular</div>
              <h3 className="font-bold text-lg text-primary-navy">Single Report</h3>
              <p className="text-3xl font-bold text-gold my-4">$1</p>
              <p className="text-sm text-gray-500">Full report + PDF + email delivery</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="font-bold text-lg text-primary-navy">Monthly</h3>
              <p className="text-3xl font-bold text-primary-navy my-4">$9.9</p>
              <p className="text-sm text-gray-500">Unlimited reports for one month</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
