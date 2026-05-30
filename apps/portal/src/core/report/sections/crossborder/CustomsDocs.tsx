import SectionTitle from '../../components/SectionTitle'
export default function CustomsDocs({ result }: { result: any }) {
  if (!result.customsDocGuide?.length) return null
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <SectionTitle icon="📄" label="Customs Documentation" />
      <p className="text-xs text-gray-500 mb-3">3-document matching required for CBEC customs clearance.</p>
      <ul className="space-y-2">
        {result.customsDocGuide.map((d: string, i: number) => (
          <li key={i} className="flex items-start gap-2 text-sm text-gray-700"><span className="w-6 h-6 bg-gold/20 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">{i+1}</span>{d}</li>
        ))}
      </ul>
    </div>
  )
}
