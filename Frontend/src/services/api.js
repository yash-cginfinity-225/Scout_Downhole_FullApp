import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || ''

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Auth
export const loginUser = (username, password) =>
  api.post('/api/auth/login', { username, password })

// Tables
export const getTableData = (tableName, params = {}) =>
  api.get(`/api/tables/${tableName}`, { params })

export const getTableColumns = (tableName) =>
  api.get(`/api/tables/${tableName}/columns`)

export const exportTableData = (tableName, search = '') =>
  api.get(`/api/tables/${tableName}/export`, { params: { search } })

// Files
export const uploadFiles = (formData) =>
  api.post('/api/files/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

export const listFiles = () => api.get('/api/files/list')

export const deleteFile = (filename) => api.delete(`/api/files/${filename}`)

export const getFileDownloadUrl = (filename) =>
  `${API_URL}/api/files/download/${filename}`

export const getFileViewUrl = (filename) =>
  `${API_URL}/api/files/view/${encodeURIComponent(filename)}`

// Admin
export const getLookupTable = () => api.get('/api/admin/lookup-table')

export const createLookupTable = (data) =>
  api.post('/api/admin/lookup-table', data)

export const updateLookupColumn = (id, data) =>
  api.put(`/api/admin/lookup-table/${id}`, data)

export const deleteLookupColumn = (id) =>
  api.delete(`/api/admin/lookup-table/${id}`)

export const getTableStructures = () => api.get('/api/admin/table-structures')

export default api
