import { FileText, Download, Trash2 } from 'lucide-react'
import Button from '../../atoms/Button/Button'

export default function FileCard({ file, highlighted, onDownload, onDelete }) {
  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1048576).toFixed(1)} MB`
  }

  return (
    <div className={`flex items-center gap-[0.75rem] px-[1rem] py-[0.875rem] bg-white border rounded-[0.5rem] transition-shadow duration-200 hover:shadow-md ${highlighted ? 'border-emerald-500 bg-emerald-50 animate-[highlight-pulse_2s_ease-in-out]' : 'border-gray-200'}`}>
      <div className="flex items-center justify-center w-[2.5rem] h-[2.5rem] bg-red-50 rounded-[0.5rem] text-primary shrink-0">
        <FileText size={24} />
      </div>
      <div className="flex-1 min-w-0">
        <span className="block text-[0.875rem] font-medium text-gray-900 overflow-hidden text-ellipsis whitespace-nowrap" title={file.name}>
          {file.name}
        </span>
        <span className="text-[0.75rem] text-gray-500">{formatSize(file.size)}</span>
      </div>
      <div className="flex gap-[0.5rem] shrink-0">
        <Button variant="ghost" size="sm" onClick={() => onDownload(file.name)}>
          <Download size={14} />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onDelete(file.name)}>
          <Trash2 size={14} />
        </Button>
      </div>
    </div>
  )
}
