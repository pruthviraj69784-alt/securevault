import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'react-toastify'
import { motion, AnimatePresence } from 'framer-motion'
import { Share2, Download, Lock, KeyRound, ShieldCheck, Info } from 'lucide-react'
import { shareApi } from '../services/api'
import { processAndSaveDownload } from '../utils/downloadHelper'
import { useAuth } from '../context/AuthContext'

export default function SharedFiles() {
  const [loading, setLoading] = useState(false)
  const [downloaded, setDownloaded] = useState(false)
  const { register, handleSubmit, watch, formState: { errors } } = useForm()

  const tokenValue = watch('token')

  const extractToken = (value) => {
    const token = String(value || '').trim()
    if (!token) return ''
    if (token.startsWith('http')) {
      try {
        return new URL(token).pathname.split('/').filter(Boolean).pop() || token
      } catch {
        return token
      }
    }
    if (token.includes('/')) {
      return token.split('/').filter(Boolean).pop()
    }
    return token
  }

  const getErrorMessage = async (err) => {
    const status = err.response?.status
    const data = err.response?.data

    if (status === 401) return 'Wrong password. Try again.'
    if (status === 410) return 'This share link has expired.'
    if (status === 403) return 'Access denied.'

    if (data instanceof Blob) {
      try {
        const text = await data.text()
        const parsed = JSON.parse(text)
        return parsed?.message || 'Failed to access share link.'
      } catch {
        return 'Failed to access share link.'
      }
    }

    if (typeof data === 'string') {
      try {
        const parsed = JSON.parse(data)
        return parsed?.message || 'Failed to access share link.'
      } catch {
        return data || 'Failed to access share link.'
      }
    }

    if (data?.message) return data.message
    return err.message || 'Failed to access share link.'
  }

  const { zkPassphrase } = useAuth() || {}

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      const rawToken = extractToken(data.token)
      const res = await shareApi.access(rawToken, data.password || undefined)
      const passToUse = data.zkPassphrase || zkPassphrase || ''
      await processAndSaveDownload(res, 'shared-file', passToUse)
      setDownloaded(true)
      toast.success('File downloaded successfully!')
    } catch (err) {
      const msg = await getErrorMessage(err)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: '32rem', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.75rem', paddingTop: '1rem' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: '4rem', height: '4rem', borderRadius: '1.25rem',
          background: 'linear-gradient(135deg, var(--accent), var(--accent-hover))',
          color: '#fff', margin: '0 auto 1rem',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 24px var(--accent-glow)'
        }}>
          <Share2 size={26} />
        </div>
        <h1 className="page-title" style={{ fontSize: '1.6rem' }}>Access Shared File</h1>
        <p className="page-sub">Enter the share token (and password if protected) to decrypt and download.</p>
      </div>

      <motion.div className="card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>Share Token</label>
            <div style={{ position: 'relative' }}>
              <KeyRound size={15} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
              <input
                {...register('token', { required: 'Share token is required', minLength: { value: 8, message: 'Invalid token' } })}
                type="text"
                placeholder="Paste share token or link here"
                className="input-field"
                style={{ paddingLeft: '2.5rem', fontFamily: 'monospace' }}
              />
            </div>
            {errors.token && <p style={{ fontSize: '0.72rem', color: 'var(--danger)', marginTop: '0.3rem' }}>{errors.token.message}</p>}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>
              Password <span style={{ textTransform: 'none', fontWeight: 400 }}>(optional)</span>
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={15} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
              <input
                {...register('password')}
                type="password"
                placeholder="••••••••"
                className="input-field"
                style={{ paddingLeft: '2.5rem' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>
              ZK Passphrase <span style={{ textTransform: 'none', fontWeight: 400 }}>(only if zero-knowledge)</span>
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={15} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
              <input
                {...register('zkPassphrase')}
                type="password"
                placeholder="Enter zero-knowledge passphrase"
                className="input-field"
                style={{ paddingLeft: '2.5rem' }}
              />
            </div>
          </div>

          <motion.button
            type="submit"
            className="btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '0.85rem', fontSize: '0.9rem' }}
            disabled={loading || !tokenValue}
            whileHover={tokenValue ? { scale: 1.02 } : {}}
            whileTap={tokenValue ? { scale: 0.98 } : {}}
          >
            {loading
              ? <><span style={{ width: '1.25rem', height: '1.25rem', borderRadius: '50%', border: '2px solid white', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} /> Decrypting…</>
              : <><Download size={16} /> Download File</>
            }
          </motion.button>
        </form>

        <AnimatePresence>
          {downloaded && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                marginTop: '1.25rem', padding: '1rem', borderRadius: '0.75rem',
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                background: 'var(--success-soft)', border: '1px solid color-mix(in srgb, var(--success) 30%, transparent)'
              }}
            >
              <ShieldCheck size={20} style={{ color: 'var(--success)' }} />
              <p style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--success)' }}>
                File decrypted & downloaded successfully!
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <div className="card" style={{ background: 'var(--accent-soft)', borderColor: 'color-mix(in srgb, var(--accent) 30%, var(--border))' }}>
        <h3 className="section-title" style={{ marginBottom: '0.65rem' }}>
          <Info size={15} style={{ color: 'var(--accent)' }} /> How share links work
        </h3>
        <ul style={{ fontSize: '0.78rem', color: 'var(--muted)', display: 'flex', flexDirection: 'column', gap: '0.4rem', paddingLeft: '1.2rem' }}>
          <li>Share tokens expire automatically after the sender's set duration</li>
          <li>Files may require an access password set by the creator</li>
          <li>Download rate limits protect files against unauthorized scraping</li>
          <li>All download transactions are immutably logged for auditability</li>
        </ul>
      </div>
    </div>
  )
}
