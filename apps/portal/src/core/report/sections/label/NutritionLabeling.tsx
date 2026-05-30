import SectionTitle from '../../components/SectionTitle'
export default function NutritionLabeling({ result }: { result: any }) {
  const n = result.nutritionGuide
  if (!n) return null
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <SectionTitle icon="📊" label="Nutrition Labeling (GB 28050)" />
      <div className="space-y-3">
        <div><p className="text-xs font-semibold text-gray-500 uppercase mb-1">Mandatory Fields</p><div className="flex flex-wrap gap-2">{n.mandatoryFields?.map((f: string, i: number) => <span key={i} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium border border-blue-100">{f}</span>)}</div></div>
        <div className="bg-amber-50 rounded-lg p-3 border border-amber-200"><p className="text-xs font-semibold text-amber-800">Key Rule</p><p className="text-xs text-amber-700 mt-1">{n.keyRule}</p></div>
        <div className="bg-red-50 rounded-lg p-3 border border-red-200"><p className="text-xs font-semibold text-red-800">Common Mistake</p><p className="text-xs text-red-700 mt-1">{n.commonMistake}</p></div>
        <p className="text-xs text-gray-500">Format: {n.format}</p>
      </div>
    </div>
  )
}
