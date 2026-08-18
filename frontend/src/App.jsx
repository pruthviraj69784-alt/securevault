import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/Layout'

import Login       from './pages/Login'
import Register    from './pages/Register'
import Dashboard   from './pages/Dashboard'
import Files       from './pages/Files'
import Favorites   from './pages/Favorites'
import Trash       from './pages/Trash'
import Upload      from './pages/Upload'
import SharedFiles from './pages/SharedFiles'
import SharedWithMe from './pages/SharedWithMe'
import SharedByMe   from './pages/SharedByMe'
import AccessRequests from './pages/AccessRequests'
import Notifications  from './pages/Notifications'
import PublicSharePage from './pages/PublicSharePage'
import SecurityCenter from './pages/SecurityCenter'
import AuditLogs   from './pages/AuditLogs'
import Webhooks    from './pages/Webhooks'
import Admin       from './pages/Admin'
import Settings    from './pages/Settings'
import Profile     from './pages/Profile'
import QRScannerPage from './pages/QRScannerPage'

function PrivateRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-(--accent) border-t-transparent animate-spin" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  if (adminOnly && user.role?.toLowerCase() !== 'admin') return <Navigate to="/dashboard" replace />
  return children
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (user) return <Navigate to="/dashboard" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login"    element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

      {/* Shared file access — no auth needed */}
      <Route path="/shares" element={<SharedFiles />} />
      <Route path="/share/:token" element={<PublicSharePage />} />

      {/* QR scanner — auth happens inside the flow */}
      <Route path="/qr/scan" element={<QRScannerPage />} />

      {/* Protected */}
      <Route path="/" element={<PrivateRoute><Layout><Dashboard /></Layout></PrivateRoute>} />
      <Route path="/dashboard" element={<PrivateRoute><Layout><Dashboard /></Layout></PrivateRoute>} />
      <Route path="/files"     element={<PrivateRoute><Layout><Files /></Layout></PrivateRoute>} />
      <Route path="/favorites" element={<PrivateRoute><Layout><Favorites /></Layout></PrivateRoute>} />
      <Route path="/trash"     element={<PrivateRoute><Layout><Trash /></Layout></PrivateRoute>} />
      <Route path="/upload"    element={<PrivateRoute><Layout><Upload /></Layout></PrivateRoute>} />
      <Route path="/security"  element={<PrivateRoute><Layout><SecurityCenter /></Layout></PrivateRoute>} />
      <Route path="/audit"     element={<PrivateRoute><Layout><AuditLogs /></Layout></PrivateRoute>} />
      <Route path="/webhooks"  element={<PrivateRoute><Layout><Webhooks /></Layout></PrivateRoute>} />
      <Route path="/settings"  element={<PrivateRoute><Layout><Settings /></Layout></PrivateRoute>} />
      <Route path="/profile"   element={<PrivateRoute><Layout><Profile /></Layout></PrivateRoute>} />
      <Route path="/shares/with-me"  element={<PrivateRoute><Layout><SharedWithMe /></Layout></PrivateRoute>} />
      <Route path="/shares/by-me"    element={<PrivateRoute><Layout><SharedByMe /></Layout></PrivateRoute>} />
      <Route path="/shares/requests" element={<PrivateRoute><Layout><AccessRequests /></Layout></PrivateRoute>} />
      <Route path="/notifications"   element={<PrivateRoute><Layout><Notifications /></Layout></PrivateRoute>} />

      {/* Admin only */}
      <Route path="/admin" element={<PrivateRoute adminOnly><Layout><Admin /></Layout></PrivateRoute>} />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
