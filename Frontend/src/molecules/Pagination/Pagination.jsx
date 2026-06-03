import Button from '../../atoms/Button/Button'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function Pagination({ page, totalPages, onPageChange, pageSize, onPageSizeChange }) {
  const getPageNumbers = () => {
    const pages = []
    const maxVisible = 5
    let start = Math.max(1, page - Math.floor(maxVisible / 2))
    let end = Math.min(totalPages, start + maxVisible - 1)
    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1)
    }
    for (let i = start; i <= end; i++) pages.push(i)
    return pages
  }

  const pageNumbers = getPageNumbers()

  return (
    <div className="flex items-center justify-between gap-[1rem] py-[1rem] flex-wrap border-t border-gray-200 mt-[0.5rem]">
      {/* Rows per page */}
      <div className="flex items-center gap-[0.5rem]">
        <span className="text-[0.8125rem] text-gray-500 whitespace-nowrap">Rows per page</span>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange?.(Number(e.target.value))}
          className="px-[0.5rem] py-[0.375rem] text-[0.8125rem] font-medium text-gray-700 bg-white border border-gray-300 rounded-[0.375rem] outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 cursor-pointer"
        >
          {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>

      {/* Page navigation */}
      <div className="flex items-center gap-[0.5rem]">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >
          <ChevronLeft size={16} />
          <span className="max-sm:hidden">Previous</span>
        </Button>

        <div className="flex items-center gap-[0.25rem]">
          {pageNumbers[0] > 1 && (
            <>
              <button
                onClick={() => onPageChange(1)}
                className="w-[2rem] h-[2rem] flex items-center justify-center rounded-[0.375rem] text-[0.8125rem] font-medium text-gray-600 hover:bg-gray-100 transition-colors"
              >
                1
              </button>
              {pageNumbers[0] > 2 && <span className="text-gray-400 px-[0.25rem]">...</span>}
            </>
          )}
          {pageNumbers.map(p => (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`w-[2rem] h-[2rem] flex items-center justify-center rounded-[0.375rem] text-[0.8125rem] font-medium transition-colors ${p === page ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              {p}
            </button>
          ))}
          {pageNumbers[pageNumbers.length - 1] < totalPages && (
            <>
              {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && <span className="text-gray-400 px-[0.25rem]">...</span>}
              <button
                onClick={() => onPageChange(totalPages)}
                className="w-[2rem] h-[2rem] flex items-center justify-center rounded-[0.375rem] text-[0.8125rem] font-medium text-gray-600 hover:bg-gray-100 transition-colors"
              >
                {totalPages}
              </button>
            </>
          )}
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
        >
          <span className="max-sm:hidden">Next</span>
          <ChevronRight size={16} />
        </Button>
      </div>
    </div>
  )
}
