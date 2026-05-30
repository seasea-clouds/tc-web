import SectionTitle from '../../components/SectionTitle'
export default function WatchService({ result }: { result: any }) {
  const ws = result.watchServiceGuide
  if (!ws) return null
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <SectionTitle icon="🔭" label="Trademark Watch Service" />
      <p className="text-sm text-gray-700 mb-2">{ws.description}</p>
      <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Includes</p>
      <ul className="space-y-1 mb-3">{ws.includes?.map((i: string, j: number) => <li key={j} className="text-sm text-gray-600 flex items-start gap-1.5"><span className="text-green-500">✓</span>{i}</li>)}</ul>
      <div className="flex gap-4 text-xs text-gray-500"><span><strong>Frequency:</strong> {ws.frequency}</span><span><strong>Cost:</strong> {ws.cost}</span></div>
    </div>
  )
}
