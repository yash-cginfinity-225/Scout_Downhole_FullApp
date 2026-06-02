import EmptyState from '../../atoms/EmptyState/EmptyState'
import Button from '../../atoms/Button/Button'
import { Eye } from 'lucide-react'

export default function DataTable({ columns, data, onViewSubTable, onRowClick }) {
  if (!data || data.length === 0) {
    return <EmptyState title="No Data Available" description="There is no data to display in this table." />
  }

  const isComplexValue = (value) => {
    return Array.isArray(value) || (typeof value === 'object' && value !== null)
  }

  const renderCell = (value, colName, rowIndex) => {
    if (value === null || value === undefined) return <span className="text-gray-400">—</span>

    if (isComplexValue(value)) {
      return (
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            onViewSubTable && onViewSubTable(value, colName)
          }}
        >
          <Eye size={14} />
          View
        </Button>
      )
    }

    const str = String(value)
    if (str.length > 100) {
      return <span title={str}>{str.substring(0, 100)}...</span>
    }
    return str
  }

  return (
    <div className="bg-white rounded-[0.75rem] shadow-sm overflow-hidden border border-gray-200">
      <div className="overflow-x-auto max-h-[65vh] overflow-y-auto">
        <table className="w-full text-[0.8125rem]" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col} className="sticky top-0 bg-gray-900 text-white px-[1rem] py-[0.875rem] text-left font-semibold text-[0.6875rem] uppercase tracking-[0.05em] whitespace-nowrap z-10 border-b border-gray-700">
                  {col.replace(/_/g, ' ')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIdx) => (
              <tr
                key={rowIdx}
                className={`border-b border-gray-200 transition-colors duration-150 ${onRowClick ? 'cursor-pointer hover:bg-red-50' : 'hover:bg-gray-50'}`}
                onClick={() => onRowClick && onRowClick(row, rowIdx)}
              >
                {columns.map((col) => (
                  <td key={col} className="px-[1rem] py-[0.75rem] whitespace-nowrap max-w-[18.75rem] overflow-hidden text-ellipsis border-b border-gray-100">
                    {renderCell(row[col], col, rowIdx)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
