'use client';
import SectionTitle from '../../components/SectionTitle'
import { useT } from '@trade/ui';
export default function AnimalTestingExempt({ result }: { result: any }) {
    const t = useT('ReportSection');
  const a = result.animalTestingExempt
  if (!a) return null

  const steps = [
    { label: t('animalCheckProductType'), yes: t('animalOrdinary'), no: t('animalSpecial'), yesNext: '→ ' + t('animalCheckGMP'), noNext: '→ ' + t('animalFullTesting') },
    { label: t('animalGMPCert'), yes: t('animalGMPValid'), no: t('animalGMPNo'), yesNext: '→ ' + t('animalApplyExemption'), noNext: '→ ' + t('animalTesting') },
    { label: t('animalExemptionReview'), yes: t('animalApproved'), no: t('animalRejected'), yesNext: '→ ' + t('animalApprovedNext'), noNext: '→ ' + t('animalRejectedNext') },
  ]

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <SectionTitle icon="🐰" label={t("sectionAnimalTestingExemption")} tooltip={t("tooltipAnimalTestingExemption")} />
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-green-50 rounded-lg p-3 border border-green-200">
          <p className="text-xs font-bold text-green-800">{t("animalEligible")}</p>
          <p className="text-[10px] text-green-700 mt-1">{a.eligible}</p>
        </div>
        <div className="bg-red-50 rounded-lg p-3 border border-red-200">
          <p className="text-xs font-bold text-red-800">{t("animalNotEligible")}</p>
          <p className="text-[10px] text-red-700 mt-1">{a.ineligible}</p>
        </div>
      </div>

      {/* Process flow */}
      <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
        <p className="text-xs font-semibold text-gray-700 mb-2">🔄 {t("animalDecisionFlow")}</p>
        <div className="space-y-2">
          {steps.map((s, i) => (
            <div key={i}>
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-primary-navy text-white flex items-center justify-center text-[9px] font-bold flex-shrink-0">{i+1}</span>
                <span className="text-xs font-medium text-gray-700">{s.label}</span>
              </div>
              <div className="ml-7 mt-1 grid grid-cols-2 gap-2">
                <div className="flex items-center gap-1 text-[10px] text-green-700">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full flex-shrink-0"></span>
                  <span>✅ {s.yes}</span>
                  <span className="text-gray-400">→</span>
                  <span className="text-gray-600">{s.yesNext}</span>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-red-700">
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full flex-shrink-0"></span>
                  <span>❌ {s.no}</span>
                  <span className="text-gray-400">→</span>
                  <span className="text-gray-600">{s.noNext}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {a.alternative && <p className="text-xs text-gray-600 mt-2"><strong>{t("labelAlternativeMethods")}:</strong> {a.alternative}</p>}
      {a.timeline && <p className="text-xs text-gray-500 mt-1"><strong>{t("labelTimeline")}:</strong> {a.timeline}</p>}
    </div>
  )
}
