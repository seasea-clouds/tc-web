import SectionTitle from '../../components/SectionTitle'
import DataTable from '../../components/DataTable'
export default function RiskMatrix({ result }: { result: any }) {
  if (!result.riskMatrix?.length) return null
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <SectionTitle icon={'📊'} label="Risk Assessment Matrix" />
      <DataTable
        headers={['Dimension', 'Rating', 'Explanation']}
        rows={result.riskMatrix.map((r: any) => [r.dimension, r.rating, r.explanation])}
      />
    </div>
  )
}