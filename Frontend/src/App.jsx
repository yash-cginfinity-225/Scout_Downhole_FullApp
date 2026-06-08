import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import FileUploader from './pages/FileUploader'
import TableView from './pages/TableView'
import SubTableView from './pages/SubTableView'
import AdminLookup from './pages/AdminLookup'
import Layout from './components/Layout'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/files" replace />} />
            <Route path="files" element={<FileUploader />} />
            <Route path="bha-tally" element={<TableView key="bha_tally" tableKey="bha_tally" title="BHA Tally" />} />
            <Route path="bha-report" element={<TableView key="bha_report" tableKey="bha_report" title="BHA Report" />} />
            <Route path="bha-extracted" element={<TableView key="bha_extracted" tableKey="bha_extracted" title="BHA Performance Reports" />} />
            <Route path="motor-performance" element={<TableView key="motor_performance" tableKey="motor_performance" title="Motor Performance" />} />
            <Route path="scout-bha-report" element={<TableView key="scout_bha_report" tableKey="scout_bha_report" title="Scout BHA Report" />} />
            <Route path="scout-failure-report" element={<TableView key="scout_failure_report" tableKey="scout_failure_report" title="Scout Failure Report" />} />
            <Route path="scout-motor-performance" element={<TableView key="scout_motor_performance" tableKey="scout_motor_performance" title="Scout Motor Performance" />} />
            <Route path="sub-table" element={<SubTableView />} />
            <Route path="admin" element={<AdminLookup />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
