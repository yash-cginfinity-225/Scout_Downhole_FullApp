import { useState, useEffect, useCallback } from 'react'
import { getTableData, exportTableData, getFileViewUrl } from '../services/api'
import DataTable from '../molecules/DataTable/DataTable'
import SearchBar from '../molecules/SearchBar/SearchBar'
import Pagination from '../molecules/Pagination/Pagination'
import Button from '../atoms/Button/Button'
import Spinner from '../atoms/Spinner/Spinner'
import { Download, ArrowLeft, Eye } from 'lucide-react'
import * as XLSX from 'xlsx'

export default function TableView({ tableKey, title }) {
  const [data, setData] = useState([])
  const [columns, setColumns] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [exporting, setExporting] = useState(false)
  const [subTableData, setSubTableData] = useState(null)
  const [subTableColumn, setSubTableColumn] = useState('')
  const [selectedRecord, setSelectedRecord] = useState(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getTableData(tableKey, { search, page, page_size: 50 })
      setData(res.data.data || [])
      setColumns(res.data.columns || [])
      setTotalPages(res.data.total_pages || 1)
      setTotal(res.data.total || 0)
    } catch {
      setData([])
      setColumns([])
    } finally {
      setLoading(false)
    }
  }, [tableKey, search, page])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    setPage(1)
  }, [search])

  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await exportTableData(tableKey, search)
      const exportData = res.data.data || []

      // Flatten complex objects for Excel
      const flatData = exportData.map((row) => {
        const flat = {}
        for (const [key, value] of Object.entries(row)) {
          if (Array.isArray(value) || (typeof value === 'object' && value !== null)) {
            flat[key] = JSON.stringify(value)
          } else {
            flat[key] = value
          }
        }
        return flat
      })

      const ws = XLSX.utils.json_to_sheet(flatData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, title)
      XLSX.writeFile(wb, `${tableKey}_export.xlsx`)
    } catch (err) {
      console.error('Export failed:', err)
    } finally {
      setExporting(false)
    }
  }

  let debounceTimer
  const handleSearchChange = (e) => {
    const value = e.target.value
    setSearch(value)
  }

  const handleViewSubTable = (subData, colName) => {
    setSubTableData(subData)
    setSubTableColumn(colName)
  }

  const handleCloseSubTable = () => {
    setSubTableData(null)
    setSubTableColumn('')
  }

  const handleRowClick = (row) => {
    setSelectedRecord(row)
  }

  const handleCloseRecord = () => {
    setSelectedRecord(null)
  }

  const getPdfFilename = (record) => {
    if (!record || !record.path) return null
    // path is like "dbfs:/Volumes/databricksnonprod/pdf_ingestion_data/pdf/filename.pdf"
    const fullPath = record.path
    const filename = fullPath.split('/').pop()
    return filename
  }

  const handleExportRecord = () => {
    if (!selectedRecord) return
    const flat = {}
    for (const [key, value] of Object.entries(selectedRecord)) {
      if (typeof value === 'object' && value !== null) {
        flat[key] = JSON.stringify(value)
      } else {
        flat[key] = value
      }
    }
    const ws = XLSX.utils.json_to_sheet([flat])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Record')
    XLSX.writeFile(wb, `${tableKey}_record_export.xlsx`)
  }

  const handleExportSubTable = () => {
    if (!subTableData) return
    const flatData = subTableData.map((row) => {
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
    XLSX.utils.book_append_sheet(wb, ws, subTableColumn || 'SubTable')
    XLSX.writeFile(wb, `${subTableColumn || 'sub_table'}_export.xlsx`)
  }

  // PDF viewer
  if (selectedRecord) {
    const pdfFilename = getPdfFilename(selectedRecord)
    const pdfUrl = pdfFilename ? getFileViewUrl(pdfFilename) : null

    return (
      <div className="flex flex-col h-[calc(100vh-7rem)]">
        <div className="flex items-center justify-between mb-[1rem] gap-[1rem] flex-wrap shrink-0">
          <div className="flex items-baseline gap-[0.75rem]">
            <Button variant="ghost" size="md" onClick={handleCloseRecord}>
              <ArrowLeft size={16} />
              Back
            </Button>
            <h1 className="text-[1.5rem] font-bold text-gray-900">
              {pdfFilename || 'Document View'}
            </h1>
          </div>
          <div className="flex items-center gap-[0.75rem]">
            <Button variant="secondary" size="md" onClick={handleExportRecord}>
              <Download size={16} />
              Export Excel
            </Button>
          </div>
        </div>
        {pdfUrl ? (
          <div className="flex-1 bg-white rounded-[0.75rem] shadow-sm border border-gray-200 overflow-hidden">
            <iframe
              src={pdfUrl}
              className="w-full h-full border-0"
              title="PDF Viewer"
            />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-white rounded-[0.75rem] shadow-sm border border-gray-200">
            <p className="text-gray-500 text-[1rem]">No PDF available for this record</p>
          </div>
        )}
      </div>
    )
  }

  // Sub-table overlay
  if (subTableData) {
    const subColumns = subTableData.length > 0 ? Object.keys(subTableData[0]) : []
    return (
      <div>
        <div className="flex items-center justify-between mb-[1.25rem] gap-[1rem] flex-wrap">
          <div className="flex items-baseline gap-[0.75rem]">
            <Button variant="ghost" size="md" onClick={handleCloseSubTable}>
              <ArrowLeft size={16} />
              Back
            </Button>
            <h1 className="text-[1.5rem] font-bold text-gray-900">{subTableColumn?.replace(/_/g, ' ') || 'Sub Table'}</h1>
          </div>
          <div className="flex items-center gap-[0.75rem]">
            <Button variant="secondary" size="md" onClick={handleExportSubTable}>
              <Download size={16} />
              Export Excel
            </Button>
          </div>
        </div>
        <DataTable columns={subColumns} data={subTableData} onViewSubTable={handleViewSubTable} />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-[1.25rem] gap-[1rem] flex-wrap">
        <div className="flex items-baseline gap-[0.75rem]">
          <h1 className="text-[1.5rem] font-bold text-gray-900">{title}</h1>
          <span className="text-[0.875rem] text-gray-500 font-medium">{total} records</span>
        </div>
        <div className="flex items-center gap-[0.75rem]">
          <SearchBar
            value={search}
            onChange={handleSearchChange}
            placeholder={`Search ${title}...`}
          />
          <Button variant="secondary" size="md" onClick={handleExport} disabled={exporting}>
            <Download size={16} />
            {exporting ? 'Exporting...' : 'Export Excel'}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-[5rem]">
          <Spinner size="lg" />
        </div>
      ) : (
        <>
          <DataTable columns={columns} data={data} onViewSubTable={handleViewSubTable} onRowClick={handleRowClick} />
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  )
}
