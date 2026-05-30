/** 键值卡片 */
interface Props { label: string; value: string; className?: string }
export default function ValueCard({ label, value, className = '' }: Props) {
  return (
    <div className={`bg-gray-50 rounded-lg p-3 ${className}`}>
      <p className="text-xs text-gray-500 uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-gray-900">{value || '—'}</p>
    </div>
  )
}
