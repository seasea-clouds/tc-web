import SectionTitle from '../../components/SectionTitle'
export default function ChineseRPGuide({ result }: { result: any }) {
  if (!result.chineseRPActions?.length) return null
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <SectionTitle icon="👤" label="Chinese Responsible Person" />
      <p className="text-xs text-gray-500 mb-3">The Chinese RP is mandatory for all imported cosmetics. Key responsibilities:</p>
      <ol className="space-y-2">
        {result.chineseRPActions.map((a: string, i: number) => (
          <li key={i} className="flex items-start gap-2 text-sm text-gray-700"><span className="w-6 h-6 bg-gold/20 text-primary-navy rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">{i+1}</span>{a}</li>
        ))}
      </ol>
    </div>
  )
}
