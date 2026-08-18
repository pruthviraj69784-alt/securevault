import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, CheckCircle2, ShieldAlert, Share2, Upload, AlertCircle, Trash2 } from 'lucide-react'

const INITIAL_NOTIFICATIONS = [
  { id: 1, title: 'File Uploaded', desc: 'Project_Proposal_2026.pdf was successfully encrypted and stored.', time: '2m ago', type: 'upload', read: false },
  { id: 2, title: 'Share Created', desc: 'Public share link generated with 24h expiration.', time: '1h ago', type: 'share', read: false },
  { id: 3, title: 'Security Check Passed', desc: 'ClamAV scanner verified zero malware in recent uploads.', time: '3h ago', type: 'security', read: true },
  { id: 4, title: 'Webhook Dispatched', desc: 'FILE_SHARED event dispatched to registered endpoint.', time: '1d ago', type: 'webhook', read: true }
]

const ICON_MAP = {
  upload:   <Upload size={15} className="text-[var(--accent)]" />,
  share:    <Share2 size={15} className="text-amber-500" />,
  security: <CheckCircle2 size={15} className="text-emerald-500" />,
  virus:    <ShieldAlert size={15} className="text-rose-500" />,
  webhook:  <AlertCircle size={15} className="text-purple-500" />,
}

export default function NotificationCenter() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS)
  const dropdownRef = useRef(null)

  const unreadCount = notifications.filter(n => !n.read).length

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  const clearAll = () => {
    setNotifications([])
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(o => !o)}
        className="relative p-2 rounded-xl border border-theme hover:bg-[var(--border)] text-muted hover:text-theme transition-all duration-200"
        title="Notifications"
      >
        <Bell size={19} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[var(--accent)] text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-3 w-80 sm:w-96 rounded-2xl border border-theme glass shadow-2xl z-50 overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-theme bg-card">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-theme">Notifications</span>
                {unreadCount > 0 && (
                  <span className="badge badge-info text-xs">{unreadCount} new</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-xs text-accent hover:underline font-medium">
                    Mark all read
                  </button>
                )}
                {notifications.length > 0 && (
                  <button onClick={clearAll} className="p-1 text-muted hover:text-[var(--danger)] transition-colors" title="Clear all">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-theme">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-muted text-xs">
                  <Bell size={24} className="mx-auto mb-2 opacity-40" />
                  No notifications. All caught up!
                </div>
              ) : (
                notifications.map(n => (
                  <div
                    key={n.id}
                    onClick={() => setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x))}
                    className={`p-3.5 flex items-start gap-3 cursor-pointer transition-colors hover:bg-[var(--border)] ${
                      !n.read ? 'bg-[color-mix(in_srgb,var(--accent)_6%,transparent)]' : ''
                    }`}
                  >
                    <div className="p-2 rounded-lg bg-[var(--card)] border border-theme mt-0.5">
                      {ICON_MAP[n.type] || <Bell size={15} className="text-muted" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className={`text-xs font-semibold ${!n.read ? 'text-theme' : 'text-muted'}`}>{n.title}</p>
                        <span className="text-[10px] text-muted">{n.time}</span>
                      </div>
                      <p className="text-[11px] text-muted mt-0.5 line-clamp-2">{n.desc}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
