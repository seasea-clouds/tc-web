import SectionTitle from '../../components/SectionTitle'
import ValueCard from '../../components/ValueCard'
export default function Classification({ result }: { result: any }) {
  const c = result.classification
  if (!c?.assignedHsChapter) return null
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <SectionTitle icon={'🔖'} label="Product Classification" tooltip="HS 编码决定关税税率和监管条件，错编可能导致多缴税或被扣货。" />
      <div className="grid grid-cols-2 gap-3">
        <ValueCard label="HS Chapter" value={c.assignedHsChapter} />
        <ValueCard label="CIQ Code" value={c.ciqCode || '—'} />
        <ValueCard label="Classification" value={c.isHighRisk ? '🔴 High Risk' : '🟢 Low Risk'} />
        <ValueCard label="Risk Reason" value={c.riskReason || '—'} />
      </div>
    </div>
  )
}