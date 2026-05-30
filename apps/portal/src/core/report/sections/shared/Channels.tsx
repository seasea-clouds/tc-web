import SectionTitle from '../../components/SectionTitle'
export default function Channels({ result }: { result: any }) {
  if (!result.channels?.length) return null
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <SectionTitle icon={'🛒'} label="Channel Strategy" />
      <div className="space-y-4">
        {result.channels.map((ch: any, i: number) => (
          <div key={i} className={`rounded-lg p-4 border ${
            ch.suitability === 'high' ? 'bg-green-50 border-green-200' :
            ch.suitability === 'medium' ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-bold text-primary-navy">{ch.channel}</p>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                ch.suitability === 'high' ? 'bg-green-200 text-green-800' :
                ch.suitability === 'medium' ? 'bg-amber-200 text-amber-800' : 'bg-gray-200 text-gray-600'
              }`}>{ch.suitability.toUpperCase()}</span>
            </div>
            <p className="text-sm text-gray-600 mb-2">{ch.description}</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div><p className="text-green-600 font-medium">Advantages</p><ul className="list-disc list-inside text-gray-500">{ch.advantages?.map((a: string, j: number) => <li key={j}>{a}</li>)}</ul></div>
              <div><p className="text-red-500 font-medium">Disadvantages</p><ul className="list-disc list-inside text-gray-500">{ch.disadvantages?.map((d: string, j: number) => <li key={j}>{d}</li>)}</ul></div>
            </div>
            <div className="mt-2 flex gap-4 text-xs text-gray-500">
              <span>{'⏱️'} {ch.timeline}</span>
              <span>{'💰'} {ch.costRange}</span>
              {ch.gaccRequired && <span className="text-amber-600 font-medium">{'📋'} GACC required</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}