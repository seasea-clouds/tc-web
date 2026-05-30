import SectionTitle from '../../components/SectionTitle'
export default function PostApproval({ result }: { result: any }) {
  if (!result.postApprovalObligations?.length) return null
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <SectionTitle icon={'🔄'} label="Post-Approval Obligations" />
      <div className="space-y-3">
        {result.postApprovalObligations.map((o: any, i: number) => (
          <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
            <span className="mt-0.5 w-2 h-2 rounded-full bg-gold flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-gray-900">{o.item}</p>
              <p className="text-xs text-amber-600 font-medium">{o.frequency}</p>
              <p className="text-sm text-gray-600 mt-0.5">{o.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}