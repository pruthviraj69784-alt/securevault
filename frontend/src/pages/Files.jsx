import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'react-toastify'
import {
  FileText, Download, Share2, Search, Trash2, Star,
  ShieldCheck, RefreshCw, Eye, Lock, Filter, Grid, List
} from 'lucide-react'
import { fileApi } from '../services/api'
import { SkeletonTable } from '../components/Skeletons'
import { useAuth } from '../context/AuthContext'
import { processAndSaveDownload } from '../utils/downloadHelper'
import FileInsightsDrawer from '../components/FileInsightsDrawer'
import ShareModal from '../components/ShareModal'
import ZKPromptModal from '../components/ZKPromptModal'

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

const STATUS_BADGE = {
  READY:      'badge-success',
  PROCESSING: 'badge-warning',
  INFECTED:   'badge-danger',
  FAILED:     'badge-danger',
}

const EXT_COLORS = {
  pdf: '#ef4444', doc: '#3b82f6', docx: '#3b82f6', txt: '#6b7280',
  csv: '#10b981', png: '#f59e0b', jpg: '#f59e0b', jpeg: '#f59e0b',
  svg: '#8b5cf6', gif: '#ec4899', mp4: '#7c3aed', mkv: '#7c3aed',
  zip: '#f59e0b', default: 'var(--accent)',
}
const extColor = (name = '') => EXT_COLORS[name.split('.').pop()?.toLowerCase()] || EXT_COLORS.default

