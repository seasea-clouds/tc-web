'use client';

import useSubsiteHref from '@/lib/useSubsiteHref';

export default function PricingPage() {
  const href = (path: string) => `/en${path}`;
  const subsiteHref = useSubsiteHref();

  return (
    <main className="min-h-screen bg-bg-ice py-16">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <h1 className="text-3xl font-bold text-primary-navy mb-4">Simple Pricing</h1>
        <p className="text-gray-500 mb-12 max-w-2xl mx-auto">
          Pay only for what you need. Free assessment included.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Free */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <h2 className="text-lg font-semibold text-primary-navy">Free Check</h2>
            <p className="text-4xl font-bold text-primary-navy my-6">$0</p>
            <ul className="text-sm text-gray-500 space-y-3 mb-8">
              <li>Basic compliance assessment</li>
              <li>Instant results</li>
              <li>No registration needed</li>
            </ul>
            <a
              href={subsiteHref('/check/gacc')}
              className="inline-block w-full border-2 border-primary-navy text-primary-navy font-semibold py-2.5 rounded-md hover:bg-primary-navy hover:text-white transition-all"
            >
              Start Free
            </a>
          </div>

          {/* Single */}
          <div className="bg-white rounded-lg shadow-sm border-2 border-gold p-8 text-center relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gold text-primary-navy text-xs font-semibold px-4 py-1 rounded-full">
              Most Popular
            </div>
            <h2 className="text-lg font-semibold text-primary-navy">Single Report</h2>
            <p className="text-4xl font-bold text-gold my-6">$1</p>
            <ul className="text-sm text-gray-500 space-y-3 mb-8">
              <li>Complete compliance report</li>
              <li>Website &amp; PDF download</li>
              <li>Email delivery</li>
              <li>Printable / shareable</li>
            </ul>
            <button className="inline-block w-full bg-gold hover:bg-gold/90 text-primary-navy font-semibold py-2.5 rounded-md transition-all">
              Get Report — $1
            </button>
          </div>

          {/* Monthly */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <h2 className="text-lg font-semibold text-primary-navy">Monthly</h2>
            <p className="text-4xl font-bold text-primary-navy my-6">$9.9</p>
            <ul className="text-sm text-gray-500 space-y-3 mb-8">
              <li>Unlimited reports</li>
              <li>All 6 modules included</li>
              <li>Report history &amp; saved data</li>
              <li>Cancel anytime</li>
            </ul>
            <button className="inline-block w-full border-2 border-primary-navy text-primary-navy font-semibold py-2.5 rounded-md hover:bg-primary-navy hover:text-white transition-all">
              Subscribe $9.9/mo
            </button>
          </div>

          {/* Professional Service */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center flex flex-col">
            <h2 className="text-lg font-semibold text-primary-navy">Professional Service</h2>
            <p className="text-4xl font-bold text-primary-navy my-6">$500+</p>
            <ul className="text-sm text-gray-500 space-y-3 mb-8 flex-1">
              <li>Full compliance registration</li>
              <li>Documentation handling</li>
              <li>Government liaison</li>
              <li>Customs clearance support</li>
            </ul>
            <a
              href={href('/packages/')}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block w-full bg-primary-navy hover:bg-primary-navy/90 text-white font-semibold py-2.5 rounded-md transition-all"
            >
              Learn More &rarr;
            </a>
          </div>
        </div>

        <p className="text-xs text-gray-400 mt-8 max-w-lg mx-auto">
          The self-check tool provides preliminary guidance. Professional services are handled by our expert team.
        </p>
      </div>
    </main>
  );
}
