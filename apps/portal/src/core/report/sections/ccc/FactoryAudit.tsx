import SectionTitle from '../../components/SectionTitle'
export default function FactoryAudit({ result }: { result: any }) {
  const a = result.factoryAudit
  if (!a) return null

  const checklist = a.scope?.length ? a.scope : [
    'Production process and workflow review',
    'Incoming quality control procedures',
    'Testing equipment calibration records',
    'Non-conforming product handling',
    'Corrective and preventive action records',
    'Staff training and qualification files',
    'Raw material supplier audit records',
    'Finished product inspection reports',
    'Traceability system documentation',
    'Environmental and safety compliance',
  ]

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <SectionTitle icon="🏭" label="Factory Audit Requirements" />
      <p className="text-sm text-gray-700 mb-3">{a.requirement}</p>
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">
        <p className="text-xs font-semibold text-amber-800 mb-1">📋 Audit Checklist ({checklist.length} items)</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1">
          {checklist.map((s: string, i: number) => (
            <div key={i} className="flex items-start gap-1.5 text-xs text-gray-700">
              <span className="text-green-600 flex-shrink-0 mt-0.5">☐</span>
              <span>{s}</span>
            </div>
          ))}
        </div>
      </div>
      {a.frequency && (
        <div className="flex gap-4 text-xs text-gray-500">
          <span><strong>Frequency:</strong> {a.frequency}</span>
          {a.travelNote && <span className="text-amber-600">{a.travelNote}</span>}
        </div>
      )}
    </div>
  )
}
