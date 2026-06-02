import { useCallback } from 'react'
import { Upload } from 'lucide-react'

export default function DropZone({ onFilesSelected, accept }) {
  const handleDrop = useCallback(
    (e) => {
      e.preventDefault()
      e.stopPropagation()
      const files = Array.from(e.dataTransfer.files)
      if (files.length > 0) onFilesSelected(files)
    },
    [onFilesSelected]
  )

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleFileInput = (e) => {
    const files = Array.from(e.target.files)
    if (files.length > 0) onFilesSelected(files)
    e.target.value = ''
  }

  return (
    <div
      className="relative flex flex-col items-center justify-center py-[4rem] px-[1.5rem] border-2 border-dashed border-gray-400 rounded-[0.75rem] bg-gray-50 cursor-pointer transition-all duration-200 hover:border-primary hover:bg-red-50"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <Upload size={40} className="text-primary mb-[1rem]" />
      <p className="text-[1rem] font-semibold text-gray-800 mb-[0.375rem]">Drag & drop files here</p>
      <p className="text-[0.875rem] text-gray-500">or click to browse</p>
      <input
        type="file"
        multiple
        accept={accept}
        onChange={handleFileInput}
        className="absolute inset-0 opacity-0 cursor-pointer"
      />
    </div>
  )
}
