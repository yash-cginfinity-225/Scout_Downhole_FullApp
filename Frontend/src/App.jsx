import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './pages/Login'
import FileUploader from './pages/FileUploader'
import TableView from './pages/TableView'
import SubTableView from './pages/SubTableView'
import AdminLookup from './pages/AdminLookup'
import Layout from './components/Layout'

function ProtectedRoute({ children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return children
}

function AdminRoute({ children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (!user.is_admin) return <Navigate to="/" replace />
  return children
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/files" replace />} />
            <Route path="files" element={<FileUploader />} />
            <Route path="bha-tally" element={<TableView tableKey="bha_tally" title="BHA Tally" />} />
            <Route path="bha-report" element={<TableView tableKey="bha_report" title="BHA Report" />} />
            <Route path="bha-extracted" element={<TableView tableKey="bha_extracted" title="BHA Performance Reports" />} />
            <Route path="motor-performance" element={<TableView tableKey="motor_performance" title="Motor Performance" />} />
            <Route path="sub-table" element={<SubTableView />} />
            <Route
              path="admin"
              element={
                <AdminRoute>
                  <AdminLookup />
                </AdminRoute>
              }
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
