import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Shield, Lock, Download, AlertTriangle, FileText, CheckCircle2, Key, ShieldCheck } from 'lucide-react'
import { toast } from 'react-toastify'
import api from '../services/api'
import { processAndSaveDownload } from '../utils/downloadHelper'

function formatBytes(b = 0) {
  if (b < 1024) return `${b} B`
  if (b < 1024 ** 2) return `${(b / 1024).toFixed(1)} KB`
  if (b < 1024 ** 3) return `${(b / 1024 ** 2).toFixed(1)} MB`
  return `${(b / 1024 ** 3).toFixed(2)} GB`
}

export default function PublicSharePage() {
  const { token } = useParams()
  const [loading, setLoading] = useState(true)
  const [shareInfo, setShareInfo] = useState(null)
  const [error, setError] = useState(null)

  // Password & OTP states
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    fetchShareInfo()
  }, [token])

  const fetchShareInfo = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get(`/shares/${token}/info`)
      setShareInfo(res.data.data || res.data)
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired share link.')
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const res = await api.post(`/shares/${token}/access`, { password, otp }, { responseType: 'blob' })
      await processAndSaveDownload(res, shareInfo?.fileName || 'download')
      toast.success('Download started!')
    } catch (err) {
      if (err.response?.data instanceof Blob) {
        const text = await err.response.data.text()
        try {
          const json = JSON.parse(text)
          toast.error(json.message || 'Access denied.')
        } catch {
          toast.error('Access denied. Check password/OTP.')
        }
      } else {
        toast.error(err.response?.data?.message || 'Access denied. Check password/OTP.')
      }
    } finally {
      setDownloading(false)
    }
  }

  const requestOtp = async () => {
    try {
      await api.post(`/shares/${token}/send-otp`)
      setOtpSent(true)
      toast.success('OTP sent to registered email!')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send OTP.')
    }
  }

  return (
    <div className="login-page">
      <div className="login-network">
        {Array.from({ length: 18 }).map((_, i) => (
          <i
            key={i}
            style={{
              top: `${(i * 19) % 100}%`,
              left: `${(i * 29) % 100}%`,
              animationDelay: `${(i * 0.7) % 6}s`,
            }}
          />
        ))}
      </div>
      <div className="login-orb login-orb-one" />
      <div className="login-orb login-orb-two" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="card"
        style={{
          width: '100%',
          maxWidth: '28rem',
          position: 'relative',
          zIndex: 1,
          backdropFilter: 'blur(20px)',
          background: 'color-mix(in srgb, var(--card) 92%, transparent)',
          boxShadow: '0 24px 60px rgba(0,0,0,0.3)',
          padding: '2rem',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{
            width: '3.5rem', height: '3.5rem', borderRadius: '1rem',
            background: 'linear-gradient(135deg, var(--accent), var(--accent-hover))',
            color: '#fff', margin: '0 auto 0.875rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 24px var(--accent-glow)'
          }}>
            <Shield size={24} />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.02em' }}>SecureVault</h1>
          <p style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.14em', marginTop: '0.2rem', fontWeight: 700 }}>
            Encrypted Share Portal
          </p>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', padding: '2rem 0', color: 'var(--muted)', fontSize: '0.875rem' }}>
            <div style={{ width: '2rem', height: '2rem', borderRadius: '50%', border: '3px solid var(--accent)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
            Verifying share token…
          </div>
        ) : error ? (
          <div style={{ padding: '1.25rem', borderRadius: '0.875rem', background: 'var(--danger-soft)', border: '1px solid color-mix(in srgb, var(--danger) 30%, transparent)', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={26} style={{ color: 'var(--danger)' }} />
            <p style={{ fontWeight: 700, color: 'var(--danger)', fontSize: '0.875rem' }}>{error}</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.875rem',
              padding: '1rem', borderRadius: '0.875rem',
              background: 'color-mix(in srgb, var(--bg) 80%, transparent)',
              border: '1px solid var(--border)',
            }}>
              <div style={{
                width: '2.75rem', height: '2.75rem', borderRadius: '0.75rem',
                background: 'var(--accent-soft)', color: 'var(--accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.65rem', fontWeight: 800, flexShrink: 0
              }}>
                {shareInfo?.fileName?.split('.').pop()?.toUpperCase()?.slice(0, 3) || 'FILE'}
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontWeight: 700, color: 'var(--text)', fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {shareInfo?.fileName || 'Encrypted File'}
                </p>
                <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.15rem' }}>
                  {formatBytes(shareInfo?.fileSize)} · Protected Content
                </p>
              </div>
            </div>

            {shareInfo?.isPasswordRequired && (
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>
                  Password Protection
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={14} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter access password…"
                    className="input-field"
                    style={{ paddingLeft: '2.5rem' }}
                  />
                </div>
              </div>
            )}

            {shareInfo?.isOtpRequired && (
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>
                  Email OTP Verification
                </label>
                {!otpSent ? (
                  <button onClick={requestOtp} className="btn-ghost" style={{ width: '100%', justifyContent: 'center', fontSize: '0.8rem' }}>
                    <Key size={14} /> Send 6-Digit OTP Code
                  </button>
                ) : (
                  <input
                    type="text"
                    value={otp}
                    onChange={e => setOtp(e.target.value)}
                    placeholder="Enter 6-digit OTP"
                    className="input-field"
                    style={{ textAlign: 'center', letterSpacing: '0.25em', fontFamily: 'monospace', fontSize: '1.1rem', fontWeight: 700 }}
                    maxLength={6}
                  />
                )}
              </div>
            )}

            <motion.button
              onClick={handleDownload}
              disabled={downloading}
              className="btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '0.85rem', fontSize: '0.9rem' }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {downloading ? (
                <span style={{ width: '1.25rem', height: '1.25rem', borderRadius: '50%', border: '2px solid white', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
              ) : (
                <><Download size={16} /> Decrypt & Download File</>
              )}
            </motion.button>
          </div>
        )}
      </motion.div>
    </div>
  )
}
