import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { X, User, HardDrive, Files, Share2, ClipboardList, Laptop, Shield, CheckCircle2, Lock } from 'lucide-react'
import { adminApi } from '../services/api'

function formatBytes(b = 0) {
  if (b < 1024) return `${b} B`
  if (b < 1024 ** 2) return `${(b / 1024).toFixed(1)} KB`
  if (b < 1024 ** 3) return `${(b / 1024 ** 2).toFixed(1)} MB`
  return `${(b / 1024 ** 3).toFixed(2)} GB`
}

export default function UserDetailsDrawer({ userId, onClose }) {
  const [activeTab, setActiveTab] = useState('general')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-user-details', userId],
    queryFn: () => adminApi.userDetails(userId).then(r => r.data.data),
    enabled: !!userId
  })

  if (!userId) return null

  const user = data?.user
  const files = data?.files || []
  const shares = data?.shares || []
  const audits = data?.audits || []

  const totalSize = files.reduce((s, f) => {
    const latest = f.versions?.[f.versions.length - 1]
    return s + (latest?.size || 0)
  }, 0)

  const TABS = [
    { id: 'general', label: 'General', icon: User },
    { id: 'storage', label: 'Storage', icon: HardDrive },
    { id: 'files', label: `Files (${files.length})`, icon: Files },
    { id: 'shares', label: `Shares (${shares.length})`, icon: Share2 },
    { id: 'audits', label: 'Audit Logs', icon: ClipboardList },
  ]

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-end" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)' }} onClick={onClose}>
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          onClick={e => e.stopPropagation()}
          className="w-full max-w-xl bg-card h-full border-l border-theme p-6 overflow-y-auto flex flex-col justify-between shadow-2xl"
        >
          {isLoading ? (
            <div className="p-8 text-center text-muted">Loading user telemetry...</div>
          ) : (
            <div>
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-theme">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-lg" style={{ background: 'var(--accent)' }}>
                    {user?.name?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <h2 className="font-bold text-theme text-base">{user?.name}</h2>
                    <p className="text-xs text-muted">{user?.email}</p>
                  </div>
                </div>
                <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--border)] text-muted hover:text-theme">
                  <X size={18} />
                </button>
              </div>

              {/* Navigation Tabs */}
              <div className="flex border-b border-theme gap-2 my-4 overflow-x-auto pb-1">
                {TABS.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                      activeTab === id ? 'bg-accent text-white' : 'text-muted hover:text-theme hover:bg-[var(--border)]'
                    }`}
                  >
                    <Icon size={14} /> {label}
                  </button>
                ))}
              </div>

              {/* Tab 1: General */}
              {activeTab === 'general' && (
                <div className="space-y-4 text-xs">
                  <div className="p-4 rounded-xl border border-theme bg-[var(--bg)] space-y-2">
                    <div className="flex justify-between"><span className="text-muted">Role:</span><span className="font-bold text-theme">{user?.role}</span></div>
                    <div className="flex justify-between"><span className="text-muted">Account Status:</span><span className="badge badge-success">{user?.status || 'Active'}</span></div>
                    <div className="flex justify-between"><span className="text-muted">Joined Date:</span><span className="font-semibold text-theme">{new Date(user?.createdAt).toLocaleDateString()}</span></div>
                    <div className="flex justify-between"><span className="text-muted">Last Login:</span><span className="font-semibold text-theme">{user?.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Recently'}</span></div>
                  </div>
                </div>
              )}

              {/* Tab 2: Storage */}
              {activeTab === 'storage' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl border border-theme bg-[var(--bg)]">
                    <p className="text-xs text-muted mb-1">Total Storage Consumed</p>
                    <p className="text-2xl font-bold text-theme">{formatBytes(totalSize)}</p>
                  </div>
                </div>
              )}

              {/* Tab 3: Files */}
              {activeTab === 'files' && (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {files.map(f => (
                    <div key={f._id} className="flex items-center justify-between p-3 rounded-xl border border-theme text-xs">
                      <div>
                        <p className="font-bold text-theme truncate max-w-[220px]">{f.originalName}</p>
                        <span className="text-muted text-[10px]">{formatBytes(f.size)}</span>
                      </div>
                      <span className="badge badge-info">v{f.currentVersion}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Tab 4: Shares */}
              {activeTab === 'shares' && (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {shares.map(s => (
                    <div key={s._id} className="p-3 rounded-xl border border-theme text-xs space-y-1">
                      <div className="flex justify-between"><span className="font-mono text-accent">{s.token}</span><span className="badge badge-warning">{s.downloadCount}/{s.maxDownloads} downloads</span></div>
                    </div>
                  ))}
                </div>
              )}

              {/* Tab 5: Audits */}
              {activeTab === 'audits' && (
                <div className="space-y-2 max-h-96 overflow-y-auto text-xs">
                  {audits.map(a => (
                    <div key={a._id} className="flex items-center justify-between p-2.5 rounded-xl border border-theme bg-[var(--bg)]">
                      <span className="badge badge-info">{a.action}</span>
                      <span className="text-muted text-[10px]">{new Date(a.createdAt).toLocaleTimeString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="pt-4 border-t border-theme mt-6">
            <button onClick={onClose} className="btn-ghost w-full justify-center text-xs">Close Details</button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
