import { NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Users, HardDrive, ShieldCheck, Cpu, Webhook,
  ClipboardList, Sliders, LogOut, Sun, Moon, ChevronLeft, Menu, Shield, QrCode
} from 'lucide-react'
import { useState } from 'react'
import { useAdminAuth } from '../context/AdminAuthContext'
import { useTheme } from '../context/ThemeContext'

const NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/users', icon: Users, label: 'User Management' },
  { to: '/storage', icon: HardDrive, label: 'Storage' },
  { to: '/security', icon: ShieldCheck, label: 'Security Center' },
  { to: '/qr', icon: QrCode, label: 'QR Telemetry' },
  { to: '/queues', icon: Cpu, label: 'Queue Monitor' },
  { to: '/webhooks', icon: Webhook, label: 'Webhook Monitor' },
  { to: '/audits', icon: ClipboardList, label: 'Audit Explorer' },
  { to: '/settings', icon: Sliders, label: 'Platform Settings' },
]

export default function AdminLayout({ children }) {
  const { user, logout } = useAdminAuth()
  const { dark, toggle } = useTheme()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 72 : 260 }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
        className="flex-shrink-0 flex flex-col overflow-hidden"
        style={{ background: 'var(--card)', borderRight: '1px solid var(--border)' }}
      >
        <div className="flex items-center justify-between px-4 py-5 border-b border-theme">
          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm bg-accent shadow-md">
                  <Shield size={18} />
                </div>
                <div>
                  <span className="font-bold text-sm text-theme block">Admin Portal</span>
                  <span className="text-[10px] text-muted block font-mono">PORT :3001</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <button onClick={() => setCollapsed(c => !c)} className="p-1.5 rounded-lg hover:bg-[var(--border)] text-muted">
            {collapsed ? <Menu size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''} ${collapsed ? 'justify-center px-0' : ''}`}
              title={collapsed ? label : undefined}
            >
              <Icon size={18} className="flex-shrink-0" />
              {!collapsed && <span className="truncate">{label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-theme space-y-1">
          <button onClick={toggle} className={`sidebar-link w-full ${collapsed ? 'justify-center px-0' : ''}`}>
            {dark ? <Sun size={18} /> : <Moon size={18} />}
            {!collapsed && <span>{dark ? 'Light Mode' : 'Dark Mode'}</span>}
          </button>
          <button onClick={handleLogout} className={`sidebar-link w-full text-rose-500 hover:bg-rose-500/10 ${collapsed ? 'justify-center px-0' : ''}`}>
            <LogOut size={18} className="flex-shrink-0" />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-h-screen overflow-auto">
        <header className="flex items-center justify-between px-6 py-3 border-b border-theme bg-card sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <span className="badge badge-warning text-[10px] font-bold">ENTERPRISE ADMIN ENGINE</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 p-1.5 rounded-xl border border-theme bg-[var(--bg)]">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold bg-accent">
                {user?.name?.[0]?.toUpperCase() || 'A'}
              </div>
              <span className="text-xs font-semibold text-theme">{user?.name || 'Administrator'}</span>
            </div>
          </div>
        </header>

        <motion.div className="flex-1 p-6 lg:p-8" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          {children}
        </motion.div>
      </main>
    </div>
  )
}
