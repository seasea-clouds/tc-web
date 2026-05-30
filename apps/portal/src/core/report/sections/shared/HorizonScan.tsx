import SectionTitle from '../../components/SectionTitle'
export default function HorizonScan({ result }: { result: any }) {
  if (!result.horizonScan?.length) return null
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <SectionTitle icon={'🔭'} label="Horizon Scan" />
      <div className="space-y-3">
        {result.horizonScan.map((h: any, i: number) => (
          <div key={i} className={`rounded-lg border p-3 ${h.impact === 'high' ? 'border-red-200 bg-red-50' : h.impact === 'medium' ? 'border-amber-200 bg-amber-50' : 'border-gray-200 bg-gray-50'}`}>
            <div className="flex justify-between items-start">
              <h3 className="text-xs font-bold text-gray-900">{h.topic}</h3>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${h.impact === 'high' ? 'bg-red-200 text-red-800' : h.impact === 'medium' ? 'bg-amber-200 text-amber-800' : 'bg-gray-200 text-gray-600'}`}>{h.impact.toUpperCase()} IMPACT</span>
            </div>
            <p className="text-[10px] text-gray-500 mt-0.5">Expected: {h.timeframe}</p>
            <p className="text-[11px] text-gray-700 mt-1">{h.description}</p>
            {h.actionRequired && <p className="text-[10px] text-red-600 mt-1">{'⚠️'} Action recommended</p>}
          </div>
        ))}
      </div>
    </div>
  )
}