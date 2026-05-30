import SectionTitle from '../../components/SectionTitle'
export default function CSTaxGuide({ result }: { result: any }) {
  const t = result.cbTaxInfo
  if (!t) return null
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <SectionTitle icon="💰" label="Cross-Border Tax Guide" />
      <div className="space-y-3">
        <div className="bg-blue-50 rounded-lg p-3"><p className="text-xs font-bold text-blue-800">Calculation</p><p className="text-[10px] text-blue-700 mt-1">{t.calculation}</p></div>
        <div className="flex gap-3 text-xs text-gray-600"><span><strong>Threshold:</strong> {t.threshold}</span></div>
        {t.note && <p className="text-xs text-amber-600">{t.note}</p>}
        {t.example && <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs font-semibold text-gray-700">Example</p><p className="text-[10px] text-gray-500 mt-1">{t.example}</p></div>}
      </div>
    </div>
  )
}
