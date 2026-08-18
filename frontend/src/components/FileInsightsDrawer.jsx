import { motion, AnimatePresence } from 'framer-motion'
import { X, FileText, Download, Share2, ShieldCheck, History, Key, HardDrive, Calendar, Hash, Lock, CheckCircle2 } from 'lucide-react'

function formatBytes(b = 0) {
  if (b < 1024) return `${b} B`
  if (b < 1024 ** 2) return `${(b / 1024).toFixed(1)} KB`
  if (b < 1024 ** 3) return `${(b / 1024 ** 2).toFixed(1)} MB`
  return `${(b / 1024 ** 3).toFixed(2)} GB`
}

export default function FileInsightsDrawer({ file, onClose, onDownload, onShare }) {
  if (!file) return null

  const latest = file.versions?.[file.versions.length - 1]
  const isZK = latest?.isZeroKnowledge
  const ext = file.originalName?.split('.').pop()?.toUpperCase() || 'FILE'

  return (
    <AnimatePresence>
      <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', justifyContent: 'flex-end', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', stiffness: 320, damping: 32 }}
          onClick={e => e.stopPropagation()}
          className="card"
          style={{
            width: '100%',
            maxWidth: '26rem',
            height: '100%',
            borderRadius: 0,
            borderLeft: '1px solid var(--border)',
            padding: '1.5rem',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 0 50px rgba(0,0,0,0.4)',
            background: 'var(--card)',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                <div style={{
                  width: '2.5rem', height: '2.5rem', borderRadius: '0.65rem',
                  background: 'var(--accent-soft)', color: 'var(--accent)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontSize: '0.65rem', flexShrink: 0
                }}>
                  {ext.slice(0, 4)}
                </div>
                <div style={{ minWidth: 0 }}>
                  <h2 style={{ fontWeight: 700, color: 'var(--text)', fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {file.originalName}
                  </h2>
                  <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>Version {file.currentVersion || 1} · SHA-256</span>
                </div>
              </div>
              <button onClick={onClose} className="btn-icon"><X size={15} /></button>
            </div>

            {/* Quick Actions */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
              <button onClick={() => onDownload(file._id, file.originalName)} className="btn-primary" style={{ justifyContent: 'center', fontSize: '0.8rem', padding: '0.6rem' }}>
                <Download size={14} /> Download
              </button>
              <button onClick={() => onShare(file)} className="btn-ghost" style={{ justifyContent: 'center', fontSize: '0.8rem', padding: '0.6rem' }}>
                <Share2 size={14} /> Share Link
              </button>
            </div>

            {/* Security Badge */}
            <div style={{
              padding: '0.875rem 1rem', borderRadius: '0.75rem',
              border: `1px solid ${isZK ? 'color-mix(in srgb, var(--success) 30%, transparent)' : 'color-mix(in srgb, var(--accent) 30%, transparent)'}`,
              background: isZK ? 'var(--success-soft)' : 'var(--accent-soft)',
              display: 'flex', alignItems: 'center', gap: '0.65rem'
            }}>
              {isZK ? <Lock size={18} style={{ color: 'var(--success)' }} /> : <ShieldCheck size={18} style={{ color: 'var(--accent)' }} />}
              <div>
                <p style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--text)' }}>
                  {isZK ? 'Zero-Knowledge Client Encrypted' : 'AES-256 Encrypted'}
                </p>
                <p style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: '0.1rem' }}>
                  {isZK ? 'Encrypted locally with PBKDF2 salt & AES-GCM' : 'Automated server encryption & integrity hashed'}
                </p>
              </div>
            </div>

            {/* Metadata Grid */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <p className="nav-section-label" style={{ padding: '0.2rem 0' }}>METADATA & TELEMETRY</p>
              {[
                { icon: HardDrive, label: 'Payload Size', value: formatBytes(latest?.size) },
                { icon: Calendar,  label: 'Created At',   value: new Date(file.createdAt).toLocaleString() },
                { icon: Calendar,  label: 'Last Modified', value: new Date(file.updatedAt).toLocaleString() },
                { icon: Hash,      label: 'SHA-256 Hash', value: latest?.hash || 'Calculated on upload', isMono: true },
                { icon: Key,       label: 'IV Nonce',     value: latest?.iv || 'Embedded in ciphertext', isMono: true },
              ].map(({ icon: Icon, label, value, isMono }) => (
                <div key={label} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '0.65rem 0.85rem', borderRadius: '0.65rem',
                  border: '1px solid var(--border)', background: 'color-mix(in srgb, var(--bg) 60%, transparent)',
                  gap: '0.5rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--muted)' }}>
                    <Icon size={14} />
                    <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{label}</span>
                  </div>
                  <span style={{
                    fontSize: '0.75rem', color: 'var(--text)', fontWeight: 600,
                    maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    ...(isMono ? { fontFamily: 'monospace', fontSize: '0.68rem' } : {})
                  }}>
                    {value}
                  </span>
                </div>
              ))}
            </div>

            {/* Version History */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <p className="nav-section-label" style={{ padding: '0.2rem 0' }}>VERSION HISTORY</p>
                <span className="badge badge-info">{file.versions?.length || 1} versions</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {(file.versions || [latest]).map((v, idx) => (
                  <div key={idx} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0.55rem 0.85rem', borderRadius: '0.65rem',
                    border: '1px solid var(--border)', background: idx === (file.versions?.length - 1) ? 'var(--accent-soft)' : 'color-mix(in srgb, var(--bg) 40%, transparent)',
                    fontSize: '0.75rem'
                  }}>
                    <span style={{ fontWeight: 700, color: 'var(--text)' }}>Version {v.versionNumber || (idx + 1)}</span>
                    <span style={{ color: 'var(--muted)' }}>{formatBytes(v.size)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ paddingTop: '1.25rem', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--muted)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
              <CheckCircle2 size={12} style={{ color: 'var(--success)' }} /> Protected by SecureVault Security Protocols
            </span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
