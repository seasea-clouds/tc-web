import SectionTitle from '../../components/SectionTitle'
export default function TranslationGuide({ result }: { result: any }) {
  const t = result.translationGuide
  if (!t) return null
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <SectionTitle icon="🌐" label="Translation Requirements" />
      <div className="space-y-2">
        <p className="text-sm text-gray-700">{t.requirement}</p>
        <p className="text-xs text-gray-500"><strong>Notarization:</strong> {t.notarization}</p>
        <p className="text-xs text-gray-500"><strong>Minimum font size:</strong> {t.fontsize}</p>
        <ul className="space-y-1 mt-2">{t.tips?.map((tip: string, i: number) => <li key={i} className="text-sm text-gray-600 flex items-start gap-1.5"><span className="text-green-500">✓</span>{tip}</li>)}</ul>
      </div>
    </div>
  )
}
