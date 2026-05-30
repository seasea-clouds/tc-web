/** 数据表格 */
interface Props { headers: string[]; rows: (string | React.ReactNode)[][] }
export default function DataTable({ headers, rows }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            {headers.map((h, i) => <th key={i} className="text-left py-2 pr-2 text-gray-500 font-medium text-xs">{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-gray-100">
              {row.map((cell, j) => <td key={j} className="py-2 pr-2 text-sm text-gray-700">{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
