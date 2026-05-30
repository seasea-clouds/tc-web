import SectionTitle from '../../components/SectionTitle'
import ValueCard from '../../components/ValueCard'
export default function CccCatalog({ result }: { result: any }) {
  const c = result.cccCatalog
  if (!c) return null
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <SectionTitle icon="📖" label="CCC Product Catalog" tooltip="CCC 目录包含 17 大类产品。不在目录中的产品仍需确认是否需要 SRRC（无线）或 NMPA（医疗）等其他认证。" />
      <div className="grid grid-cols-2 gap-3 mb-3">
        <ValueCard label="Product Categories" value={String(c.productCategories || '?')} />
        <ValueCard label="Last Update" value={c.lastUpdate || '—'} />
      </div>
      <p className="text-xs text-gray-600">{c.note}</p>
      <p className="text-xs text-blue-600 mt-1">{c.verificationTip}</p>
    </div>
  )
}