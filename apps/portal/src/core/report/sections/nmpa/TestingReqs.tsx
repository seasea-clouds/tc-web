import SectionTitle from '../../components/SectionTitle'
export default function TestingReqs({ result }: { result: any }) {
  const t = result.nmpaTestingReqs
  if (!t) return null
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <SectionTitle icon="🔬" label="Testing Requirements" />
      <div className="flex flex-wrap gap-2 mb-3">{t.categories?.map((c: string, i: number) => <span key={i} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium border border-blue-100">{c}</span>)}</div>
      <p className="text-xs text-gray-600"><strong>Lab:</strong> {t.labRequirement}</p>
      {t.exemption && <p className="text-xs text-amber-600 mt-1">{t.exemption}</p>}
    </div>
  )
}
