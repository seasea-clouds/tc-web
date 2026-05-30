import SectionTitle from '../../components/SectionTitle'
export default function LogisticsModel({ result }: { result: any }) {
  const lm = result.logisticsModels
  if (!lm) return null
  const models = [lm.bbc, lm.direct].filter(Boolean)
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <SectionTitle icon="🚚" label="Logistics Models" />
      <div className="space-y-3">
        {models.map((m: any, i: number) => (
          <div key={i} className="bg-gray-50 rounded-lg p-3 border-l-4 border-gold">
            <h3 className="text-sm font-bold text-primary-navy">{m.name}</h3>
            <p className="text-xs text-gray-600 mt-1"><strong>Process:</strong> {m.process}</p>
            <p className="text-xs text-green-600 mt-0.5"><strong>Advantage:</strong> {m.advantage}</p>
            {m.requirement && <p className="text-xs text-amber-600 mt-0.5"><strong>Requirement:</strong> {m.requirement}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}
