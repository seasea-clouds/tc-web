import SectionTitle from '../../components/SectionTitle'
export default function PositiveList({ result }: { result: any }) {
  const pl = result.positiveList
  if (!pl) return null
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <SectionTitle icon="📋" label="CBEC Positive List" />
      <p className="text-xs text-gray-500 mb-3">{pl.note}</p>
      <div className="grid grid-cols-2 gap-3">
        <div><p className="text-xs font-semibold text-green-700 mb-1">Typically Included</p><ul className="space-y-1">{pl.typicalIncluded?.map((i: string, j: number) => <li key={j} className="text-xs text-gray-600 flex items-start gap-1"><span className="text-green-500">✓</span>{i}</li>)}</ul></div>
        <div><p className="text-xs font-semibold text-red-700 mb-1">Typically Excluded</p><ul className="space-y-1">{pl.typicalExcluded?.map((e: string, j: number) => <li key={j} className="text-xs text-gray-600 flex items-start gap-1"><span className="text-red-500">✗</span>{e}</li>)}</ul></div>
      </div>
      <p className="text-xs text-blue-600 mt-2">{pl.checkMethod}</p>
    </div>
  )
}
