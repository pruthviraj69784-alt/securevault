import { NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Files, Star, Trash2, Upload, Share2, ClipboardList,
  Webhook, Shield, ShieldCheck, User, Settings, LogOut, Sun, Moon,
  ChevronLeft, Menu, Users, Key, Bell, Search, Command, ChevronDown,
  Sparkles
} from 'lucide-react'
import { useState } from 'react'
import { useAuth }  from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import NotificationBell from './NotificationBell'

const NAV = [
  { to: '/dashboard',       icon: LayoutDashboard, label: 'Dashboard',       section: 'WORKSPACE' },
  { to: '/files',           icon: Files,           label: 'My Files',        section: 'WORKSPACE' },
  { to: '/shares/with-me',  icon: Users,           label: 'Shared With Me',  section: 'WORKSPACE' },
  { to: '/shares/by-me',    icon: Share2,          label: 'Shared By Me',    section: 'WORKSPACE' },
  { to: '/shares/requests', icon: Key,             label: 'Access Requests', section: 'WORKSPACE' },
  { to: '/favorites',       icon: Star,            label: 'Favorites',       section: 'WORKSPACE' },
  { to: '/trash',           icon: Trash2,          label: 'Trash',           section: 'WORKSPACE' },
  { to: '/upload',          icon: Upload,          label: 'Upload',          section: 'WORKSPACE' },
  { to: '/notifications',   icon: Bell,            label: 'Notifications',   section: 'WORKSPACE' },
  { to: '/security',        icon: ShieldCheck,     label: 'Security Center', section: 'SECURITY' },
  { to: '/audit',           icon: ClipboardList,   label: 'Audit Logs',      section: 'SECURITY' },
  { to: '/webhooks',        icon: Webhook,         label: 'Webhooks',        section: 'SECURITY' },
]

const ADMIN_NAV = [{ to: '/admin', icon: Shield, label: 'Admin Panel' }]

const AVATAR_COLORS = [
  'linear-gradient(135deg,#7c4dff,#5628d9)',
  'linear-gradient(135deg,#34d399,#059669)',
  'linear-gradient(135deg,#f59e0b,#d97706)',
  'linear-gradient(135deg,#3b82f6,#2563eb)',
]

function avatarGradient(name = '') {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]
}

