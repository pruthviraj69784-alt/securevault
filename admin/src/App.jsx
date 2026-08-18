import { Routes, Route, Navigate } from 'react-router-dom'
import { useAdminAuth } from './context/AdminAuthContext'
import AdminLayout from './components/AdminLayout'

import AdminLogin from './pages/AdminLogin'
import AdminDashboard from './pages/AdminDashboard'
import UserManagement from './pages/UserManagement'
import StorageManagement from './pages/StorageManagement'
import SecurityCenter from './pages/SecurityCenter'
import QueueMonitoring from './pages/QueueMonitoring'
import WebhookMonitoring from './pages/WebhookMonitoring'
import AuditExplorer from './pages/AuditExplorer'
import PlatformSettings from './pages/PlatformSettings'
import QRSecurityPanel from './pages/QRSecurityPanel'

function AdminPrivateRoute({ children }) {
  const { user, loading } = useAdminAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-[var(--accent)] border-t-transparent animate-spin" />
      </div>
    )
  }

  if (!user || user.role?.toUpperCase() !== 'ADMIN') {
    return <Navigate to="/login" replace />
  }

  return children
}

function AdminPublicRoute({ children }) {
  const { user, loading } = useAdminAuth()
  if (loading) return null
  if (user && user.role?.toUpperCase() === 'ADMIN') {
    return <Navigate to="/dashboard" replace />
  }
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<AdminPublicRoute><AdminLogin /></AdminPublicRoute>} />

      <Route path="/" element={<AdminPrivateRoute><AdminLayout><AdminDashboard /></AdminLayout></AdminPrivateRoute>} />
      <Route path="/dashboard" element={<AdminPrivateRoute><AdminLayout><AdminDashboard /></AdminLayout></AdminPrivateRoute>} />
      <Route path="/users" element={<AdminPrivateRoute><AdminLayout><UserManagement /></AdminLayout></AdminPrivateRoute>} />
      <Route path="/storage" element={<AdminPrivateRoute><AdminLayout><StorageManagement /></AdminLayout></AdminPrivateRoute>} />
      <Route path="/security" element={<AdminPrivateRoute><AdminLayout><SecurityCenter /></AdminLayout></AdminPrivateRoute>} />
      <Route path="/queues" element={<AdminPrivateRoute><AdminLayout><QueueMonitoring /></AdminLayout></AdminPrivateRoute>} />
      <Route path="/webhooks" element={<AdminPrivateRoute><AdminLayout><WebhookMonitoring /></AdminLayout></AdminPrivateRoute>} />
      <Route path="/audits" element={<AdminPrivateRoute><AdminLayout><AuditExplorer /></AdminLayout></AdminPrivateRoute>} />
      <Route path="/qr" element={<AdminPrivateRoute><AdminLayout><QRSecurityPanel /></AdminLayout></AdminPrivateRoute>} />
      <Route path="/settings" element={<AdminPrivateRoute><AdminLayout><PlatformSettings /></AdminLayout></AdminPrivateRoute>} />

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
