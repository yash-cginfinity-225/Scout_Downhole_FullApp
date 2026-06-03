import { useState, useEffect, useCallback, useRef } from 'react'
import { getTableData, exportTableData, getFileViewUrl } from '../services/api'
import DataTable from '../molecules/DataTable/DataTable'
import SearchBar from '../molecules/SearchBar/SearchBar'
import Pagination from '../molecules/Pagination/Pagination'
import Button from '../atoms/Button/Button'
import Spinner from '../atoms/Spinner/Spinner'
import { Download, ArrowLeft, X } from 'lucide-react'
import * as XLSX from 'xlsx'

const PAGE_SIZE = 100
const DISPLAY_PAGE_SIZE = 100

export default function TableView({ tableKey, title }) {
  const [allData, setAllData] = useState([])
  const [columns, setColumns] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [search, setSearch] = useState('')
  const [displayPage, setDisplayPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [total, setTotal] = useState(0)
  const [fetchedCount, setFetchedCount] = useState(0)
  const [exporting, setExporting] = useState(false)
  const [subTableData, setSubTableData] = useState(null)
  const [subTableColumn, setSubTableColumn] = useState('')
  const [selectedPdf, setSelectedPdf] = useState(null)
  const [descPopup, setDescPopup] = useState(null)
  const abortRef = useRef(false)

  const transformRow = (row) => {
    const newRow = { ...row }
    if (newRow.path) {
      newRow.file_name = newRow.path.split('/').pop()
    } else {
      newRow.file_name = ''
    }
    return newRow
  }

  const fetchAllData = useCallback(async () => {
    abortRef.current = true
    await new Promise(r => setTimeout(r, 0))
    abortRef.current = false

    setLoading(true)
    setAllData([])
    setFetchedCount(0)
    setDisplayPage(1)

    let currentPage = 1
    let totalRecords = 0
    let accumulated = []

    try {
      // Fetch first batch
      const res = await getTableData(tableKey, { search, page: currentPage, page_size: PAGE_SIZE })
      if (abortRef.current) return

      const rawData = res.data.data || []
      const rawColumns = res.data.columns || []
      totalRecords = res.data.total || 0

      const transformed = rawData.map(transformRow)
      accumulated = transformed

      const filteredCols = rawColumns.filter(c => c !== 'path')
      const displayCols = ['file_name', ...filteredCols]

      setColumns(displayCols)
      setTotal(totalRecords)
      setAllData(accumulated)
      setFetchedCount(accumulated.length)
      setLoading(false)

      // Poll remaining pages
      const serverTotalPages = res.data.total_pages || 1
      if (serverTotalPages > 1) {
        setLoadingMore(true)
        for (let p = 2; p <= serverTotalPages; p++) {
          if (abortRef.current) return
          const nextRes = await getTableData(tableKey, { search, page: p, page_size: PAGE_SIZE })
          if (abortRef.current) return

          const nextData = (nextRes.data.data || []).map(transformRow)
          accumulated = [...accumulated, ...nextData]
          setAllData(accumulated)
          setFetchedCount(accumulated.length)
        }
        setLoadingMore(false)
      }
    } catch {
      setAllData([])
      setColumns([])
      setLoading(false)
      setLoadingMore(false)
    }
  }, [tableKey, search])

  useEffect(() => {
    fetchAllData()
    return () => { abortRef.current = true }
  }, [fetchAllData])

  useEffect(() => {
    setDisplayPage(1)
  }, [search])

  // Client-side pagination — base total pages on server total so pagination shows immediately
  const totalDisplayPages = Math.max(1, Math.ceil(total / pageSize))
  const maxAvailablePage = Math.max(1, Math.ceil(allData.length / pageSize))
  const effectivePage = Math.min(displayPage, maxAvailablePage)
  const displayData = allData.slice((effectivePage - 1) * pageSize, effectivePage * pageSize)

  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await exportTableData(tableKey, search)
      const exportData = res.data.data || []

      const flatData = exportData.map((row) => {
        const flat = {}
        // Add file_name
        if (row.path) {
          flat.file_name = row.path.split('/').pop()
        }
        for (const [key, value] of Object.entries(row)) {
          if (key === 'path') continue
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

  const handleSearchChange = (e) => {
    setSearch(e.target.value)
  }

  const handleViewSubTable = (subData, colName) => {
    setSubTableData(subData)
    setSubTableColumn(colName)
  }

  const handleCloseSubTable = () => {
    setSubTableData(null)
    setSubTableColumn('')
  }

  const handleFileClick = (row) => {
    const filename = row.file_name || (row.path ? row.path.split('/').pop() : '')
    if (filename) {
      setSelectedPdf(filename)
    }
  }

  const handleDescriptionClick = (text, fileName, colName) => {
    setDescPopup({ text, fileName, colName })
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
  if (selectedPdf) {
    const pdfUrl = getFileViewUrl(selectedPdf)

    return (
      <div className="flex flex-col h-[calc(100vh-7rem)]">
        <div className="flex items-center justify-between mb-[1rem] gap-[1rem] flex-wrap shrink-0">
          <div className="flex items-baseline gap-[0.75rem]">
            <Button variant="ghost" size="md" onClick={() => setSelectedPdf(null)}>
              <ArrowLeft size={16} />
              Back
            </Button>
            <h1 className="text-[1.5rem] font-bold text-gray-900">
              {selectedPdf}
            </h1>
          </div>
        </div>
        <div className="flex-1 bg-white rounded-[0.75rem] shadow-sm border border-gray-200 overflow-hidden">
          <iframe
            src={pdfUrl}
            className="w-full h-full border-0"
            title="PDF Viewer"
          />
        </div>
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
      {/* Description Popup */}
      {descPopup && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-[1rem]" onClick={() => setDescPopup(null)}>
          <div className="bg-white rounded-[0.75rem] shadow-2xl max-w-[52rem] w-full max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-[1.5rem] py-[1.25rem] border-b border-gray-200 bg-gray-900 rounded-t-[0.75rem]">
              <div>
                <h3 className="text-[1.125rem] font-bold text-white capitalize">{(descPopup.colName || 'Details').replace(/_/g, ' ')}</h3>
                <p className="text-[0.75rem] text-gray-300 mt-[0.25rem] break-all">{descPopup.fileName}</p>
              </div>
              <button onClick={() => setDescPopup(null)} className="w-[2rem] h-[2rem] flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors shrink-0 ml-[1rem]">
                <X size={16} />
              </button>
            </div>
            <div className="p-[1.5rem] overflow-y-auto">
              <div className="bg-gray-50 border border-gray-200 rounded-[0.5rem] p-[1.25rem]">
                <p className="text-[0.875rem] text-gray-700 leading-relaxed whitespace-pre-wrap">{descPopup.text}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mb-[1.25rem]">
        <div className="flex items-baseline gap-[0.75rem] mb-[0.75rem]">
          <h1 className="text-[1.5rem] font-bold text-gray-900">{title}</h1>
          <span className="text-[0.875rem] text-gray-500 font-medium">
            {total} records
            {loadingMore && ` (loaded ${fetchedCount}...)`}
          </span>
        </div>
        <div className="flex items-center justify-between gap-[0.75rem] flex-wrap">
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
          <DataTable
            columns={columns}
            data={displayData}
            onViewSubTable={handleViewSubTable}
            onFileClick={handleFileClick}
            onDescriptionClick={handleDescriptionClick}
          />
          <Pagination page={effectivePage} totalPages={totalDisplayPages} onPageChange={setDisplayPage} pageSize={pageSize} onPageSizeChange={(n) => { setPageSize(n); setDisplayPage(1) }} />
          {loadingMore && (
            <div className="flex items-center justify-center gap-[0.5rem] py-[0.5rem]">
              <Spinner size="sm" />
              <span className="text-[0.75rem] text-gray-500">Loading more records...</span>
            </div>
          )}
        </>
      )}
    </div>
  )
}
