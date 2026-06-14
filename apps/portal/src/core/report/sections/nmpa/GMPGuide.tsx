'use client';
import SectionTitle from '../../components/SectionTitle'
import { useT } from '@trade/ui';
export default function GMPGuide({ result }: { result: any }) {
    const t = useT('ReportSection');
  const g = result.gmpGuide
  if (!g) return null
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <SectionTitle icon="🏭" label={t("sectionGMPCertificationGuide")} />
      <p className="text-sm text-gray-700 mb-2"><strong>{t("fieldRequired")}:</strong> {g.standard}</p>
      <p className="text-xs font-semibold text-gray-500 uppercase mb-1">{t("gmpAcceptedCertifications")}</p>
      <ul className="space-y-1 mb-3">{g.accepted?.map((a: string, i: number) => <li key={i} className="text-sm text-gray-600 flex items-start gap-1.5"><span className="text-green-500">✓</span>{a}</li>)}</ul>
      <p className="text-xs text-red-500"><strong>{t("fieldNotAccepted")}:</strong> {g.notAccepted}</p>
      {g.note && <p className="text-xs text-gray-500 mt-1">{g.note}</p>}
    </div>
  )
}
