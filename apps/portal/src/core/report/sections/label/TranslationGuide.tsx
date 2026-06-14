'use client';
import SectionTitle from '../../components/SectionTitle'
import { useT } from '@trade/ui';
export default function TranslationGuide({ result }: { result: any }) {
    const t = useT('ReportSection');
  const data = result.translationGuide
  if (!data) return null
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <SectionTitle icon="🌐" label={t("sectionTranslationRequirements")} />
      <div className="space-y-2">
        <p className="text-sm text-gray-700">{data.requirement}</p>
        <p className="text-xs text-gray-500"><strong>{t("fieldNotarization")}:</strong> {data.notarization}</p>
        <p className="text-xs text-gray-500"><strong>{t("fieldMinFontSize")}:</strong> {data.fontsize}</p>
        <ul className="space-y-1 mt-2">{data.tips?.map((tip: string, i: number) => <li key={i} className="text-sm text-gray-600 flex items-start gap-1.5"><span className="text-green-500">✓</span>{tip}</li>)}</ul>
      </div>
    </div>
  )
}
