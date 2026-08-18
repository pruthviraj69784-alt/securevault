import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Lock, Key, X, ShieldAlert, Download, Eye, EyeOff } from 'lucide-react'

export default function ZKPromptModal({ isOpen, fileName, onConfirm, onCancel }) {
  const [passphrase, setPassphrase] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [remember, setRemember] = useState(true)
  const [decrypting, setDecrypting] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!passphrase.trim()) {
      setError('Please enter the ZK passphrase.')
      return
    }
    setError('')
    setDecrypting(true)
    try {
      await onConfirm(passphrase.trim(), remember)
    } catch (err) {
      setError(err?.message || 'Decryption failed. Please check the passphrase.')
    } finally {
      setDecrypting(false)
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed', inset: 0, zIndex: 70,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '1rem', background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)'
        }}
        onClick={onCancel}
      >
        <motion.div
          className="card"
          style={{ width: '100%', maxWidth: '26rem', background: 'var(--bg-card)', border: '1px solid var(--border)' }}
          initial={{ scale: 0.92, y: 15 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.92 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: '2.6rem', height: '2.6rem', borderRadius: '0.7rem',
                background: 'var(--accent-soft)', color: 'var(--accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                <Lock size={18} />
              </div>
              <div>
                <h3 style={{ fontWeight: 800, color: 'var(--text)', fontSize: '1rem' }}>Zero-Knowledge Decryption</h3>
                <p style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>Client-side end-to-end security</p>
              </div>
            </div>
            <button onClick={onCancel} className="btn-icon"><X size={15} /></button>
          </div>

          <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '0.65rem', padding: '0.75rem 0.9rem', marginBottom: '1.2rem' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>File to decrypt:</p>
            <p style={{ fontWeight: 700, color: 'var(--text)', fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '0.15rem' }}>
              {fileName || 'Encrypted File'}
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                Secret Passphrase
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={passphrase}
                  onChange={(e) => { setPassphrase(e.target.value); setError('') }}
                  placeholder="Enter the ZK passphrase used by the sender…"
                  className="input-field"
                  style={{ paddingRight: '2.5rem', width: '100%' }}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="btn-icon"
                  style={{ position: 'absolute', right: '0.6rem', top: '50%', transform: 'translateY(-50%)', padding: '0.25rem' }}
                >
                  {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  background: 'var(--danger-soft)', border: '1px solid color-mix(in srgb, var(--danger) 30%, transparent)',
                  borderRadius: '0.5rem', padding: '0.5rem 0.75rem', color: 'var(--danger)', fontSize: '0.75rem'
                }}
              >
                <ShieldAlert size={14} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </motion.div>
            )}

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem', color: 'var(--muted)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                style={{ accentColor: 'var(--accent)' }}
              />
              <span>Remember passphrase for this session</span>
            </label>

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button type="button" onClick={onCancel} className="btn-ghost" style={{ flex: 1, justifyContent: 'center' }}>
                Cancel
              </button>
              <button
                type="submit"
                disabled={decrypting}
                className="btn-primary"
                style={{ flex: 1.2, justifyContent: 'center' }}
              >
                {decrypting ? 'Decrypting…' : <><Download size={14} /> Decrypt & Download</>}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
