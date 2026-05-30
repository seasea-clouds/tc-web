import SectionTitle from '../../components/SectionTitle'
export default function RequiredDocuments({ result }: { result: any }) {
  // Use documentGuide if available (richer data), fall back to requiredDocuments list
  const guide = result.documentGuide?.length ? result.documentGuide : null
  const docs = result.requiredDocuments?.length ? result.requiredDocuments : null
  if (!guide && !docs) return null
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <SectionTitle icon="📄" label="Required Documents" />
      {guide ? (
        <div className="overflow-x-auto -mx-6">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-6 py-2.5 font-semibold text-gray-700">Document</th>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-700">Format</th>
                <th className="text-center px-4 py-2.5 font-semibold text-gray-700">Notarization</th>
                <th className="text-center px-4 py-2.5 font-semibold text-gray-700">Validity</th>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-700 hidden md:table-cell">Common Error</th>
              </tr>
            </thead>
            <tbody>
              {guide.map((d: any, i: number) => (
                <tr key={i} className={`border-b border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-bg-ice/40'}`}>
                  <td className="px-6 py-2.5 font-medium text-gray-900">{d.name}</td>
                  <td className="px-4 py-2.5 text-gray-600">{d.format}</td>
                  <td className="px-4 py-2.5 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${d.notarization?.includes('Certified') || d.notarization?.includes('Yes') ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
                      {d.notarization || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-center text-gray-600">{d.validity || '—'}</td>
                  <td className="px-4 py-2.5 text-red-600 hidden md:table-cell">{d.commonError || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <ul className="space-y-2">
          {docs!.map((doc: string, i: number) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-700"><span className="text-gold mt-0.5">▸</span>{doc}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
