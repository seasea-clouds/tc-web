'use client';
import SectionTitle from '../../components/SectionTitle'
import DataTable from '../../components/DataTable'
import { useT } from '@trade/ui';
export default function RiskMatrix({ result }: { result: any }) {
    const t = useT('ReportSection');
  if (!result.riskMatrix?.length) return null
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <SectionTitle icon={'📊'} label={t("sectionRiskAssessmentMatrix")} />
      <DataTable
        headers={[t('labelDimension'), t('labelRating'), t('labelExplanation')]}
        rows={result.riskMatrix.map((r: any) => [r.dimension, r.rating, r.explanation])}
      />
    </div>
  )
}