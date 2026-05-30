import SectionTitle from '../../components/SectionTitle'
import DataTable from '../../components/DataTable'
export default function LabelCompliance({ result }: { result: any }) {
  if (!result.labelGuide?.requiredItems?.length) return null
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <SectionTitle icon={'🏷️'} label="Label Compliance (GB 7718)" />
      <DataTable
        headers={['Field', 'Common Mistake']}
        rows={result.labelGuide.requiredItems.map((item: any) => [item.field, item.commonMistake])}
      />
    </div>
  )
}