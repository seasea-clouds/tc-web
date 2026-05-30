/** 📊 数据统计标注 */
interface Props { value: string; label: string; color?: 'red' | 'amber' | 'green' }
const colors = { red: 'bg-red-100 text-red-800', amber: 'bg-amber-100 text-amber-800', green: 'bg-green-100 text-green-800' }
export default function StatBadge({ value, label, color = 'amber' }: Props) {
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${colors[color]}`}>{value} {label}</span>
}
