'use client';
import SectionTitle from '../../components/SectionTitle'
import CollapsibleBox from '../../components/CollapsibleBox'
import { useT } from '@trade/ui';
export default function IpBrandRisk({ result }: { result: any }) {
    const t = useT('ReportSection');
  if (!result.regulations?.length) return null
  const ipRegs = result.regulations.filter((r: any) => r.name?.toLowerCase().includes('trademark'))
  if (!ipRegs.length) return null
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <SectionTitle icon={'®️'} label={t("sectionIpBrandRiskAssessment")} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
        <div className="bg-red-50 rounded-lg p-3 border border-red-200">
          <p className="text-[10px] font-bold text-red-800 uppercase">{'🔴'} {t('ipFirstToFileRisk')}</p>
          <p className="text-[9px] text-red-700 mt-1">{t('ipFirstToFileDesc')}</p>
        </div>
        <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
          <p className="text-[10px] font-bold text-amber-800 uppercase">{'🟡'} {t('ipCustomsRecordal')}</p>
          <p className="text-[9px] text-amber-700 mt-1">{t('ipCustomsRecordalDesc')}</p>
        </div>
        <div className="bg-green-50 rounded-lg p-3 border border-green-200">
          <p className="text-[10px] font-bold text-green-800 uppercase">{'🟢'} {t('ipMonitorEnforce')}</p>
          <p className="text-[9px] text-green-700 mt-1">{t('ipMonitorEnforceDesc')}</p>
        </div>
      </div>
      <CollapsibleBox title={t("ipLegalFrameworkTitle")}>
        {ipRegs.map((r: any, i: number) => <p key={i} className="text-[10px] text-gray-600">{'•'} <strong>{r.name}:</strong> {r.description}</p>)}
      </CollapsibleBox>
    </div>
  )
}