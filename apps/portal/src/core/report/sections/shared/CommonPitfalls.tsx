import SectionTitle from '../../components/SectionTitle'
export default function CommonPitfalls({ result }: { result: any }) {
  if (!result.commonRejections?.length) return null
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <SectionTitle icon="⚠️" label="Common Pitfalls & Rejection Analysis" />
      <div className="space-y-3">
        {result.commonRejections.map((r: any, i: number) => (
          <div key={i} className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-100 hover:border-amber-200 hover:shadow-sm transition-all">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-50 border border-red-200 flex items-center justify-center text-sm">❌</div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900 mb-1.5">{r.problem}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="flex items-start gap-1.5">
                  <span className="text-xs text-amber-600 mt-0.5 flex-shrink-0">🔍</span>
                  <div>
                    <p className="text-[10px] font-semibold text-gray-500 uppercase">Cause</p>
                    <p className="text-xs text-amber-800">{r.cause}</p>
                  </div>
                </div>
                <div className="flex items-start gap-1.5">
                  <span className="text-xs text-green-600 mt-0.5 flex-shrink-0">✅</span>
                  <div>
                    <p className="text-[10px] font-semibold text-gray-500 uppercase">Solution</p>
                    <p className="text-xs text-green-800">{r.solution}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
