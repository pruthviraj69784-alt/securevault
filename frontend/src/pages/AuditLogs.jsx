import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'react-toastify'
import {
  ClipboardList, Search, Trash2, AlertTriangle, X,
  CheckCircle2, XCircle, Activity, ShieldCheck, ShieldAlert,
  Hash, RefreshCw, Link2, Key, Info, ExternalLink, Lock, Wrench, Zap
} from 'lucide-react'
import { auditApi } from '../services/api'
import { SkeletonTable } from '../components/Skeletons'

const ACTION_BADGE = {
  UPLOAD:                  'badge-info',
  DOWNLOAD:                'badge-success',
  CREATE_SHARE:            'badge-warning',
  ACCESS_SHARE:            'badge-warning',
  RESTORE_VERSION:         'badge-info',
  DELETE:                  'badge-danger',
  LOGIN:                   'badge-success',
  REGISTER:                'badge-success',
  QR_CREATED:              'badge-warning',
  SHARE_INTERNAL_CREATED:  'badge-info',
  SHARE_INTERNAL_ACCEPTED: 'badge-success',
  SHARE_INTERNAL_DECLINED: 'badge-danger',
  SHARE_INTERNAL_REVOKED:  'badge-danger',
  SHARE_INTERNAL_DOWNLOAD: 'badge-success',
}

const ACTIONS = [
  'ALL',
  'LOGIN',
  'UPLOAD',
  'DOWNLOAD',
  'CREATE_SHARE',
  'ACCESS_SHARE',
  'SHARE_INTERNAL_CREATED',
  'SHARE_INTERNAL_DOWNLOAD',
  'DELETE'
]

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString('en', { dateStyle: 'medium', timeStyle: 'short' })
}

function truncateHash(h) {
  if (!h) return '—'
  return `${h.slice(0, 8)}…${h.slice(-6)}`
}

function LogDetailsModal({ log, onClose }) {
  if (!log) return null
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}>
      <motion.div className="card" style={{ width: '100%', maxWidth: '34rem', maxHeight: '90vh', overflowY: 'auto' }} initial={{ scale: 0.94, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '0.65rem', background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Lock size={18} />
            </div>
            <div>
              <h3 style={{ fontWeight: 800, color: 'var(--text)', fontSize: '1rem' }}>Audit Block Telemetry</h3>
              <p style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>Immutable cryptographic record</p>
            </div>
          </div>
          <button onClick={onClose} className="btn-icon"><X size={15} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '0.65rem', padding: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>Action</span>
              <span className={`badge ${ACTION_BADGE[log.action] || 'badge-neutral'}`}>{log.action}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text)' }}>
              <span>Timestamp:</span>
              <span style={{ color: 'var(--muted)' }}>{formatDate(log.createdAt)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text)', marginTop: '0.3rem' }}>
              <span>Client IP:</span>
              <span style={{ fontFamily: 'monospace', color: 'var(--accent)' }}>{log.ipAddress || log.ip || '127.0.0.1'}</span>
            </div>
          </div>

          {/* Cryptographic Chain */}
          <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '0.65rem', padding: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent)', fontSize: '0.78rem', fontWeight: 700, marginBottom: '0.65rem' }}>
              <Link2 size={14} /> Cryptographic Proof & Hash Chain
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.75rem' }}>
              <div>
                <p style={{ color: 'var(--muted)', fontSize: '0.68rem', textTransform: 'uppercase', fontWeight: 700 }}>Record SHA-256 Hash</p>
                <p style={{ fontFamily: 'monospace', color: 'var(--success)', background: 'var(--bg-base)', padding: '0.4rem 0.6rem', borderRadius: '0.4rem', border: '1px solid var(--border)', wordBreak: 'break-all', marginTop: '0.2rem' }}>
                  {log.recordHash || 'Generated & Verified on Chain'}
                </p>
              </div>
              <div>
                <p style={{ color: 'var(--muted)', fontSize: '0.68rem', textTransform: 'uppercase', fontWeight: 700 }}>Parent Block Pointer (Previous Hash)</p>
                <p style={{ fontFamily: 'monospace', color: 'var(--text)', background: 'var(--bg-base)', padding: '0.4rem 0.6rem', borderRadius: '0.4rem', border: '1px solid var(--border)', wordBreak: 'break-all', marginTop: '0.2rem' }}>
                  {log.previousHash || '0000000000000000000000000000000000000000000000000000000000000000 (Genesis)'}
                </p>
              </div>
              {log.signature && (
                <div>
                  <p style={{ color: 'var(--muted)', fontSize: '0.68rem', textTransform: 'uppercase', fontWeight: 700 }}>Server HMAC Signature</p>
                  <p style={{ fontFamily: 'monospace', color: 'var(--info)', background: 'var(--bg-base)', padding: '0.4rem 0.6rem', borderRadius: '0.4rem', border: '1px solid var(--border)', wordBreak: 'break-all', marginTop: '0.2rem' }}>
                    {log.signature}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Details Payload */}
          {log.details && Object.keys(log.details).length > 0 && (
            <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '0.65rem', padding: '0.85rem' }}>
              <p style={{ color: 'var(--muted)', fontSize: '0.68rem', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.4rem' }}>Metadata Details</p>
              <pre style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: 'var(--text)', background: 'var(--bg-base)', padding: '0.6rem', borderRadius: '0.4rem', overflowX: 'auto', border: '1px solid var(--border)' }}>
                {JSON.stringify(log.details, null, 2)}
              </pre>
            </div>
          )}
        </div>

        <div style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} className="btn-primary" style={{ fontSize: '0.8rem', padding: '0.45rem 1.25rem' }}>Close</button>
        </div>
      </motion.div>
    </motion.div>
  )
}

