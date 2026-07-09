'use client';
import SectionTitle from '../../components/SectionTitle'
import ExpertBox from '../../components/ExpertBox'
import { useT } from '@trade/ui';

/** Localize a date string like "January 1, 2022" to locale-aware format */
function localizeDate(dateStr: string, locale: string = 'en'): string {
  // Only try to parse if it looks like a month-day-year pattern
  // Skip placeholders like "See document", "Ongoing" or bare years like "2021"
  if (!dateStr || !/[A-Z][a-z]+ \d{1,2}, \d{4}/.test(dateStr)) return dateStr;
  const parsed = Date.parse(dateStr);
  if (isNaN(parsed)) return dateStr;
  try {
    return new Intl.DateTimeFormat(locale.replace('-', '_'), {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date(parsed));
  } catch {
    return dateStr;
  }
}

export default function Regulations({ result, locale }: { result: any; locale?: string }) {
    const t = useT('ReportSection');
  if (!result.regulations?.length) return null
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <SectionTitle icon="⚖️" label={t("sectionRegulatoryFramework")} />
      <div className="space-y-3">
        {result.regulations.map((reg: any, i: number) => (
          <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
            <span className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${reg.relevance === 'primary' ? 'bg-red-500' : 'bg-amber-400'}`} />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900">{reg.name}</p>
              <p className="text-xs text-gray-500">{reg.number} | {reg.issuingAuthority} | {t('labelEffective')}: {localizeDate(reg.effectiveDate, locale)}</p>
              <p className="text-sm text-gray-600 mt-1">{reg.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}