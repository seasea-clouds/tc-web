'use client';
import SectionTitle from '../../components/SectionTitle'
import DataTable from '../../components/DataTable'
import { useT } from '@trade/ui';
export default function DocumentGuide({ result }: { result: any }) {
    const t = useT('ReportSection');
  if (!result.documentGuide?.length) return null
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <SectionTitle icon="📋" label={t("sectionDocumentGuide")} />
      <DataTable
        headers={[t('labelDocument'), t('labelFormat'), t('labelCommonError')]}
        rows={result.documentGuide.map((d: any) => [d.name, d.format || d.notarization || '', d.commonError])}
      />
    </div>
  )
}