import SectionTitle from '../../components/SectionTitle'
export default function MarketIntel({ result }: { result: any }) {
  if (!result.marketIntel?.chinaImportTrend) return null
  const mi = result.marketIntel
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <SectionTitle icon={'📈'} label="Market Intelligence" />
      <p className="text-sm text-gray-700 mb-4">{mi.chinaImportTrend}</p>
      {mi.keyDrivers?.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Key Drivers</p>
          <div className="flex flex-wrap gap-2">{mi.keyDrivers.map((d: string, i: number) => <span key={i} className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium border border-green-100">{'📈'} {d}</span>)}</div>
        </div>
      )}
      {mi.barriers?.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Barriers</p>
          <div className="flex flex-wrap gap-2">{mi.barriers.map((b: string, i: number) => <span key={i} className="px-3 py-1 bg-red-50 text-red-700 rounded-full text-xs font-medium border border-red-100">{'⚠️'} {b}</span>)}</div>
        </div>
      )}
      {mi.topOrigins?.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Top Competing Origins</p>
          <div className="flex flex-wrap gap-2">{mi.topOrigins.map((o: any, i: number) => <span key={i} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium border border-blue-100">{o.country} ({o.share})</span>)}</div>
        </div>
      )}
      {mi.recommendation && (
        <div className="mt-4 bg-gold/5 rounded-lg p-3 border border-gold/20">
          <p className="text-xs text-gray-500 mb-1">Recommendation</p>
          <p className="text-sm font-semibold text-primary-navy">{mi.recommendation}</p>
        </div>
      )}
    </div>
  )
}