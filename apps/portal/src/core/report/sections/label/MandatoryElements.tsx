import SectionTitle from '../../components/SectionTitle'

const COMPARISON: { field: string; china: string; eu: string; us: string }[] = [
  { field: 'Product Name', china: 'Standardized name required; fanciful names must include true nature', eu: 'Legal name + common name; fanciful allowed with clear description', us: 'Statement of identity; fanciful names must be accompanied by common name' },
  { field: 'Ingredients List', china: 'Descending order; additives with GB 2760 codes only', eu: 'Descending order; allergens emphasized; QUID for characterizing ingredients', us: 'Descending order; standardized ingredients exempt; allergens in plain language' },
  { field: 'Net Content', china: 'Metric units (g/mL); draining weight for solids in liquid', eu: 'Metric units; drained weight for solid foods in liquid medium', us: 'Metric + US customary; net weight for solids, net volume for liquids' },
  { field: 'Nutrition Panel', china: 'Energy (kJ mandatory!), protein, fat, carbs, sodium + NRV%', eu: 'Energy (kJ+kcal), fat, saturates, carbs, sugars, protein, salt + GDA%', us: 'Calories, fat, sodium, carbs, protein + %DV; kJ optional' },
  { field: 'Allergens', china: '8 mandatory: milk, eggs, fish, crustacea, peanuts, soy, wheat, tree nuts', eu: '14 regulated allergens including celery, mustard, lupin, molluscs, sulfites', us: 'Major 9: milk, eggs, fish, crustacea, peanuts, soy, wheat, tree nuts, sesame' },
  { field: 'Date Marking', china: 'DD/MM/YYYY or YYYY/MM/DD format; best before + date of manufacture', eu: 'Best before (or use by for perishable); DD/MM/YYYY format', us: 'Best if used by; MM/DD/YYYY format typically accepted' },
  { field: 'Country of Origin', china: 'Clearly marked; must not be vague ("Product of X" or "Made in X")', eu: 'Required when origin differs from processing; "Made in EU" may be used', us: 'Required if product is imported; "Product of USA" for domestic' },
  { field: 'Language', china: 'Chinese ONLY mandatory; foreign text supplementary', eu: 'Official EU language(s) of member state where sold', us: 'English mandatory; bilingual allowed' },
  { field: 'Storage Conditions', china: 'Clear storage instructions required', eu: 'Storage conditions or temperature needed for perishables', us: 'Required for perishable foods or if shelf life depends on storage' },
  { field: 'Manufacturer Info', china: 'Overseas manufacturer + Chinese responsible party (备案代理人)', eu: 'Producer or packer name and address; importer within EU', us: 'Manufacturer, packer, or distributor name and address' },
]

export default function MandatoryElements({ result }: { result: any }) {
  if (!result.labelMandatoryElements?.length) return null
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <SectionTitle icon="🏷️" label="Mandatory Label Elements (GB 7718)" tooltip="GB 7718 规定进口预包装食品必须包含 12 项强制标注内容。缺少任何一项都可能导致海关扣留。" />
      <p className="text-xs text-gray-500 mb-3">All {result.labelMandatoryElements.length} elements below are mandatory for imported prepackaged food.</p>
      <ul className="space-y-2 mb-6">
        {result.labelMandatoryElements.map((e: string, i: number) => (
          <li key={i} className="flex items-start gap-2 text-sm text-gray-700"><span className="text-gold mt-0.5 font-bold">{i+1}.</span>{e}</li>
        ))}
      </ul>

      {/* 中欧美对比表 */}
      <div className="border-t border-gray-200 pt-4 mt-2">
        <p className="text-xs font-bold text-primary-navy mb-3 text-center">📊 China vs EU vs US Label Requirements</p>
        <div className="overflow-x-auto -mx-6">
          <table className="w-full text-[10px] border-collapse">
            <thead>
              <tr className="border-b-2 border-primary-navy">
                <th className="text-left px-3 py-2 font-bold text-primary-navy w-[15%]">Field</th>
                <th className="text-left px-3 py-2 font-bold text-red-700 w-[28%]">🇨🇳 China</th>
                <th className="text-left px-3 py-2 font-bold text-blue-700 w-[28%]">🇪🇺 EU</th>
                <th className="text-left px-3 py-2 font-bold text-green-700 w-[28%]">🇺🇸 US</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((row, i) => (
                <tr key={i} className={`border-b border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-bg-ice/40'}`}>
                  <td className="px-3 py-2 font-semibold text-gray-800">{row.field}</td>
                  <td className="px-3 py-2 text-gray-700 leading-relaxed">{row.china}</td>
                  <td className="px-3 py-2 text-gray-700 leading-relaxed">{row.eu}</td>
                  <td className="px-3 py-2 text-gray-700 leading-relaxed">{row.us}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[9px] text-gray-400 mt-2 text-center">Exporters must meet China requirements regardless of EU/US compliance.</p>
      </div>
    </div>
  )
}
