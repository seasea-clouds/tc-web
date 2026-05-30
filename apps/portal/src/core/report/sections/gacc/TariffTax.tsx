import SectionTitle from '../../components/SectionTitle'
import ValueCard from '../../components/ValueCard'
export default function TariffTax({ result }: { result: any }) {
  const t = result.tariffInfo
  if (!t || t.mfnRate === 'N/A') return null
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <SectionTitle icon="💰" label="Tariff & Tax Analysis" tooltip="综合关税 = 关税 + 增值税 + 消费税。FTA 成员国可享受优惠税率。" />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
        <ValueCard label="HS Code" value={t.hsCode || '—'} />
        <ValueCard label="MFN Rate" value={t.mfnRate || '—'} />
        <ValueCard label="VAT" value={t.vatRate || '—'} />
        <ValueCard label="Consumption Tax" value={t.consumptionTax || 'N/A'} />
        <ValueCard label="Total Tax Burden" value={t.totalTaxBurden || '—'} />
        <ValueCard label="FTA Rate" value={t.ftaRate || 'None'} />
      </div>
      {t.estimatedLandedCostExample && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-xs font-semibold text-blue-800 mb-1">📦 Landed Cost Example</p>
          <p className="text-xs text-blue-700">{t.estimatedLandedCostExample}</p>
        </div>
      )}
    </div>
  )
}