function ClearModal({ onClose, onConfirm, loading }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}>
      <motion.div className="card" style={{ width: '100%', maxWidth: '24rem' }} initial={{ scale: 0.9, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', marginBottom: '1rem' }}>
          <div style={{ width: '2.75rem', height: '2.75rem', borderRadius: '0.75rem', background: 'var(--danger-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <AlertTriangle size={20} style={{ color: 'var(--danger)' }} />
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontWeight: 800, color: 'var(--text)', fontSize: '1rem' }}>Clear All Audit Logs</h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>This action cannot be undone</p>
          </div>
          <button onClick={onClose} className="btn-icon"><X size={14} /></button>
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
          All audit log entries for your account will be permanently removed. The cryptographic ledger chain will reset to genesis.
        </p>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={onClose} className="btn-ghost" style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
          <button onClick={onConfirm} disabled={loading} className="btn-danger" style={{ flex: 1, justifyContent: 'center' }}>
            {loading ? 'Clearing…' : <><Trash2 size={13} /> Clear All</>}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

function RepairConfirmModal({ onClose, onConfirm, loading, result }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
      onClick={!loading ? onClose : undefined}>
      <motion.div className="card" style={{ width: '100%', maxWidth: '26rem' }} initial={{ scale: 0.94, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', marginBottom: '1.1rem' }}>
          <div style={{ width: '2.75rem', height: '2.75rem', borderRadius: '0.75rem', background: result ? 'var(--success-soft)' : 'var(--warning-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {result ? <ShieldCheck size={20} style={{ color: 'var(--success)' }} /> : <Wrench size={20} style={{ color: 'var(--warning)' }} />}
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontWeight: 800, color: 'var(--text)', fontSize: '1rem' }}>
              {result ? 'Ledger Repair Complete' : 'Repair Audit Ledger?'}
            </h3>
            <p style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>
              {result ? `${result.repaired} blocks re-sequenced` : 'This will recompute all hash chains'}
            </p>
          </div>
          {!loading && <button onClick={onClose} className="btn-icon"><X size={14} /></button>}
        </div>

        {!result ? (
          <>
            <div style={{ background: 'var(--warning-soft)', border: '1px solid color-mix(in srgb, var(--warning) 30%, transparent)', borderRadius: '0.65rem', padding: '0.875rem', marginBottom: '1.1rem' }}>
              <p style={{ fontSize: '0.82rem', color: 'var(--text)', fontWeight: 600, marginBottom: '0.4rem' }}>What this does:</p>
              <ul style={{ fontSize: '0.79rem', color: 'var(--muted)', lineHeight: 1.7, paddingLeft: '1.1rem', margin: 0 }}>
                <li>Fetches all your audit records in chronological order</li>
                <li>Recomputes each SHA-256 block hash sequentially</li>
                <li>Regenerates HMAC signatures from genesis onwards</li>
                <li>Restores a verified, tamper-free chain</li>
              </ul>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={onClose} className="btn-ghost" style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
              <button onClick={onConfirm} disabled={loading} className="btn-primary" style={{ flex: 1.5, justifyContent: 'center', background: 'var(--warning)', borderColor: 'var(--warning)' }}>
                {loading ? <><RefreshCw size={13} className="spin" /> Repairing…</> : <><Wrench size={13} /> Repair Ledger</>}
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'var(--success-soft)', border: '1px solid color-mix(in srgb, var(--success) 30%, transparent)', borderRadius: '0.65rem', padding: '0.875rem', marginBottom: '1.1rem', fontSize: '0.82rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--muted)' }}>Total records:</span>
                <span style={{ fontWeight: 700, color: 'var(--text)', fontFamily: 'monospace' }}>{result.total}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--muted)' }}>Blocks re-hashed:</span>
                <span style={{ fontWeight: 700, color: 'var(--success)', fontFamily: 'monospace' }}>{result.repaired}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--muted)' }}>New chain tip hash:</span>
                <span style={{ fontWeight: 700, color: 'var(--accent)', fontFamily: 'monospace', fontSize: '0.72rem' }}>{result.newLastHash?.slice(0, 12)}…</span>
              </div>
            </div>
            <button onClick={onClose} className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
              <CheckCircle2 size={14} /> Close
            </button>
          </>
        )}
      </motion.div>
    </motion.div>
  )
}

