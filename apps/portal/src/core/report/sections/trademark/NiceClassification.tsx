import SectionTitle from '../../components/SectionTitle'
export default function NiceClassification({ result }: { result: any }) {
  const nc = result.niceClasses
  if (!nc) return null

  // Build comparison table: category → Nice class
  const rows = Object.entries(nc).filter(([k]) => k !== 'default').map(([key, val]: any) => ({
    category: key.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
    classes: val,
  }))

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <SectionTitle icon="📋" label="Nice Classification" tooltip="中国采用第 11 版尼斯分类。正确选择商品/服务类别是商标注册的核心。" />
      <p className="text-xs text-gray-500 mb-3">Recommended Nice classes by product category:</p>
      <div className="overflow-x-auto -mx-6">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-6 py-2 font-semibold text-gray-700">Product Category</th>
              <th className="text-left px-4 py-2 font-semibold text-gray-700">Recommended Classes</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className={`border-b border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-bg-ice/40'}`}>
                <td className="px-6 py-2 font-medium text-gray-900">{r.category}</td>
                <td className="px-4 py-2 text-gray-600">{r.classes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {nc.default && <p className="text-xs text-gray-400 mt-2 italic">{nc.default}</p>}
    </div>
  )
}
