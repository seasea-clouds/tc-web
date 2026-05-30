import SectionTitle from '../../components/SectionTitle'
import DataTable from '../../components/DataTable'
export default function DocumentGuide({ result }: { result: any }) {
  if (!result.documentGuide?.length) return null
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <SectionTitle icon="📋" label="Document Guide" />
      <DataTable
        headers={['Document', 'Format', 'Common Error']}
        rows={result.documentGuide.map((d: any) => [d.name, d.format || d.notarization || '', d.commonError])}
      />
    </div>
  )
}