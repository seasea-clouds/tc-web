import SectionTitle from '../../components/SectionTitle'
export default function RegistrationProcess({ result }: { result: any }) {
  if (!result.registrationProcess?.length) return null
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <SectionTitle icon="📋" label="Registration Process" />
      <div className="space-y-3">
        {result.registrationProcess.map((s: any, i: number) => (
          <div key={i} className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-primary-navy text-white flex items-center justify-center text-xs font-bold flex-shrink-0">{i+1}</div>
            <div className="flex-1 bg-gray-50 rounded-lg p-3">
              <div className="flex justify-between items-start"><h3 className="text-sm font-semibold text-gray-900">{s.step}</h3><span className="text-xs font-bold text-gold bg-gold/10 px-2 py-0.5 rounded">{s.duration}</span></div>
              <p className="text-xs text-gray-600 mt-1">{s.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
