'use client';
import SectionTitle from '../../components/SectionTitle'
import ValueCard from '../../components/ValueCard'
import { useT } from '@trade/ui';
export default function CountryProfile({ result }: { result: any }) {
    const t = useT('ReportSection');
  const cp = result.countryProfile
  if (!cp?.region) return null
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <SectionTitle icon={'🌍'} label={t("sectionCountryProfile")} />
      <div className="grid grid-cols-2 gap-3">
        <ValueCard label={t("valueRegion")} value={cp.region} />
        <ValueCard label={t("valueFTAWithChina")} value={cp.ftaWithChina ? t('valueYes') : t('valueNo')} />
        <ValueCard label={t("valueGACCDifficulty")} value={cp.gaccDifficulty} />
        <ValueCard label={t("valueLanguageNote")} value={cp.languageNote || '—'} />
      </div>
    </div>
  )
}