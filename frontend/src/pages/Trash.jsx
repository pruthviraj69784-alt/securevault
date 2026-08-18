import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'react-toastify'
import { Trash2, RotateCcw, X, AlertTriangle, Package } from 'lucide-react'
import { fileApi } from '../services/api'
import { SkeletonTable } from '../components/Skeletons'

function formatBytes(b = 0) {
  if (b < 1024) return `${b} B`
  if (b < 1024 ** 2) return `${(b / 1024).toFixed(1)} KB`
  if (b < 1024 ** 3) return `${(b / 1024 ** 2).toFixed(1)} MB`
  return `${(b / 1024 ** 3).toFixed(2)} GB`
}
function relativeTime(date) {
  const diff = Date.now() - new Date(date).getTime()
  const d = Math.floor(diff / 86400000)
  if (d < 1) return 'today'
  if (d === 1) return 'yesterday'
  return `${d}d ago`
}

export default function Trash() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['trash-files'],
    queryFn:  () => fileApi.myFiles().then(r => (r.data.data || []).filter(f => f.isDeleted)),
  })
  const files = data || []

  const handleRestore = async (id, name) => {
    try { await fileApi.restoreFromTrash(id); toast.success(`"${name}" restored!`); qc.invalidateQueries(['trash-files']); qc.invalidateQueries(['my-files']) }
    catch { toast.error('Restore failed') }
  }
  const handleDelete = async (id, name) => {
    if (!window.confirm(`Permanently delete "${name}"? This cannot be undone.`)) return
    try { await fileApi.permanentlyDelete(id); toast.success(`"${name}" permanently deleted`); qc.invalidateQueries(['trash-files']) }
    catch { toast.error('Delete failed') }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="page-header">
        <div className="page-header-left">
          <span className="page-tag" style={{ background: 'var(--danger-soft)', color: 'var(--danger)', borderColor: 'color-mix(in srgb, var(--danger) 25%, transparent)' }}>
            <Trash2 size={11} /> Trash Bin
          </span>
          <h1 className="page-title">Trash</h1>
          <p className="page-sub">Files here are pending permanent deletion. Restore or delete them.</p>
        </div>
      </div>

      {/* Warning banner */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.75rem',
        padding: '0.875rem 1.1rem', borderRadius: '0.75rem',
        background: 'var(--warning-soft)', border: '1px solid color-mix(in srgb, var(--warning) 30%, transparent)',
      }}>
        <AlertTriangle size={16} style={{ color: 'var(--warning)', flexShrink: 0 }} />
        <p style={{ fontSize: '0.8rem', color: 'var(--warning)', fontWeight: 500 }}>
          Files in trash are automatically purged after 30 days. Restore them before they are permanently deleted.
        </p>
      </div>

      {isLoading ? <SkeletonTable rows={4} /> : files.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-state-icon" style={{ background: 'color-mix(in srgb, var(--success) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--success) 25%, transparent)' }}>
            <Package size={26} style={{ color: 'var(--success)' }} />
          </div>
          <h3>Trash is empty</h3>
          <p>Your vault is clean. Files you delete will appear here for 30 days before being permanently removed.</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  {['File', 'Size', 'Deleted', 'Actions'].map(h => <th key={h}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {files.map((f, i) => {
                    const latest = f.versions?.[f.versions.length - 1]
                    const fileId = f._id || f.id
                    const ext = f.originalName?.split('.').pop()?.toUpperCase()?.slice(0, 3)
                    const color = 'var(--danger)'
                    return (
                      <motion.tr key={fileId || i} exit={{ opacity: 0, height: 0 }}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                            <div style={{
                              width: '2rem', height: '2rem', borderRadius: '0.4rem', flexShrink: 0,
                              background: `color-mix(in srgb, ${color} 14%, transparent)`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '0.55rem', fontWeight: 800, color
                            }}>
                              {ext}
                            </div>
                            <div>
                              <span style={{ fontWeight: 600, color: 'var(--text)' }}>{f.originalName}</span>
                              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.1rem' }}>
                                <span style={{ fontSize: '0.68rem', color: 'var(--danger)' }}>Deleted</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>{formatBytes(latest?.size)}</td>
                        <td style={{ color: 'var(--muted)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{relativeTime(f.updatedAt)}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.4rem' }}>
                            <motion.button onClick={() => handleRestore(fileId, f.originalName)} className="btn-ghost"
                              style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem', color: 'var(--success)' }}
                              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                              <RotateCcw size={13} /> Restore
                            </motion.button>
                            <motion.button onClick={() => handleDelete(fileId, f.originalName)} className="btn-ghost"
                              style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem', color: 'var(--danger)' }}
                              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                              <X size={13} /> Delete
                            </motion.button>
                          </div>
                        </td>
                      </motion.tr>
                    )
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
