import SectionTitle from '../../components/SectionTitle'
export default function PlatformGuide({ result }: { result: any }) {
  if (!result.platformGuide?.length) return null
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <SectionTitle icon="🛒" label="Platform Comparison" tooltip="Tmall Global 流量最大，JD Worldwide 适合电子/健康品类，Douyin 直播增速最快。" />
      <div className="overflow-x-auto -mx-6">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-6 py-2.5 font-semibold text-gray-700">Platform</th>
              <th className="text-right px-4 py-2.5 font-semibold text-gray-700">Fee</th>
              <th className="text-left px-4 py-2.5 font-semibold text-gray-700 hidden md:table-cell">Requirement</th>
              <th className="text-left px-4 py-2.5 font-semibold text-gray-700 hidden md:table-cell">Timeline</th>
            </tr>
          </thead>
          <tbody>
            {result.platformGuide.map((p: any, i: number) => (
              <tr key={i} className={`border-b border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-bg-ice/40'}`}>
                <td className="px-6 py-2.5 font-medium text-primary-navy">{p.platform}</td>
                <td className="px-4 py-2.5 text-right font-semibold text-gold">{p.fee}</td>
                <td className="px-4 py-2.5 text-gray-600 hidden md:table-cell">{p.req || '—'}</td>
                <td className="px-4 py-2.5 text-gray-600 hidden md:table-cell">{p.timeline || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Bar chart visual comparison */}
      {result.platformGuide.length >= 2 && (
        <div className="mt-4 bg-gray-50 rounded-lg p-3 border border-gray-200">
          <p className="text-xs font-semibold text-gray-700 mb-2">📊 Fee & Timeline at a Glance</p>
          {result.platformGuide.map((p: any, i: number) => {
            // Extract numeric deposit from text like "$25,000 deposit + 5% commission"
            const depositMatch = p.fee?.match(/\$?(\d[\d,]*)/);
            const deposit = depositMatch ? parseInt(depositMatch[1].replace(/,/g,'')) / 1000 : 0;
            return (
              <div key={i} className="mb-2 last:mb-0">
                <div className="flex justify-between text-xs text-gray-600 mb-0.5">
                  <span className="font-medium">{p.platform}</span>
                  <span>{p.fee}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="h-2 rounded-full bg-gold/70" style={{width: Math.min(deposit * 4, 100) + '%'}}></div>
                </div>
                <p className="text-[9px] text-gray-400 mt-0.5">Deposit: ${deposit}K{/*nbsp*/} | Timeline: {p.timeline}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  )
}
