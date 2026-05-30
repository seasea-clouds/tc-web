/** 统一区块标题，支持可选 tooltip */
interface Props { icon: string; label: string; tooltip?: string }
export default function SectionTitle({ icon, label, tooltip }: Props) {
  return (
    <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-200">
      <span>{icon}</span>
      <h2 className="text-sm font-bold text-primary-navy uppercase tracking-wider">{label}</h2>
      {tooltip && (
        <div className="relative group ml-auto">
          <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-200 text-gray-500 text-[10px] font-bold cursor-help hover:bg-gold hover:text-white transition-colors">?</span>
          <div className="absolute right-0 top-full mt-1.5 w-64 p-3 bg-primary-navy text-white text-[11px] leading-relaxed rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none">
            {tooltip}
            <div className="absolute -top-1 right-2 w-2 h-2 bg-primary-navy rotate-45"></div>
          </div>
        </div>
      )}
    </div>
  )
}
