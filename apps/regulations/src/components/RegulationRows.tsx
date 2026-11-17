import type { DocMeta } from '@/lib/documents';

export interface RegulationRowTexts {
  colDocNumber: string;
  colTitle: string;
  colPublished: string;
  colEffective: string;
  noDocs: string;
}

/**
 * 政策列表：桌面是表格，移动端退化成上下堆叠的条目。
 * 两种形态共用同一份数据与顺序（发布日倒序），只是排版不同。
 */
export default function RegulationRows({
  docs,
  locale,
  texts,
}: {
  docs: DocMeta[];
  locale: string;
  texts: RegulationRowTexts;
}) {
  if (docs.length === 0) {
    return <p className="text-center text-[#5F6F7F] py-16">{texts.noDocs}</p>;
  }

  return (
    <>
      {/* 桌面：表格 */}
      <div className="hidden md:block overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#F4F6F9] text-[#5F6F7F] text-sm">
              <th className="px-4 py-3 font-semibold whitespace-nowrap">{texts.colDocNumber}</th>
              <th className="px-4 py-3 font-semibold">{texts.colTitle}</th>
              <th className="px-4 py-3 font-semibold whitespace-nowrap">{texts.colPublished}</th>
              <th className="px-4 py-3 font-semibold whitespace-nowrap">{texts.colEffective}</th>
            </tr>
          </thead>
          <tbody>
            {docs.map((doc) => (
              <tr key={doc.slug} className="border-t border-gray-100 hover:bg-[#FAFBFD] transition-colors">
                <td className="px-4 py-4 text-sm text-[#5F6F7F] whitespace-nowrap align-middle">{doc.docNumber}</td>
                <td className="px-4 py-4 align-middle">
                  <a
                    href={`/${locale}/regulations/${doc.slug}/`}
                    className="font-semibold text-primary-navy hover:text-gold transition-colors"
                  >
                    {doc.title}
                  </a>
                </td>
                <td className="px-4 py-4 text-sm text-[#5F6F7F] whitespace-nowrap align-middle">{doc.publishedLabel}</td>
                <td className="px-4 py-4 text-sm text-[#5F6F7F] whitespace-nowrap align-middle">
                  {doc.effectiveLabel || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 移动端：堆叠卡片 */}
      <div className="md:hidden space-y-4">
        {docs.map((doc) => (
          <a
            key={doc.slug}
            href={`/${locale}/regulations/${doc.slug}/`}
            className="block rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
          >
            <div className="mb-2">
              <span className="text-xs text-[#5F6F7F]">{doc.docNumber}</span>
            </div>
            <h2 className="font-semibold text-primary-navy leading-snug">{doc.title}</h2>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#5F6F7F]">
              <span>{texts.colPublished}: {doc.publishedLabel}</span>
              {doc.effectiveLabel && <span>{texts.colEffective}: {doc.effectiveLabel}</span>}
            </div>
          </a>
        ))}
      </div>
    </>
  );
}
