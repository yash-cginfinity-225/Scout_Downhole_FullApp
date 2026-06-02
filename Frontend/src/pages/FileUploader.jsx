import { useState, useEffect } from 'react'
import { uploadFiles, listFiles, deleteFile, getFileDownloadUrl } from '../services/api'
import DropZone from '../molecules/DropZone/DropZone'
import FileCard from '../molecules/FileCard/FileCard'
import Button from '../atoms/Button/Button'
import Spinner from '../atoms/Spinner/Spinner'
import EmptyState from '../atoms/EmptyState/EmptyState'
import { FolderOpen, Upload } from 'lucide-react'

export default function FileUploader() {
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')
  const [recentUploads, setRecentUploads] = useState([])
  const [stagedFiles, setStagedFiles] = useState([])

  const fetchFiles = async () => {
    try {
      const res = await listFiles()
      setFiles(res.data.files || [])
    } catch {
      setFiles([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFiles()
  }, [])

  const handleFilesSelected = (selectedFiles) => {
    setStagedFiles((prev) => [...prev, ...selectedFiles])
    setMessage('')
  }

  const handleRemoveStaged = (index) => {
    setStagedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleConfirmUpload = async () => {
    if (stagedFiles.length === 0) return
    setUploading(true)
    setMessage('')
    try {
      const formData = new FormData()
      stagedFiles.forEach((file) => formData.append('files', file))
      const res = await uploadFiles(formData)
      setMessage(res.data.message)
      const uploadedNames = (res.data.uploaded || []).map((f) => f.stored_name)
      setRecentUploads(uploadedNames)
      setStagedFiles([])
      fetchFiles()
    } catch (err) {
      setMessage('Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const handleDownload = (filename) => {
    window.open(getFileDownloadUrl(filename), '_blank')
  }

  const handleDelete = async (filename) => {
    try {
      await deleteFile(filename)
      fetchFiles()
    } catch {
      setMessage('Delete failed.')
    }
  }

  return (
    <div>
      <div className="mb-[1.5rem]">
        <h1 className="text-[1.5rem] font-bold text-gray-900">File Upload</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-[2rem]">
        <div className="bg-white rounded-[0.75rem] p-[1.75rem] shadow-sm border border-gray-200">
          <h2 className="text-[1rem] font-semibold text-gray-800 mb-[1.25rem]">Upload Files</h2>
          <DropZone onFilesSelected={handleFilesSelected} />

          {stagedFiles.length > 0 && (
            <div className="mt-[1rem] p-[1rem] bg-amber-50 border border-amber-300 rounded-[0.5rem]">
              <h3 className="text-[0.875rem] font-semibold text-amber-800 mb-[0.625rem]">
                Ready to upload ({stagedFiles.length} file{stagedFiles.length > 1 ? 's' : ''})
              </h3>
              <div className="flex flex-col gap-[0.375rem] mb-[0.75rem]">
                {stagedFiles.map((file, idx) => (
                  <div key={idx} className="flex items-center gap-[0.5rem] px-[0.625rem] py-[0.375rem] bg-white border border-amber-300 rounded-[0.25rem]">
                    <span className="flex-1 text-[0.8125rem] font-medium text-gray-800 overflow-hidden text-ellipsis whitespace-nowrap">{file.name}</span>
                    <span className="text-[0.75rem] text-gray-500 shrink-0">
                      {(file.size / 1024).toFixed(1)} KB
                    </span>
                    <Button variant="ghost" size="sm" onClick={() => handleRemoveStaged(idx)}>
                      ✕
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                variant="primary"
                size="md"
                onClick={handleConfirmUpload}
                disabled={uploading}
              >
                <Upload size={16} />
                {uploading ? 'Uploading...' : 'Confirm Upload'}
              </Button>
            </div>
          )}

          {uploading && (
            <div className="flex items-center gap-[0.5rem] mt-[0.75rem] text-[0.875rem] text-gray-600">
              <Spinner size="sm" />
              <span>Uploading...</span>
            </div>
          )}
          {message && <p className="mt-[0.75rem] text-[0.875rem] font-medium text-emerald-600">{message}</p>}
        </div>

        <div className="bg-white rounded-[0.75rem] p-[1.75rem] shadow-sm border border-gray-200">
          <h2 className="text-[1rem] font-semibold text-gray-800 mb-[1.25rem]">Uploaded Files</h2>
          {loading ? (
            <div className="flex justify-center py-[2.5rem]">
              <Spinner />
            </div>
          ) : files.length === 0 ? (
            <EmptyState
              icon={<FolderOpen size={48} />}
              title="No Files Uploaded"
              description="Upload files using the drop zone on the left."
            />
          ) : (
            <div className="flex flex-col gap-[0.625rem] max-h-[31.25rem] overflow-y-auto">
              {files.map((file) => (
                <FileCard
                  key={file.name}
                  file={file}
                  highlighted={recentUploads.includes(file.name)}
                  onDownload={handleDownload}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
