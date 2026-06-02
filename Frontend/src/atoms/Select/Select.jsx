import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, X, Check } from 'lucide-react'

export default function Select({
  value,
  onChange,
  options = [],
  placeholder = 'Select...',
  multiple = false,
  noSort = false,
  className = '',
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [dropdownStyle, setDropdownStyle] = useState({})
  const triggerRef = useRef(null)
  const dropdownRef = useRef(null)

  const computePosition = useCallback(() => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    const spaceAbove = rect.top
    const dropHeight = 240
    const openUpward = spaceBelow < dropHeight && spaceAbove > spaceBelow

    setDropdownStyle({
      position: 'fixed',
      left: rect.left,
      width: rect.width,
      minWidth: '12rem',
      zIndex: 9999,
      ...(openUpward
        ? { bottom: window.innerHeight - rect.top + 4 }
        : { top: rect.bottom + 4 }),
    })
  }, [])

  useEffect(() => {
    if (open) computePosition()
  }, [open, computePosition])

  useEffect(() => {
    const handler = (e) => {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target)
      ) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (!open) return
    const handler = () => computePosition()
    window.addEventListener('scroll', handler, true)
    window.addEventListener('resize', handler)
    return () => {
      window.removeEventListener('scroll', handler, true)
      window.removeEventListener('resize', handler)
    }
  }, [open, computePosition])

  const sortedOptions = noSort ? [...options] : [...options].sort((a, b) => {
    const la = (a.label || a.value || '').toLowerCase()
    const lb = (b.label || b.value || '').toLowerCase()
    if (la === 'n/a') return -1
    if (lb === 'n/a') return 1
    return la.localeCompare(lb)
  })

  const filtered = sortedOptions.filter((opt) =>
    (opt.label || opt.value || '').toLowerCase().includes(search.toLowerCase())
  )

  const handleSelect = (optValue) => {
    if (multiple) {
      const current = Array.isArray(value) ? value : []
      if (current.includes(optValue)) {
        onChange(current.filter((v) => v !== optValue))
      } else {
        onChange([...current, optValue])
      }
    } else {
      onChange(optValue)
      setOpen(false)
      setSearch('')
    }
  }

  const handleRemove = (e, optValue) => {
    e.stopPropagation()
    if (multiple) {
      const current = Array.isArray(value) ? value : []
      onChange(current.filter((v) => v !== optValue))
    }
  }

  const getLabel = (val) => {
    const opt = options.find((o) => o.value === val)
    return opt ? (opt.label || opt.value) : val
  }

  const displayValue = multiple
    ? (Array.isArray(value) ? value : [])
    : value

  return (
    <div ref={triggerRef} className={`relative w-full ${className}`}>
      <div
        className={`flex items-center gap-[0.375rem] min-h-[2.25rem] px-[0.625rem] py-[0.375rem] border rounded-[0.375rem] bg-white cursor-pointer transition-all duration-150 ${open ? 'border-primary ring-2 ring-primary/10' : 'border-gray-300 hover:border-gray-400'}`}
        onClick={() => setOpen(!open)}
      >
        <div className="flex-1 flex flex-wrap gap-[0.25rem] items-center min-w-0">
          {multiple ? (
            displayValue.length > 0 ? (
              displayValue.map((v) => (
                <span
                  key={v}
                  className="inline-flex items-center gap-[0.125rem] px-[0.375rem] py-[0.0625rem] bg-gray-100 border border-gray-200 rounded-[0.25rem] text-[0.6875rem] font-medium text-gray-700 max-w-[8rem] truncate"
                >
                  {getLabel(v)}
                  <button
                    onClick={(e) => handleRemove(e, v)}
                    className="ml-[0.125rem] text-gray-400 hover:text-red-500 transition-colors shrink-0"
                  >
                    <X size={10} />
                  </button>
                </span>
              ))
            ) : (
              <span className="text-[0.75rem] text-gray-400">{placeholder}</span>
            )
          ) : (
            <span className={`text-[0.75rem] truncate ${value && value !== 'N/A' ? 'text-gray-900' : 'text-gray-400'}`}>
              {value && value !== 'N/A' ? getLabel(value) : placeholder}
            </span>
          )}
        </div>
        <ChevronDown size={14} className={`text-gray-400 shrink-0 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </div>

      {open && createPortal(
        <div ref={dropdownRef} style={dropdownStyle} className="bg-white border border-gray-200 rounded-[0.5rem] shadow-xl overflow-hidden">
          {sortedOptions.length > 5 && (
            <div className="p-[0.375rem] border-b border-gray-100">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="w-full px-[0.5rem] py-[0.375rem] text-[0.75rem] border border-gray-200 rounded-[0.25rem] outline-none focus:border-primary focus:ring-1 focus:ring-primary/10"
                onClick={(e) => e.stopPropagation()}
                autoFocus
              />
            </div>
          )}
          <div className="max-h-[14rem] overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-[0.75rem] py-[0.5rem] text-[0.75rem] text-gray-400">No options</div>
            ) : (
              filtered.map((opt) => {
                const isSelected = multiple
                  ? (Array.isArray(value) ? value : []).includes(opt.value)
                  : value === opt.value
                return (
                  <div
                    key={opt.value}
                    className={`flex items-center gap-[0.5rem] px-[0.75rem] py-[0.5rem] text-[0.75rem] cursor-pointer transition-colors ${isSelected ? 'bg-primary/5 text-primary font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleSelect(opt.value)
                    }}
                  >
                    {multiple && (
                      <div className={`w-[1rem] h-[1rem] rounded-[0.1875rem] border flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'bg-primary border-primary' : 'border-gray-300'}`}>
                        {isSelected && <Check size={10} className="text-white" />}
                      </div>
                    )}
                    <span className="truncate">{opt.label || opt.value}</span>
                    {!multiple && isSelected && <Check size={12} className="ml-auto text-primary shrink-0" />}
                  </div>
                )
              })
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
