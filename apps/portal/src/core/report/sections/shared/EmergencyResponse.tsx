'use client';
import SectionTitle from '../../components/SectionTitle'
import { useT } from '@trade/ui';

const SCENARIOS = [
  {
    icon: '🚫',
    titleKey: 'emergencyScenario1Title',
    color: 'red',
    causeKey: 'emergencyScenario1Cause',
    responseKey: 'emergencyScenario1Response',
    basisKey: 'emergencyScenario1Basis',
    bgClass: 'bg-red-50 border-red-200',
    textClass: 'text-red-800',
    subClass: 'text-red-700',
  },
  {
    icon: '❌',
    titleKey: 'emergencyScenario2Title',
    color: 'red',
    causeKey: 'emergencyScenario2Cause',
    responseKey: 'emergencyScenario2Response',
    basisKey: 'emergencyScenario2Basis',
    bgClass: 'bg-red-50 border-red-200',
    textClass: 'text-red-800',
    subClass: 'text-red-700',
  },
  {
    icon: '⚠️',
    titleKey: 'emergencyScenario3Title',
    color: 'amber',
    causeKey: 'emergencyScenario3Cause',
    responseKey: 'emergencyScenario3Response',
    basisKey: 'emergencyScenario3Basis',
    bgClass: 'bg-amber-50 border-amber-200',
    textClass: 'text-amber-800',
    subClass: 'text-amber-700',
  },
]

export default function EmergencyResponse({ result }: { result: any }) {
    const t = useT('ReportSection');
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <SectionTitle icon="🚨" label={t("sectionEmergencyResponse")} />
      <div className="space-y-3">
        {SCENARIOS.map((s, i) => (
          <div key={i} className={`${s.bgClass} border rounded-lg p-3`}>
            <div className="flex items-start gap-2">
              <span className="text-lg">{s.icon}</span>
              <div>
                <h3 className={`text-xs font-bold ${s.textClass}`}>{t(s.titleKey)}</h3>
                <p className={`text-[10px] ${s.subClass} mt-0.5`}><strong>{t("labelCause")}:</strong> {t(s.causeKey)}</p>
                <p className="text-[10px] text-green-700 mt-0.5"><strong>{t("labelResponse")}:</strong> {t(s.responseKey)}</p>
                <p className="text-[9px] text-gray-500 mt-0.5">📋 {t(s.basisKey)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
