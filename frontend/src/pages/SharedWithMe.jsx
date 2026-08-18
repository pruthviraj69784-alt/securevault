import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { toast } from 'react-toastify'
import { Users, Download, ShieldCheck, Lock, Clock } from 'lucide-react'
import { shareApi, fileApi } from '../services/api'
import { SkeletonTable } from '../components/Skeletons'
import { useAuth } from '../context/AuthContext'
import { processAndSaveDownload } from '../utils/downloadHelper'
import ZKPromptModal from '../components/ZKPromptModal'

function relativeTime(date) {
  if (!date) return 'No expiry'
  const diff = new Date(date).getTime() - Date.now()
  if (diff < 0) return 'Expired'
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m left`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h left`
  return `${Math.floor(hrs / 24)}d left`
}

function formatBytes(b = 0) {
  if (b < 1024) return `${b} B`
  if (b < 1024 ** 2) return `${(b / 1024).toFixed(1)} KB`
  if (b < 1024 ** 3) return `${(b / 1024 ** 2).toFixed(1)} MB`
  return `${(b / 1024 ** 3).toFixed(2)} GB`
}

export default function SharedWithMe() {
  const { zkPassphrase, setZkPassphrase } = useAuth() || {}
  const [pendingZK, setPendingZK] = useState(null) // { res, name }

  const { data, isLoading } = useQuery({
    queryKey: ['shares-with-me'],
    queryFn:  () => shareApi.sharedWithMe().then(r => r.data.data),
  })
  const shares = data || []

  const handleDownload = async (fileId, name) => {
    try {
      const res = await fileApi.download(fileId)
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
      <div className="page-header">
        <div className="page-header-left">
          <span className="page-tag"><Users size={11} /> Collaboration</span>
          <h1 className="page-title">Shared With Me</h1>
          <p className="page-sub">{shares.length} file{shares.length !== 1 ? 's' : ''} shared with your account</p>
        </div>
      </div>

      {isLoading ? <SkeletonTable rows={5} /> : shares.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-state-icon"><Users size={26} style={{ color: 'var(--accent)' }} /></div>
          <h3>No files shared with you yet</h3>
          <p>When another user shares a file with your email, it will securely appear here.</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>{['File', 'Shared By', 'Size', 'Security', 'Expires', 'Actions'].map(h => <th key={h}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {shares.map((s, i) => {
                  const sender = s.sharedBy || s.owner || {}
                  const senderName = sender.name || sender.email || 'Team Member'
                  const fileObj = s.file || {}
                  const fileId = fileObj._id || fileObj.id || s.fileId
                  const fileName = fileObj.originalName || 'Shared Document'
                  const latestVer = fileObj.versions?.[fileObj.versions.length - 1]
                  const fileSize = latestVer?.size || fileObj.size || 0
                  const isZK = s.isZeroKnowledge || latestVer?.isZeroKnowledge

                  return (
                    <motion.tr key={s._id || s.id || i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <div style={{ width: '2.2rem', height: '2.2rem', borderRadius: '0.45rem', background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 800, flexShrink: 0 }}>
                            {fileName.split('.').pop()?.toUpperCase()?.slice(0, 3) || 'FILE'}
                          </div>
                          <span style={{ fontWeight: 600, color: 'var(--text)', fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }}>
                            {fileName}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ width: '1.6rem', height: '1.6rem', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent), var(--accent-hover))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 800, color: '#fff' }}>
                            {senderName[0]?.toUpperCase()}
                          </div>
                          <div>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text)', fontWeight: 600 }}>{senderName}</span>
                            {sender.email && sender.name && <p style={{ fontSize: '0.68rem', color: 'var(--muted)' }}>{sender.email}</p>}
                          </div>
                        </div>
                      </td>
                      <td style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>{formatBytes(fileSize)}</td>
                      <td>
                        <span className={`badge ${isZK ? 'badge-success' : 'badge-info'}`}>
                          {isZK ? <><Lock size={10} /> Zero-Knowledge</> : <><ShieldCheck size={10} /> AES-256</>}
                        </span>
                      </td>
                      <td style={{ color: 'var(--muted)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                        <span className={`badge ${relativeTime(s.expiresAt) === 'Expired' ? 'badge-danger' : 'badge-neutral'}`}>
                          <Clock size={10} /> {relativeTime(s.expiresAt)}
                        </span>
                      </td>
                      <td>
                        <button onClick={() => handleDownload(fileId, fileName)} className="btn-primary" style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}>
                          <Download size={13} /> Download
                        </button>
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Interactive ZK Passphrase Decryption Modal */}
      <ZKPromptModal
        isOpen={Boolean(pendingZK)}
        fileName={pendingZK?.name}
        onConfirm={handleZKConfirm}
        onCancel={() => setPendingZK(null)}
      />
    </div>
  )
}
