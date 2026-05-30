import SectionTitle from '../../components/SectionTitle'
export default function NextSteps({ steps }: { steps: string[] }) {
  if (!steps?.length) return null
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <SectionTitle icon={'🚀'} label="Next Steps" />
      <ol className="space-y-3">
        {steps.map((step, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="w-7 h-7 rounded-full bg-gold/20 text-primary-navy flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">{i + 1}</span>
            <p className="text-sm text-gray-700 pt-0.5">{step}</p>
          </li>
        ))}
      </ol>
    </div>
  )
}