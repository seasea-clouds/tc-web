interface PackageComparisonTableProps {
  t: (key: string) => string;
  locale: string;
}

export default function PackageComparisonTable({ t, locale }: PackageComparisonTableProps) {
  const rows = [
    { feature: 'gaccRegistration', basic: true, advanced: true, premium: true },
    { feature: 'labelCompliance', basic: true, advanced: true, premium: true },
    { feature: 'complianceConsultation', basic: true, advanced: true, premium: true },
    { feature: 'crossBorderEcommerce', basic: false, advanced: true, premium: true },
    { feature: 'trademarkRegistration', basic: false, advanced: true, premium: true },
    { feature: 'customsIPRecordal', basic: false, advanced: true, premium: true },
    { feature: 'advertisingCompliance', basic: false, advanced: true, premium: true },
    { feature: 'cccCertification', basic: false, advanced: false, premium: true },
    { feature: 'nmpaCosmeticsFiling', basic: false, advanced: false, premium: true },
    { feature: 'piplDataCompliance', basic: false, advanced: false, premium: true },
    { feature: 'ongoingAdvisory', basic: false, advanced: false, premium: true },
  ];

  return (
    <div className="max-w-5xl mx-auto">
      <h3 className="text-2xl font-bold text-primary-navy text-center mb-8">{t('comparisonTitle')}</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-primary-navy/20">
              <th className="text-left py-4 px-4 text-text-charcoal font-semibold w-2/5">
                {t('comparisonFeature')}
              </th>
              <th className="text-center py-4 px-4 font-bold text-primary-navy w-1/5">
                {t('basicName')}
              </th>
              <th className="text-center py-4 px-4 font-bold text-accent-gold w-1/5 relative">
                <span className="text-xs font-medium text-white bg-accent-gold px-2 py-0.5 rounded-full block w-fit mx-auto -mt-2">{t('popular')}</span>
                {t('advancedName')}
              </th>
              <th className="text-center py-4 px-4 font-bold text-primary-navy w-1/5">
                {t('premiumName')}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className={i % 2 === 0 ? 'bg-bg-ice/30' : ''}>
                <td className="py-3 px-4 text-text-charcoal font-medium">{t(row.feature)}</td>
                <td className="text-center py-3 px-4">
                  {row.basic ? (
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-accent-green/10 text-accent-green">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    </span>
                  ) : (
                    <span className="inline-flex items-center justify-center w-6 h-6 text-text-muted/40">—</span>
                  )}
                </td>
                <td className="text-center py-3 px-4 bg-accent-gold/5">
                  {row.advanced ? (
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-accent-green/10 text-accent-green">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    </span>
                  ) : (
                    <span className="inline-flex items-center justify-center w-6 h-6 text-text-muted/40">—</span>
                  )}
                </td>
                <td className="text-center py-3 px-4">
                  {row.premium ? (
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-accent-green/10 text-accent-green">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    </span>
                  ) : (
                    <span className="inline-flex items-center justify-center w-6 h-6 text-text-muted/40">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-primary-navy/20">
              <td className="py-4 px-4"></td>
              <td className="text-center py-4 px-4">
                <a
                  href={`/${locale}/quote/?package=basic`}
                  className="inline-block font-semibold px-5 py-2.5 rounded-md border-2 border-primary-navy text-primary-navy hover:bg-primary-navy hover:text-white transition-all text-xs sm:text-sm whitespace-nowrap"
                >
                  {t('getStarted')}
                </a>
              </td>
              <td className="text-center py-4 px-4 bg-accent-gold/5">
                <a
                  href={`/${locale}/quote/?package=advanced`}
                  className="inline-block font-semibold px-5 py-2.5 rounded-md bg-accent-gold hover:bg-accent-gold/90 text-white transition-all text-xs sm:text-sm whitespace-nowrap shadow-sm"
                >
                  {t('getStarted')}
                </a>
              </td>
              <td className="text-center py-4 px-4">
                <a
                  href={`/${locale}/quote/?package=premium`}
                  className="inline-block font-semibold px-5 py-2.5 rounded-md border-2 border-primary-navy text-primary-navy hover:bg-primary-navy hover:text-white transition-all text-xs sm:text-sm whitespace-nowrap"
                >
                  {t('getStarted')}
                </a>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