export default function Files() {
  const qc = useQueryClient()
  const { zkPassphrase, setZkPassphrase } = useAuth() || {}
  const [searchParams] = useSearchParams()
  const [search, setSearch]       = useState(() => searchParams.get('q') || '')
  const [category, setCategory]   = useState('ALL')
  const [encFilter, setEncFilter] = useState('ALL')
  const [shareFile, setShareFile] = useState(null)
  const [inspectFile, setInspectFile] = useState(null)
  const [viewMode, setViewMode]   = useState('grid')
  const [pendingZK, setPendingZK] = useState(null)

  useEffect(() => { setSearch(searchParams.get('q') || '') }, [searchParams])

  const { data, isLoading } = useQuery({
    queryKey: ['my-files'],
    queryFn:  () => fileApi.myFiles().then(r => r.data.data),
  })

  const files = (data || []).filter(f => {
    const ext = f.originalName?.split('.').pop()?.toLowerCase() || ''
    const latest = f.versions?.[f.versions.length - 1]
    const matchSearch = f.originalName?.toLowerCase().includes(search.toLowerCase())
    let matchCat = true
    if (category === 'documents') matchCat = ['pdf','doc','docx','txt','csv'].includes(ext)
    else if (category === 'images') matchCat = ['png','jpg','jpeg','svg','gif'].includes(ext)
    else if (category === 'videos') matchCat = ['mp4','mkv','avi','mov'].includes(ext)
    else if (category === 'others') matchCat = !['pdf','doc','docx','txt','csv','png','jpg','jpeg','svg','gif','mp4','mkv','avi','mov'].includes(ext)
    let matchEnc = true
    if (encFilter === 'zk') matchEnc = latest?.isZeroKnowledge === true
    else if (encFilter === 'standard') matchEnc = latest?.isZeroKnowledge !== true
    return matchSearch && matchCat && matchEnc
  })

  const handleToggleFavorite = async (id) => {
    try { await fileApi.toggleFavorite(id); qc.invalidateQueries(['my-files']); qc.invalidateQueries(['favorite-files']); toast.success('Updated') }
    catch { toast.error('Failed to update favorite') }
  }
  const handleMoveToTrash = async (id, name) => {
    try { await fileApi.moveToTrash(id); toast.info(`"${name}" moved to Trash`); qc.invalidateQueries(['my-files']); qc.invalidateQueries(['trash-files']) }
    catch { toast.error('Failed to move to Trash') }
  }
  const handleDownload = async (id, name) => {
    try {
      const res = await fileApi.download(id)
      await processAndSaveDownload(res, name, zkPassphrase)
      toast.success('Download started!')
    } catch (err) {
      if (err.isZeroKnowledge) {
        setPendingZK({ res: err.pendingRes, name: err.finalFilename || name })
      } else {
        toast.error(err?.message || 'Download failed')
      }
    }
  }

  const handleZKConfirm = async (passphrase, remember) => {
    if (!pendingZK) return
    await processAndSaveDownload(pendingZK.res, pendingZK.name, passphrase)
    if (remember && setZkPassphrase) {
      setZkPassphrase(passphrase)
    }
    toast.success('Decrypted and downloaded successfully!')
    setPendingZK(null)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <span className="page-tag"><ShieldCheck size={11} /> File Vault</span>
          <h1 className="page-title">My Files</h1>
          <p className="page-sub">{files.length} file{files.length !== 1 ? 's' : ''} in your encrypted vault</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', borderRadius: '0.5rem', border: '1px solid var(--border)', overflow: 'hidden' }}>
            {[['grid', Grid], ['list', List]].map(([mode, Icon]) => (
              <button key={mode} onClick={() => setViewMode(mode)} style={{
                padding: '0.45rem 0.65rem', background: viewMode === mode ? 'var(--accent-soft)' : 'transparent',
                color: viewMode === mode ? 'var(--accent)' : 'var(--muted)', border: 'none', cursor: 'pointer',
              }}>
                <Icon size={15} />
              </button>
            ))}
          </div>
          <button onClick={() => qc.invalidateQueries(['my-files'])} className="btn-ghost" style={{ fontSize: '0.8rem' }}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '200px', maxWidth: '22rem' }}>
            <Search size={14} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by filename…"
              className="input-field"
              style={{ paddingLeft: '2.4rem' }}
            />
          </div>
          <select value={category} onChange={e => setCategory(e.target.value)} className="input-field" style={{ maxWidth: '160px' }}>
            <option value="ALL">All Categories</option>
            <option value="documents">Documents</option>
            <option value="images">Images</option>
            <option value="videos">Videos</option>
            <option value="others">Others</option>
          </select>
          <select value={encFilter} onChange={e => setEncFilter(e.target.value)} className="input-field" style={{ maxWidth: '175px' }}>
            <option value="ALL">All Encryption</option>
            <option value="zk">Zero Knowledge</option>
            <option value="standard">Standard AES-256</option>
          </select>
          {(search || category !== 'ALL' || encFilter !== 'ALL') && (
            <button onClick={() => { setSearch(''); setCategory('ALL'); setEncFilter('ALL') }} className="btn-ghost" style={{ fontSize: '0.8rem', color: 'var(--danger)' }}>
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* File Grid / List */}
      {isLoading ? <SkeletonTable rows={6} /> : files.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-state-icon"><FileText size={26} style={{ color: 'var(--accent)' }} /></div>
          <h3>No matching files</h3>
          <p>Upload a file or clear filters to view your vault files.</p>
        </div>
      ) : viewMode === 'grid' ? (
        <motion.div
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}
        >
          {files.map((f, i) => {
            const latest = f.versions?.[f.versions.length - 1]
            const isZK = latest?.isZeroKnowledge
            const ext = f.originalName?.split('.').pop()?.toUpperCase()?.slice(0, 4) || 'FILE'
            const fileId = f._id || f.id
            const color = extColor(f.originalName)
            return (
              <motion.article
                key={fileId || i}
                className="file-preview-card"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.35 }}
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
                  <motion.button onClick={() => handleToggleFavorite(fileId)} whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.9 }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: f.isFavorite ? '#f59e0b' : 'var(--muted)', flexShrink: 0 }}>
                    <Star size={16} style={{ fill: f.isFavorite ? '#f59e0b' : 'none' }} />
                  </motion.button>
                </div>

                <div style={{
                  marginTop: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.4rem 0.75rem', borderRadius: '9999px',
                  background: 'color-mix(in srgb, var(--bg) 70%, transparent)', border: '1px solid var(--border)',
                  fontSize: '0.7rem', color: 'var(--muted)',
                }}>
                  {isZK ? <Lock size={12} style={{ color: 'var(--success)' }} /> : <ShieldCheck size={12} style={{ color: 'var(--accent)' }} />}
                  <span style={{ flex: 1 }}>{isZK ? 'Zero-Knowledge' : 'AES-256'}</span>
                  <span className={`badge ${STATUS_BADGE[latest?.status] || 'badge-info'}`}>{latest?.status || 'PROCESSING'}</span>
                </div>

                <div style={{ marginTop: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.68rem', color: 'var(--muted)' }}>v{f.currentVersion || 1} · SHA-256</span>
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    {[
                      { title: 'Inspect', Icon: Eye,      onClick: () => setInspectFile(f) },
                      { title: 'Download', Icon: Download, onClick: () => handleDownload(fileId, f.originalName) },
                      { title: 'Share',   Icon: Share2,   onClick: () => setShareFile(f) },
                      { title: 'Trash',   Icon: Trash2,   onClick: () => handleMoveToTrash(fileId, f.originalName), danger: true },
                    ].map(({ title, Icon, onClick, danger }) => (
                      <motion.button key={title} title={title} onClick={onClick} className="btn-icon"
                        whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                        style={{ ...(danger ? { color: 'var(--danger)', borderColor: 'transparent' } : {}) }}>
                        <Icon size={13} />
                      </motion.button>
                    ))}
                  </div>
                </div>
              </motion.article>
            )
          })}
        </motion.div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  {['', 'File', 'Size', 'Status', 'Encryption', 'Uploaded', 'Actions'].map(h => <th key={h}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {files.map((f, i) => {
                  const latest = f.versions?.[f.versions.length - 1]
                  const isZK = latest?.isZeroKnowledge
                  const color = extColor(f.originalName)
                  const ext = f.originalName?.split('.').pop()?.toUpperCase()?.slice(0, 3)
                  const fileId = f._id || f.id
                  return (
                    <tr key={fileId || i}>
                      <td style={{ width: '2.5rem' }}>
                        <motion.button onClick={() => handleToggleFavorite(fileId)} whileTap={{ scale: 0.9 }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: f.isFavorite ? '#f59e0b' : 'var(--muted)' }}>
                          <Star size={15} style={{ fill: f.isFavorite ? '#f59e0b' : 'none' }} />
                        </motion.button>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <div style={{ width: '2rem', height: '2rem', borderRadius: '0.4rem', flexShrink: 0, background: `color-mix(in srgb, ${color} 14%, transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.55rem', fontWeight: 800, color }}>
                            {ext}
                          </div>
                          <span style={{ fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>
                            {f.originalName}
                          </span>
                        </div>
                      </td>
                      <td style={{ color: 'var(--muted)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{formatBytes(latest?.size)}</td>
                      <td><span className={`badge ${STATUS_BADGE[latest?.status] || 'badge-info'}`}>{latest?.status}</span></td>
                      <td><span className={`badge ${isZK ? 'badge-success' : 'badge-info'}`}>{isZK ? 'Zero-Knowledge' : 'AES-256'}</span></td>
                      <td style={{ color: 'var(--muted)', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>{relativeTime(f.createdAt)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                          {[
                            { title: 'Inspect', Icon: Eye,      onClick: () => setInspectFile(f) },
                            { title: 'Download', Icon: Download, onClick: () => handleDownload(fileId, f.originalName) },
                            { title: 'Share',   Icon: Share2,   onClick: () => setShareFile(f) },
                            { title: 'Trash',   Icon: Trash2,   onClick: () => handleMoveToTrash(fileId, f.originalName), danger: true },
                          ].map(({ title, Icon, onClick, danger }) => (
                            <button key={title} title={title} onClick={onClick} className="btn-icon"
                              style={{ ...(danger ? { color: 'var(--danger)' } : {}) }}>
                              <Icon size={13} />
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AnimatePresence>
        {shareFile && <ShareModal file={shareFile} onClose={() => setShareFile(null)} />}
      </AnimatePresence>
      <FileInsightsDrawer file={inspectFile} onClose={() => setInspectFile(null)}
        onDownload={handleDownload} onShare={(f) => { setInspectFile(null); setShareFile(f) }} />
      <ZKPromptModal
        isOpen={Boolean(pendingZK)}
        fileName={pendingZK?.name}
        onConfirm={handleZKConfirm}
        onCancel={() => setPendingZK(null)}
      />
    </div>
  )
}
