import SectionTitle from '../../components/SectionTitle'
export default function Glossary({ glossary }: { glossary: { term: string; def: string }[] }) {
  if (!glossary?.length) return null
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <SectionTitle icon={'📖'} label="Glossary" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {glossary.map((g: any, i: number) => (
          <div key={i} className="bg-gray-50 rounded-lg p-3">
            <p className="text-sm font-bold text-primary-navy mb-1">{g.term}</p>
            <p className="text-xs text-gray-600">{g.def}</p>
          </div>
        ))}
      </div>
    </div>
  )
}