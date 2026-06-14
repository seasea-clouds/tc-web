'use client';
import SectionTitle from '../../components/SectionTitle'
import { useT } from '@trade/ui';

// Field key prefixes for the comparison table (data looked up via t())
const COMPARISON_FIELDS = ['ProductName', 'Ingredients', 'NetContent', 'Nutrition', 'Allergens', 'DateMarking', 'CountryOfOrigin', 'Language', 'Storage', 'Manufacturer'];


export default function MandatoryElements({ result }: { result: any }) {
    const t = useT('ReportSection');
  if (!result.labelMandatoryElements?.length) return null
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <SectionTitle icon="🏷️" label={t("sectionMandatoryLabelElements")} tooltip={t("tooltipMandatoryLabelElements")} />
      <p className="text-xs text-gray-500 mb-3">All {result.labelMandatoryElements.length} elements below are mandatory for imported prepackaged food.</p>
      <ul className="space-y-2 mb-6">
        {result.labelMandatoryElements.map((e: string, i: number) => (
          <li key={i} className="flex items-start gap-2 text-sm text-gray-700"><span className="text-gold mt-0.5 font-bold">{i+1}.</span>{e}</li>
        ))}
      </ul>

      {/* 中欧美对比表 */}
      <div className="border-t border-gray-200 pt-4 mt-2">
        <p className="text-xs font-bold text-primary-navy mb-3 text-center">📊 {t("compareChinaVsEuVsUs")}</p>
        <div className="overflow-x-auto -mx-6">
          <table className="w-full text-[10px] border-collapse">
            <thead>
              <tr className="border-b-2 border-primary-navy">
                <th className="text-left px-3 py-2 font-bold text-primary-navy w-[15%]">{t("tableHeaderField")}</th>
                <th className="text-left px-3 py-2 font-bold text-red-700 w-[28%]">🇨🇳 {t("compareChina")}</th>
                <th className="text-left px-3 py-2 font-bold text-blue-700 w-[28%]">🇪🇺 {t("compareEU")}</th>
                <th className="text-left px-3 py-2 font-bold text-green-700 w-[28%]">🇺🇸 {t("compareUS")}</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON_FIELDS.map((prefix, i) => (
                <tr key={i} className={`border-b border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-bg-ice/40'}`}>
                  <td className="px-3 py-2 font-semibold text-gray-800">{t(`comp${prefix}`)}</td>
                  <td className="px-3 py-2 text-gray-700 leading-relaxed">{t(`comp${prefix}China`)}</td>
                  <td className="px-3 py-2 text-gray-700 leading-relaxed">{t(`comp${prefix}EU`)}</td>
                  <td className="px-3 py-2 text-gray-700 leading-relaxed">{t(`comp${prefix}US`)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[9px] text-gray-400 mt-2 text-center">{t("compareExportNote")}</p>
      </div>
    </div>
  )
}
