import SectionTitle from '../../components/SectionTitle'
export default function Timeline({ result }: { result: any }) {
  if (!result.timelinePhases?.length) return null

  const colors = ['border-blue-500', 'border-gold', 'border-green-500', 'border-purple-500', 'border-blue-500', 'border-gold', 'border-green-500']
  const bgColors = ['bg-blue-500', 'bg-gold', 'bg-green-500', 'bg-purple-500', 'bg-blue-500', 'bg-gold', 'bg-green-500']
  const lightBg = ['bg-blue-50', 'bg-amber-50', 'bg-green-50', 'bg-purple-50', 'bg-blue-50', 'bg-amber-50', 'bg-green-50']
  const last = result.timelinePhases.length - 1

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <SectionTitle icon="🗓️" label="Implementation Roadmap" tooltip="分阶段路线图，展示从评估到持续合规的完整流程和时间预估。" />

      {/* ── 垂直时间轴 ── */}
      <div className="relative pl-8 pb-4">
        {/* 竖线 */}
        <div className="absolute left-[15px] top-2 bottom-0 w-0.5 bg-gray-200"></div>

        {result.timelinePhases.map((p: any, i: number) => {
          const ci = i % colors.length
          return (
            <div key={i} className="relative pb-6 last:pb-0">
              {/* 时间节点圆点 */}
              <div className={`absolute -left-[22px] w-[14px] h-[14px] rounded-full border-[3px] ${colors[ci]} ${i === last ? bgColors[ci] : 'bg-white'} shadow-sm`}></div>

              {/* 内容卡片 */}
              <div className={`rounded-lg p-4 border ${lightBg[ci]} border-${colors[ci].replace('border-', '')}/30 ml-2`}>
                <div className="flex justify-between items-start mb-1">
                  <h3 className="text-sm font-bold text-gray-900">{p.phase}</h3>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${bgColors[ci]} text-white`}>{p.duration}</span>
                </div>

                {/* 活动列表 */}
                {(p.activities?.length > 0 || p.description) && (
                  <ul className="space-y-0.5 mt-1">
                    {(p.activities || [p.description]).filter(Boolean).map((a: string, j: number) => (
                      <li key={j} className="text-xs text-gray-600 flex items-start gap-1">
                        <span className="text-gray-300 mt-0.5">▸</span>{a}
                      </li>
                    ))}
                  </ul>
                )}

                {/* 责任人 */}
                <div className="flex flex-wrap gap-2 mt-2">
                  {p.responsible && (
                    <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                      p.responsible === 'SinoTrade' ? 'bg-blue-100 text-blue-700' :
                      p.responsible === 'Both' ? 'bg-purple-100 text-purple-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {p.responsible === 'SinoTrade' ? '🤝 We handle' : p.responsible === 'Both' ? '🔄 Joint' : '📋 Client'}
                    </span>
                  )}
                  {(p.dependencies || []).map((dep: string, j: number) => (
                    <span key={j} className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">← {dep}</span>
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── 总计 ── */}
      {result.estimatedTimeline && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-lg font-bold text-blue-800">Estimated Total: {result.estimatedTimeline}</p>
          {result.detailedTimeline && <p className="text-sm text-gray-700 mt-1">{result.detailedTimeline}</p>}
        </div>
      )}

      {/* ── 甘特图 ── */}
      {result.timelinePhases.length > 1 && (
        <>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-xs border-collapse" style={{ minWidth: '500px' }}>
              <thead>
                <tr>
                  <th className="text-left p-1.5 text-[9px] font-bold text-gray-500 uppercase w-[30%]">Phase</th>
                  <th className="text-center p-1.5 text-[9px] font-bold text-gray-500 uppercase">Timeline</th>
                  <th className="text-center p-1.5 text-[9px] font-bold text-gray-500 uppercase w-[12%]">Duration</th>
                </tr>
              </thead>
              <tbody>
                {result.timelinePhases.map((p: any, i: number) => {
                  const ci = i % colors.length
                  // Calculate bar width: phases spread roughly evenly
                  const barW = Math.max(10, Math.round(80 / result.timelinePhases.length))
                  const barL = Math.round((i / Math.max(1, result.timelinePhases.length - 1)) * (85 - barW))
                  return (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                      <td className="p-1.5">
                        <span className="text-[10px] font-medium text-gray-800">{p.phase}</span>
                      </td>
                      <td className="p-1.5 relative">
                        <div className="h-6 bg-gray-100 rounded relative overflow-hidden w-full">
                          <div className={`absolute top-1 h-4 rounded-sm opacity-80 ${bgColors[ci]}`}
                            style={{ left: barL + '%', width: barW + '%', minWidth: '30px' }} />
                        </div>
                      </td>
                      <td className="p-1.5 text-center">
                        <span className="text-[9px] font-semibold text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded">{p.duration}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
