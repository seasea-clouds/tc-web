'use client';
import SectionTitle from '../../components/SectionTitle'
import { useT } from '@trade/ui';
export default function CustomsClearance({ result }: { result: any }) {
    const t = useT('ReportSection');
  const steps = [
    { phase: t('customsPreArrival'), actions: t('customsPreArrivalAction'), responsible: t('customsPreArrivalResp') },
    { phase: t('customsPortArrival'), actions: t('customsPortArrivalAction'), responsible: t('customsPortArrivalResp') },
    { phase: t('customsLabTesting'), actions: t('customsLabTestingAction'), responsible: t('customsLabTestingResp') },
    { phase: t('customsClearance'), actions: t('customsClearanceAction'), responsible: t('customsClearanceResp') },
  ]
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <SectionTitle icon="🚢" label={t("sectionCustomsClearancePortEntry")} />
      <div className="space-y-3">
        {steps.map((s, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-primary-navy text-white flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</div>
            <div className="flex-1 bg-gray-50 rounded-lg p-3">
              <div className="flex justify-between items-start">
                <h3 className="text-sm font-semibold text-gray-900">{s.phase}</h3>
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${s.responsible === 'CIQ' ? 'bg-red-100 text-red-700' : s.responsible === 'Forwarder' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>{s.responsible}</span>
              </div>
              <p className="text-xs text-gray-600 mt-1">{s.actions}</p>
            </div>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-gray-400 mt-3 italic">{t("customsTimelineNote")}</p>
    </div>
  )
}