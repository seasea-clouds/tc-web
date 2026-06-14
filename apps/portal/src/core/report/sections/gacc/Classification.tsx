'use client';
import SectionTitle from '../../components/SectionTitle'
import ValueCard from '../../components/ValueCard'
import { useT } from '@trade/ui';
export default function Classification({ result }: { result: any }) {
    const t = useT('ReportSection');
  const c = result.classification
  if (!c?.assignedHsChapter) return null
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <SectionTitle icon={'🔖'} label={t("sectionProductClassification")} tooltip={t("tooltipProductClassification")} />
      <div className="grid grid-cols-2 gap-3">
        <ValueCard label={t("valueHSChapter")} value={c.assignedHsChapter} />
        <ValueCard label={t("valueCIQCode")} value={c.ciqCode || '—'} />
        <ValueCard label={t("valueClassification")} value={c.isHighRisk ? `🔴 ${t('valueHighRisk')}` : `🟢 ${t('valueLowRisk')}`} />
        <ValueCard label={t("valueRiskReason")} value={c.riskReason || '—'} />
      </div>
    </div>
  )
}