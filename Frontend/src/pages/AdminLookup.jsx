import { useState, useEffect, useCallback, useRef } from 'react'
import {
  getMappedData,
  getFileViewUrl,
} from '../services/api'
import DataTable from '../molecules/DataTable/DataTable'
import SearchBar from '../molecules/SearchBar/SearchBar'
import Pagination from '../molecules/Pagination/Pagination'
import Button from '../atoms/Button/Button'
import Spinner from '../atoms/Spinner/Spinner'
import { Download, ArrowLeft, X } from 'lucide-react'
import * as XLSX from 'xlsx'

export default function AdminLookup() {
  // Mapped data state
  const [allMappedData, setAllMappedData] = useState([])
  const [mappedColumns, setMappedColumns] = useState([])
  const [mappedLoading, setMappedLoading] = useState(false)
  const [loadingMoreMapped, setLoadingMoreMapped] = useState(false)
  const [mappedSearch, setMappedSearch] = useState('')
  const [mappedDisplayPage, setMappedDisplayPage] = useState(1)
  const [mappedPageSize, setMappedPageSize] = useState(10)
  const [mappedTotal, setMappedTotal] = useState(0)
  const [mappedFetchedCount, setMappedFetchedCount] = useState(0)
  const [exporting, setExporting] = useState(false)
  const mappedAbortRef = useRef(false)

  // PDF viewer state
  const [selectedPdf, setSelectedPdf] = useState(null)

  // Description popup state
  const [descPopup, setDescPopup] = useState(null)

  // Sub-table state
  const [subTableData, setSubTableData] = useState(null)
  const [subTableColumn, setSubTableColumn] = useState('')

  const fetchMappedData = useCallback(async () => {
    mappedAbortRef.current = true
    await new Promise(r => setTimeout(r, 0))
    mappedAbortRef.current = false

    setMappedLoading(true)
    setAllMappedData([])
    setMappedFetchedCount(0)
    setMappedDisplayPage(1)

    try {
      const res = await getMappedData({ search: mappedSearch, page: 1, page_size: 100 })
      if (mappedAbortRef.current) return

      const data = res.data.data || []
      const cols = res.data.columns || []
      const total = res.data.total || 0
      const totalPages = res.data.total_pages || 1

      setMappedColumns(cols.map(c => c === 'path' ? 'file_name' : c))
      setMappedTotal(total)
      setAllMappedData(data.map(row => {
        if ('path' in row && !('file_name' in row)) {
          const { path, ...rest } = row
          return { file_name: (path || '').split('/').pop(), ...rest }
        }
        return row
      }))
      setMappedFetchedCount(data.length)
      setMappedLoading(false)

      if (totalPages > 1) {
        setLoadingMoreMapped(true)
        let accumulated = [...data]
        for (let p = 2; p <= totalPages; p++) {
          if (mappedAbortRef.current) return
          const nextRes = await getMappedData({ search: mappedSearch, page: p, page_size: 100 })
          if (mappedAbortRef.current) return
          const nextData = nextRes.data.data || []
          const transformed = nextData.map(row => {
            if ('path' in row && !('file_name' in row)) {
              const { path, ...rest } = row
              return { file_name: (path || '').split('/').pop(), ...rest }
            }
            return row
          })
          accumulated = [...accumulated, ...transformed]
          setAllMappedData(accumulated)
          setMappedFetchedCount(accumulated.length)
        }
        setLoadingMoreMapped(false)
      }
    } catch {
      setAllMappedData([])
      setMappedColumns([])
      setMappedLoading(false)
      setLoadingMoreMapped(false)
    }
  }, [mappedSearch])

  useEffect(() => {
    fetchMappedData()
    return () => { mappedAbortRef.current = true }
  }, [fetchMappedData])

  // Client-side pagination over allMappedData
  const mappedTotalDisplayPages = Math.max(1, Math.ceil(mappedTotal / mappedPageSize))
  const mappedMaxAvailablePage = Math.max(1, Math.ceil(allMappedData.length / mappedPageSize))
  const mappedEffectivePage = Math.min(mappedDisplayPage, mappedMaxAvailablePage)
  const mappedData = allMappedData.slice(
    (mappedEffectivePage - 1) * mappedPageSize,
    mappedEffectivePage * mappedPageSize
  )

  const handleExportMapped = () => {
    if (!allMappedData.length) return
    setExporting(true)
    try {
      const flatData = allMappedData
        .filter(row => !mappedSearch || mappedColumns.some(col => String(row[col] ?? '').toLowerCase().includes(mappedSearch.toLowerCase())))
        .map((row) => {
          const flat = {}
          for (const col of mappedColumns) {
            const value = row[col]
            if (Array.isArray(value)) {
              flat[col] = value.join('; ')
            } else if (typeof value === 'object' && value !== null) {
              flat[col] = JSON.stringify(value)
            } else {
              flat[col] = value ?? ''
            }
          }
          return flat
        })
      const ws = XLSX.utils.json_to_sheet(flatData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Mapped Data')
      XLSX.writeFile(wb, 'mapped_data_export.xlsx')
    } catch (err) {
      console.error('Export failed:', err)
    } finally {
      setExporting(false)
    }
  }

  const handleFileNameClick = (row) => {
    const filename = row.file_name || (row._path || '').split('/').pop()
    const fullPath = row._path || row.path || null
    if (filename) {
      setSelectedPdf({ name: filename, path: fullPath })
    }
  }

  const handleDescriptionClick = (value, fileName, colName) => {
    setDescPopup({ text: String(value), fileName, colName })
  }

  const handleViewSubTable = (data, colName) => {
    setSubTableData(data)
    setSubTableColumn(colName)
  }

  // PDF viewer
  if (selectedPdf) {
    const pdfUrl = getFileViewUrl(selectedPdf.name || selectedPdf, selectedPdf.path || null)
    const pdfName = selectedPdf.name || selectedPdf
    return (
      <div className="flex flex-col h-[calc(100vh-7rem)]">
        <div className="flex items-center justify-between mb-[1rem] gap-[1rem] flex-wrap shrink-0">
          <div className="flex items-baseline gap-[0.75rem]">
            <Button variant="ghost" size="md" onClick={() => setSelectedPdf(null)}>
              <ArrowLeft size={16} />
              Back
            </Button>
            <h1 className="text-[1.5rem] font-bold text-gray-900">{pdfName}</h1>
          </div>
        </div>
        <div className="flex-1 bg-white rounded-[0.75rem] shadow-sm border border-gray-200 overflow-hidden">
          <iframe src={pdfUrl} className="w-full h-full border-0" title="PDF Viewer" />
        </div>
      </div>
    )
  }

  // Sub-table view
  if (subTableData) {
    const subColumns = subTableData.length > 0 ? Object.keys(subTableData[0]) : []
    return (
      <div>
        <div className="flex items-center justify-between mb-[1.25rem] gap-[1rem] flex-wrap">
          <div className="flex items-baseline gap-[0.75rem]">
            <Button variant="ghost" size="md" onClick={() => { setSubTableData(null); setSubTableColumn('') }}>
              <ArrowLeft size={16} />
              Back
            </Button>
            <h1 className="text-[1.5rem] font-bold text-gray-900">{subTableColumn?.replace(/_/g, ' ') || 'Sub Table'}</h1>
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

      {/* Mapped Data Table */}
      <div>
          <div className="flex items-center justify-between mb-[1.25rem] gap-[1rem] flex-wrap">
            <div className="flex items-baseline gap-[0.75rem]">
              <h2 className="text-[1.25rem] font-bold text-gray-900">Mapped Data</h2>
              <span className="text-[0.875rem] text-gray-500 font-medium">
                {loadingMoreMapped ? `${mappedFetchedCount} / ${mappedTotal} loaded` : `${mappedTotal} records`}
              </span>
            </div>
            <div className="flex items-center gap-[0.75rem]">
              <SearchBar
                value={mappedSearch}
                onChange={(e) => setMappedSearch(e.target.value)}
                placeholder="Search mapped data..."
              />
              <Button variant="secondary" size="md" onClick={handleExportMapped} disabled={exporting}>
                <Download size={16} />
                {exporting ? 'Exporting...' : 'Export Excel'}
              </Button>
            </div>
          </div>

          {mappedLoading ? (
            <div className="flex justify-center items-center py-[5rem]">
              <Spinner size="lg" />
            </div>
          ) : (
            <>
              <MappedDataTable
                columns={mappedColumns}
                data={mappedData}
                onFileNameClick={handleFileNameClick}
                onDescriptionClick={handleDescriptionClick}
                onViewSubTable={handleViewSubTable}
              />
              <Pagination page={mappedDisplayPage} totalPages={mappedTotalDisplayPages} onPageChange={setMappedDisplayPage} pageSize={mappedPageSize} onPageSizeChange={(size) => { setMappedPageSize(size); setMappedDisplayPage(1) }} />
            </>
          )}
        </div>
    </div>
  )
}

function MappedDataTable({ columns, data, onFileNameClick, onDescriptionClick, onViewSubTable }) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-[0.75rem] p-[3rem] shadow-sm border border-gray-200 text-center">
        <p className="text-gray-500 text-[1rem]">No mapped data available. Make sure mappings are saved and tables have data.</p>
      </div>
    )
  }

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

  const isSummaryColumn = (colName) => {
    const normalized = colName.toLowerCase().replace(/[^a-z0-9_]/g, '_')
    return SUMMARY_COLUMNS.some(sc => normalized.includes(sc) || sc.includes(normalized))
  }

  const getFileName = (row) => row.file_name || ''

  const renderCell = (value, colName, row) => {
    if (value === null || value === undefined) return <span className="text-gray-400">—</span>

    if (colName === 'file_name') {
      return (
        <button
          className="text-gray-900 font-medium text-left hover:text-gray-600 transition-colors whitespace-normal break-all"
          onClick={(e) => {
            e.stopPropagation()
            onFileNameClick(row)
          }}
        >
          {value}
        </button>
      )
    }

    if (Array.isArray(value)) {
      if (value.length > 0 && typeof value[0] === 'object') {
        return (
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onViewSubTable(value, colName)
            }}
          >
            View ({value.length})
          </Button>
        )
      }
      const joined = value.join(', ')
      if (joined.length > 80 || isSummaryColumn(colName)) {
        return (
          <button
            className="text-left text-gray-700 hover:text-gray-900 transition-colors"
            onClick={(e) => {
              e.stopPropagation()
              onDescriptionClick(joined, getFileName(row), colName)
            }}
          >
            <span>{joined.length > 60 ? joined.substring(0, 60) + '...' : joined}</span>
            <span className="ml-[0.375rem] text-[0.6875rem] text-gray-400 italic">view</span>
          </button>
        )
      }
      return joined
    }

    const str = String(value)

    // Summary columns - always clickable
    if (isSummaryColumn(colName) && str.trim()) {
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

    if (str.length > 80) {
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

    return str
  }

  const displayColumns = columns.filter(c => !c.startsWith('_'))

  return (
    <div className="bg-white rounded-[0.75rem] shadow-sm overflow-hidden border border-gray-200">
      <div className="overflow-x-auto max-h-[80vh] overflow-y-auto">
        <table className="w-full text-[0.8125rem]" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
          <thead>
            <tr>
              {displayColumns.map((col) => (
                <th key={col} className="sticky top-0 bg-gray-900 text-white px-[1rem] py-[0.875rem] text-left font-semibold text-[0.6875rem] uppercase tracking-[0.05em] whitespace-nowrap z-10 border-b border-gray-700">
                  {col.replace(/__/g, ' \u203A ').replace(/_/g, ' ')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIdx) => (
              <tr key={rowIdx} className="border-b border-gray-200 transition-colors duration-150 hover:bg-gray-50">
                {displayColumns.map((col) => (
                  <td key={col} className={`px-[1rem] py-[0.75rem] border-b border-gray-100 ${col === 'file_name' ? 'min-w-[16rem] max-w-[26rem]' : 'whitespace-nowrap max-w-[18.75rem] overflow-hidden text-ellipsis'}`}>
                    {renderCell(row[col], col, row)}
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
