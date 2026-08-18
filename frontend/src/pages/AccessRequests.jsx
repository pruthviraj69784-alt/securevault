import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { toast } from 'react-toastify'
import { Key, CheckCircle2, XCircle, Clock, User, FileText, ShieldCheck } from 'lucide-react'
import { accessApi } from '../services/api'
import { SkeletonTable } from '../components/Skeletons'

function relativeTime(date) {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${Math.max(1, mins)}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

const STATUS_STYLES = {
  PENDING:  { cls: 'badge-warning', label: 'Pending' },
  APPROVED: { cls: 'badge-success', label: 'Approved' },
  DENIED:   { cls: 'badge-danger',  label: 'Denied' },
}

export default function AccessRequests() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['access-requests'],
    queryFn:  () => accessApi.list().then(r => r.data.data),
  })
  const requests = data || []
  const pending = requests.filter(r => r.status === 'PENDING')
  const resolved = requests.filter(r => r.status !== 'PENDING')

  const handle = async (id, action) => {
    try {
      if (action === 'approve') await accessApi.approve(id)
      else await accessApi.deny(id)
      toast.success(`Request ${action}d`)
      qc.invalidateQueries(['access-requests'])
    } catch { toast.error(`Failed to ${action} request`) }
  }

  const RequestCard = ({ r, i }) => {
    const st = STATUS_STYLES[r.status] || STATUS_STYLES.PENDING
    return (
      <motion.div key={r._id} className="card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', flex: 1, minWidth: 0 }}>
            <div style={{ width: '2.75rem', height: '2.75rem', borderRadius: '0.75rem', background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <User size={17} />
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)' }}>
                {r.requester?.name || 'Unknown User'}
              </p>
              <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.15rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                Requesting access to: <strong style={{ color: 'var(--text)' }}>{r.file?.originalName || 'Unknown File'}</strong>
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
                <span className={`badge ${st.cls}`}>{st.label}</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Clock size={10} /> {relativeTime(r.createdAt)}
                </span>
              </div>
            </div>
          </div>
          {r.status === 'PENDING' && (
            <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
              <motion.button onClick={() => handle(r._id, 'approve')} className="btn-success"
                style={{ fontSize: '0.75rem', padding: '0.4rem 0.875rem' }} whileHover={{ scale: 1.04 }}>
                <CheckCircle2 size={13} /> Approve
              </motion.button>
              <motion.button onClick={() => handle(r._id, 'deny')} className="btn-danger"
                style={{ fontSize: '0.75rem', padding: '0.4rem 0.875rem' }} whileHover={{ scale: 1.04 }}>
                <XCircle size={13} /> Deny
              </motion.button>
            </div>
          )}
        </div>
        {r.message && (
          <div style={{ marginTop: '0.75rem', padding: '0.65rem 0.875rem', borderRadius: '0.6rem', background: 'color-mix(in srgb, var(--bg) 60%, transparent)', border: '1px solid var(--border)', fontSize: '0.8rem', color: 'var(--muted)', fontStyle: 'italic' }}>
            "{r.message}"
          </div>
        )}
      </motion.div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="page-header">
        <div className="page-header-left">
          <span className="page-tag"><Key size={11} /> Access Control</span>
          <h1 className="page-title">Access Requests</h1>
          <p className="page-sub">{pending.length} pending request{pending.length !== 1 ? 's' : ''} awaiting your decision</p>
        </div>
      </div>

      {isLoading ? <SkeletonTable rows={4} /> : requests.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-state-icon"><Key size={26} style={{ color: 'var(--accent)' }} /></div>
          <h3>No access requests</h3>
          <p>When someone requests access to one of your shared files, it will appear here.</p>
        </div>
      ) : (
        <>
          {pending.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <h2 className="section-title"><Clock size={15} style={{ color: 'var(--warning)' }} /> Pending ({pending.length})</h2>
              {pending.map((r, i) => <RequestCard key={r._id} r={r} i={i} />)}
            </div>
          )}
          {resolved.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <h2 className="section-title" style={{ marginTop: '0.5rem' }}><ShieldCheck size={15} style={{ color: 'var(--success)' }} /> Resolved ({resolved.length})</h2>
              {resolved.map((r, i) => <RequestCard key={r._id} r={r} i={i} />)}
            </div>
          )}
        </>
      )}
    </div>
  )
}
