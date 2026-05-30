import SectionTitle from '../../components/SectionTitle'
export default function AllergenDeclaration({ result }: { result: any }) {
  const a = result.allergenGuide
  if (!a) return null
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <SectionTitle icon="⚠️" label="Allergen Declaration" />
      <p className="text-xs text-gray-500 mb-2">Regulated allergens in China — differs from EU/US lists.</p>
      <div className="flex flex-wrap gap-2 mb-3">{a.regulated?.map((g: string, i: number) => <span key={i} className="px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-medium border border-amber-100">{g}</span>)}</div>
      <p className="text-xs text-gray-600"><strong>Format:</strong> {a.format}</p>
      {a.note && <p className="text-xs text-red-500 mt-1">{a.note}</p>}
    </div>
  )
}
