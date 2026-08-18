import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { toast } from 'react-toastify'
import { Share2, Link2, Clock, Trash2, Lock, Copy, Users, ShieldCheck } from 'lucide-react'
import { shareApi } from '../services/api'
import { SkeletonTable } from '../components/Skeletons'

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

export default function SharedByMe() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['shares-by-me'],
    queryFn:  () => shareApi.sharedByMe().then(r => r.data.data),
  })
  const shares = data || []

  const handleRevoke = async (id) => {
    try {
      await shareApi.revokeShare(id)
      toast.success('Share revoked successfully')
      qc.invalidateQueries(['shares-by-me'])
    } catch {
      toast.error('Failed to revoke share')
    }
  }

  const handleCopy = (token) => {
    if (!token) return
    navigator.clipboard.writeText(`${window.location.origin}/share/${token}`)
    toast.success('Share link copied!')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="page-header">
        <div className="page-header-left">
          <span className="page-tag"><Share2 size={11} /> Outgoing Shares</span>
          <h1 className="page-title">Shared By Me</h1>
          <p className="page-sub">{shares.length} active share{shares.length !== 1 ? 's' : ''} you have created</p>
        </div>
      </div>

      {isLoading ? <SkeletonTable rows={5} /> : shares.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-state-icon" style={{ background: 'var(--info-soft)', borderColor: 'color-mix(in srgb, var(--info) 25%, transparent)' }}>
            <Share2 size={26} style={{ color: 'var(--info)' }} />
          </div>
          <h3>No shares created yet</h3>
          <p>Open any file in My Files and click the share icon to create a secure internal or external link.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {shares.map((s, i) => {
            const expiry = relativeTime(s.expiresAt)
            const isExpired = expiry === 'Expired'
            const fileObj = s.file || {}
            const fileName = fileObj.originalName || 'Unnamed File'
            const isInternal = s.shareType === 'INTERNAL'
            const shareId = s._id || s.id

            return (
              <motion.div key={shareId || i} className="card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                style={{ borderColor: isExpired ? 'color-mix(in srgb, var(--danger) 20%, var(--border))' : 'var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', flex: 1, minWidth: 0 }}>
                    <div style={{
                      width: '2.75rem', height: '2.75rem', borderRadius: '0.75rem',
                      background: isExpired ? 'var(--danger-soft)' : (isInternal ? 'var(--accent-soft)' : 'var(--info-soft)'),
                      color: isExpired ? 'var(--danger)' : (isInternal ? 'var(--accent)' : 'var(--info)'),
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                    }}>
                      {isInternal ? <Users size={17} /> : <Share2 size={17} />}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontWeight: 700, color: 'var(--text)', fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {fileName}
                      </p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.15rem' }}>
                        Shared with: <strong style={{ color: 'var(--text)' }}>{s.recipientName || s.recipientEmail || (isInternal ? 'Internal User' : 'Public Link')}</strong>
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginTop: '0.35rem', flexWrap: 'wrap' }}>
                        <span className={`badge ${isExpired ? 'badge-danger' : 'badge-success'}`}>
                          <Clock size={10} /> {expiry}
                        </span>
                        <span className={`badge ${isInternal ? 'badge-info' : 'badge-warning'}`}>
                          {isInternal ? <><Users size={10} /> Internal User</> : <><Link2 size={10} /> Public Link</>}
                        </span>
                        {s.isZeroKnowledge && <span className="badge badge-success"><Lock size={10} /> ZK</span>}
                        <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>{s.downloadCount || 0} downloads</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                    {!isExpired && s.token && (
                      <motion.button onClick={() => handleCopy(s.token)} className="btn-ghost" style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem' }} whileHover={{ scale: 1.04 }}>
                        <Copy size={13} /> Copy Link
                      </motion.button>
                    )}
                    <motion.button onClick={() => handleRevoke(shareId)} className="btn-ghost" style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem', color: 'var(--danger)' }} whileHover={{ scale: 1.04 }}>
                      <Trash2 size={13} /> Revoke
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