export default function Layout({ children }) {
  const { user, logout }  = useAuth()
  const { dark, toggle }  = useTheme()
  const navigate          = useNavigate()
  const [collapsed, setCollapsed]   = useState(false)
  const [globalSearch, setGlobalSearch] = useState('')

  const handleLogout = () => { logout(); navigate('/login') }
  const isAdmin = user?.role?.toLowerCase() === 'admin'
  const sections = [...new Set(NAV.map(item => item.section))]

  const submitGlobalSearch = (e) => {
    e.preventDefault()
    const q = globalSearch.trim()
    navigate(q ? `/files?q=${encodeURIComponent(q)}` : '/files')
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* ── Sidebar ── */}
      <motion.aside
        animate={{ width: collapsed ? 68 : 260 }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
        style={{
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          background: 'var(--card)',
          borderRight: '1px solid var(--border)',
          position: 'sticky',
          top: 0,
          height: '100vh',
        }}
      >
        {/* Logo / Collapse */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1rem 0.875rem',
          borderBottom: '1px solid var(--border)',
          minHeight: '3.75rem',
        }}>
          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.div
                key="logo"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.15 }}
                style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}
              >
                <div style={{
                  width: '2rem', height: '2rem', borderRadius: '0.5rem',
                  background: 'linear-gradient(135deg, var(--accent), var(--accent-hover))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: '0 4px 12px var(--accent-glow)',
                }}>
                  <Shield size={14} color="#fff" />
                </div>
                <div>
                  <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text)', letterSpacing: '-0.02em' }}>
                    SecureVault
                  </span>
                  <div style={{ fontSize: '0.6rem', color: 'var(--muted)', letterSpacing: '0.06em', marginTop: '-1px' }}>
                    ENTERPRISE
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setCollapsed(c => !c)}
            style={{
              width: '1.75rem', height: '1.75rem',
              borderRadius: '0.4rem', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              background: 'transparent', border: '1px solid var(--border)',
              color: 'var(--muted)', cursor: 'pointer', flexShrink: 0,
              marginLeft: 'auto',
              transition: 'all 0.2s',
            }}
          >
            {collapsed ? <Menu size={15} /> : <ChevronLeft size={15} />}
          </motion.button>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '0.75rem 0.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {sections.map(section => (
            <div key={section}>
              {!collapsed && (
                <p className="nav-section-label">{section}</p>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                {NAV.filter(item => item.section === section).map(({ to, icon: Icon, label }) => (
                  <NavLink
                    key={to}
                    to={to}
                    title={collapsed ? label : undefined}
                    className={({ isActive }) =>
                      `sidebar-link${isActive ? ' active' : ''}${collapsed ? ' justify-center' : ''}`
                    }
                    style={collapsed ? { justifyContent: 'center', padding: '0.55rem 0' } : {}}
                  >
                    <Icon size={16} style={{ flexShrink: 0 }} />
                    <AnimatePresence mode="wait">
                      {!collapsed && (
                        <motion.span
                          key="lbl"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.12 }}
                          style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        >
                          {label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </NavLink>
                ))}
              </div>
            </div>
          ))}

          {isAdmin && (
            <>
              <div style={{ height: '1px', background: 'var(--border)', margin: '0.5rem 0' }} />
              {!collapsed && <p className="nav-section-label" style={{ color: 'var(--warning)', opacity: 1 }}>ADMIN</p>}
              {ADMIN_NAV.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  title={collapsed ? label : undefined}
                  className={({ isActive }) =>
                    `sidebar-link${isActive ? ' active' : ''}${collapsed ? ' justify-center' : ''}`
                  }
                  style={collapsed ? { justifyContent: 'center', padding: '0.55rem 0' } : {
                    color: 'var(--warning)',
                  }}
                >
                  <Icon size={16} style={{ flexShrink: 0 }} />
                  {!collapsed && <span>Admin Panel</span>}
                </NavLink>
              ))}
            </>
          )}
        </nav>

        {/* Bottom actions */}
        <div style={{ padding: '0.5rem', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
          {[
            { to: '/profile',  Icon: User,     label: 'Profile',   onClick: undefined },
            { to: '/settings', Icon: Settings, label: 'Settings',  onClick: undefined },
          ].map(({ to, Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                `sidebar-link${isActive ? ' active' : ''}${collapsed ? ' justify-center' : ''}`
              }
              style={collapsed ? { justifyContent: 'center', padding: '0.55rem 0' } : {}}
            >
              <Icon size={16} style={{ flexShrink: 0 }} />
              {!collapsed && <span>{label}</span>}
            </NavLink>
          ))}

          <button
            onClick={toggle}
            title={dark ? 'Light mode' : 'Dark mode'}
            className={`sidebar-link${collapsed ? ' justify-center' : ''}`}
            style={collapsed ? { justifyContent: 'center', padding: '0.55rem 0', width: '100%' } : { width: '100%' }}
          >
            {dark ? <Sun size={16} style={{ flexShrink: 0 }} /> : <Moon size={16} style={{ flexShrink: 0 }} />}
            {!collapsed && <span>{dark ? 'Light Mode' : 'Dark Mode'}</span>}
          </button>

          <button
            onClick={handleLogout}
            title={collapsed ? 'Logout' : undefined}
            className={`sidebar-link${collapsed ? ' justify-center' : ''}`}
            style={{
              width: '100%',
              color: 'var(--danger)',
              ...(collapsed ? { justifyContent: 'center', padding: '0.55rem 0' } : {}),
            }}
          >
            <LogOut size={16} style={{ flexShrink: 0 }} />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>

        {/* User card */}
        {!collapsed && user && (
          <NavLink
            to="/profile"
            className="sidebar-account"
            style={{ margin: '0 0.5rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.65rem', textDecoration: 'none' }}
          >
            <div style={{
              width: '2.25rem', height: '2.25rem', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: '0.8rem', fontWeight: 800, flexShrink: 0,
              background: avatarGradient(user.name),
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            }}>
              {user.name?.[0]?.toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.name}
              </p>
              <p style={{ fontSize: '0.68rem', color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.email}
              </p>
            </div>
            <div style={{ marginLeft: 'auto', flexShrink: 0 }}>
              <span style={{
                fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.08em',
                textTransform: 'uppercase', padding: '0.15rem 0.4rem',
                borderRadius: '9999px', background: 'var(--accent-soft)', color: 'var(--accent)',
              }}>
                {user.role || 'USER'}
              </span>
            </div>
          </NavLink>
        )}
      </motion.aside>

      {/* ── Main ── */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh', overflow: 'auto', minWidth: 0 }}>
        {/* Topbar */}
        <header className="topbar">
          <div style={{ display: 'none' }} className="lg:block">
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              Secure workspace
            </span>
          </div>

          <form onSubmit={submitGlobalSearch} className="topbar-search" style={{ flex: 1, maxWidth: '26rem' }}>
            <Search size={14} color="var(--muted)" />
            <input
              value={globalSearch}
              onChange={e => setGlobalSearch(e.target.value)}
              placeholder="Search files in vault…"
              aria-label="Search files"
            />
            <span className="topbar-shortcut" style={{ display: 'inline-flex' }}>
              <Command size={10} />K
            </span>
          </form>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto' }}>
            <button onClick={toggle} className="topbar-icon" title={dark ? 'Light mode' : 'Dark mode'}>
              {dark ? <Moon size={16} /> : <Sun size={16} />}
            </button>
            <NotificationBell />
            <NavLink to="/profile" className="topbar-profile" style={{ textDecoration: 'none' }}>
              <div style={{
                width: '1.85rem', height: '1.85rem', borderRadius: '0.45rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: '0.7rem', fontWeight: 800,
                background: avatarGradient(user?.name),
              }}>
                {user?.name?.[0]?.toUpperCase()}
              </div>
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text)' }}
                    className="hidden sm:inline">{user?.name}</span>
              <ChevronDown size={13} color="var(--muted)" className="hidden sm:block" />
            </NavLink>
          </div>
        </header>

        {/* Page content */}
        <motion.div
          className="app-content"
          style={{ flex: 1 }}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
        >
          {children}
        </motion.div>
      </main>
    </div>
  )
}
