'use client';
import SectionTitle from '../../components/SectionTitle'
import { useT } from '@trade/ui';
import { localizeCost, localizeTimeline } from '../../localize';
export default function LabTesting({ result }: { result: any }) {
    const t = useT('ReportSection');
  if (!result.labTests?.length) return null
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <SectionTitle icon={'🔬'} label={t("sectionTestingRequirements")} />
      <div className="flex flex-wrap gap-2 mb-3">
        {result.labTests.map((t: string, i: number) => (
          <span key={i} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium border border-blue-100">{t}</span>
        ))}
      </div>
      {result.testCostRange && <p className="text-sm text-gray-500">{'💰'} {t('labelCostRange')}: <strong className="text-gray-900">{localizeCost(t, result.testCostRange)}</strong></p>}
      {result.labGuide && <p className="text-sm text-gray-600 mt-2">{localizeCost(t, localizeTimeline(t, result.labGuide))}</p>}
    </div>
  )
}