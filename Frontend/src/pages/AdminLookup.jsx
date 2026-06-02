import { useState, useEffect } from 'react'
import {
  getLookupTable,
  createLookupTable,
  deleteLookupColumn,
  getTableStructures,
  getMappedData,
  exportMappedData,
  getFileViewUrl,
} from '../services/api'
import DataTable from '../molecules/DataTable/DataTable'
import SearchBar from '../molecules/SearchBar/SearchBar'
import Pagination from '../molecules/Pagination/Pagination'
import Button from '../atoms/Button/Button'
import Input from '../atoms/Input/Input'
import Spinner from '../atoms/Spinner/Spinner'
import Select from '../atoms/Select/Select'
import { Plus, Trash2, Edit3, Save, X, Settings, Download, ArrowLeft } from 'lucide-react'
import * as XLSX from 'xlsx'

const TABLE_OPTIONS = [
  { key: 'bha_tally', label: 'BHA Tally' },
  { key: 'bha_report', label: 'BHA Report' },
  { key: 'bha_extracted', label: 'Performance Reports' },
  { key: 'motor_performance', label: 'Motor Performance' },
]

export default function AdminLookup() {
  const [lookupData, setLookupData] = useState([])
  const [loading, setLoading] = useState(true)
  const [tableStructures, setTableStructures] = useState({})
  const [editMode, setEditMode] = useState(false)
  const [rows, setRows] = useState([])

  // Mapped data state
  const [mappedData, setMappedData] = useState([])
  const [mappedColumns, setMappedColumns] = useState([])
  const [mappedLoading, setMappedLoading] = useState(false)
  const [mappedSearch, setMappedSearch] = useState('')
  const [mappedPage, setMappedPage] = useState(1)
  const [mappedTotalPages, setMappedTotalPages] = useState(1)
  const [mappedTotal, setMappedTotal] = useState(0)
  const [exporting, setExporting] = useState(false)

  // PDF viewer state
  const [selectedPdf, setSelectedPdf] = useState(null)

  // Description popup state
  const [descPopup, setDescPopup] = useState(null)

  // Sub-table state
  const [subTableData, setSubTableData] = useState(null)
  const [subTableColumn, setSubTableColumn] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    if (lookupData.length > 0) {
      fetchMappedData()
    }
  }, [mappedSearch, mappedPage, lookupData])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [lookupRes, structRes] = await Promise.all([
        getLookupTable(),
        getTableStructures(),
      ])
      const data = lookupRes.data.data || []
      setLookupData(data)
      setTableStructures(structRes.data || {})

      if (data.length > 0) {
        const parsed = data.map((item) => ({
          id: item.id,
          column_name: item.column_name || '',
          bha_tally: (item.mapped_columns || '').split(',')[0]?.trim() || 'N/A',
          bha_report: (item.mapped_columns || '').split(',')[1]?.trim() || 'N/A',
          bha_extracted: (item.mapped_columns || '').split(',')[2]?.trim() || 'N/A',
          motor_performance: (item.mapped_columns || '').split(',')[3]?.trim() || 'N/A',
          sub_fields: item.sub_fields ? item.sub_fields.split(',').map(s => s.trim()).filter(Boolean) : [],
          sub_field_row_index: item.sub_field_row_index || null,
        }))
        setRows(parsed)
      } else {
        setRows([createEmptyRow()])
      }
    } catch {
      setRows([createEmptyRow()])
    } finally {
      setLoading(false)
    }
  }

  const fetchMappedData = async () => {
    setMappedLoading(true)
    try {
      const res = await getMappedData({ search: mappedSearch, page: mappedPage, page_size: 50 })
      setMappedData(res.data.data || [])
      setMappedColumns(res.data.columns || [])
      setMappedTotalPages(res.data.total_pages || 1)
      setMappedTotal(res.data.total || 0)
    } catch {
      setMappedData([])
      setMappedColumns([])
    } finally {
      setMappedLoading(false)
    }
  }

  const createEmptyRow = () => ({
    id: null,
    column_name: '',
    bha_tally: 'N/A',
    bha_report: 'N/A',
    bha_extracted: 'N/A',
    motor_performance: 'N/A',
    sub_fields: [],
    sub_field_row_index: null,
  })

  const getColumnsForTable = (tableKey) => {
    const structure = tableStructures[tableKey] || []
    return structure.map((col) => col.col_name || col.column_name || '').filter(Boolean)
  }

  const isArrayColumn = (row) => {
    for (const t of TABLE_OPTIONS) {
      const colName = row[t.key]
      if (colName && colName !== 'N/A') {
        const struct = tableStructures[t.key] || []
        const colDef = struct.find(s => (s.col_name || s.column_name) === colName)
        if (colDef) {
          const dataType = (colDef.data_type || '').toLowerCase()
          if (dataType.includes('array') || dataType.includes('string')) {
            if (colName.includes('component') || colName.includes('data') || colName.includes('configuration') || colName.includes('stations') || colName.includes('stabilizers') || colName.includes('drill_string')) {
              return true
            }
          }
        }
      }
    }
    return false
  }

  const getSubFieldOptions = (row) => {
    for (const t of TABLE_OPTIONS) {
      const colName = row[t.key]
      if (colName && colName !== 'N/A') {
        return getKnownSubFields(colName)
      }
    }
    return []
  }

  const getKnownSubFields = (colName) => {
    const knownFields = {
      component_data: ['item_no', 'description', 'serial_number', 'od_in', 'id_in', 'gauge_in', 'weight_lbpf', 'top_connection', 'bottom_connection', 'length_ft', 'cumulative_length_ft', 'bit_center_blade_ft'],
      motor_configuration: ['no', 'dfb_ft', 'component', 'yes_no', 'type', 'value'],
      drill_string_parameters_components: ['no', 'component', 'serial_no', 'vendor', 'gauge_in', 'od_in', 'id_in', 'fn_od_in', 'fn_len_ft', 'top_thd', 'bot_thd', 'len_ft', 'total_len_ft'],
      stabilizers: ['description', 'gauge_in', 'position'],
    }
    for (const [key, fields] of Object.entries(knownFields)) {
      if (colName.includes(key) || key.includes(colName)) {
        return fields
      }
    }
    return ['item_no', 'description', 'serial_number', 'od_in', 'id_in', 'length_ft', 'no', 'component', 'value', 'type']
  }

  const handleAddRow = () => {
    setRows([...rows, createEmptyRow()])
  }

  const handleRemoveRow = (index) => {
    const row = rows[index]
    if (row.id) {
      deleteLookupColumn(row.id).catch(() => { })
    }
    setRows(rows.filter((_, i) => i !== index))
  }

  const handleRowChange = (index, field, value) => {
    const updated = [...rows]
    updated[index][field] = value
    setRows(updated)
  }

  const handleSubFieldChange = (index, selectedFields) => {
    const updated = [...rows]
    updated[index].sub_fields = selectedFields
    setRows(updated)
  }

  const handleSubFieldRowIndex = (index, rowIdx) => {
    const updated = [...rows]
    updated[index].sub_field_row_index = rowIdx
    setRows(updated)
  }

  const handleSave = async () => {
    const validRows = rows.filter((r) => r.column_name.trim())
    if (validRows.length === 0) return

    const columns = validRows.map((r) => ({
      column_name: r.column_name,
      mapped_tables: TABLE_OPTIONS.filter((t) => r[t.key] !== 'N/A').map((t) => t.key),
      mapped_columns: TABLE_OPTIONS.map((t) => r[t.key] || 'N/A'),
      sub_fields: r.sub_fields || [],
      sub_field_row_index: r.sub_field_row_index,
    }))

    try {
      await createLookupTable({ columns })
      setEditMode(false)
      fetchData()
    } catch (err) {
      console.error('Save failed:', err)
    }
  }

  const handleExportMapped = async () => {
    setExporting(true)
    try {
      const res = await exportMappedData(mappedSearch)
      const exportData = res.data.data || []
      const flatData = exportData.map((row) => {
        const flat = {}
        for (const [key, value] of Object.entries(row)) {
          if (key.startsWith('_')) continue
          if (Array.isArray(value)) {
            flat[key] = value.join('; ')
          } else if (typeof value === 'object' && value !== null) {
            flat[key] = JSON.stringify(value)
          } else {
            flat[key] = value
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
    const path = row._path || ''
    const filename = path.split('/').pop()
    if (filename) {
      setSelectedPdf(filename)
    }
  }

  const handleDescriptionClick = (value, fileName, colName) => {
    setDescPopup({ text: String(value), fileName, colName })
  }

  const handleViewSubTable = (data, colName) => {
    setSubTableData(data)
    setSubTableColumn(colName)
  }

  useEffect(() => {
    if (editMode) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [editMode])

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
            <h1 className="text-[1.5rem] font-bold text-gray-900">{selectedPdf}</h1>
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

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Spinner size="lg" />
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

      {/* Empty state */}
      {rows.length === 0 || (rows.length === 1 && !rows[0].column_name && !lookupData.length) ? (
        <div className="bg-white rounded-[0.75rem] p-[2rem] shadow-sm border border-gray-200 mb-[1.5rem]">
          <h2 className="text-[1.25rem] font-bold text-gray-900 mb-[0.5rem]">Start Creating Your Lookup Table</h2>
          <p className="text-[0.875rem] text-gray-500">Define column names and select the corresponding field from each table. Use N/A if a column doesn't apply to a table.</p>
          <Button variant="primary" size="md" className="mt-[1rem]" onClick={() => setEditMode(true)}>
            <Edit3 size={16} />
            Get Started
          </Button>
        </div>
      ) : null}

      {/* Edit Overlay */}
      {editMode && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-[1rem]" onClick={() => setEditMode(false)}>
          <div className="bg-white rounded-[0.75rem] shadow-xl w-[95vw] h-[95vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Overlay Header */}
            <div className="flex items-center justify-between px-[1.5rem] py-[1rem] border-b border-gray-200 shrink-0">
              <h2 className="text-[1.125rem] font-bold text-gray-900">Edit Mappings</h2>
              <div className="flex items-center gap-[0.75rem]">
                <Button variant="primary" size="md" onClick={handleSave}>
                  <Save size={16} />
                  Save
                </Button>
                <button onClick={() => setEditMode(false)} className="text-gray-500 hover:text-gray-900 transition-colors">
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Overlay Body */}
            <div className="flex-1 overflow-y-auto p-[1.5rem]">
              <div className="bg-white rounded-[0.5rem] border border-gray-200 overflow-x-auto">
                <div className="grid grid-cols-[12.5rem_repeat(4,1fr)_auto] bg-gray-900 text-white text-[0.75rem] font-semibold uppercase tracking-wide">
                  <div className="px-[1rem] py-[0.75rem]">Column Name</div>
                  {TABLE_OPTIONS.map((t) => (
                    <div key={t.key} className="px-[1rem] py-[0.75rem]">
                      {t.label}
                    </div>
                  ))}
                  <div className="px-[1rem] py-[0.75rem] min-w-[3.75rem] text-center">Actions</div>
                </div>

                {rows.map((row, idx) => (
                  <div key={idx} className="border-b border-gray-200 last:border-b-0">
                    <div className="grid grid-cols-[12.5rem_repeat(4,1fr)_auto] items-center hover:bg-gray-50">
                      <div className="px-[1rem] py-[0.75rem] text-[0.8125rem]">
                        <Input
                          value={row.column_name}
                          onChange={(e) => handleRowChange(idx, 'column_name', e.target.value)}
                          placeholder="Column name"
                        />
                      </div>
                      {TABLE_OPTIONS.map((t) => (
                        <div key={t.key} className="px-[1rem] py-[0.75rem] text-[0.8125rem]">
                          <Select
                            value={row[t.key] || 'N/A'}
                            onChange={(val) => handleRowChange(idx, t.key, val)}
                            options={[
                              { value: 'N/A', label: 'N/A' },
                              ...getColumnsForTable(t.key).map((col) => ({ value: col, label: col.replace(/_/g, ' ') }))
                            ]}
                            placeholder="Select column"
                          />
                        </div>
                      ))}
                      <div className="px-[1rem] py-[0.75rem] min-w-[3.75rem] text-center">
                        <Button variant="ghost" size="sm" onClick={() => handleRemoveRow(idx)}>
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>

                    {/* Sub-field selector for nested/array columns */}
                    {isArrayColumn(row) && (
                      <div className="px-[1rem] py-[0.75rem] bg-gray-50 border-t border-gray-100">
                        <div className="flex items-start gap-[1rem] flex-wrap">
                          <div className="flex-1 min-w-[14rem]">
                            <p className="text-[0.6875rem] font-semibold text-gray-600 uppercase tracking-wide mb-[0.375rem]">Sub-columns</p>
                            <Select
                              multiple
                              value={row.sub_fields || []}
                              onChange={(selected) => handleSubFieldChange(idx, selected)}
                              options={getSubFieldOptions(row).map((sf) => ({ value: sf, label: sf.replace(/_/g, ' ') }))}
                              placeholder="Select sub-columns..."
                            />
                          </div>
                          {(row.sub_fields || []).length > 0 && (
                            <div className="min-w-[8rem]">
                              <p className="text-[0.6875rem] font-semibold text-gray-600 uppercase tracking-wide mb-[0.375rem]">Row Index</p>
                              <Select
                                value={row.sub_field_row_index}
                                onChange={(val) => handleSubFieldRowIndex(idx, val)}
                                options={[
                                  { value: null, label: 'All rows' },
                                  ...Array.from({ length: 20 }, (_, i) => ({ value: i + 1, label: `Row ${i + 1}` }))
                                ]}
                                placeholder="Select row..."
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="p-[1rem] flex justify-center">
                <Button variant="ghost" size="md" onClick={handleAddRow}>
                  <Plus size={16} />
                  Add Column
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Resultant Data Table */}
      {lookupData.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-[1.25rem] gap-[1rem] flex-wrap">
            <div className="flex items-baseline gap-[0.75rem]">
              <h2 className="text-[1.25rem] font-bold text-gray-900">Mapped Data</h2>
              <span className="text-[0.875rem] text-gray-500 font-medium">{mappedTotal} records</span>
            </div>
            <div className="flex items-center gap-[0.75rem]">
              <SearchBar
                value={mappedSearch}
                onChange={(e) => { setMappedSearch(e.target.value); setMappedPage(1) }}
                placeholder="Search mapped data..."
              />
              <Button variant="secondary" size="md" onClick={handleExportMapped} disabled={exporting}>
                <Download size={16} />
                {exporting ? 'Exporting...' : 'Export Excel'}
              </Button>
              <div className="flex gap-[0.75rem]">
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => setEditMode(true)}
                >
                  <Edit3 size={16} />
                  Edit
                </Button>
              </div>
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
              <Pagination page={mappedPage} totalPages={mappedTotalPages} onPageChange={setMappedPage} />
            </>
          )}
        </div>
      )}
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
      <div className="overflow-x-auto max-h-[65vh] overflow-y-auto">
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
