import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'react-toastify'
import {
  QrCode, Camera, ShieldCheck, Download, AlertTriangle,
  FileText, User, Clock, Loader2, RefreshCw, X, Shield, Lock
} from 'lucide-react'
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { processAndSaveDownload } from '../utils/downloadHelper'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import ZKPromptModal from '../components/ZKPromptModal'
import api from '../services/api'

function parseQRPayload(text) {
  try {
    const url = new URL(text)
    const sessionId = url.searchParams.get('sessionId')
    const nonce = url.searchParams.get('nonce')
    if (sessionId && nonce) return { sessionId, nonce }
  } catch {}

  try {
    const params = new URLSearchParams(window.location.search)
    const sessionId = params.get('sessionId')
    const nonce = params.get('nonce')
    if (sessionId && nonce) return { sessionId, nonce }
  } catch {}

  return null
}

const STAGES = {
  SCANNING:    'scanning',
  FETCHING:    'fetching',
  READY:       'ready',
  DOWNLOADING: 'downloading',
  DONE:        'done',
  ERROR:       'error'
}

function formatFileSize(b = 0) {
  if (b < 1024) return `${b} B`
  if (b < 1024 ** 2) return `${(b / 1024).toFixed(1)} KB`
  if (b < 1024 ** 3) return `${(b / 1024 ** 2).toFixed(1)} MB`
  return `${(b / 1024 ** 3).toFixed(2)} GB`
}

