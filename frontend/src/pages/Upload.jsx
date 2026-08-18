import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'react-toastify'
import { Upload as UploadIcon, Lock, ShieldCheck, ScanLine, CloudUpload, CheckCircle2, LoaderCircle, Shield } from 'lucide-react'
import Dropzone from '../components/Dropzone'
import ProgressBar from '../components/ProgressBar'
import { fileApi } from '../services/api'
import { encryptFile, sha256Hex } from '../hooks/useCrypto'
import { useAuth } from '../context/AuthContext'

export default function Upload() {
  const { zkPassphrase } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [file, setFile]       = useState(null)
  const [useZK, setUseZK]     = useState(false)
  const [passphrase, setPass] = useState(zkPassphrase || '')
  const [progress, setProgress] = useState(0)
  const [status, setStatus]   = useState('idle')
  const [stage, setStage]     = useState('idle')

  const stages = [
    { id: 'scan',    label: 'Security Scanning',     detail: 'Validating upload before vault entry',                     icon: ScanLine },
    { id: 'encrypt', label: 'Encrypting File',        detail: useZK ? 'Browser-side zero-knowledge encryption' : 'AES-256 server encryption', icon: Lock },
    { id: 'upload',  label: 'Uploading Securely',     detail: 'Transmitting over protected connection',                  icon: CloudUpload },
    { id: 'queue',   label: 'Processing Queue',       detail: 'Hashing, scanning, and storing in vault',                 icon: LoaderCircle },
    { id: 'verify',  label: 'Integrity Verified',     detail: 'File is ready in SecureVault',                            icon: CheckCircle2 },
  ]

  const waitForProcessing = async (fileId) => {
    for (let attempt = 0; attempt < 30; attempt++) {
      const files = (await fileApi.myFiles()).data.data || []
      const uploaded = files.find(item => item._id === fileId || item.id === fileId)
      const latest = uploaded?.versions?.[uploaded.versions.length - 1]
      if (latest?.status === 'READY') return
      if (latest?.status === 'FAILED' || latest?.status === 'INFECTED') throw new Error(`Processing ended with status ${latest.status}`)
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    throw new Error('File is still processing. Check My Files shortly.')
  }

  const handleUpload = async () => {
    if (!file) return toast.warn('Please select a file first.')
    if (useZK && !passphrase) return toast.warn('Enter your ZK passphrase.')
    setStatus('uploading'); setStage('scan'); setProgress(5)
    const form = new FormData()
    try {
      setStage('encrypt')
      if (useZK) {
        const { encryptedBlob, ivHex } = await encryptFile(file, passphrase)
        const arrayBuf = await encryptedBlob.arrayBuffer()
        const encFile = new File([encryptedBlob], file.name, { type: 'application/octet-stream' })
        form.append('file', encFile); form.set('iv', ivHex)
        form.set('hash', await sha256Hex(arrayBuf)); form.set('isZeroKnowledge', 'true'); form.set('clientEncrypted', 'true')
      } else { form.append('file', file) }
      setStage('upload')
      const response = await fileApi.upload(form, val => setProgress(15 + Math.round(val * 0.65)))
      const uploadedId = response.data.data?._id
      setStage('queue'); setProgress(85)
      if (uploadedId) await waitForProcessing(uploadedId)
      setStage('verify'); setProgress(100); setStatus('success')
      toast.success('File encrypted, verified, and stored securely!')
      qc.invalidateQueries(['my-files'])
      setTimeout(() => navigate('/files'), 1500)
    } catch (err) {
      setStatus('error')
      toast.error(err.response?.data?.message || err.message || 'Upload failed.')
    }
  }

  const resetFile = nextFile => { setFile(nextFile); setStatus('idle'); setStage('idle'); setProgress(0) }
  const currentIndex = stages.findIndex(item => item.id === stage)

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <span className="page-tag"><Shield size={11} /> Secure Ingestion</span>
        <h1 className="page-title">Upload a File</h1>
        <p className="page-sub">Every upload is scanned, encrypted, queued, stored, and integrity-verified.</p>
      </div>

      <Dropzone file={file} setFile={resetFile} />

      {/* ZK Toggle */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
            <div style={{
              width: '2.75rem', height: '2.75rem', borderRadius: '0.75rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: useZK ? 'var(--success-soft)' : 'color-mix(in srgb, var(--border) 60%, transparent)',
              border: `1px solid ${useZK ? 'color-mix(in srgb, var(--success) 30%, transparent)' : 'var(--border)'}`,
              transition: 'all 0.25s',
            }}>
              {useZK ? <ShieldCheck size={19} style={{ color: 'var(--success)' }} /> : <Lock size={19} style={{ color: 'var(--muted)' }} />}
            </div>
            <div>
              <p style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)' }}>Zero-Knowledge Encryption</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Encrypt in your browser before upload — server never sees plaintext.</p>
            </div>
          </div>
          <motion.button
            role="switch" aria-checked={useZK}
            onClick={() => setUseZK(v => !v)}
            style={{
              position: 'relative', width: '2.75rem', height: '1.5rem', borderRadius: '9999px',
              border: 'none', cursor: 'pointer', flexShrink: 0,
              background: useZK ? 'var(--success)' : 'var(--border)',
              transition: 'background 0.3s',
              boxShadow: useZK ? '0 0 12px var(--success-soft)' : 'none',
            }}
          >
            <motion.span
              style={{
                position: 'absolute', top: '0.18rem', left: '0.18rem',
                width: '1.125rem', height: '1.125rem', borderRadius: '50%',
                background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
              }}
              animate={{ x: useZK ? '1.25rem' : '0rem' }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          </motion.button>
        </div>

        <AnimatePresence>
          {useZK && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
              <div style={{ marginTop: '1.1rem', paddingTop: '1.1rem', borderTop: '1px solid var(--border)' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
                  ZK Passphrase
                </label>
                <input type="password" value={passphrase} onChange={e => setPass(e.target.value)}
                  placeholder="Enter your zero-knowledge passphrase" className="input-field" />
                <p style={{ marginTop: '0.5rem', fontSize: '0.72rem', color: 'var(--muted)' }}>
                  ⚠️ This passphrase never leaves your browser. You <strong>must retain it</strong> to decrypt this file.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Progress pipeline */}
      <AnimatePresence>
        {status === 'uploading' && (
          <motion.div className="card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <p style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)' }}>Protecting your file…</p>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent)' }}>{progress}%</span>
            </div>
            <ProgressBar progress={progress} height={6} />
            <div className="upload-pipeline" style={{ marginTop: '1.25rem' }}>
              {stages.map((item, idx) => {
                const isDone   = currentIndex > idx
                const isActive = currentIndex === idx
                const Icon = isDone ? CheckCircle2 : item.icon
                return (
                  <div key={item.id} className={`upload-stage${isActive ? ' active' : ''}${isDone ? ' done' : ''}`}>
                    <div className="upload-stage-icon">
                      <Icon size={15} className={isActive && item.id === 'queue' ? 'animate-spin' : ''} />
                    </div>
                    <div>
                      <p>{item.label}</p>
                      <span>{item.detail}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}
        {status === 'success' && (
          <motion.div className="card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', borderColor: 'color-mix(in srgb, var(--success) 35%, var(--border))', background: 'var(--success-soft)' }}>
            <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '50%', background: 'var(--success-soft)', border: '1px solid color-mix(in srgb, var(--success) 30%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <CheckCircle2 size={20} style={{ color: 'var(--success)' }} />
            </div>
            <div>
              <p style={{ fontWeight: 700, color: 'var(--success)', fontSize: '0.9rem' }}>Verified & stored securely!</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Opening your vault…</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={handleUpload}
        disabled={!file || status === 'uploading' || status === 'success'}
        className="btn-primary"
        style={{ width: '100%', justifyContent: 'center', padding: '0.9rem', fontSize: '0.95rem' }}
        whileHover={file ? { scale: 1.01, boxShadow: '0 8px 28px var(--accent-glow)' } : {}}
        whileTap={file ? { scale: 0.99 } : {}}
      >
        <UploadIcon size={18} />
        {status === 'uploading' ? 'Securing upload…' : 'Secure Upload'}
      </motion.button>
    </div>
  )
}
