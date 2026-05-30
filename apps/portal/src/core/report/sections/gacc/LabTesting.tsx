import SectionTitle from '../../components/SectionTitle'
export default function LabTesting({ result }: { result: any }) {
  if (!result.labTests?.length) return null
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <SectionTitle icon={'🔬'} label="Testing Requirements" />
      <div className="flex flex-wrap gap-2 mb-3">
        {result.labTests.map((t: string, i: number) => (
          <span key={i} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium border border-blue-100">{t}</span>
        ))}
      </div>
      {result.testCostRange && <p className="text-sm text-gray-500">{'💰'} Cost range: <strong className="text-gray-900">{result.testCostRange}</strong></p>}
      {result.labGuide && <p className="text-sm text-gray-600 mt-2">{result.labGuide}</p>}
    </div>
  )
}