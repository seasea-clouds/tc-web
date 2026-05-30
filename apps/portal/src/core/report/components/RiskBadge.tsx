/** 风险等级标签 */
interface Props { level: 'high' | 'low'; showIcon?: boolean }
export default function RiskBadge({ level, showIcon = true }: Props) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border ${
      level === 'high' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'
    }`}>
      {showIcon && (level === 'high' ? '🔴' : '🟢')} {level === 'high' ? 'High Risk' : 'Low Risk'}
    </span>
  )
}
