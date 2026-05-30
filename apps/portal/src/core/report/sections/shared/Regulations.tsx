import SectionTitle from '../../components/SectionTitle'
import ExpertBox from '../../components/ExpertBox'
export default function Regulations({ result }: { result: any }) {
  if (!result.regulations?.length) return null
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <SectionTitle icon="⚖️" label="Regulatory Framework" />
      <div className="space-y-3">
        {result.regulations.map((reg: any, i: number) => (
          <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
            <span className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${reg.relevance === 'primary' ? 'bg-red-500' : 'bg-amber-400'}`} />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900">{reg.name}</p>
              <p className="text-xs text-gray-500">{reg.number} | {reg.issuingAuthority} | Effective: {reg.effectiveDate}</p>
              <p className="text-sm text-gray-600 mt-1">{reg.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}