import { useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import {
  X, Share2, Globe, Users, Search, Shield, Calendar, Download,
  Link2, CheckCircle2, Copy, ExternalLink, QrCode
} from 'lucide-react'
import QRShareModal from './QRShareModal'
import api from '../services/api'

export default function ShareModal({ file, onClose }) {
  const qc = useQueryClient()
  const [mode, setMode] = useState('internal')
  const searchTimeoutRef = useRef(null)

  // Internal share state
  const [recipientEmail, setRecipientEmail] = useState('')
  const [permission, setPermission] = useState('DOWNLOADER')
  const [message, setMessage] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [maxDownloads, setMaxDownloads] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)

  // External share state
  const [generatedLink, setGeneratedLink] = useState('')

  const searchUsers = useCallback(async (query) => {
    if (!query || query.length < 2) { setSearchResults([]); return }
    setSearching(true)
    try {
      const res = await api.get(`/shares/internal/search-users?q=${encodeURIComponent(query)}`)
      setSearchResults(res.data.data || [])
    } catch {
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }, [])

  const handleInputChange = (val) => {
    setRecipientEmail(val)
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    searchTimeoutRef.current = setTimeout(() => {
      searchUsers(val)
    }, 300)
  }

  const internalShareMutation = useMutation({
    mutationFn: data => api.post('/shares/internal', data),
    onSuccess: () => {
      toast.success(`File shared with ${recipientEmail}!`)
      qc.invalidateQueries(['shares-sent'])
      qc.invalidateQueries(['shares-by-me'])
      onClose()
    },
    onError: err => toast.error(err.response?.data?.message || 'Internal share failed.')
  })

  const externalShareMutation = useMutation({
    mutationFn: data => api.post('/shares', data),
    onSuccess: res => {
      const token = res.data.data?.token || res.data.token
      const link = `${window.location.origin}/share/${token}`
      setGeneratedLink(link)
      toast.success('External share link generated!')
      qc.invalidateQueries(['shares-by-me'])
    },
    onError: err => toast.error(err.response?.data?.message || 'External share failed.')
  })

  const handleInternalShare = () => {
    if (!recipientEmail.trim()) return toast.error('Please enter recipient email.')
    const fileId = file?._id || file?.id
    internalShareMutation.mutate({
      fileId,
      recipientEmail: recipientEmail.trim(),
      permission,
      message,
      expiresAt: expiresAt || null,
      maxDownloads: maxDownloads ? parseInt(maxDownloads, 10) : null
    })
  }

  const handleExternalShare = () => {
    let expiresInHours = 24
    if (expiresAt) {
      const selectedDate = new Date(expiresAt)
      selectedDate.setHours(23, 59, 59, 999)
      const diffMs = selectedDate.getTime() - Date.now()
      expiresInHours = Math.max(1, Math.ceil(diffMs / 3_600_000))
    }
    const fileId = file?._id || file?.id
    externalShareMutation.mutate({
      fileId,
      expiresInHours,
      maxDownloads: maxDownloads ? parseInt(maxDownloads, 10) : null
    })
  }

  const copyLink = () => {
    navigator.clipboard.writeText(generatedLink)
    toast.success('Link copied to clipboard!')
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed', inset: 0, zIndex: 50,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '1rem', background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)'
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 16 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          className="card"
          style={{ width: '100%', maxWidth: '30rem', boxShadow: '0 24px 60px rgba(0,0,0,0.3)', padding: '1.75rem' }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div style={{ width: '2.25rem', height: '2.25rem', borderRadius: '0.65rem', background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Share2 size={16} />
              </div>
              <div>
                <h2 style={{ fontWeight: 800, color: 'var(--text)', fontSize: '0.95rem' }}>Share File</h2>
                <p style={{ fontSize: '0.72rem', color: 'var(--muted)', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {file?.originalName}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="btn-icon"><X size={15} /></button>
          </div>

          {/* Mode Tabs */}
          <div style={{ display: 'flex', borderRadius: '0.65rem', border: '1px solid var(--border)', overflow: 'hidden', marginBottom: '1.25rem' }}>
            {[
              { id: 'internal', label: 'Internal', icon: Users },
              { id: 'external', label: 'External', icon: Globe },
              { id: 'qr',       label: 'QR Share', icon: QrCode },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setMode(id)}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                  padding: '0.55rem', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700,
                  transition: 'all 0.2s', fontFamily: 'inherit',
                  background: mode === id ? 'linear-gradient(135deg, var(--accent), var(--accent-hover))' : 'transparent',
                  color: mode === id ? '#fff' : 'var(--muted)',
                }}
              >
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>

          {/* QR Share */}
          {mode === 'qr' && (
            <QRShareModal file={file} onClose={onClose} inline />
          )}

          {/* Internal Share Form */}
          {mode === 'internal' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ position: 'relative' }}>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>
                  Recipient Email / Name
                </label>
                <div style={{ position: 'relative' }}>
                  <Search size={14} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
                  <input
                    type="text"
                    value={recipientEmail}
                    onChange={e => handleInputChange(e.target.value)}
                    placeholder="Search user by email or name…"
                    className="input-field"
                    style={{ paddingLeft: '2.5rem' }}
                  />
                </div>
                {searchResults.length > 0 && (
                  <div className="card" style={{ position: 'absolute', zIndex: 10, width: '100%', marginTop: '0.25rem', padding: '0.35rem', boxShadow: '0 12px 30px rgba(0,0,0,0.25)' }}>
                    {searchResults.map(u => (
                      <button
                        key={u._id}
                        onClick={() => { setRecipientEmail(u.email); setSearchResults([]) }}
                        style={{
                          width: '100%', textAlign: 'left', padding: '0.5rem 0.75rem', borderRadius: '0.5rem',
                          background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.65rem',
                          transition: 'background 0.15s', color: 'var(--text)'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-soft)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <div style={{ width: '1.75rem', height: '1.75rem', borderRadius: '50%', background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 800 }}>
                          {u.name?.[0] || u.email[0]}
                        </div>
                        <div>
                          <p style={{ fontSize: '0.8rem', fontWeight: 700 }}>{u.name}</p>
                          <p style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>{u.email}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>
                  Permission Level
                </label>
                <select value={permission} onChange={e => setPermission(e.target.value)} className="input-field">
                  <option value="VIEWER">👁️ Viewer — View metadata only</option>
                  <option value="DOWNLOADER">⬇️ Downloader — Can download file</option>
                  <option value="EDITOR">✏️ Editor — Can upload new versions</option>
                  <option value="MANAGER">⚙️ Manager — Can reshare with others</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>
                    Expiry Date
                  </label>
                  <input type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} className="input-field" min={new Date().toISOString().split('T')[0]} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>
                    Max Downloads
                  </label>
                  <input type="number" value={maxDownloads} onChange={e => setMaxDownloads(e.target.value)} placeholder="Unlimited" className="input-field" min={1} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>
                  Message (optional)
                </label>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Add a note for the recipient…"
                  rows={2}
                  className="input-field"
                  style={{ resize: 'none' }}
                />
              </div>

              <button
                onClick={handleInternalShare}
                disabled={internalShareMutation.isPending}
                className="btn-primary"
                style={{ width: '100%', justifyContent: 'center', padding: '0.75rem' }}
              >
                {internalShareMutation.isPending
                  ? <span style={{ width: '1.1rem', height: '1.1rem', borderRadius: '50%', border: '2px solid white', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
                  : <><CheckCircle2 size={15} /> Send Internal Share</>}
              </button>
            </div>
          )}

          {/* External Share Form */}
          {mode === 'external' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {generatedLink ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ padding: '0.875rem 1rem', borderRadius: '0.75rem', background: 'var(--success-soft)', border: '1px solid color-mix(in srgb, var(--success) 30%, transparent)' }}>
                    <p style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--success)', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <CheckCircle2 size={14} /> Share Link Active
                    </p>
                    <p style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text)', wordBreak: 'break-all' }}>{generatedLink}</p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={copyLink} className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                      <Copy size={14} /> Copy Link
                    </button>
                    <a href={generatedLink} target="_blank" rel="noreferrer" className="btn-ghost" style={{ padding: '0.55rem 0.85rem' }}>
                      <ExternalLink size={14} />
                    </a>
                  </div>
                  <button onClick={() => setGeneratedLink('')} className="btn-ghost" style={{ width: '100%', justifyContent: 'center', fontSize: '0.75rem' }}>
                    Generate Another Link
                  </button>
                </div>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>Expiry Date</label>
                      <input type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} className="input-field" min={new Date().toISOString().split('T')[0]} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>Max Downloads</label>
                      <input type="number" value={maxDownloads} onChange={e => setMaxDownloads(e.target.value)} placeholder="Unlimited" className="input-field" min={1} />
                    </div>
                  </div>
                  <div style={{ padding: '0.75rem 0.85rem', borderRadius: '0.65rem', background: 'var(--warning-soft)', border: '1px solid color-mix(in srgb, var(--warning) 25%, transparent)', fontSize: '0.75rem', color: 'var(--warning)' }}>
                    <Link2 size={13} style={{ display: 'inline', marginRight: 4 }} />
                    This creates a public token link with server-side validation and expiration safeguards.
                  </div>
                  <button
                    onClick={handleExternalShare}
                    disabled={externalShareMutation.isPending}
                    className="btn-primary"
                    style={{ width: '100%', justifyContent: 'center', padding: '0.75rem' }}
                  >
                    {externalShareMutation.isPending
                      ? <span style={{ width: '1.1rem', height: '1.1rem', borderRadius: '50%', border: '2px solid white', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
                      : <><Globe size={15} /> Generate Share Link</>}
                  </button>
                </>
              )}
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
