import SectionTitle from '../../components/SectionTitle'
export default function FilingType({ result }: { result: any }) {
  const f = result.filingType
  if (!f) return null
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <SectionTitle icon="📋" label="NMPA Filing Type" tooltip="普通化妆品走备案（2-4 个月），特殊化妆品（防晒/美白）需注册（6-12 个月）。" />
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="bg-green-50 rounded-lg p-3 border border-green-200"><p className="text-xs font-bold text-green-800">Ordinary {f.ordinary?.includes('Notification') ? '(备案)' : ''}</p><p className="text-[10px] text-green-700 mt-1">{f.ordinary}</p></div>
        <div className="bg-red-50 rounded-lg p-3 border border-red-200"><p className="text-xs font-bold text-red-800">Special {f.special?.includes('Registration') ? '(注册)' : ''}</p><p className="text-[10px] text-red-700 mt-1">{f.special}</p></div>
      </div>
      <p className="text-xs text-gray-500">{f.classificationBasis}</p>
      {f.timeline && <div className="mt-2 flex gap-4 text-xs text-gray-600"><span>Ordinary: {f.timeline.ordinary || '—'}</span><span>Special: {f.timeline.special || '—'}</span></div>}
    </div>
  )
}