export default function AuditLogs() {
  const qc = useQueryClient()
  const [page, setPage]                   = useState(1)
  const [actionFilter, setAction]         = useState('ALL')
  const [search, setSearch]               = useState('')
  const [clearing, setClearing]           = useState(false)
  const [showClearModal, setShowClearModal] = useState(false)
  const [showRepairModal, setShowRepairModal] = useState(false)
  const [repairing, setRepairing]         = useState(false)
  const [repairResult, setRepairResult]   = useState(null)
  const [selectedLog, setSelectedLog]     = useState(null)
  const [verifying, setVerifying]         = useState(false)

  // Fetch logs
  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', page, actionFilter],
    queryFn:  () => auditApi.myLogs(page, actionFilter !== 'ALL' ? actionFilter : undefined).then(r => r.data.data),
  })

  // Fetch cryptographic integrity status
  const { data: integrityData, refetch: refetchIntegrity, isFetching: integrityLoading } = useQuery({
    queryKey: ['audit-integrity'],
    queryFn:  () => auditApi.verify().then(r => r.data.data),
    staleTime: 60000,
  })

  const logs    = (data?.logs || []).filter(l => !search || l.action?.includes(search.toUpperCase()) || l.resourceId?.includes(search) || l.recordHash?.includes(search))
  const total   = data?.total || 0
  const pages   = Math.ceil(total / 20) || 1

  const handleVerify = async () => {
    setVerifying(true)
    try {
      const res = await auditApi.verify()
      const result = res.data?.data
      if (result?.isValid) {
        toast.success(`Ledger verified! All ${result.totalRecords} blocks are cryptographically intact.`)
      } else {
        toast.error(`Tampering detected in ${result?.brokenRecords || 0} audit record(s)!`)
      }
      refetchIntegrity()
    } catch {
      toast.error('Failed to verify audit ledger integrity')
    } finally {
      setVerifying(false)
    }
  }

  const handleClear = async () => {
    setClearing(true)
    try {
      await auditApi.clearMyLogs()
      toast.success('Audit logs cleared')
      qc.invalidateQueries(['audit-logs'])
      qc.invalidateQueries(['audit-integrity'])
      qc.invalidateQueries(['audit-integrity'])
      setShowClearModal(false)
    } catch {
      toast.error('Failed to clear logs')
    } finally {
      setClearing(false)
    }
  }

  const handleRepair = async () => {
    setRepairing(true)
    try {
      const res = await auditApi.repair()
      const result = res.data?.data
      setRepairResult(result)
      if (result.status === 'ALREADY_CLEAN') {
        toast.success(`Ledger is already clean — all ${result.total} blocks intact.`)
      } else {
        toast.success(`Ledger repaired! ${result.repaired} of ${result.total} blocks re-hashed.`)
      }
      await refetchIntegrity()
      qc.invalidateQueries(['audit-logs'])
      qc.invalidateQueries(['audit-integrity'])
    } catch (err) {
      toast.error(err.response?.data?.message || 'Ledger repair failed. Please try again.')
      setShowRepairModal(false)
    } finally {
      setRepairing(false)
    }
  }

  const isChainValid = integrityData?.isValid !== false
  const isTampered = integrityData?.isTampered === true

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <span className="page-tag"><ClipboardList size={11} /> Security & Compliance</span>
          <h1 className="page-title">Audit Ledger</h1>
          <p className="page-sub">Cryptographically hashed and tamper-evident sequential audit trail</p>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          {isTampered && (
            <motion.button
              onClick={() => { setRepairResult(null); setShowRepairModal(true) }}
              disabled={repairing}
              className="btn-primary"
              style={{ fontSize: '0.8rem', padding: '0.45rem 1rem', background: 'var(--danger)', borderColor: 'var(--danger)', boxShadow: '0 0 14px color-mix(in srgb, var(--danger) 35%, transparent)' }}
              whileHover={{ scale: 1.04 }}
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ duration: 1.8, repeat: Infinity }}
            >
              <Wrench size={13} /> Repair Ledger
            </motion.button>
          )}
          <motion.button onClick={handleVerify} disabled={verifying || integrityLoading} className="btn-primary" style={{ fontSize: '0.8rem', padding: '0.45rem 1rem' }} whileHover={{ scale: 1.04 }}>
            <RefreshCw size={13} className={verifying || integrityLoading ? 'spin' : ''} />
            {verifying ? 'Verifying…' : 'Verify Integrity'}
          </motion.button>
          <motion.button onClick={() => setShowClearModal(true)} className="btn-ghost" style={{ fontSize: '0.8rem', color: 'var(--danger)' }} whileHover={{ scale: 1.04 }}>
            <Trash2 size={14} /> Clear Logs
          </motion.button>
        </div>
      </div>

      {/* Ledger Integrity Card */}
      <div className="card" style={{
        background: isTampered
          ? 'linear-gradient(135deg, color-mix(in srgb, var(--danger) 15%, var(--bg-card)), var(--bg-card))'
          : 'linear-gradient(135deg, color-mix(in srgb, var(--accent) 12%, var(--bg-card)), var(--bg-card))',
        borderColor: isTampered
          ? 'color-mix(in srgb, var(--danger) 40%, var(--border))'
          : 'color-mix(in srgb, var(--success) 35%, var(--border))',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1.25rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              width: '3.25rem', height: '3.25rem', borderRadius: '0.85rem',
              background: isTampered ? 'var(--danger-soft)' : 'var(--success-soft)',
              color: isTampered ? 'var(--danger)' : 'var(--success)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              {isTampered ? <ShieldAlert size={24} /> : <ShieldCheck size={24} />}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h3 style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text)' }}>
                  {isTampered ? 'Tamper Detected in Audit Ledger' : 'Cryptographic Ledger: Verified & Intact'}
                </h3>
                <span className={`badge ${isTampered ? 'badge-danger' : 'badge-success'}`}>
                  {isTampered ? 'Compromised' : 'SHA-256 Chained'}
                </span>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: '0.2rem' }}>
                {isTampered
                  ? `${integrityData?.brokenRecords || 1} records have broken cryptographic hashes or invalid signatures.`
                  : `Each audit event is linked to its predecessor via SHA-256 hash pointers and authenticated with server HMAC.`}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 700 }}>Total Verified Blocks</span>
              <p style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text)', fontFamily: 'monospace' }}>
                {integrityData?.validRecords ?? total} / {integrityData?.totalRecords ?? total}
              </p>
            </div>
            <div style={{ textAlign: 'right', minWidth: '120px' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 700 }}>Latest Block Hash</span>
              <p style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--accent)', fontFamily: 'monospace' }}>
                {truncateHash(integrityData?.lastRecordHash)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tamper Alert Banner with Repair CTA */}
      <AnimatePresence>
        {isTampered && (
          <motion.div
            key="tamper-banner"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{
              background: 'linear-gradient(135deg, color-mix(in srgb, var(--danger) 20%, var(--bg-card)), var(--bg-card))',
              border: '1px solid color-mix(in srgb, var(--danger) 45%, transparent)',
              borderRadius: '0.85rem',
              padding: '1.1rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              flexWrap: 'wrap',
              boxShadow: '0 0 24px color-mix(in srgb, var(--danger) 15%, transparent)'
            }}
          >
            <div style={{ width: '2.75rem', height: '2.75rem', borderRadius: '0.75rem', background: 'var(--danger-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <AlertTriangle size={20} style={{ color: 'var(--danger)' }} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 800, color: 'var(--danger)', fontSize: '0.9rem' }}>
                🚨 Audit Ledger Integrity Compromised
              </p>
              <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: '0.2rem', lineHeight: 1.5 }}>
                <strong>{integrityData?.brokenRecords || 0} records</strong> have broken SHA-256 hash pointers or invalid signatures — likely caused by direct database edits or record deletions. Use Repair Ledger to automatically recompute the full chain from genesis.
              </p>
            </div>
            <motion.button
              onClick={() => { setRepairResult(null); setShowRepairModal(true) }}
              className="btn-primary"
              style={{ background: 'var(--danger)', borderColor: 'var(--danger)', fontSize: '0.82rem', whiteSpace: 'nowrap' }}
              whileHover={{ scale: 1.04 }}
            >
              <Wrench size={13} /> Repair Ledger Now
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters */}
      <div className="card" style={{ padding: '0.875rem 1.1rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '180px', maxWidth: '22rem' }}>
            <Search size={14} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search action, resource, or hash…" className="input-field" style={{ paddingLeft: '2.4rem' }} />
          </div>
          <select value={actionFilter} onChange={e => { setAction(e.target.value); setPage(1) }} className="input-field" style={{ maxWidth: '190px' }}>
            {ACTIONS.map(a => <option key={a} value={a}>{a === 'ALL' ? 'All Actions' : a}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      {isLoading ? <SkeletonTable rows={8} /> : logs.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-state-icon"><Activity size={26} style={{ color: 'var(--accent)' }} /></div>
          <h3>No audit events found</h3>
          <p>Your security activity and file operations will be sequentially logged here.</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>{['Action', 'Block Hash (SHA-256)', 'Status', 'IP Address', 'Date & Time', 'Inspect'].map(h => <th key={h}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {logs.map((log, i) => (
                  <motion.tr key={log._id || log.id || i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}>
                    <td>
                      <span className={`badge ${ACTION_BADGE[log.action] || 'badge-neutral'}`}>{log.action}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Hash size={12} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                        <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text)' }}>
                          {truncateHash(log.recordHash)}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${log.status === 'SUCCESS' ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.7rem' }}>
                        {log.status || 'SUCCESS'}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--muted)' }}>
                      {log.ipAddress || log.ip || '127.0.0.1'}
                    </td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                      {formatDate(log.createdAt)}
                    </td>
                    <td>
                      <button onClick={() => setSelectedLog(log)} className="btn-ghost" style={{ fontSize: '0.72rem', padding: '0.3rem 0.65rem' }}>
                        <Info size={12} /> Inspect
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.875rem 1rem', borderTop: '1px solid var(--border)' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>Page {page} of {pages}</span>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn-ghost" style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem' }}>← Prev</button>
                <button disabled={page >= pages} onClick={() => setPage(p => p + 1)} className="btn-ghost" style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem' }}>Next →</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {selectedLog && <LogDetailsModal log={selectedLog} onClose={() => setSelectedLog(null)} />}
        {showClearModal && <ClearModal onClose={() => setShowClearModal(false)} onConfirm={handleClear} loading={clearing} />}
        {showRepairModal && (
          <RepairConfirmModal
            onClose={() => { if (!repairing) { setShowRepairModal(false); setRepairResult(null) } }}
            onConfirm={handleRepair}
            loading={repairing}
            result={repairResult}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
