import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { toast } from 'react-toastify'
import { Star, Download, Share2, Trash2, ShieldCheck, Lock, Eye, Files } from 'lucide-react'
import { fileApi } from '../services/api'
import { SkeletonCard } from '../components/Skeletons'
import { useAuth } from '../context/AuthContext'
import { processAndSaveDownload } from '../utils/downloadHelper'
import { useState } from 'react'
import FileInsightsDrawer from '../components/FileInsightsDrawer'
import ShareModal from '../components/ShareModal'
import { AnimatePresence } from 'framer-motion'

function formatBytes(b = 0) {
  if (b < 1024) return `${b} B`
  if (b < 1024 ** 2) return `${(b / 1024).toFixed(1)} KB`
  if (b < 1024 ** 3) return `${(b / 1024 ** 2).toFixed(1)} MB`
  return `${(b / 1024 ** 3).toFixed(2)} GB`
}
function relativeTime(date) {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${Math.max(1, mins)}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

const EXT_COLORS = { pdf: '#ef4444', doc: '#3b82f6', docx: '#3b82f6', txt: '#6b7280', csv: '#10b981', png: '#f59e0b', jpg: '#f59e0b', jpeg: '#f59e0b', svg: '#8b5cf6', gif: '#ec4899', mp4: '#7c3aed', default: 'var(--accent)' }
const extColor = (name = '') => EXT_COLORS[name.split('.').pop()?.toLowerCase()] || EXT_COLORS.default

export default function Favorites() {
  const qc = useQueryClient()
  const { zkPassphrase } = useAuth() || {}
  const [shareFile, setShareFile]   = useState(null)
  const [inspectFile, setInspectFile] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['favorite-files'],
    queryFn:  () => fileApi.myFiles().then(r => (r.data.data || []).filter(f => f.isFavorite)),
  })
  const files = data || []

  const handleToggleFavorite = async (id) => {
    try { await fileApi.toggleFavorite(id); qc.invalidateQueries(['favorite-files']); qc.invalidateQueries(['my-files']); toast.success('Removed from favorites') }
    catch { toast.error('Failed') }
  }
  const handleDownload = async (id, name) => {
    try { const res = await fileApi.download(id); await processAndSaveDownload(res, name, zkPassphrase); toast.success('Download started!') }
    catch (err) { toast.error(err?.message || 'Download failed') }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="page-header">
        <div className="page-header-left">
          <span className="page-tag"><Star size={11} /> Favorites</span>
          <h1 className="page-title">Starred Files</h1>
          <p className="page-sub">{files.length} file{files.length !== 1 ? 's' : ''} marked as favorite</p>
        </div>
      </div>

      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : files.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-state-icon" style={{ background: 'var(--warning-soft)', border: '1px solid color-mix(in srgb, var(--warning) 25%, transparent)' }}>
            <Star size={26} style={{ color: 'var(--warning)' }} />
          </div>
          <h3>No favorite files yet</h3>
          <p>Star any file from My Files to pin it here for quick access.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
          {files.map((f, i) => {
            const latest = f.versions?.[f.versions.length - 1]
            const isZK = latest?.isZeroKnowledge
            const ext = f.originalName?.split('.').pop()?.toUpperCase()?.slice(0, 4) || 'FILE'
            const color = extColor(f.originalName)
            return (
              <motion.article
                key={f._id}
                className="file-preview-card"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                style={{ borderColor: 'color-mix(in srgb, var(--warning) 20%, var(--border))' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                    <div style={{
                      width: '2.75rem', height: '2.75rem', flexShrink: 0, borderRadius: '0.75rem',
                      background: `color-mix(in srgb, ${color} 14%, transparent)`,
                      border: `1px solid color-mix(in srgb, ${color} 25%, transparent)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.6rem', fontWeight: 800, color,
                    }}>
                      {ext}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <h2 style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {f.originalName}
                      </h2>
                      <p style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: '0.1rem' }}>
                        {formatBytes(latest?.size)} · {relativeTime(f.createdAt)}
                      </p>
                    </div>
                  </div>
                  <motion.button onClick={() => handleToggleFavorite(f._id)} whileHover={{ scale: 1.2 }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f59e0b', flexShrink: 0 }}>
                    <Star size={17} style={{ fill: '#f59e0b' }} />
                  </motion.button>
                </div>

                <div style={{
                  marginTop: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.4rem 0.75rem', borderRadius: '9999px',
                  background: 'var(--warning-soft)', border: '1px solid color-mix(in srgb, var(--warning) 25%, transparent)',
                  fontSize: '0.7rem', color: 'var(--muted)',
                }}>
                  {isZK ? <Lock size={12} style={{ color: 'var(--success)' }} /> : <ShieldCheck size={12} style={{ color: 'var(--accent)' }} />}
                  <span>{isZK ? 'Zero-Knowledge' : 'AES-256'}</span>
                </div>

                <div style={{ marginTop: '0.875rem', display: 'flex', gap: '0.35rem', justifyContent: 'flex-end' }}>
                  {[
                    { title: 'Inspect', Icon: Eye,      onClick: () => setInspectFile(f) },
                    { title: 'Download', Icon: Download, onClick: () => handleDownload(f._id, f.originalName) },
                    { title: 'Share',   Icon: Share2,   onClick: () => setShareFile(f) },
                  ].map(({ title, Icon, onClick }) => (
                    <motion.button key={title} title={title} onClick={onClick} className="btn-icon"
                      whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                      <Icon size={13} />
                    </motion.button>
                  ))}
                </div>
              </motion.article>
            )
          })}
        </div>
      )}

      <AnimatePresence>
        {shareFile && <ShareModal file={shareFile} onClose={() => setShareFile(null)} />}
      </AnimatePresence>
      <FileInsightsDrawer file={inspectFile} onClose={() => setInspectFile(null)}
        onDownload={handleDownload} onShare={(f) => { setInspectFile(null); setShareFile(f) }} />
    </div>
  )
}
