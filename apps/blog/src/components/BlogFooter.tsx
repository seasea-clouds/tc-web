// Simplified Footer reusing @trade/ui styles, no next-intl dependency
interface Props {
  locale: string;
}

export default function BlogFooter({ locale }: Props) {
  return (
    <footer className="bg-[#1B365D] py-12 sm:py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-white/70 text-sm">
          <div>
            <h4 className="text-white font-semibold mb-3">SinoTrade Compliance</h4>
            <p className="leading-relaxed text-white/50">
              Independent regulatory consulting for foreign companies entering the China market.
            </p>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-3">Quick Links</h4>
            <ul className="space-y-2">
              <li><a href={`/${locale}/`} className="hover:text-white transition-colors">Home</a></li>
              <li><a href={`/${locale}/about/`} className="hover:text-white transition-colors">About</a></li>
              <li><a href={`/${locale}/packages/`} className="hover:text-white transition-colors">Packages</a></li>
              <li><a href={`/${locale}/faq/`} className="hover:text-white transition-colors">FAQ</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-3">Services</h4>
            <ul className="space-y-2">
              <li><a href={`/${locale}/services/gacc/`} className="hover:text-white transition-colors">GACC Registration</a></li>
              <li><a href={`/${locale}/services/label/`} className="hover:text-white transition-colors">Label Compliance</a></li>
              <li><a href={`/${locale}/services/ccc/`} className="hover:text-white transition-colors">CCC Certification</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-3">Contact</h4>
            <p className="text-white/50">david@sinotradecompliance.com</p>
            <p className="text-white/50 mt-1">Jing'an District, Shanghai, China</p>
          </div>
        </div>
        <div className="border-t border-white/10 mt-8 pt-8 text-center text-white/40 text-xs">
          <p>© 2012-2026 SinoTrade Compliance. All rights reserved.</p>
          <p className="mt-1">Disclaimer: Independent regulatory consulting firm, not affiliated with GACC, NMPA, or any Chinese government agency.</p>
        </div>
      </div>
    </footer>
  );
}
