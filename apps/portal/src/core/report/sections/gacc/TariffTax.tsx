'use client';
import SectionTitle from '../../components/SectionTitle'
import ValueCard from '../../components/ValueCard'
import { useT } from '@trade/ui';
export default function TariffTax({ result }: { result: any }) {
    const t = useT('ReportSection');
  const data = result.tariffInfo
  if (!data || data.mfnRate === 'N/A') return null
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <SectionTitle icon="💰" label={t("sectionTariffTaxAnalysis")} tooltip={t("tooltipTariffTaxAnalysis")} />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
        <ValueCard label={t("valueHSCode")} value={data.hsCode || '—'} />
        <ValueCard label={t("valueMFNRate")} value={data.mfnRate || '—'} />
        <ValueCard label={t("valueVAT")} value={data.vatRate || '—'} />
        <ValueCard label={t("valueConsumptionTax")} value={data.consumptionTax || 'N/A'} />
        <ValueCard label={t("valueTotalTaxBurden")} value={data.totalTaxBurden || '—'} />
        <ValueCard label={t("valueFTARate")} value={data.ftaRate || 'None'} />
      </div>
      {data.estimatedLandedCostExample && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-xs font-semibold text-blue-800 mb-1">📦 {t("gaccLandedCostExample")}</p>
          <p className="text-xs text-blue-700">{data.estimatedLandedCostExample}</p>
        </div>
      )}
    </div>
  )
}
