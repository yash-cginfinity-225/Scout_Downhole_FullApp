import { useLocation, useNavigate } from 'react-router-dom'
import DataTable from '../molecules/DataTable/DataTable'
import Button from '../atoms/Button/Button'
import EmptyState from '../atoms/EmptyState/EmptyState'
import { ArrowLeft, Download } from 'lucide-react'
import * as XLSX from 'xlsx'

export default function SubTableView() {
  const location = useLocation()
  const navigate = useNavigate()
  const { data, columnName } = location.state || {}

  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div>
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} />
          Go Back
        </Button>
        <EmptyState title="No Data Available" description="No sub-table data to display." />
      </div>
    )
  }

  const columns = Object.keys(data[0])

  const handleExport = () => {
    const flatData = data.map((row) => {
      const flat = {}
      for (const [key, value] of Object.entries(row)) {
        if (typeof value === 'object' && value !== null) {
          flat[key] = JSON.stringify(value)
        } else {
          flat[key] = value
        }
      }
      return flat
    })

    const ws = XLSX.utils.json_to_sheet(flatData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, columnName || 'SubTable')
    XLSX.writeFile(wb, `${columnName || 'sub_table'}_export.xlsx`)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-[1.25rem] gap-[1rem]">
        <div className="flex items-center gap-[1rem]">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft size={16} />
            Go Back
          </Button>
          <h1 className="text-[1.5rem] font-bold text-gray-900">{columnName?.replace(/_/g, ' ') || 'Sub Table'}</h1>
        </div>
        <Button variant="secondary" size="md" onClick={handleExport}>
          <Download size={16} />
          Export Excel
        </Button>
      </div>

      <DataTable columns={columns} data={data} />
    </div>
  )
}
