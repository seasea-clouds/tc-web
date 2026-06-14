'use client';
import SectionTitle from '../../components/SectionTitle'
import { useT } from '@trade/ui';
export default function SquattingRisk({ result }: { result: any }) {
    const t = useT('ReportSection');
  const sq = result.squattingGuide
  if (!sq) return null
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <SectionTitle icon="⚠️" label={t("sectionTrademarkSquattingRisk")} tooltip={t("tooltipTrademarkSquattingRisk")} />
      <div className="bg-red-50 rounded-lg p-3 border border-red-200 mb-3">
        <p className="text-xs font-bold text-red-800">{t("squattingRiskLabel")}: {sq.stats || t("valueHigh")} {t("squattingOfForeignBrandsSquatted")}</p>
        <p className="text-[10px] text-red-700 mt-1">{sq.risk}</p>
      </div>
      {/* Real-world case alert */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">
        <p className="text-[10px] font-bold text-amber-800 mb-1">💡 {t("squattingRealWorldCase")}</p>
        <p className="text-[10px] text-amber-700 leading-relaxed">
                  {t("squattingCaseDesc")}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs font-semibold text-green-700 mb-1">{t("labelPrevention")}</p>
          <ul className="space-y-1">
            {sq.prevention?.map((p: string, i: number) => (
              <li key={i} className="text-xs text-gray-600 flex items-start gap-1"><span className="text-green-500">✓</span>{p}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold text-amber-700 mb-1">{t("labelRemedy")}</p>
          <ul className="space-y-1">
            {sq.remedy?.map((r: string, i: number) => (
              <li key={i} className="text-xs text-gray-600 flex items-start gap-1"><span className="text-amber-500">→</span>{r}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
