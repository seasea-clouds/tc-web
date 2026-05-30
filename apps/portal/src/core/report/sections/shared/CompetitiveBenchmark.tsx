import SectionTitle from '../../components/SectionTitle'
export default function CompetitiveBenchmark({ result }: { result: any }) {
  const mi = result.marketIntel
  const ca = result.competitiveAnalysis
  const hasTopOrigins = mi?.topOrigins?.length > 0

  if (!ca && !hasTopOrigins) return null

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <SectionTitle icon="🏆" label="Competitive Benchmark" tooltip="了解中国市场上同类产品的竞争格局，帮助您制定入市策略。" />

      {ca && (
        <div className="mb-4">
          <p className="text-sm text-gray-700 leading-relaxed">{ca}</p>
        </div>
      )}

      {hasTopOrigins && (
        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Top Competing Origins</p>
          <div className="space-y-2">
            {mi.topOrigins.map((o: any, i: number) => {
              const shareNum = parseFloat(o.share) || 0
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs font-medium text-gray-700 break-words max-w-[140px]">{o.country}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2.5">
                    <div className="h-2.5 rounded-full bg-gold/70" style={{ width: Math.min(shareNum * 2, 100) + '%' }}></div>
                  </div>
                  <span className="text-xs font-semibold text-gray-600 w-12 text-right">{o.share}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {mi?.consumerPerception && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-[10px] font-semibold text-blue-800 uppercase">Consumer Perception</p>
          <p className="text-xs text-blue-700 mt-1">{mi.consumerPerception}</p>
        </div>
      )}
    </div>
  )
}