export default function QRScannerPage() {
  const navigate = useNavigate()
  const { zkPassphrase, setZkPassphrase } = useAuth() || {}
  const [stage, setStage] = useState(STAGES.SCANNING)
  const [sessionData, setSessionData] = useState(null)
  const [error, setError] = useState(null)
  const [pendingPayload, setPendingPayload] = useState(null)
  const [pendingZK, setPendingZK] = useState(null)
  const scannerRef = useRef(null)
  const hasScannedRef = useRef(false)

  // Check URL query parameters on mount (when scanned with phone camera)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const sessionId = params.get('sessionId')
      const nonce = params.get('nonce')

      if (sessionId && nonce && !hasScannedRef.current) {
        hasScannedRef.current = true
        setStage(STAGES.FETCHING)
        handleScanPayload({ sessionId, nonce })
      }
    } catch (e) {
      console.error('URL parse error:', e)
    }
  }, [])

  // Camera QR scanner initialization (only when in scanning mode without URL params)
  useEffect(() => {
    if (stage !== STAGES.SCANNING || hasScannedRef.current) return

    let scanner = null
    const timer = setTimeout(() => {
      try {
        const elem = document.getElementById('qr-reader')
        if (!elem) return

        scanner = new Html5QrcodeScanner(
          'qr-reader',
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            supportedScanTypes: [],
            formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE]
          },
          false
        )

        scanner.render(
          (text) => {
            if (hasScannedRef.current) return
            hasScannedRef.current = true
            scanner.clear().catch(() => {})
            handleScan(text)
          },
          () => {}
        )

        scannerRef.current = scanner
      } catch (err) {
        console.warn('Camera scanner init skipped or unsupported:', err)
      }
    }, 100)

    return () => {
      clearTimeout(timer)
      if (scanner) {
        scanner.clear().catch(() => {})
      }
    }
  }, [stage])

  const handleScanPayload = async (payload) => {
    setPendingPayload(payload)
    setStage(STAGES.FETCHING)
    try {
      const res = await api.post('/qr/scan', payload)
      setSessionData(res.data.data)
      setStage(STAGES.READY)
    } catch (err) {
      setError(err.response?.data?.message || 'QR session has expired or is invalid.')
      setStage(STAGES.ERROR)
    }
  }

  const handleScan = (text) => {
    const payload = parseQRPayload(text)
    if (!payload) {
      setError('This QR code is not a valid SecureVault transfer code.')
      setStage(STAGES.ERROR)
      return
    }
    handleScanPayload(payload)
  }

  const handleDownload = async (passphraseOverride = '') => {
    if (!pendingPayload) return
    setStage(STAGES.DOWNLOADING)
    setError(null)

    try {
      const res = await api.post('/qr/consume', pendingPayload, { responseType: 'blob' })
      const pass = passphraseOverride || zkPassphrase || ''
      await processAndSaveDownload(res, sessionData?.filename || 'file', pass)
      setStage(STAGES.DONE)
      toast.success('File downloaded securely via QR!')
    } catch (err) {
      if (err.isZeroKnowledge) {
        setPendingZK({ res: err.pendingRes, name: err.finalFilename || sessionData?.filename || 'Encrypted File' })
        setStage(STAGES.READY)
        return
      }

      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text()
          const json = JSON.parse(text)
          setError(json.message || 'Download failed.')
        } catch {
          setError('Download failed.')
        }
      } else {
        setError(err.response?.data?.message || err.message || 'Download failed.')
      }
      setStage(STAGES.ERROR)
    }
  }

  const handleZKConfirm = async (passphrase, remember) => {
    if (remember && setZkPassphrase) {
      setZkPassphrase(passphrase)
    }
    setPendingZK(null)
    await handleDownload(passphrase)
  }

  const reset = () => {
    hasScannedRef.current = false
    setError(null)
    setSessionData(null)
    setPendingPayload(null)
    setPendingZK(null)
    setStage(STAGES.SCANNING)
  }

  return (
    <div className="login-page" style={{ padding: '1rem' }}>
      <div className="login-network">
        {Array.from({ length: 14 }).map((_, i) => (
          <i
            key={i}
            style={{
              top: `${(i * 23) % 100}%`,
              left: `${(i * 31) % 100}%`,
              animationDelay: `${(i * 0.8) % 6}s`,
            }}
          />
        ))}
      </div>
      <div className="login-orb login-orb-one" />
      <div className="login-orb login-orb-two" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card"
        style={{
          width: '100%',
          maxWidth: '28rem',
          position: 'relative',
          zIndex: 1,
          backdropFilter: 'blur(20px)',
          background: 'color-mix(in srgb, var(--card) 94%, transparent)',
          boxShadow: '0 24px 60px rgba(0,0,0,0.35)',
          padding: '1.75rem',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{ width: '2.4rem', height: '2.4rem', borderRadius: '0.7rem', background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <QrCode size={19} />
            </div>
            <div>
              <h1 style={{ fontWeight: 800, color: 'var(--text)', fontSize: '1rem' }}>QR Direct Transfer</h1>
              <p style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>Encrypted single-use peer download</p>
            </div>
          </div>
          <button onClick={() => navigate('/dashboard')} className="btn-icon"><X size={15} /></button>
        </div>

        {/* ── Stages ─────────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          {stage === STAGES.SCANNING && (
            <motion.div key="scanning" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem', color: 'var(--muted)', padding: '0.75rem', borderRadius: '0.65rem', border: '1px solid var(--border)', background: 'color-mix(in srgb, var(--bg) 70%, transparent)' }}>
                <Camera size={15} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                <span>Point your camera at the SecureVault QR code to download…</span>
              </div>
              <div id="qr-reader" style={{ borderRadius: '0.75rem', overflow: 'hidden', border: '1px solid var(--border)' }} />
            </motion.div>
          )}

          {stage === STAGES.FETCHING && (
            <motion.div key="fetching" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '2.5rem 0', textAlign: 'center' }}>
              <Loader2 size={36} className="animate-spin" style={{ color: 'var(--accent)' }} />
              <div>
                <p style={{ fontWeight: 700, color: 'var(--text)', fontSize: '0.95rem' }}>Verifying QR Session…</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.25rem' }}>Retrieving encrypted file metadata from peer</p>
              </div>
            </motion.div>
          )}

          {stage === STAGES.READY && sessionData && (
            <motion.div key="ready" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem', padding: '0.25rem 0' }}>
                <div style={{ width: '3.5rem', height: '3.5rem', borderRadius: '50%', background: 'var(--success-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShieldCheck size={26} style={{ color: 'var(--success)' }} />
                </div>
                <p style={{ fontWeight: 800, color: 'var(--text)', fontSize: '1.05rem' }}>File Ready for Download</p>
                <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>Verified Session</span>
              </div>

              {/* File Info Card */}
              <div style={{ padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--border)', background: 'var(--bg-elevated)', display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.825rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '2.2rem', height: '2.2rem', borderRadius: '0.45rem', background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 800, flexShrink: 0 }}>
                    {sessionData.filename?.split('.').pop()?.toUpperCase()?.slice(0, 3) || 'FILE'}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{ fontSize: '0.68rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>Filename</p>
                    <p style={{ fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {sessionData.filename || 'Shared File'}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: '0.65rem', fontSize: '0.78rem' }}>
                  <span style={{ color: 'var(--muted)' }}>File Size:</span>
                  <span style={{ fontWeight: 600, color: 'var(--text)' }}>{formatFileSize(sessionData.size)}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                  <span style={{ color: 'var(--muted)' }}>Security:</span>
                  <span style={{ fontWeight: 600, color: 'var(--accent)' }}>Single-use Nonce Verified</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                <button onClick={reset} className="btn-ghost" style={{ flex: 1, justifyContent: 'center' }}>
                  Scan Another
                </button>
                <button onClick={() => handleDownload()} className="btn-primary" style={{ flex: 1.4, justifyContent: 'center' }}>
                  <Download size={14} /> Download File
                </button>
              </div>
            </motion.div>
          )}

          {stage === STAGES.DOWNLOADING && (
            <motion.div key="downloading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '2.5rem 0', textAlign: 'center' }}>
              <Loader2 size={38} className="animate-spin" style={{ color: 'var(--accent)' }} />
              <div>
                <p style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text)' }}>Streaming & decrypting…</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.25rem' }}>The single-use QR token will be safely consumed on completion.</p>
              </div>
            </motion.div>
          )}

          {stage === STAGES.DONE && (
            <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem', padding: '1.75rem 0', textAlign: 'center' }}>
              <div style={{ width: '4rem', height: '4rem', borderRadius: '50%', background: 'var(--success-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShieldCheck size={32} style={{ color: 'var(--success)' }} />
              </div>
              <div>
                <p style={{ fontWeight: 800, color: 'var(--text)', fontSize: '1.1rem' }}>Download Complete!</p>
                <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: '0.35rem' }}>The file has been saved to your device.</p>
              </div>
              <button onClick={() => navigate('/dashboard')} className="btn-primary" style={{ padding: '0.6rem 2rem' }}>
                Done
              </button>
            </motion.div>
          )}

          {stage === STAGES.ERROR && (
            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem', padding: '1.75rem 0', textAlign: 'center' }}>
              <div style={{ width: '4rem', height: '4rem', borderRadius: '50%', background: 'var(--danger-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertTriangle size={30} style={{ color: 'var(--danger)' }} />
              </div>
              <div>
                <p style={{ fontWeight: 800, color: 'var(--danger)', fontSize: '1.1rem' }}>Transfer Expired or Invalid</p>
                <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: '0.35rem', lineHeight: 1.5 }}>
                  {error || 'This QR session has expired (60s limit) or has already been downloaded.'}
                </p>
              </div>
              <button onClick={reset} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <RefreshCw size={14} /> Scan New QR
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Interactive ZK Decryption Modal if required */}
      <ZKPromptModal
        isOpen={Boolean(pendingZK)}
        fileName={pendingZK?.name}
        onConfirm={handleZKConfirm}
        onCancel={() => setPendingZK(null)}
      />
    </div>
  )
}
