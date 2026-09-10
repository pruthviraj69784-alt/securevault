import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Shield, ShieldCheck, FileText, AlertCircle, Eye, Trash2,
  Lock, CheckCircle2, Clock, XCircle, Search, Plus, RefreshCw,
  Sparkles, Fingerprint, Calendar, ArrowRight, X, Download, User, ShieldAlert
} from 'lucide-react'
import { toast } from 'react-toastify'
import { dpdpApi, fileApi } from '../services/api'

export default function ConsentManager() {
  const qc = useQueryClient()
  const [tab, setTab] = useState('consents') // 'consents' | 'scanner' | 'erasure'
  const [filterStatus, setFilterStatus] = useState('ALL')
  const [search, setSearch] = useState('')
  const [selectedConsent, setSelectedConsent] = useState(null)
  const [showNewModal, setShowNewModal] = useState(false)
  const [auditTrailConsent, setAuditTrailConsent] = useState(null)

  // Scanner state
  const [scanFile, setScanFile] = useState(null)
  const [scanResult, setScanResult] = useState(null)
  const [isScanning, setIsScanning] = useState(false)

  // Queries
  const { data: consents = [], isLoading, refetch } = useQuery({
    queryKey: ['dpdp-consents', filterStatus],
    queryFn: async () => {
      const status = filterStatus === 'ALL' ? null : filterStatus
      const res = await dpdpApi.consents(status)
      return res.data?.data || []
    }
  })

  const { data: myFiles = [] } = useQuery({
    queryKey: ['my-files'],
    queryFn: async () => {
      const res = await fileApi.myFiles()
      return res.data?.data || []
    }
  })

  // Consent Audit Trail Query
  const { data: auditTrailRecord, isLoading: loadingTrail } = useQuery({
    queryKey: ['consent-audit-trail', auditTrailConsent?.id],
    queryFn: async () => {
      if (!auditTrailConsent) return null
      const res = await dpdpApi.auditTrail(auditTrailConsent.id)
      return res.data?.data || null
    },
    enabled: !!auditTrailConsent
  })
  const auditTrail = auditTrailRecord?.accessLogs || []

  // Mutations
  const revokeMutation = useMutation({
    mutationFn: ({ id, reason }) => dpdpApi.revokeConsent(id, reason),
    onSuccess: () => {
      toast.success('Consent revoked! Right to Erasure / minimization initiated.')
      qc.invalidateQueries(['dpdp-consents'])
      setSelectedConsent(null)
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to revoke consent')
    }
  })

  const purgeMutation = useMutation({
    mutationFn: (id) => dpdpApi.purgeData(id),
    onSuccess: () => {
      toast.success('File permanently purged & crypto-shredded from vault!')
      qc.invalidateQueries(['dpdp-consents'])
      qc.invalidateQueries(['my-files'])
      setSelectedConsent(null)
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to purge file')
    }
  })

  // Scan file handler
  const handleRunScan = async () => {
    if (!scanFile) return toast.warn('Select a file to scan.')
    setIsScanning(true)
    const formData = new FormData()
    formData.append('file', scanFile)
    try {
      const res = await dpdpApi.preview(formData)
      setScanResult(res.data?.data)
      toast.success('DPDP PII scan completed!')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Scan failed')
    } finally {
      setIsScanning(false)
    }
  }

  // Filtered consents
  const filteredConsents = consents.filter(c => {
    const term = search.toLowerCase()
    const fileName = c.file?.originalName || ''
    const subject = c.dataSubjectName || ''
    const purpose = c.purpose || ''
    return fileName.toLowerCase().includes(term) ||
           subject.toLowerCase().includes(term) ||
           purpose.toLowerCase().includes(term)
  })

  // Computed stats
  const totalActive = consents.filter(c => c.status === 'GRANTED').length
  const totalRevoked = consents.filter(c => c.status === 'REVOKED').length
  const sensitiveFilesCount = myFiles.filter(f => f.hasSensitiveData).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <span className="page-tag" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
            <Shield size={12} /> DPDP Act 2023 Compliance
          </span>
          <h1 className="page-title" style={{ marginTop: '0.35rem' }}>Privacy & Consent Layer</h1>
          <p className="page-sub">
            Auto-detect sensitive identifiers, mask Aadhaar numbers, maintain auditable consent trails, and enforce data minimization.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={() => refetch()}
            className="btn btn-secondary"
            title="Refresh Consents"
          >
            <RefreshCw size={14} /> Refresh
          </button>
          <button
            onClick={() => setShowNewModal(true)}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Plus size={16} /> Register Consent
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 600 }}>Active Consents</span>
            <span style={{ padding: '0.3rem 0.6rem', borderRadius: '9999px', background: 'var(--success-soft)', color: 'var(--success)', fontSize: '0.75rem', fontWeight: 700 }}>
              COMPLIANT
            </span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text)', marginTop: '0.5rem' }}>{totalActive}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.25rem' }}>Lawfully retained under explicit consent</div>
        </div>

        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 600 }}>Sensitive Documents</span>
            <Fingerprint size={18} style={{ color: 'var(--accent)' }} />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent)', marginTop: '0.5rem' }}>{sensitiveFilesCount}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.25rem' }}>Aadhaar / PAN / ID identifiers detected</div>
        </div>

        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 600 }}>Revoked / Minimised</span>
            <XCircle size={18} style={{ color: 'var(--warning)' }} />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--warning)', marginTop: '0.5rem' }}>{totalRevoked}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.25rem' }}>Right to Erasure exercised</div>
        </div>
      </div>

      {/* Tabs Bar */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
        {[
          { id: 'consents', label: 'Consent Registry', icon: FileText, badge: consents.length },
          { id: 'scanner',  label: 'PII Redaction Scanner', icon: Fingerprint },
          { id: 'sensitive', label: 'Sensitive Vault Files', icon: ShieldCheck, badge: sensitiveFilesCount }
        ].map(({ id, label, icon: Icon, badge }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.6rem 1rem',
              borderRadius: '0.5rem',
              border: 'none',
              background: tab === id ? 'var(--accent-soft)' : 'transparent',
              color: tab === id ? 'var(--accent)' : 'var(--muted)',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <Icon size={16} />
            {label}
            {badge !== undefined && (
              <span style={{
                fontSize: '0.7rem',
                padding: '0.1rem 0.45rem',
                borderRadius: '9999px',
                background: tab === id ? 'var(--accent)' : 'var(--border)',
                color: tab === id ? '#fff' : 'var(--text)'
              }}>
                {badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* TAB 1: Consents Registry */}
      {tab === 'consents' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Filters & Search */}
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {['ALL', 'GRANTED', 'REVOKED', 'EXPIRED'].map(st => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  className={`btn ${filterStatus === st ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem' }}
                >
                  {st}
                </button>
              ))}
            </div>

            <div style={{ position: 'relative', width: '280px' }}>
              <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
              <input
                type="text"
                placeholder="Search file, subject or purpose..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="input"
                style={{ paddingLeft: '2.2rem', fontSize: '0.8rem', width: '100%' }}
              />
            </div>
          </div>

          {/* Consents Table */}
          {isLoading ? (
            <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted)' }}>
              Loading DPDP consent ledger...
            </div>
          ) : filteredConsents.length === 0 ? (
            <div className="card" style={{ padding: '3.5rem 1rem', textAlign: 'center' }}>
              <ShieldCheck size={40} style={{ color: 'var(--muted)', margin: '0 auto 1rem', opacity: 0.5 }} />
              <h3 style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text)' }}>No Consent Records Found</h3>
              <p style={{ color: 'var(--muted)', fontSize: '0.85rem', maxWidth: '450px', margin: '0.5rem auto 1.25rem' }}>
                Register explicit consent declarations for uploaded Aadhaar cards, IDs, and records to ensure full DPDP Act compliance.
              </p>
              <button onClick={() => setShowNewModal(true)} className="btn btn-primary">
                <Plus size={15} /> Register First Consent
              </button>
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th>Document</th>
                      <th>Data Principal</th>
                      <th>Purpose & Lawful Basis</th>
                      <th>Status</th>
                      <th>Expires In</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredConsents.map((c) => {
                      const isExpired = new Date(c.expiresAt) < new Date()
                      const daysLeft = Math.ceil((new Date(c.expiresAt) - new Date()) / (1000 * 60 * 60 * 24))
                      return (
                        <tr key={c.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                              <div style={{
                                width: '2rem', height: '2rem', borderRadius: '0.4rem',
                                background: c.file?.hasSensitiveData ? 'rgba(239, 68, 68, 0.12)' : 'var(--accent-soft)',
                                color: c.file?.hasSensitiveData ? 'var(--danger)' : 'var(--accent)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                              }}>
                                <FileText size={15} />
                              </div>
                              <div>
                                <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text)' }}>
                                  {c.file?.originalName || 'Linked File'}
                                </div>
                                {c.file?.hasSensitiveData && (
                                  <div style={{ display: 'flex', gap: '0.3rem', marginTop: '0.2rem' }}>
                                    {(c.file.sensitiveTypes || ['PII']).map(t => (
                                      <span key={t} style={{
                                        fontSize: '0.62rem',
                                        padding: '0.1rem 0.35rem',
                                        borderRadius: '0.25rem',
                                        background: 'rgba(239, 68, 68, 0.15)',
                                        color: 'var(--danger)',
                                        fontWeight: 700
                                      }}>
                                        {t}
                                      </span>
                                    ))}
                                    {c.file.maskedAadhaar && (
                                      <span style={{ fontSize: '0.62rem', color: 'var(--muted)', fontFamily: 'monospace' }}>
                                        {c.file.maskedAadhaar}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          <td>
                            <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{c.dataSubjectName}</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>
                              {c.dataSubjectEmail || c.dataSubjectPhone || 'Direct Subject'}
                            </div>
                          </td>

                          <td>
                            <div style={{ fontSize: '0.82rem', color: 'var(--text)' }}>{c.purpose}</div>
                            <span style={{
                              fontSize: '0.65rem',
                              padding: '0.15rem 0.4rem',
                              borderRadius: '9999px',
                              background: 'var(--accent-soft)',
                              color: 'var(--accent)',
                              fontWeight: 700
                            }}>
                              {c.lawfulBasis}
                            </span>
                          </td>

                          <td>
                            <span className={`badge ${
                              c.status === 'GRANTED' ? 'badge-success' :
                              c.status === 'REVOKED' ? 'badge-danger' : 'badge-warning'
                            }`}>
                              {c.status}
                            </span>
                          </td>

                          <td>
                            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: daysLeft <= 7 ? 'var(--danger)' : 'var(--text)' }}>
                              {daysLeft > 0 ? `${daysLeft} days left` : 'Expired'}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>
                              {new Date(c.expiresAt).toLocaleDateString()}
                            </div>
                          </td>

                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                              <button
                                onClick={() => setAuditTrailConsent(c)}
                                className="btn btn-secondary"
                                style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                                title="View DPDP Access Trail"
                              >
                                <Eye size={12} /> Audit Trail
                              </button>

                              {c.status === 'GRANTED' && (
                                <button
                                  onClick={() => {
                                    const reason = prompt('Reason for consent revocation (Data Principal Right to Erasure):', 'Data Principal requested consent revocation.')
                                    if (reason !== null) {
                                      revokeMutation.mutate({ id: c.id, reason })
                                    }
                                  }}
                                  className="btn btn-danger"
                                  style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem' }}
                                  title="Revoke Consent"
                                >
                                  Revoke
                                </button>
                              )}

                              {c.status === 'REVOKED' && (
                                <button
                                  onClick={() => {
                                    if (confirm('Permanently purge this document and all encrypted S3 backups? This cannot be undone.')) {
                                      purgeMutation.mutate(c.id)
                                    }
                                  }}
                                  className="btn btn-danger"
                                  style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                                  title="Execute Right to Erasure"
                                >
                                  <Trash2 size={12} /> Purge
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PII Redaction Playground Scanner */}
      {tab === 'scanner' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {/* Upload card */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <span className="page-tag" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                PS2 Engine
              </span>
              <h3 style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text)', marginTop: '0.3rem' }}>
                Document Redaction & PII Scanner
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '0.25rem' }}>
                Test document ingestion. Detects Indian Aadhaar, PAN, phone numbers, and passport IDs, generating legally compliant masked outputs.
              </p>
            </div>

            <div
              style={{
                border: '2px dashed var(--border)',
                borderRadius: '0.75rem',
                padding: '2rem 1rem',
                textAlign: 'center',
                cursor: 'pointer',
                background: 'var(--bg)'
              }}
              onClick={() => document.getElementById('pii-file-input').click()}
            >
              <Fingerprint size={36} style={{ color: 'var(--accent)', margin: '0 auto 0.75rem' }} />
              <p style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text)' }}>
                {scanFile ? scanFile.name : 'Click to select an ID card or document'}
              </p>
              <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.2rem' }}>
                Supports PDF, PNG, JPG, JPEG, TXT
              </p>
              <input
                id="pii-file-input"
                type="file"
                style={{ display: 'none' }}
                onChange={e => {
                  if (e.target.files?.[0]) setScanFile(e.target.files[0])
                }}
              />
            </div>

            <button
              onClick={handleRunScan}
              disabled={!scanFile || isScanning}
              className="btn btn-primary"
              style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
            >
              {isScanning ? (
                <>Scanning Document...</>
              ) : (
                <>
                  <Sparkles size={16} /> Scan & Detect PII
                </>
              )}
            </button>
          </div>

          {/* Results card */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text)' }}>
              Scan Analysis Results
            </h3>

            {!scanResult ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 1rem', color: 'var(--muted)' }}>
                <Shield size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                <p style={{ fontSize: '0.85rem' }}>Upload and run a scan to see PII breakdown and redaction preview.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{
                  padding: '1rem',
                  borderRadius: '0.5rem',
                  background: scanResult.hasPII ? 'rgba(239, 68, 68, 0.1)' : 'var(--success-soft)',
                  border: `1px solid ${scanResult.hasPII ? 'rgba(239, 68, 68, 0.3)' : 'var(--success)'}`
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: scanResult.hasPII ? 'var(--danger)' : 'var(--success)' }}>
                    {scanResult.hasPII ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
                    {scanResult.hasPII ? 'Sensitive Identifiers Detected' : 'No PII Detected (Clean)'}
                  </div>
                  <div style={{ fontSize: '0.8rem', marginTop: '0.3rem', color: 'var(--text)' }}>
                    {scanResult.hasPII
                      ? `Found ${scanResult.findings?.length || 0} sensitive token(s): ${scanResult.types?.join(', ')}`
                      : 'This document does not contain any detected government IDs or personal data.'}
                  </div>
                </div>

                {scanResult.maskedAadhaar && (
                  <div style={{ padding: '0.875rem', borderRadius: '0.5rem', background: 'var(--bg)', border: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                      Masked Aadhaar Output (DPDP Mandate)
                    </span>
                    <div style={{ fontSize: '1.25rem', fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent)', marginTop: '0.25rem' }}>
                      {scanResult.maskedAadhaar}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: '0.2rem' }}>
                      Only last 4 digits retained per UIDAI & DPDP compliance guidelines.
                    </div>
                  </div>
                )}

                {scanResult.findings && scanResult.findings.length > 0 && (
                  <div>
                    <h4 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.5rem' }}>Detected Findings:</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '220px', overflowY: 'auto' }}>
                      {scanResult.findings.map((f, idx) => (
                        <div key={idx} style={{
                          padding: '0.5rem 0.75rem',
                          borderRadius: '0.35rem',
                          background: 'var(--bg)',
                          border: '1px solid var(--border)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '0.78rem'
                        }}>
                          <div>
                            <span style={{ fontWeight: 700, color: 'var(--danger)', marginRight: '0.5rem' }}>[{f.type}]</span>
                            <span style={{ fontFamily: 'monospace', color: 'var(--muted)' }}>{f.value}</span>
                          </div>
                          <span style={{ color: 'var(--success)', fontWeight: 700 }}>
                            → {f.masked}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: Sensitive Files in Vault */}
      {tab === 'sensitive' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="card" style={{ padding: '1rem' }}>
            <h3 style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text)' }}>
              Documents with Detected PII in Your Vault
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '0.2rem' }}>
              These files were scanned during upload and found to contain sensitive identifiers. You must maintain active consent records for them.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
            {myFiles.filter(f => f.hasSensitiveData).map(f => (
              <div key={f.id || f._id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <div style={{
                    width: '2.5rem', height: '2.5rem', borderRadius: '0.5rem',
                    background: 'rgba(239, 68, 68, 0.12)', color: 'var(--danger)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <Fingerprint size={18} />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {f.originalName}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>
                      v{f.currentVersion || 1} · {f.sensitiveTypes?.join(', ')}
                    </div>
                  </div>
                </div>

                {f.maskedAadhaar && (
                  <div style={{ padding: '0.4rem 0.6rem', borderRadius: '0.4rem', background: 'var(--bg)', border: '1px solid var(--border)', fontSize: '0.75rem', fontFamily: 'monospace' }}>
                    Masked: {f.maskedAadhaar}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '0.5rem', borderTop: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>
                    Retention: {f.dpdpRetentionDays || 365} days
                  </span>
                  <button
                    onClick={() => {
                      setShowNewModal(true)
                    }}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.72rem', padding: '0.3rem 0.6rem' }}
                  >
                    + Register Consent
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: Register New Consent */}
      <AnimatePresence>
        {showNewModal && (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: '1rem'
          }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="card"
              style={{ width: '100%', maxWidth: '520px', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ShieldCheck size={20} style={{ color: 'var(--accent)' }} />
                  <h3 style={{ fontWeight: 700, fontSize: '1.1rem' }}>Register DPDP Consent</h3>
                </div>
                <button onClick={() => setShowNewModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}>
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={async (e) => {
                e.preventDefault()
                const fd = new FormData(e.target)
                const payload = {
                  fileId: fd.get('fileId'),
                  dataSubjectName: fd.get('dataSubjectName'),
                  dataSubjectEmail: fd.get('dataSubjectEmail'),
                  dataSubjectPhone: fd.get('dataSubjectPhone'),
                  purpose: fd.get('purpose'),
                  lawfulBasis: fd.get('lawfulBasis'),
                  retentionDays: Number(fd.get('retentionDays')) || 365
                }
                try {
                  await dpdpApi.createConsent(payload)
                  toast.success('Consent registered and logged to immutable audit ledger!')
                  qc.invalidateQueries(['dpdp-consents'])
                  setShowNewModal(false)
                } catch (err) {
                  toast.error(err.response?.data?.message || 'Failed to register consent')
                }
              }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: '0.3rem' }}>
                    SELECT VAULT DOCUMENT *
                  </label>
                  <select name="fileId" required className="input" style={{ width: '100%' }}>
                    <option value="">-- Choose a document --</option>
                    {myFiles.map(f => (
                      <option key={f.id || f._id} value={f.id || f._id}>
                        {f.originalName} {f.hasSensitiveData ? '⚠️ (Sensitive PII)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: '0.3rem' }}>
                    DATA PRINCIPAL NAME *
                  </label>
                  <input name="dataSubjectName" required placeholder="e.g. Ramesh Sharma" className="input" style={{ width: '100%' }} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: '0.3rem' }}>
                      EMAIL (OPTIONAL)
                    </label>
                    <input name="dataSubjectEmail" type="email" placeholder="ramesh@example.com" className="input" style={{ width: '100%' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: '0.3rem' }}>
                      PHONE (OPTIONAL)
                    </label>
                    <input name="dataSubjectPhone" placeholder="+91 98765 43210" className="input" style={{ width: '100%' }} />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: '0.3rem' }}>
                    SPECIFIED PURPOSE *
                  </label>
                  <input name="purpose" required placeholder="e.g. College Admission KYC, Patient Record Verification" className="input" style={{ width: '100%' }} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: '0.3rem' }}>
                      LAWFUL BASIS
                    </label>
                    <select name="lawfulBasis" className="input" style={{ width: '100%' }}>
                      <option value="EXPLICIT_CONSENT">EXPLICIT_CONSENT</option>
                      <option value="LEGAL_OBLIGATION">LEGAL_OBLIGATION</option>
                      <option value="CONTRACTUAL">CONTRACTUAL</option>
                      <option value="LEGITIMATE_USE">LEGITIMATE_USE</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: '0.3rem' }}>
                      RETENTION (DAYS)
                    </label>
                    <input name="retentionDays" type="number" defaultValue="365" className="input" style={{ width: '100%' }} />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button type="button" onClick={() => setShowNewModal(false)} className="btn btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Confirm & Save Consent
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: Rich DPDP Audit Trail Timeline Drawer */}
      <AnimatePresence>
        {auditTrailConsent && (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: '1rem'
          }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="card"
              style={{
                width: '100%', maxWidth: '720px', maxHeight: '88vh',
                display: 'flex', flexDirection: 'column', gap: '1rem',
                border: '1px solid var(--border)', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)'
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border)', paddingBottom: '0.85rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <span className="badge badge-info" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Fingerprint size={12} /> DPDP Section 6 Auditable Trail
                    </span>
                    {auditTrailConsent.file?.maskedAadhaar && (
                      <span className="badge badge-warning">
                        Masked Aadhaar: {auditTrailConsent.file.maskedAadhaar}
                      </span>
                    )}
                  </div>
                  <h3 style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--text)' }}>
                    Access & Consent Lifecycle Ledger
                  </h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.1rem' }}>
                    Data Subject: <strong style={{ color: 'var(--text)' }}>{auditTrailConsent.dataSubjectName}</strong> ({auditTrailConsent.dataSubjectEmail || 'No email'}) · File: <strong style={{ color: 'var(--text)' }}>{auditTrailConsent.file?.originalName}</strong>
                  </p>
                </div>
                <button
                  onClick={() => setAuditTrailConsent(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: '0.25rem' }}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Timeline Stream */}
              <div style={{ overflowY: 'auto', flex: 1, paddingRight: '0.5rem', maxHeight: '480px' }}>
                {loadingTrail ? (
                  <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)' }}>
                    <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 0.5rem auto' }} />
                    Verifying immutable DPDP log hashes…
                  </div>
                ) : auditTrail.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)' }}>
                    <CheckCircle2 size={36} style={{ color: 'var(--success)', opacity: 0.8, margin: '0 auto 0.5rem auto' }} />
                    <p style={{ fontWeight: 600, color: 'var(--text)', fontSize: '0.9rem' }}>No External Access Events Yet</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.2rem' }}>
                      All requests to access this data subject's file will be logged in this tamper-evident ledger.
                    </p>
                  </div>
                ) : (
                  <div style={{ position: 'relative', paddingLeft: '1.75rem', marginLeft: '0.5rem', borderLeft: '2px dashed var(--border)' }}>
                    {auditTrail.map((log, idx) => {
                      const isDelete = log.action === 'DELETE' || log.action === 'PURGE'
                      const isDownload = log.action === 'DOWNLOAD'
                      const isView = log.action === 'VIEW'
                      const nodeColor = isDelete ? 'var(--danger)' : isDownload ? '#f59e0b' : isView ? 'var(--accent)' : 'var(--success)'

                      return (
                        <div key={log.id || idx} style={{ position: 'relative', marginBottom: '1.25rem' }}>
                          {/* Timeline node icon dot */}
                          <div
                            style={{
                              position: 'absolute', left: '-2.35rem', top: '0.25rem',
                              width: '1.25rem', height: '1.25rem', borderRadius: '50%',
                              background: 'var(--card)', border: `2px solid ${nodeColor}`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              boxShadow: `0 0 8px ${nodeColor}40`
                            }}
                          >
                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: nodeColor }} />
                          </div>

                          {/* Event card */}
                          <div style={{
                            padding: '0.85rem 1rem', borderRadius: '0.625rem',
                            background: 'var(--bg)', border: '1px solid var(--border)',
                            transition: 'border-color 0.2s ease'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{
                                  fontSize: '0.68rem', fontWeight: 800,
                                  padding: '0.15rem 0.5rem', borderRadius: '4px',
                                  background: `color-mix(in srgb, ${nodeColor} 15%, transparent)`,
                                  color: nodeColor,
                                  border: `1px solid color-mix(in srgb, ${nodeColor} 30%, transparent)`
                                }}>
                                  {log.action}
                                </span>
                                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text)' }}>
                                  {log.purpose}
                                </span>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', color: 'var(--muted)' }}>
                                <Clock size={12} />
                                {new Date(log.timestamp).toLocaleDateString()} {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                              </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.4rem', marginTop: '0.6rem', fontSize: '0.72rem', color: 'var(--muted)' }}>
                              <div>
                                <span style={{ opacity: 0.7 }}>Accessed by: </span>
                                <strong style={{ color: 'var(--text)' }}>{log.accessedByName || 'Authorized User / Client'}</strong>
                              </div>
                              <div>
                                <span style={{ opacity: 0.7 }}>Client IP: </span>
                                <code style={{ color: 'var(--text)', background: 'var(--card)', padding: '0.1rem 0.3rem', borderRadius: '3px' }}>
                                  {log.ipAddress || '127.0.0.1'}
                                </code>
                              </div>
                              {log.userAgent && (
                                <div style={{ gridColumn: '1 / -1', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  <span style={{ opacity: 0.7 }}>User Agent: </span>
                                  <span>{log.userAgent}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
                <button
                  onClick={() => {
                    const exportData = {
                      consentId: auditTrailConsent.id,
                      subject: auditTrailConsent.dataSubjectName,
                      file: auditTrailConsent.file?.originalName,
                      exportedAt: new Date().toISOString(),
                      framework: 'Digital Personal Data Protection Act (DPDP) 2023',
                      auditTrail
                    }
                    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2))
                    const dlAnchor = document.createElement('a')
                    dlAnchor.setAttribute("href", dataStr)
                    dlAnchor.setAttribute("download", `DPDP_Audit_${auditTrailConsent.dataSubjectName.replace(/\s+/g, '_')}_${auditTrailConsent.id.slice(0,8)}.json`)
                    dlAnchor.click()
                  }}
                  disabled={auditTrail.length === 0}
                  className="btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem' }}
                >
                  <Download size={14} /> Export Audit Ledger
                </button>

                <button onClick={() => setAuditTrailConsent(null)} className="btn-primary" style={{ fontSize: '0.8rem' }}>
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
