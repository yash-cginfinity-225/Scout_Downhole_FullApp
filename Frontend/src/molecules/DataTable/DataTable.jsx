import EmptyState from '../../atoms/EmptyState/EmptyState'
import Button from '../../atoms/Button/Button'
import { Eye } from 'lucide-react'

const SUMMARY_COLUMNS = [
  'bha_weight_calculation_message',
  'comment_text',
  'objectives_text',
  'results_text',
  'recommendations_text',
  'other_text',
  'bha_description_text',
  'bha_performance_observations_text',
  'bha_oos_conditions_text',
  'bha_conclusions_recommendations_remarks_text',
  'bha_reason_pooh_text',
  'directional_drillers_names',
]

export default function DataTable({ columns, data, onViewSubTable, onRowClick, onFileClick, onDescriptionClick }) {
  if (!data || data.length === 0) {
    return <EmptyState title="No Data Available" description="There is no data to display in this table." />
  }

  const isComplexValue = (value) => {
    return Array.isArray(value) || (typeof value === 'object' && value !== null)
  }

  const isLongText = (value) => {
    return typeof value === 'string' && value.length > 80
  }

  const isSummaryColumn = (colName) => {
    return SUMMARY_COLUMNS.includes(colName)
  }

  const getFileName = (row) => {
    if (row.file_name) return row.file_name
    if (row.path) return row.path.split('/').pop()
    return ''
  }

  const renderCell = (value, colName, rowIndex, row) => {
    if (value === null || value === undefined) return <span className="text-gray-400">—</span>

    // File name column - clickable link to open PDF
    if (colName === 'file_name' && onFileClick) {
      return (
        <button
          className="text-gray-900 font-medium text-left hover:text-gray-600 transition-colors whitespace-normal break-all"
          onClick={(e) => {
            e.stopPropagation()
            onFileClick(row)
          }}
        >
          {value}
        </button>
      )
    }

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

    // Summary columns - always show click-to-view if there's content
    if (isSummaryColumn(colName) && str.trim() && onDescriptionClick) {
      return (
        <button
          className="text-left text-gray-700 hover:text-gray-900 transition-colors"
          onClick={(e) => {
            e.stopPropagation()
            onDescriptionClick(str, getFileName(row), colName)
          }}
        >
          <span>{str.length > 60 ? str.substring(0, 60) + '...' : str}</span>
          <span className="ml-[0.375rem] text-[0.6875rem] text-gray-400 italic">view</span>
        </button>
      )
    }

    // Long text - truncate and show popup on click
    if (isLongText(str) && onDescriptionClick) {
      return (
        <button
          className="text-left text-gray-700 hover:text-gray-900"
          onClick={(e) => {
            e.stopPropagation()
            onDescriptionClick(str, getFileName(row), colName)
          }}
        >
          <span>{str.substring(0, 80)}...</span>
        </button>
      )
    }

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
              {columns.map((col, idx) => (
                <th key={col} className="sticky top-0 bg-gray-900 text-white px-[1rem] py-[0.875rem] text-left font-semibold text-[0.6875rem] uppercase tracking-[0.05em] whitespace-nowrap z-10 border-b border-gray-700">
                  {col.replace(/_/g, ' ')} ({idx + 1})
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
                  <td key={col} className={`px-[1rem] py-[0.75rem] border-b border-gray-100 ${col === 'file_name' ? 'min-w-[22rem] max-w-[28rem]' : 'whitespace-nowrap max-w-[18.75rem] overflow-hidden text-ellipsis'}`}>
                    {renderCell(row[col], col, rowIdx, row)}
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
