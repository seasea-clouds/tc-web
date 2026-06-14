'use client';
import SectionTitle from '../../components/SectionTitle'
import { useT } from '@trade/ui';
export default function CostEstimation({ result }: { result: any }) {
    const t = useT('ReportSection');
  if (!result.costBreakdown?.length) return null
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <SectionTitle icon={'💰'} label={t("sectionCostEstimation")} />
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-200">
            <th className="text-left py-2 pr-4 text-gray-500 font-medium">{t("labelItem")}</th>
            <th className="text-right py-2 pr-4 text-gray-500 font-medium">{t("labelEstCost")}</th>
            <th className="text-right py-2 text-gray-500 font-medium">{t("labelNotes")}</th>
          </tr></thead>
          <tbody>
            {result.costBreakdown.map((c: any, i: number) => (
              <tr key={i} className="border-b border-gray-100">
                <td className="py-2 pr-4 text-gray-700">{c.item}</td>
                <td className="text-right py-2 pr-4 text-gray-900 font-medium">{c.estimatedCost || c.estimatedRange || c.cost || ''}</td>
                <td className="text-right py-2 text-gray-500">{c.notes || ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {result.totalCostRange && (
        <div className="mt-4 bg-gold/5 rounded-lg p-3 text-center border border-gold/20">
          <p className="text-sm text-gray-500">{t("labelEstimatedTotalCost")}</p>
          <p className="text-xl font-bold text-primary-navy">{result.totalCostRange}</p>
        </div>
      )}
    </div>
  )
}