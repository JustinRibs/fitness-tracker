import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { DataProvider } from './context/DataContext'
import { Layout } from './components/Layout'
import { AdminPage } from './pages/AdminPage'
import { HomePage } from './pages/HomePage'
import { SettingsPage } from './pages/SettingsPage'
import { LiftHistoryPage } from './pages/LiftHistoryPage'
import { StatsLayout } from './pages/StatsLayout'
import { StatsOverviewPage } from './pages/StatsOverviewPage'

export default function App() {
  return (
    <DataProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="stats" element={<StatsLayout />}>
              <Route index element={<StatsOverviewPage />} />
              <Route path="lifts" element={<LiftHistoryPage />} />
            </Route>
            <Route path="settings" element={<SettingsPage />} />
            <Route path="admin" element={<AdminPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </DataProvider>
  )
}
