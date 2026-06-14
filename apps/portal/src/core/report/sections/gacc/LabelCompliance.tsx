'use client';
import SectionTitle from '../../components/SectionTitle'
import DataTable from '../../components/DataTable'
import { useT } from '@trade/ui';
export default function LabelCompliance({ result }: { result: any }) {
    const t = useT('ReportSection');
  if (!result.labelGuide?.requiredItems?.length) return null
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <SectionTitle icon={'🏷️'} label={t("sectionLabelCompliance")} />
      <DataTable
        headers={[t('labelField'), t('labelCommonMistakeCaps')]}
        rows={result.labelGuide.requiredItems.map((item: any) => [item.field, item.commonMistake])}
      />
    </div>
  )
}