import SectionTitle from '../../components/SectionTitle'
export default function ComplianceChecklist({ result }: { result: any }) {
  if (!result.requiredDocuments?.length) return null
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <SectionTitle icon="✅" label="Compliance Checklist" />
      <p className="text-xs text-gray-500 mb-3">Check off each item as completed. This checklist can be printed and shared with your team.</p>
      <div className="space-y-2">
        {result.requiredDocuments.map((doc: string, i: number) => (
          <label key={i} className="flex items-start gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
            <input type="checkbox" className="mt-0.5 w-4 h-4 accent-gold" />
            <span className="text-sm text-gray-700">{doc}</span>
          </label>
        ))}
      </div>
    </div>
  )
}