import { useState, useEffect } from 'react'
import {
  getLookupTable,
  createLookupTable,
  deleteLookupColumn,
  getTableStructures,
} from '../services/api'
import Button from '../atoms/Button/Button'
import Input from '../atoms/Input/Input'
import Spinner from '../atoms/Spinner/Spinner'
import { Plus, Trash2, Edit3, Save, X, Settings } from 'lucide-react'

const TABLE_OPTIONS = [
  { key: 'bha_tally', label: 'BHA Tally' },
  { key: 'bha_report', label: 'BHA Report' },
  { key: 'bha_extracted', label: 'Extracted Reports' },
  { key: 'motor_performance', label: 'Motor Performance' },
]

export default function AdminLookup() {
  const [lookupData, setLookupData] = useState([])
  const [loading, setLoading] = useState(true)
  const [tableStructures, setTableStructures] = useState({})
  const [editMode, setEditMode] = useState(false)
  const [rows, setRows] = useState([])

  useEffect(() => {
    fetchData()
  }, [])

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

      // Convert existing data into row format
      if (data.length > 0) {
        const parsed = data.map((item) => ({
          id: item.id,
          column_name: item.column_name || '',
          bha_tally: item.mapped_columns?.split(',')[0]?.trim() || 'N/A',
          bha_report: item.mapped_columns?.split(',')[1]?.trim() || 'N/A',
          bha_extracted: item.mapped_columns?.split(',')[2]?.trim() || 'N/A',
          motor_performance: item.mapped_columns?.split(',')[3]?.trim() || 'N/A',
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

  const createEmptyRow = () => ({
    id: null,
    column_name: '',
    bha_tally: 'N/A',
    bha_report: 'N/A',
    bha_extracted: 'N/A',
    motor_performance: 'N/A',
  })

  const getColumnsForTable = (tableKey) => {
    const structure = tableStructures[tableKey] || []
    return structure.map((col) => col.col_name || col.column_name || '').filter(Boolean)
  }

  const handleAddRow = () => {
    setRows([...rows, createEmptyRow()])
  }

  const handleRemoveRow = (index) => {
    const row = rows[index]
    if (row.id) {
      deleteLookupColumn(row.id).catch(() => {})
    }
    setRows(rows.filter((_, i) => i !== index))
  }

  const handleRowChange = (index, field, value) => {
    const updated = [...rows]
    updated[index][field] = value
    setRows(updated)
  }

  const handleSave = async () => {
    const validRows = rows.filter((r) => r.column_name.trim())
    if (validRows.length === 0) return

    const columns = validRows.map((r) => ({
      column_name: r.column_name,
      mapped_tables: TABLE_OPTIONS.filter((t) => r[t.key] !== 'N/A').map((t) => t.key),
      mapped_columns: TABLE_OPTIONS.map((t) => r[t.key] || 'N/A'),
      sub_fields: [],
    }))

    try {
      await createLookupTable({ columns })
      setEditMode(false)
      fetchData()
    } catch (err) {
      console.error('Save failed:', err)
    }
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
      <div className="flex items-center justify-between mb-[1.5rem] flex-wrap gap-[1rem]">
        <div>
          <h1 className="text-[1.5rem] font-bold text-gray-900 flex items-center gap-[0.625rem]">
            <Settings size={24} />
            Admin - Lookup Table
          </h1>
        </div>
        <div className="flex gap-[0.75rem]">
          <Button
            variant={editMode ? 'danger' : 'outline'}
            size="md"
            onClick={() => setEditMode(!editMode)}
          >
            {editMode ? <X size={16} /> : <Edit3 size={16} />}
            {editMode ? 'Cancel' : 'Edit'}
          </Button>
          {editMode && (
            <Button variant="primary" size="md" onClick={handleSave}>
              <Save size={16} />
              Save
            </Button>
          )}
        </div>
      </div>

      {rows.length === 0 || (rows.length === 1 && !rows[0].column_name && !lookupData.length) ? (
        <div className="bg-white rounded-[0.75rem] p-[2rem] shadow-sm border border-gray-200 mb-[1.5rem]">
          <h2 className="text-[1.25rem] font-bold text-gray-900 mb-[0.5rem]">Start Creating Your Lookup Table</h2>
          <p className="text-[0.875rem] text-gray-500">Define column names and select the corresponding field from each table. Use N/A if a column doesn't apply to a table.</p>
        </div>
      ) : null}

      <div className="bg-white rounded-[0.75rem] shadow-sm border border-gray-200 overflow-x-auto">
        {/* Header row */}
        <div className={`grid ${editMode ? 'grid-cols-[12.5rem_repeat(4,1fr)_auto]' : 'grid-cols-[12.5rem_repeat(4,1fr)]'} bg-gray-900 text-white text-[0.75rem] font-semibold uppercase tracking-wide`}>
          <div className="px-[1rem] py-[0.75rem]">Column Name</div>
          {TABLE_OPTIONS.map((t) => (
            <div key={t.key} className="px-[1rem] py-[0.75rem]">
              {t.label}
            </div>
          ))}
          {editMode && <div className="px-[1rem] py-[0.75rem] min-w-[3.75rem] text-center">Actions</div>}
        </div>

        {/* Data rows */}
        {rows.map((row, idx) => (
          <div key={idx} className={`grid ${editMode ? 'grid-cols-[12.5rem_repeat(4,1fr)_auto]' : 'grid-cols-[12.5rem_repeat(4,1fr)]'} border-b border-gray-200 last:border-b-0 items-center hover:bg-gray-50`}>
            <div className="px-[1rem] py-[0.75rem] text-[0.8125rem]">
              {editMode ? (
                <Input
                  value={row.column_name}
                  onChange={(e) => handleRowChange(idx, 'column_name', e.target.value)}
                  placeholder="Column name"
                />
              ) : (
                <span className="font-semibold text-gray-900">{row.column_name || '—'}</span>
              )}
            </div>
            {TABLE_OPTIONS.map((t) => (
              <div key={t.key} className="px-[1rem] py-[0.75rem] text-[0.8125rem]">
                {editMode ? (
                  <select
                    className="w-full px-[0.625rem] py-[0.5rem] border border-gray-300 rounded-[0.25rem] text-[0.75rem] bg-white text-gray-900 cursor-pointer outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                    value={row[t.key] || 'N/A'}
                    onChange={(e) => handleRowChange(idx, t.key, e.target.value)}
                  >
                    <option value="N/A">N/A</option>
                    {getColumnsForTable(t.key).map((col) => (
                      <option key={col} value={col}>
                        {col}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className={row[t.key] === 'N/A' ? 'text-gray-400 italic' : 'text-gray-700'}>
                    {row[t.key] || 'N/A'}
                  </span>
                )}
              </div>
            ))}
            {editMode && (
              <div className="px-[1rem] py-[0.75rem] min-w-[3.75rem] text-center">
                <Button variant="ghost" size="sm" onClick={() => handleRemoveRow(idx)}>
                  <Trash2 size={14} />
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      {editMode && (
        <div className="p-[1rem] flex justify-center">
          <Button variant="ghost" size="md" onClick={handleAddRow}>
            <Plus size={16} />
            Add Column
          </Button>
        </div>
      )}
    </div>
  )
}
