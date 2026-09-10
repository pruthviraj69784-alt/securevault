import { useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import {
  X, Share2, Globe, Users, Search, Shield, Calendar, Download,
  Link2, CheckCircle2, Copy, ExternalLink, QrCode, Clock,
  Fingerprint, Sparkles, AlertTriangle, ArrowRight, ArrowLeft,
  Eye, FileText, Check, ShieldCheck
} from 'lucide-react'
import QRShareModal from './QRShareModal'
import api, { dpdpApi } from '../services/api'
import { processAndSaveDownload } from '../utils/downloadHelper'

export default function ShareModal({ file, onClose }) {
  const qc = useQueryClient()
  
  // Step state: 'redact' (Step 1) | 'channels' (Step 2)
  const [step, setStep] = useState('redact')
  
  // Sharing channel mode (inside Step 2): 'internal' | 'external' | 'qr'
  const [mode, setMode] = useState('internal')
  const searchTimeoutRef = useRef(null)

  const isProcessing = file?.versions?.[file?.versions?.length - 1]?.status === 'PROCESSING'

  // Redaction settings
  const hasDetectedPII = Boolean(file?.hasSensitiveData || (file?.sensitiveTypes && file.sensitiveTypes.length > 0))
  const [autoMask, setAutoMask] = useState(true)
  const [showPreviewSnippet, setShowPreviewSnippet] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [customScanFindings, setCustomScanFindings] = useState(null)
  const [downloadingMasked, setDownloadingMasked] = useState(false)
  const [downloadingOriginal, setDownloadingOriginal] = useState(false)

  // Internal share state
  const [recipientEmail, setRecipientEmail] = useState('')
  const [permission, setPermission] = useState('DOWNLOADER')
  const [message, setMessage] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [maxDownloads, setMaxDownloads] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)

  // External share state
  const [generatedLink, setGeneratedLink] = useState('')
  const [password, setPassword] = useState('')
  const [expiresInHours, setExpiresInHours] = useState('24')

  const searchUsers = useCallback(async (query) => {
    if (!query || query.length < 2) { setSearchResults([]); return }
    setSearching(true)
    try {
      const res = await api.get(`/shares/internal/search-users?q=${encodeURIComponent(query)}`)
      setSearchResults(res.data.data || [])
    } catch {
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }, [])

  const handleInputChange = (val) => {
    setRecipientEmail(val)
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    searchTimeoutRef.current = setTimeout(() => {
      searchUsers(val)
    }, 300)
  }

  // Live AI PII scan triggered by "Re-Check PII" button
  const handleRunScan = async () => {
    setScanning(true)
    try {
      const fileId = file?.id || file?._id
      const res = await api.get(`/files/${fileId}/scan-pii`)
      const data = res.data?.data
      if (data) {
        setCustomScanFindings({
          hasPII: data.hasPII,
          types: data.types || [],
          findingsCount: data.findingsCount || 0,
          maskedAadhaar: data.maskedAadhaar || null,
          documentType: data.documentType || null,
          summary: data.summary || null,
          source: data.source || 'live-scan'
        })
        const sourceLabel = data.source === 'gpt4o-vision' ? '🤖 GPT-4o Vision'
          : data.source === 'tesseract-ocr' ? '🔍 Tesseract OCR'
          : data.source === 'ai+regex' ? '🤖 AI + Regex'
          : '🔍 Regex Engine'
        if (data.hasPII) {
          toast.success(`${sourceLabel}: ${data.findingsCount || data.types?.length || 0} PII pattern(s) detected${data.documentType ? ` in ${data.documentType.replace(/_/g,' ')}` : ''}.`)
        } else {
          toast.success(`${sourceLabel}: No PII detected — file is clean.`)
        }
      }
    } catch (err) {
      toast.error('PII scan failed: ' + (err.response?.data?.message || err.message))
    } finally {
      setScanning(false)
    }
  }

  const handleDownloadMaskedPreview = async () => {
    setDownloadingMasked(true)
    try {
      const fileId = file?._id || file?.id
      const res = await api.get(`/files/download/${fileId}?masked=true`, { responseType: 'blob' })
      await processAndSaveDownload(res, `MASKED_${file?.originalName || 'file'}`)
      toast.success('Masked file downloaded! Check the blacked-out sensitive fields.')
    } catch (err) {
      toast.error('Failed to download masked copy: ' + (err.response?.data?.message || err.message))
    } finally {
      setDownloadingMasked(false)
    }
  }

  const handleDownloadOriginal = async () => {
    setDownloadingOriginal(true)
    try {
      const fileId = file?._id || file?.id
      const res = await api.get(`/files/download/${fileId}?masked=false`, { responseType: 'blob' })
      await processAndSaveDownload(res, `ORIGINAL_${file?.originalName || 'file'}`)
      toast.success('Original unmasked file downloaded!')
    } catch (err) {
      toast.error('Failed to download original: ' + (err.response?.data?.message || err.message))
    } finally {
      setDownloadingOriginal(false)
    }
  }

  // Mutations
  const internalShareMutation = useMutation({
    mutationFn: data => api.post('/shares/internal', data),
    onSuccess: () => {
      toast.success(`File shared with ${recipientEmail}! (Masked copy delivered)`)
      qc.invalidateQueries(['shares-sent'])
      qc.invalidateQueries(['shares-by-me'])
      onClose()
    },
    onError: err => toast.error(err.response?.data?.message || 'Internal share failed.')
  })

  const externalShareMutation = useMutation({
    mutationFn: data => api.post('/shares', data),
    onSuccess: res => {
      const token = res.data.data?.token || res.data.token
      const link = `${window.location.origin}/share/${token}`
      setGeneratedLink(link)
      toast.success('Masked external share link generated!')
      qc.invalidateQueries(['shares-by-me'])
    },
    onError: err => toast.error(err.response?.data?.message || 'External share failed.')
  })

  const handleInternalShare = () => {
    if (isProcessing) return toast.warn('Please wait until file processing and security scan completes.')
    if (!recipientEmail.trim()) return toast.error('Please enter recipient email.')
    const fileId = file?._id || file?.id
    internalShareMutation.mutate({
      fileId,
      recipientEmail: recipientEmail.trim(),
      permission,
      message,
      expiresAt: expiresAt || null,
      maxDownloads: maxDownloads ? parseInt(maxDownloads, 10) : null,
      autoMask,
      isRedacted: autoMask
    })
  }

  const handleExternalShare = () => {
    if (isProcessing) return toast.warn('Please wait until file processing and security scan completes.')
    let calculatedHours = parseInt(expiresInHours, 10) || 24
    if (expiresAt) {
      const selectedDate = new Date(expiresAt)
      selectedDate.setHours(23, 59, 59, 999)
      const diffMs = selectedDate.getTime() - Date.now()
      calculatedHours = Math.max(1, Math.ceil(diffMs / 3_600_000))
    }
    const fileId = file?._id || file?.id
    externalShareMutation.mutate({
      fileId,
      expiresInHours: calculatedHours,
      password: password || undefined,
      maxDownloads: maxDownloads ? parseInt(maxDownloads, 10) : null,
      autoMask,
      isRedacted: autoMask
    })
  }

  const copyLink = () => {
    navigator.clipboard.writeText(generatedLink)
    toast.success('Masked share link copied to clipboard!')
  }

  // Display findings — prefer live scan result over stored metadata
  const activeFindings = customScanFindings || {
    hasPII: hasDetectedPII,
    types: file?.sensitiveTypes?.length ? file.sensitiveTypes : (hasDetectedPII ? ['AADHAAR'] : []),
    maskedAadhaar: file?.maskedAadhaar || null,
    findingsCount: null,
    source: 'metadata'
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed', inset: 0, zIndex: 50,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '1rem', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)'
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 16 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          className="card"
          style={{
            width: '100%', maxWidth: '34rem', maxHeight: '90vh',
            boxShadow: '0 24px 60px rgba(0,0,0,0.4)', padding: '1.75rem',
            display: 'flex', flexDirection: 'column', overflowY: 'auto'
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', paddingBottom: '0.85rem', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div style={{ width: '2.25rem', height: '2.25rem', borderRadius: '0.65rem', background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Share2 size={16} />
              </div>
              <div>
                <h2 style={{ fontWeight: 800, color: 'var(--text)', fontSize: '1rem', margin: 0 }}>
                  Share Document
                </h2>
                <p style={{ fontSize: '0.72rem', color: 'var(--muted)', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>
                  {file?.originalName}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="btn-icon"><X size={16} /></button>
          </div>

          {/* Stepper Indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <button
              onClick={() => setStep('redact')}
              style={{
                flex: 1, padding: '0.5rem 0.75rem', borderRadius: '0.5rem', border: 'none',
                background: step === 'redact' ? 'var(--accent)' : 'var(--bg)',
                color: step === 'redact' ? '#fff' : 'var(--muted)',
                fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                transition: 'all 0.2s ease'
              }}
            >
              <Fingerprint size={14} />
              1. AI Redaction & Masking
            </button>
            <div style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>➔</div>
            <button
              onClick={() => setStep('channels')}
              style={{
                flex: 1, padding: '0.5rem 0.75rem', borderRadius: '0.5rem', border: 'none',
                background: step === 'channels' ? 'var(--accent)' : 'var(--bg)',
                color: step === 'channels' ? '#fff' : 'var(--muted)',
                fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                transition: 'all 0.2s ease'
              }}
            >
              <Users size={14} />
              2. Share Channel & Delivery
            </button>
          </div>

          {/* Processing alert */}
          {isProcessing && (
            <div style={{
              marginBottom: '1rem', padding: '0.65rem 0.85rem', borderRadius: '0.5rem',
              background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)',
              display: 'flex', alignItems: 'center', gap: '0.6rem'
            }}>
              <Clock size={16} style={{ color: 'var(--warning)', flexShrink: 0 }} />
              <div style={{ fontSize: '0.74rem', color: 'var(--text)' }}>
                <span style={{ fontWeight: 700, color: 'var(--warning)' }}>Processing: </span>
                File is undergoing encryption and AI PII scanning. Sharing will be enabled once ready.
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* STEP 1: AI REDACTION & PII MASKING STEP                           */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          {step === 'redact' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{
                padding: '1rem', borderRadius: '0.75rem',
                background: 'color-mix(in srgb, var(--accent) 5%, var(--bg))',
                border: '1px solid color-mix(in srgb, var(--accent) 20%, transparent)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <ShieldCheck size={18} style={{ color: 'var(--accent)' }} />
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text)' }}>
                      DPDP Sensitive Data Redaction Step
                    </span>
                  </div>
                  <span className="badge badge-info" style={{ fontSize: '0.68rem' }}>
                    India DPDP Act 2023
                  </span>
                </div>
                <p style={{ fontSize: '0.74rem', color: 'var(--muted)', margin: 0 }}>
                  Before this file is transmitted over Internal, External Link, or QR channels, sensitive personal identifiers (Aadhaar, PAN, phone numbers) are masked to prevent unauthorized data leaks.
                </p>
              </div>

              {/* Detected PII card */}
              <div style={{
                padding: '0.9rem', borderRadius: '0.65rem',
                background: activeFindings.hasPII ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)',
                border: `1px solid ${activeFindings.hasPII ? 'rgba(239, 68, 68, 0.25)' : 'rgba(16, 185, 129, 0.25)'}`,
                display: 'flex', flexDirection: 'column', gap: '0.6rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {activeFindings.hasPII ? (
                      <AlertTriangle size={18} style={{ color: 'var(--danger)' }} />
                    ) : (
                      <CheckCircle2 size={18} style={{ color: 'var(--success)' }} />
                    )}
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text)' }}>
                      {activeFindings.hasPII
                        ? `Sensitive Data Detected${activeFindings.findingsCount != null ? ` (${activeFindings.findingsCount} matches)` : ''}`
                        : ['gpt4o-vision','tesseract-ocr','ai+regex','regex'].includes(activeFindings.source)
                          ? 'No PII Found — AI Scan Confirmed Clean'
                          : 'No High-Risk PII Detected on Initial Scan'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    {activeFindings.source && (
                      <span style={{
                        fontSize: '0.62rem', padding: '0.15rem 0.45rem', borderRadius: '0.3rem', fontWeight: 700,
                        background: activeFindings.source === 'gpt4o-vision' ? 'rgba(139,92,246,0.15)'
                          : activeFindings.source === 'tesseract-ocr' ? 'rgba(59,130,246,0.12)'
                          : activeFindings.source === 'ai+regex' ? 'rgba(16,185,129,0.12)'
                          : 'rgba(99,102,241,0.12)',
                        color: activeFindings.source === 'gpt4o-vision' ? '#8b5cf6'
                          : activeFindings.source === 'tesseract-ocr' ? '#3b82f6'
                          : activeFindings.source === 'ai+regex' ? 'var(--success)'
                          : 'var(--accent)'
                      }}>
                        {activeFindings.source === 'gpt4o-vision' ? '🤖 GPT-4o Vision'
                          : activeFindings.source === 'tesseract-ocr' ? '🔍 Tesseract OCR'
                          : activeFindings.source === 'ai+regex' ? '🤖 AI + Regex'
                          : activeFindings.source === 'regex' ? '🔍 Regex Engine'
                          : '📋 Metadata'}
                      </span>
                    )}
                    <button
                      onClick={handleRunScan}
                      disabled={scanning}
                      className="btn-secondary"
                      style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                    >
                      <Sparkles size={12} /> {scanning ? 'Scanning…' : 'Re-Check PII'}
                    </button>
                  </div>
                </div>

                {activeFindings.hasPII && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.2rem' }}>
                    {activeFindings.documentType && (
                      <span style={{
                        fontSize: '0.68rem', padding: '0.15rem 0.45rem', borderRadius: '0.3rem', fontWeight: 700,
                        background: 'rgba(139,92,246,0.12)', color: '#8b5cf6'
                      }}>
                        📄 {activeFindings.documentType.replace(/_/g, ' ')}
                      </span>
                    )}
                    {activeFindings.types.map((t, idx) => (
                      <span key={idx} className="badge badge-danger" style={{ fontSize: '0.68rem', fontWeight: 700 }}>
                        {t}
                      </span>
                    ))}
                    {activeFindings.maskedAadhaar && (
                      <span className="badge badge-warning" style={{ fontSize: '0.68rem', fontWeight: 700 }}>
                        Aadhaar Mask: {activeFindings.maskedAadhaar}
                      </span>
                    )}
                  </div>
                )}
                {activeFindings.summary && (
                  <p style={{ fontSize: '0.7rem', color: 'var(--muted)', margin: '0.3rem 0 0', fontStyle: 'italic' }}>
                    {activeFindings.summary}
                  </p>
                )}
              </div>

              {/* Masking Mode Selection: Masked vs Unmasked */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text)' }}>
                  Delivery Redaction Policy:
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                  {/* Option 1: Masked Mode */}
                  <div
                    onClick={() => setAutoMask(true)}
                    style={{
                      padding: '0.85rem', borderRadius: '0.65rem', cursor: 'pointer',
                      border: `2px solid ${autoMask ? 'var(--accent)' : 'var(--border)'}`,
                      background: autoMask ? 'rgba(99, 102, 241, 0.08)' : 'var(--bg)',
                      transition: 'all 0.2s ease', display: 'flex', flexDirection: 'column', gap: '0.35rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 800, color: autoMask ? 'var(--accent)' : 'var(--text)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        🛡️ Mask Data
                      </span>
                      {autoMask && (
                        <span style={{ fontSize: '0.6rem', padding: '0.1rem 0.4rem', borderRadius: '0.25rem', background: 'var(--accent)', color: '#fff', fontWeight: 700 }}>
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--muted)', lineHeight: 1.3 }}>
                      Blacks out PAN, Aadhaar & credentials. Safe for external sharing.
                    </span>
                  </div>

                  {/* Option 2: Non-Masked Mode */}
                  <div
                    onClick={() => setAutoMask(false)}
                    style={{
                      padding: '0.85rem', borderRadius: '0.65rem', cursor: 'pointer',
                      border: `2px solid ${!autoMask ? 'var(--warning)' : 'var(--border)'}`,
                      background: !autoMask ? 'rgba(245, 158, 11, 0.08)' : 'var(--bg)',
                      transition: 'all 0.2s ease', display: 'flex', flexDirection: 'column', gap: '0.35rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 800, color: !autoMask ? 'var(--warning)' : 'var(--text)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        🔓 Do Not Mask
                      </span>
                      {!autoMask && (
                        <span style={{ fontSize: '0.6rem', padding: '0.1rem 0.4rem', borderRadius: '0.25rem', background: 'var(--warning)', color: '#000', fontWeight: 700 }}>
                          RAW
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--muted)', lineHeight: 1.3 }}>
                      Delivers original unmasked file with all sensitive details visible.
                    </span>
                  </div>
                </div>
              </div>

              {/* Redacted Preview Accordion */}
              <div>
                <button
                  onClick={() => setShowPreviewSnippet(!showPreviewSnippet)}
                  style={{
                    background: 'none', border: 'none', color: 'var(--accent)',
                    fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.2rem 0'
                  }}
                >
                  <Eye size={13} />
                  {showPreviewSnippet ? 'Hide Delivery Simulation' : 'Show Delivery Simulation'}
                </button>

                {showPreviewSnippet && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    style={{
                      marginTop: '0.5rem', padding: '0.75rem', borderRadius: '0.5rem',
                      background: 'var(--card)', border: '1px dashed var(--border)',
                      fontSize: '0.72rem', color: 'var(--muted)', lineHeight: 1.5
                    }}
                  >
                    <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: '0.3rem' }}>
                      Delivery Simulation ({autoMask ? 'Masked' : 'Unmasked'}):
                    </div>
                    <div style={{ background: 'var(--bg)', padding: '0.5rem', borderRadius: '4px', fontFamily: 'monospace', color: 'var(--text)' }}>
                      [DPDP POLICY — SecureVault]<br />
                      Mode: {autoMask ? '🛡️ SENSITIVE IDENTIFIERS MASKED ON DELIVERY' : '🔓 RAW UNMASKED FILE SERVED'}<br />
                      Status: {activeFindings.hasPII ? `Sensitive Identifiers (${activeFindings.types?.join(', ') || 'PII'}) Detected` : 'No PII Detected'}.<br />
                      {activeFindings.maskedAadhaar && <>Aadhaar: {activeFindings.maskedAadhaar}<br /></>}
                      Lawful Basis: EXPLICIT_CONSENT
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Dual Test Download Buttons: Masked vs Original Before Masking */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <span style={{ fontSize: '0.73rem', fontWeight: 700, color: 'var(--muted)' }}>
                  Download & Verify Copies:
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={handleDownloadMaskedPreview}
                    disabled={downloadingMasked || downloadingOriginal}
                    className="btn-secondary"
                    style={{
                      padding: '0.65rem 0.5rem',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                      fontSize: '0.75rem', fontWeight: 700,
                      border: '1px solid rgba(99, 102, 241, 0.35)',
                      background: 'rgba(99, 102, 241, 0.08)',
                      color: 'var(--accent)'
                    }}
                  >
                    <Shield size={14} />
                    {downloadingMasked ? 'Downloading…' : '⬇️ Download Masked'}
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadOriginal}
                    disabled={downloadingMasked || downloadingOriginal}
                    className="btn-secondary"
                    style={{
                      padding: '0.65rem 0.5rem',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                      fontSize: '0.75rem', fontWeight: 700,
                      border: '1px solid var(--border)',
                      background: 'var(--bg)',
                      color: 'var(--text)'
                    }}
                  >
                    <Download size={14} />
                    {downloadingOriginal ? 'Downloading…' : '⬇️ Download Original'}
                  </button>
                </div>
              </div>

              {/* Next button */}
              <button
                onClick={() => setStep('channels')}
                className="btn-primary"
                style={{
                  marginTop: '0.5rem', width: '100%', padding: '0.75rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  fontSize: '0.85rem'
                }}
              >
                Proceed to Share (Internal / External / QR) <ArrowRight size={16} />
              </button>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* STEP 2: CHOOSE DELIVERY CHANNEL & COMPLETE SHARE                  */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          {step === 'channels' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Active Redaction Banner */}
              <div style={{
                padding: '0.55rem 0.8rem', borderRadius: '0.5rem',
                background: autoMask ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                border: `1px solid ${autoMask ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <ShieldCheck size={15} style={{ color: autoMask ? 'var(--success)' : 'var(--danger)' }} />
                  <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text)' }}>
                    {autoMask
                      ? 'AI Auto-Masking: ACTIVE (Sanitized copy will be shared)'
                      : 'AI Auto-Masking: INACTIVE (Raw copy will be shared)'}
                  </span>
                </div>
                <button
                  onClick={() => setStep('redact')}
                  style={{
                    background: 'none', border: 'none', color: 'var(--accent)',
                    fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline'
                  }}
                >
                  Edit Redaction
                </button>
              </div>

              {/* Mode Tabs */}
              <div style={{ display: 'flex', borderRadius: '0.65rem', border: '1px solid var(--border)', overflow: 'hidden' }}>
                {[
                  { id: 'internal', label: 'Internal Share', icon: Users },
                  { id: 'external', label: 'External Link', icon: Globe },
                  { id: 'qr',       label: 'QR Code Share', icon: QrCode },
                ].map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setMode(id)}
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                      padding: '0.55rem', border: 'none', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700,
                      transition: 'all 0.2s', fontFamily: 'inherit',
                      background: mode === id ? 'linear-gradient(135deg, var(--accent), var(--accent-hover))' : 'transparent',
                      color: mode === id ? '#fff' : 'var(--muted)',
                    }}
                  >
                    <Icon size={14} /> {label}
                  </button>
                ))}
              </div>

              {/* ── Sub-mode 1: QR Share ── */}
              {mode === 'qr' && (
                <QRShareModal file={file} onClose={onClose} inline autoMask={autoMask} />
              )}

              {/* ── Sub-mode 2: Internal Share Form ── */}
              {mode === 'internal' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <div style={{ position: 'relative' }}>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.35rem' }}>
                      Recipient User (Email or Name)
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Search size={14} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
                      <input
                        type="text"
                        value={recipientEmail}
                        onChange={e => handleInputChange(e.target.value)}
                        placeholder="Search user by email or name…"
                        className="input-field"
                        style={{ paddingLeft: '2.5rem', width: '100%' }}
                      />
                    </div>
                    {searchResults.length > 0 && (
                      <div className="card" style={{ position: 'absolute', zIndex: 10, width: '100%', marginTop: '0.25rem', padding: '0.35rem', boxShadow: '0 12px 30px rgba(0,0,0,0.25)' }}>
                        {searchResults.map(u => (
                          <button
                            key={u._id || u.id}
                            onClick={() => { setRecipientEmail(u.email); setSearchResults([]) }}
                            style={{
                              width: '100%', textAlign: 'left', padding: '0.5rem 0.75rem', borderRadius: '0.5rem',
                              background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.65rem',
                              transition: 'background 0.15s', color: 'var(--text)'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-soft)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            <div style={{ width: '1.75rem', height: '1.75rem', borderRadius: '50%', background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 800 }}>
                              {u.name?.[0] || u.email[0]}
                            </div>
                            <div>
                              <p style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text)', margin: 0 }}>{u.name}</p>
                              <p style={{ fontSize: '0.7rem', color: 'var(--muted)', margin: 0 }}>{u.email}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.35rem' }}>
                      Permission
                    </label>
                    <select
                      value={permission}
                      onChange={e => setPermission(e.target.value)}
                      className="input-field"
                      style={{ width: '100%' }}
                    >
                      <option value="DOWNLOADER">Downloader (Can view and download masked file)</option>
                      <option value="VIEWER">Viewer (View masked copy only)</option>
                    </select>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.35rem' }}>
                        Expiration (Optional)
                      </label>
                      <input
                        type="date"
                        value={expiresAt}
                        onChange={e => setExpiresAt(e.target.value)}
                        className="input-field"
                        style={{ width: '100%' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.35rem' }}>
                        Max Downloads
                      </label>
                      <input
                        type="number"
                        min="1"
                        placeholder="Unlimited"
                        value={maxDownloads}
                        onChange={e => setMaxDownloads(e.target.value)}
                        className="input-field"
                        style={{ width: '100%' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.35rem' }}>
                      Message to Recipient
                    </label>
                    <input
                      type="text"
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                      placeholder="Optional note or context…"
                      className="input-field"
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => setStep('redact')}
                      className="btn-secondary"
                      style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem' }}
                    >
                      <ArrowLeft size={14} /> Back
                    </button>
                    <button
                      type="button"
                      onClick={handleInternalShare}
                      disabled={internalShareMutation.isPending || isProcessing}
                      className="btn-primary"
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.82rem' }}
                    >
                      {internalShareMutation.isPending ? 'Sharing…' : 'Share Redacted File with User'}
                    </button>
                  </div>
                </div>
              )}

              {/* ── Sub-mode 3: External Share Form ── */}
              {mode === 'external' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.35rem' }}>
                        Expiration Time
                      </label>
                      <select
                        value={expiresInHours}
                        onChange={e => setExpiresInHours(e.target.value)}
                        className="input-field"
                        style={{ width: '100%' }}
                      >
                        <option value="1">1 Hour</option>
                        <option value="6">6 Hours</option>
                        <option value="24">24 Hours (1 Day)</option>
                        <option value="72">72 Hours (3 Days)</option>
                        <option value="168">7 Days</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.35rem' }}>
                        Max Downloads
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={maxDownloads}
                        onChange={e => setMaxDownloads(e.target.value)}
                        placeholder="1 (One-time link)"
                        className="input-field"
                        style={{ width: '100%' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.35rem' }}>
                      Password Protection (Optional)
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Require password to download…"
                      className="input-field"
                      style={{ width: '100%' }}
                    />
                  </div>

                  {/* Generated Link Display */}
                  {generatedLink ? (
                    <div style={{
                      padding: '0.85rem', borderRadius: '0.65rem',
                      background: 'var(--bg)', border: '1px solid var(--accent)',
                      display: 'flex', flexDirection: 'column', gap: '0.6rem'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--accent)' }}>
                          ✓ Masked Public Link Ready
                        </span>
                        <a
                          href={generatedLink}
                          target="_blank"
                          rel="noreferrer"
                          style={{ fontSize: '0.7rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                        >
                          Test Link <ExternalLink size={11} />
                        </a>
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <input
                          type="text"
                          readOnly
                          value={generatedLink}
                          className="input-field"
                          style={{ fontSize: '0.75rem', flex: 1 }}
                        />
                        <button
                          onClick={copyLink}
                          className="btn-primary"
                          style={{ padding: '0 0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem' }}
                        >
                          <Copy size={13} /> Copy
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                      <button
                        type="button"
                        onClick={() => setStep('redact')}
                        className="btn-secondary"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem' }}
                      >
                        <ArrowLeft size={14} /> Back
                      </button>
                      <button
                        type="button"
                        onClick={handleExternalShare}
                        disabled={externalShareMutation.isPending || isProcessing}
                        className="btn-primary"
                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.82rem' }}
                      >
                        {externalShareMutation.isPending ? 'Generating…' : 'Generate Redacted Share Link'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
