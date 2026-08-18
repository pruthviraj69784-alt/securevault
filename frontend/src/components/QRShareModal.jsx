import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { QRCodeSVG } from 'qrcode.react'
import { toast } from 'react-toastify'
import axios from 'axios'
import { X, QrCode, RefreshCw, ShieldOff, Clock, CheckCircle2, Loader2 } from 'lucide-react'

const api = axios.create({ baseURL: '/api' })
api.interceptors.request.use(cfg => {
  const t = localStorage.getItem('sv_token')
  if (t) cfg.headers.Authorization = `Bearer ${t}`
  return cfg
})

function CountdownTimer({ expiresAt, onExpired }) {
  const [secondsLeft, setSecondsLeft] = useState(null)

  useEffect(() => {
    if (!expiresAt) return
    const interval = setInterval(() => {
      const diff = Math.max(0, Math.floor((new Date(expiresAt) - Date.now()) / 1000))
      setSecondsLeft(diff)
      if (diff === 0) {
        clearInterval(interval)
        onExpired?.()
      }
    }, 500)
    return () => clearInterval(interval)
  }, [expiresAt, onExpired])

  if (secondsLeft === null) return null
  const isUrgent = secondsLeft <= 15
  return (
    <div className={`flex items-center gap-1.5 text-sm font-mono font-bold ${isUrgent ? 'text-red-400 animate-pulse' : 'text-emerald-400'}`}>
      <Clock size={14} />
      Expires in: {String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:{String(secondsLeft % 60).padStart(2, '0')}
    </div>
  )
}

function getEffectivePayload(rawPayload) {
  if (!rawPayload) return ''
  const host = window.location.hostname
  if (host && host !== 'localhost' && host !== '127.0.0.1') {
    return rawPayload.replace(/localhost|127\.0\.0\.1/, host)
  }
  return rawPayload
}

// QR content — shared between inline and modal views
function QRContent({ file, onClose }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [expired, setExpired] = useState(false)
  const [revoked, setRevoked] = useState(false)
  const [revoking, setRevoking] = useState(false)
  const sessionRef = useRef(null)

  const generateSession = async () => {
    setLoading(true)
    setExpired(false)
    setRevoked(false)
    setSession(null)
    try {
      const res = await api.post(`/shares/${file._id}/qr`)
      setSession(res.data.data)
      sessionRef.current = res.data.data
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate QR session')
    } finally {
      setLoading(false)
    }
  }

  const revokeSession = async () => {
    if (!session?.sessionId) return
    setRevoking(true)
    try {
      await api.delete(`/qr/${session.sessionId}`)
      sessionRef.current = null
      setRevoked(true)
      setSession(null)
      toast.success('QR session revoked.')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to revoke session')
    } finally {
      setRevoking(false)
    }
  }

  useEffect(() => {
    generateSession()
    return () => {
      if (sessionRef.current?.sessionId) {
        api.delete(`/qr/${sessionRef.current.sessionId}`).catch(() => {})
        sessionRef.current = null
      }
    }
  }, [])

  const qrSize = 210
  const payload = getEffectivePayload(session?.qrPayload || '')

  return (
    <div className="flex flex-col items-center gap-5">
      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center gap-3 py-8">
          <Loader2 size={36} className="animate-spin text-accent" />
          <p className="text-sm text-muted">Generating secure QR session…</p>
        </div>
      )}

      {/* Expired */}
      {expired && !loading && (
        <div className="flex flex-col items-center gap-4 py-6">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
            <Clock size={28} className="text-red-400" />
          </div>
          <p className="text-sm font-semibold text-red-400">QR Session Expired</p>
          <p className="text-xs text-muted text-center">The 60-second window has passed.</p>
          <button onClick={generateSession} className="btn-primary flex items-center gap-2">
            <RefreshCw size={15} /> Generate New QR
          </button>
        </div>
      )}

      {/* Revoked */}
      {revoked && !loading && (
        <div className="flex flex-col items-center gap-4 py-6">
          <div className="w-16 h-16 rounded-full bg-orange-500/10 flex items-center justify-center">
            <ShieldOff size={28} className="text-orange-400" />
          </div>
          <p className="text-sm font-semibold text-orange-400">Session Revoked</p>
          <button onClick={generateSession} className="btn-primary flex items-center gap-2">
            <RefreshCw size={15} /> Generate New QR
          </button>
        </div>
      )}

      {/* Active QR */}
      {session && !loading && !expired && !revoked && (
        <>
          {/* QR Code */}
          <div className="p-4 rounded-2xl bg-white shadow-lg">
            <QRCodeSVG value={payload} size={qrSize} level="H" includeMargin={false} />
          </div>

          {/* Timer */}
          <CountdownTimer
            expiresAt={session.expiresAt}
            onExpired={() => { setExpired(true); setSession(null); sessionRef.current = null }}
          />

          {/* Network URL — shows actual LAN IP for mobile */}
          <div className="text-[11px] font-mono text-muted text-center break-all px-3 bg-black/10 py-1.5 rounded-xl w-full">
            {payload}
          </div>

          {/* Security info */}
          <div className="w-full space-y-2 text-xs text-muted bg-[var(--bg-card)] rounded-xl p-3 border border-theme">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
              Single-use — auto-consumed on download
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
              Recipient must be logged into SecureVault
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
              Nonce-protected — can't be replayed
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 w-full">
            <button
              onClick={revokeSession}
              disabled={revoking}
              className="flex-1 btn-ghost flex items-center justify-center gap-2 text-red-400 border-red-400/30 hover:bg-red-500/10"
            >
              {revoking ? <Loader2 size={14} className="animate-spin" /> : <ShieldOff size={14} />}
              Revoke
            </button>
            <button onClick={generateSession} className="flex-1 btn-ghost flex items-center justify-center gap-2">
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// When used standalone (own page/modal), wrap with overlay.
// When inline={true} (embedded inside ShareModal), just render the content directly.
export default function QRShareModal({ file, onClose, inline = false }) {
  if (inline) {
    return <QRContent file={file} onClose={onClose} />
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="card w-full max-w-sm shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-5 pb-4 border-b border-theme">
            <div>
              <h2 className="font-bold text-theme flex items-center gap-2">
                <QrCode size={18} className="text-accent" /> QR Secure Transfer
              </h2>
              <p className="text-xs text-muted mt-0.5 truncate max-w-[220px]">{file?.originalName}</p>
            </div>
            <button onClick={onClose} className="btn-ghost p-2"><X size={18} /></button>
          </div>
          <QRContent file={file} onClose={onClose} />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
