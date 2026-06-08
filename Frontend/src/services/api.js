import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || ''

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Tables
export const getTableData = (tableName, params = {}) =>
  api.get(`/api/tables/${tableName}`, { params })

export const getTableColumns = (tableName) =>
  api.get(`/api/tables/${tableName}/columns`)

export const exportTableData = (tableName, search = '') =>
  api.get(`/api/tables/${tableName}/export`, { params: { search } })

// Files
export const uploadFiles = (formData) => {
  const url = `${API_URL}/api/files/upload`
  return fetch(url, {
    method: 'POST',
    body: formData,
    credentials: 'include',
  }).then(async (res) => {
    const text = await res.text()
    const data = text ? JSON.parse(text) : {}
    if (!res.ok) throw { response: { data } }
    return { data }
  })
}

export const listFiles = () => api.get('/api/files/list')

export const deleteFile = (filename) => api.delete(`/api/files/${filename}`)

export const getFileDownloadUrl = (filename) =>
  `${API_URL}/api/files/download/${filename}`

export const getFileViewUrl = (filename, fullPath) => {
  const base = `${API_URL}/api/files/view/${encodeURIComponent(filename)}`
  if (fullPath) {
    return `${base}?path=${encodeURIComponent(fullPath)}`
  }
  return base
}

export const getFileAsArrayBuffer = (filename, fullPath) => {
  let url = `/api/files/view/${encodeURIComponent(filename)}`
  if (fullPath) {
    url += `?path=${encodeURIComponent(fullPath)}`
  }
  return api.get(url, { responseType: 'arraybuffer' })
}

// Admin
export const getLookupTable = () => api.get('/api/admin/lookup-table')

export const createLookupTable = (data) =>
  api.post('/api/admin/lookup-table', data)

export const updateLookupColumn = (id, data) =>
  api.put(`/api/admin/lookup-table/${id}`, data)

export const deleteLookupColumn = (id) =>
  api.delete(`/api/admin/lookup-table/${id}`)

export const getTableStructures = () => api.get('/api/admin/table-structures')

export const getMappedData = (params = {}) =>
  api.get('/api/admin/mapped-data', { params })

export const exportMappedData = (search = '') =>
  api.get('/api/admin/mapped-data/export', { params: { search } })

export default api
