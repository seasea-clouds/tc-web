/** 🔍 专家解读框 — 金色左边框 + 图标 + 文本 */
interface Props { text: string; icon?: string; variant?: 'gold' | 'blue' | 'red' }
const variants = {
  gold: { bg: 'bg-primary-navy/5', border: 'border-gold', icon: '🔍' },
  blue: { bg: 'bg-blue-50', border: 'border-blue-300', icon: '💡' },
  red: { bg: 'bg-red-50', border: 'border-red-300', icon: '⚠️' },
}
export default function ExpertBox({ text, icon, variant = 'gold' }: Props) {
  const v = variants[variant]
  return (
    <div className={`${v.bg} rounded-lg p-3 mb-3 border-l-4 ${v.border}`}>
      <p className="text-xs font-bold text-primary-navy">{icon || v.icon} Expert Interpretation</p>
      <p className="text-[11px] text-gray-600 mt-1 leading-relaxed">{text}</p>
    </div>
  )
}
