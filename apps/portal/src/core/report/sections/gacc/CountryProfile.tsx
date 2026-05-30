import SectionTitle from '../../components/SectionTitle'
import ValueCard from '../../components/ValueCard'
export default function CountryProfile({ result }: { result: any }) {
  const cp = result.countryProfile
  if (!cp?.region) return null
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <SectionTitle icon={'🌍'} label="Country Profile" />
      <div className="grid grid-cols-2 gap-3">
        <ValueCard label="Region" value={cp.region} />
        <ValueCard label="FTA with China" value={cp.ftaWithChina ? 'Yes' : 'No'} />
        <ValueCard label="GACC Difficulty" value={cp.gaccDifficulty} />
        <ValueCard label="Language Note" value={cp.languageNote || '—'} />
      </div>
    </div>
  )
}