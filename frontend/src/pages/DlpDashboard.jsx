import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ShieldAlert, ShieldCheck, AlertTriangle, Activity, RefreshCw,
  Search, Filter, CheckCircle2, XCircle, Eye, Ban, FileText,
  Lock, ArrowUpRight, Radio, Download, ChevronDown, ChevronUp,
  Clock, User, File, HardDrive, Shield, AlertOctagon, Sparkles
} from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { toast } from 'react-toastify'
import { dlpApi } from '../services/api'
import MetricCard from '../components/MetricCard'

const CHANNEL_COLORS = {
  PUBLIC_LINK: '#ef4444',
  INTERNAL_SHARE: '#3b82f6',
  QR_SCAN: '#8b5cf6',
  DIRECT_DOWNLOAD: '#f59e0b',
  BULK_EXPORT: '#ec4899',
}

const CHANNEL_LABELS = {
  PUBLIC_LINK: 'Public Link',
  INTERNAL_SHARE: 'Internal Share',
  QR_SCAN: 'QR Scan Transfer',
  DIRECT_DOWNLOAD: 'Direct Download',
  BULK_EXPORT: 'Bulk Export',
}

const SEVERITY_COLORS = {
  CRITICAL: 'var(--danger)',
  HIGH: '#f97316',
  MEDIUM: 'var(--warning)',
  LOW: 'var(--info)',
}

const STATUS_BADGES = {
  OPEN: { label: 'Open', bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' },
  INVESTIGATING: { label: 'Investigating', bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' },
  RESOLVED: { label: 'Resolved', bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981' },
  BLOCKED: { label: 'Blocked', bg: 'rgba(99, 102, 241, 0.15)', color: '#6366f1' },
}

export default function DlpDashboard() {
  const qc = useQueryClient()
  const [severityFilter, setSeverityFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [channelFilter, setChannelFilter] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)

  // Mitigate modal state
  const [selectedAlert, setSelectedAlert] = useState(null)
  const [mitigateAction, setMitigateAction] = useState('RESOLVE')
  const [mitigateNote, setMitigateNote] = useState('')

  // Compliance report drawer/section
  const [showCompliance, setShowCompliance] = useState(false)

  // ── Queries ──────────────────────────────────────────────────────────────────

  const {
    data: metricsData,
    isLoading: metricsLoading,
    refetch: refetchMetrics,
    isRefetching: metricsRefetching
  } = useQuery({
    queryKey: ['dlp-metrics'],
    queryFn: async () => {
      const res = await dlpApi.metrics()
      return res.data?.data || {}
    },
    refetchInterval: 15000,
  })

  const {
    data: alertsData,
    isLoading: alertsLoading,
    refetch: refetchAlerts,
    isRefetching: alertsRefetching
  } = useQuery({
    queryKey: ['dlp-alerts', page, severityFilter, statusFilter, channelFilter],
    queryFn: async () => {
      const params = {
        page,
        limit: 25,
        ...(severityFilter !== 'ALL' && { severity: severityFilter }),
        ...(statusFilter !== 'ALL' && { status: statusFilter }),
        ...(channelFilter !== 'ALL' && { channel: channelFilter }),
      }
      const res = await dlpApi.alerts(params)
      return res.data || { total: 0, data: [] }
    },
    refetchInterval: 15000,
  })

  const {
    data: complianceReport,
    isLoading: complianceLoading,
    refetch: refetchCompliance
  } = useQuery({
    queryKey: ['dlp-compliance-report'],
    queryFn: async () => {
      const res = await dlpApi.complianceReport()
      return res.data?.data || null
    },
    enabled: showCompliance,
  })

  // ── Mutations ────────────────────────────────────────────────────────────────

  const mitigateMutation = useMutation({
    mutationFn: async ({ id, action, note }) => {
      const res = await dlpApi.mitigate(id, action, note)
      return res.data
    },
    onSuccess: (_, variables) => {
      toast.success(`Alert marked as ${variables.action.toLowerCase()}`)
      qc.invalidateQueries(['dlp-alerts'])
      qc.invalidateQueries(['dlp-metrics'])
      qc.invalidateQueries(['dlp-compliance-report'])
      setSelectedAlert(null)
      setMitigateNote('')
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to update alert mitigation.')
    }
  })

  // ── Realtime WebSocket Listener ──────────────────────────────────────────────

  useEffect(() => {
    let ws = null
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const wsUrl = `${protocol}//${window.location.host}/ws`
      ws = new WebSocket(wsUrl)

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data)
          if (payload.event === 'DLP_ALERT' || payload.type === 'DLP_ALERT') {
            toast.warn(`🚨 DLP Alert Triggered: ${payload.data?.rule || 'Data movement anomaly detected'}!`, {
              position: 'top-right',
              autoClose: 6000,
            })
            qc.invalidateQueries(['dlp-alerts'])
            qc.invalidateQueries(['dlp-metrics'])
          }
        } catch {
          // ignore non-json
        }
      }
    } catch {
      // ws connection error handled silently
    }

    return () => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close()
      }
    }
  }, [qc])

  // ── Computed Metrics & Chart Data ────────────────────────────────────────────

  const metrics = metricsData || {}
  const totalAlerts = metrics.totalAlerts || 0
  const openAlerts = metrics.openAlerts || 0
  const criticalAlerts = metrics.criticalAlerts || 0
  const riskIndex = metrics.riskIndex ?? 0

  const channelChartData = useMemo(() => {
    const raw = metrics.channelBreakdown || {}
    const entries = Object.entries(raw)
    if (entries.length === 0) return []
    return entries.map(([channel, count]) => ({
      name: CHANNEL_LABELS[channel] || channel,
      rawChannel: channel,
      value: count,
      color: CHANNEL_COLORS[channel] || '#64748b'
    }))
  }, [metrics.channelBreakdown])

  // Filter alerts by search query
  const rawAlerts = alertsData?.data || []
  const filteredAlerts = useMemo(() => {
    if (!searchQuery.trim()) return rawAlerts
    const q = searchQuery.toLowerCase()
    return rawAlerts.filter(a =>
      a.ruleTriggered?.toLowerCase().includes(q) ||
      a.description?.toLowerCase().includes(q) ||
      a.file?.originalName?.toLowerCase().includes(q) ||
      a.user?.name?.toLowerCase().includes(q) ||
      a.user?.email?.toLowerCase().includes(q) ||
      a.channel?.toLowerCase().includes(q)
    )
  }, [rawAlerts, searchQuery])

  const handleRefreshAll = async () => {
    await Promise.all([refetchMetrics(), refetchAlerts()])
    if (showCompliance) await refetchCompliance()
    toast.success('DLP live telemetry refreshed')
  }

  const handleMitigateSubmit = (e) => {
    e.preventDefault()
    if (!selectedAlert) return
    mitigateMutation.mutate({
      id: selectedAlert.id,
      action: mitigateAction,
      note: mitigateNote,
    })
  }

  // Risk gauge color
  const riskColor = riskIndex >= 75 ? 'var(--danger)' : riskIndex >= 45 ? 'var(--warning)' : 'var(--success)'
  const riskStatusText = riskIndex >= 75 ? 'CRITICAL RISK' : riskIndex >= 45 ? 'MODERATE RISK' : 'LOW RISK'

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span className="page-tag" style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.25)' }}>
              <Radio size={12} className="animate-pulse" /> PS5 Live Engine
            </span>
            <span className="page-tag" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
              DPDP Compliance
            </span>
          </div>
          <h1 className="page-title" style={{ marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldAlert size={28} style={{ color: 'var(--danger)' }} />
            Data Leak Prevention (DLP)
          </h1>
          <p className="page-sub">
            Real-time movement monitoring across public shares, QR scans, downloads, and sensitive file transfers.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            onClick={() => setShowCompliance(!showCompliance)}
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <FileText size={16} />
            {showCompliance ? 'Hide Compliance' : 'DPDP Report'}
          </button>
          <button
            onClick={handleRefreshAll}
            disabled={metricsRefetching || alertsRefetching}
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <RefreshCw size={16} className={metricsRefetching || alertsRefetching ? 'animate-spin' : ''} />
            Refresh Telemetry
          </button>
        </div>
      </div>

      {/* ── Metric Cards Grid ────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginTop: '1.5rem' }}>
        <MetricCard
          icon={AlertTriangle}
          label="Total DLP Incidents"
          value={totalAlerts}
          sub="Recorded across all channels"
          color="var(--accent)"
          index={0}
        />
        <MetricCard
          icon={ShieldAlert}
          label="Open Incidents"
          value={openAlerts}
          sub="Requires immediate attention"
          color="#ef4444"
          index={1}
        />
        <MetricCard
          icon={AlertOctagon}
          label="Critical Severity"
          value={criticalAlerts}
          sub="High-confidence PII/exfiltration"
          color="#f97316"
          index={2}
        />
        
        {/* Dynamic Risk Gauge Card */}
        <motion.div
          className="card-metric"
          style={{ '--metric-color': riskColor }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.45 }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div
              style={{
                width: '2.75rem', height: '2.75rem', borderRadius: '0.875rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: `color-mix(in srgb, ${riskColor} 14%, transparent)`,
                border: `1px solid color-mix(in srgb, ${riskColor} 22%, transparent)`,
              }}
            >
              <Activity size={20} style={{ color: riskColor }} />
            </div>
            <span
              style={{
                fontSize: '0.7rem', fontWeight: 700,
                padding: '0.2rem 0.55rem', borderRadius: '9999px',
                background: `color-mix(in srgb, ${riskColor} 15%, transparent)`,
                color: riskColor,
                border: `1px solid color-mix(in srgb, ${riskColor} 30%, transparent)`
              }}
            >
              {riskStatusText}
            </span>
          </div>
          <div style={{ marginTop: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <p style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.025em', lineHeight: 1 }}>
                {riskIndex}<span style={{ fontSize: '1rem', color: 'var(--muted)' }}>/100</span>
              </p>
              <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Risk Index</span>
            </div>
            {/* Progress Track */}
            <div style={{ width: '100%', height: '8px', background: 'var(--border)', borderRadius: '9999px', overflow: 'hidden', marginTop: '0.6rem' }}>
              <div
                style={{
                  width: `${riskIndex}%`,
                  height: '100%',
                  background: riskColor,
                  borderRadius: '9999px',
                  transition: 'width 0.6s ease'
                }}
              />
            </div>
            <p style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: '0.4rem' }}>
              Based on active threats and channel exposures
            </p>
          </div>
        </motion.div>
      </div>

      {/* ── Middle Section: Channel Donut & Rules Overview ───────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.25rem', marginTop: '1.5rem' }}>
        {/* Movement Channel Breakdown */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text)' }}>Channel Transfer Vectors</h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Where data transfers and leak attempts originate</p>
            </div>
            <HardDrive size={18} style={{ color: 'var(--muted)' }} />
          </div>

          {channelChartData.length === 0 ? (
            <div style={{ height: '220px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>
              <CheckCircle2 size={36} style={{ color: 'var(--success)', opacity: 0.8, marginBottom: '0.5rem' }} />
              <p style={{ fontSize: '0.85rem' }}>No unauthorized channel transfers detected</p>
            </div>
          ) : (
            <div style={{ height: '240px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={channelChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {channelChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      color: 'var(--text)',
                      fontSize: '0.75rem'
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(val) => <span style={{ color: 'var(--text)', fontSize: '0.75rem' }}>{val}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Real-time Threat Rules & Detection Engine */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text)' }}>Active DLP Detection Rules</h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Autonomous heuristics guarding data movement</p>
            </div>
            <Sparkles size={18} style={{ color: 'var(--accent)' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', padding: '0.6rem', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', marginTop: '0.4rem', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text)' }}>PII Public Share (Unencrypted / No Auth)</p>
                <p style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>Blocks or flags Aadhaar, PAN, or health records shared via unauthenticated public links.</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', padding: '0.6rem', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b', marginTop: '0.4rem', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text)' }}>Mass Download & Rapid QR Scans</p>
                <p style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>Anomalous spikes in download velocity or multi-IP scans within 60-second windows.</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', padding: '0.6rem', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6', marginTop: '0.4rem', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text)' }}>Off-Hours & Cross-Channel Exfiltration</p>
                <p style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>Monitors nocturnal access (10 PM – 6 AM) and parallel distribution across public and internal links.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── DPDP Compliance Report Expansion ──────────────────────────────────── */}
      <AnimatePresence>
        {showCompliance && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.35 }}
            style={{ overflow: 'hidden', marginTop: '1.5rem' }}
          >
            <div className="card" style={{ padding: '1.5rem', border: '1px solid var(--accent)', background: 'color-mix(in srgb, var(--accent) 4%, var(--card))' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className="badge badge-info">DPDP Act 2023 Formatted</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                      Generated: {complianceReport?.generatedAt ? new Date(complianceReport.generatedAt).toLocaleString() : 'Loading…'}
                    </span>
                  </div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text)', marginTop: '0.4rem' }}>
                    Executive Data Protection Compliance Audit
                  </h2>
                  <p style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                    Regulatory assessment for statutory compliance with Indian Digital Personal Data Protection Act.
                  </p>
                </div>

                <button
                  onClick={() => {
                    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(complianceReport, null, 2))
                    const dlAnchor = document.createElement('a')
                    dlAnchor.setAttribute("href", dataStr)
                    dlAnchor.setAttribute("download", `DPDP_Compliance_Report_${new Date().toISOString().slice(0,10)}.json`)
                    dlAnchor.click()
                  }}
                  disabled={!complianceReport}
                  className="btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}
                >
                  <Download size={15} /> Export Audit JSON
                </button>
              </div>

              {complianceLoading ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)' }}>
                  <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 0.5rem auto' }} />
                  Compiling regulatory audit ledger…
                </div>
              ) : complianceReport ? (
                <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {/* Summary grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                    <div style={{ padding: '0.75rem', borderRadius: '8px', background: 'var(--card)', border: '1px solid var(--border)' }}>
                      <p style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>PII Files in Vault</p>
                      <p style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text)' }}>
                        {complianceReport.summary?.piiExposedFiles ?? 0}
                      </p>
                    </div>
                    <div style={{ padding: '0.75rem', borderRadius: '8px', background: 'var(--card)', border: '1px solid var(--border)' }}>
                      <p style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>Active Consents</p>
                      <p style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--success)' }}>
                        {complianceReport.summary?.consentRecords?.GRANTED || 0}
                      </p>
                    </div>
                    <div style={{ padding: '0.75rem', borderRadius: '8px', background: 'var(--card)', border: '1px solid var(--border)' }}>
                      <p style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>Revoked / Expired</p>
                      <p style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f59e0b' }}>
                        {(complianceReport.summary?.consentRecords?.REVOKED || 0) + (complianceReport.summary?.consentRecords?.EXPIRED || 0)}
                      </p>
                    </div>
                    <div style={{ padding: '0.75rem', borderRadius: '8px', background: 'var(--card)', border: '1px solid var(--border)' }}>
                      <p style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>Critical Incidents</p>
                      <p style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--danger)' }}>
                        {complianceReport.summary?.criticalIncidents ?? 0}
                      </p>
                    </div>
                  </div>

                  {/* Recommendations */}
                  <div style={{ padding: '1rem', borderRadius: '8px', background: 'var(--card)', border: '1px solid var(--border)' }}>
                    <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <ShieldCheck size={16} style={{ color: 'var(--success)' }} />
                      Compliance Directives & Recommendations
                    </h3>
                    <ul style={{ paddingLeft: '1.2rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      {complianceReport.recommendations?.map((rec, i) => (
                        <li key={i} style={{ fontSize: '0.8rem', color: 'var(--text)' }}>
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Incident Ledger Table Section ────────────────────────────────────── */}
      <div className="card" style={{ marginTop: '1.5rem', padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text)' }}>Incident Audit Ledger</h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
              Detailed stream of detected movement threats and admin mitigation actions
            </p>
          </div>

          {/* Filter Bar */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
            {/* Search Input */}
            <div style={{ position: 'relative', minWidth: '220px' }}>
              <Search size={14} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
              <input
                type="text"
                placeholder="Search file, rule, user…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.4rem 0.6rem 0.4rem 2rem',
                  fontSize: '0.8rem',
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  color: 'var(--text)'
                }}
              />
            </div>

            {/* Severity Filter */}
            <select
              value={severityFilter}
              onChange={(e) => { setSeverityFilter(e.target.value); setPage(1); }}
              style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)' }}
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)' }}
            >
              <option value="ALL">All Statuses</option>
              <option value="OPEN">Open</option>
              <option value="INVESTIGATING">Investigating</option>
              <option value="RESOLVED">Resolved</option>
              <option value="BLOCKED">Blocked</option>
            </select>

            {/* Channel Filter */}
            <select
              value={channelFilter}
              onChange={(e) => { setChannelFilter(e.target.value); setPage(1); }}
              style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)' }}
            >
              <option value="ALL">All Channels</option>
              <option value="PUBLIC_LINK">Public Link</option>
              <option value="INTERNAL_SHARE">Internal Share</option>
              <option value="QR_SCAN">QR Scan</option>
              <option value="DIRECT_DOWNLOAD">Download</option>
              <option value="BULK_EXPORT">Bulk Export</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>
                <th style={{ padding: '0.65rem 0.75rem' }}>Severity</th>
                <th style={{ padding: '0.65rem 0.75rem' }}>Rule & Description</th>
                <th style={{ padding: '0.65rem 0.75rem' }}>Channel</th>
                <th style={{ padding: '0.65rem 0.75rem' }}>Target File</th>
                <th style={{ padding: '0.65rem 0.75rem' }}>User / IP</th>
                <th style={{ padding: '0.65rem 0.75rem' }}>Risk</th>
                <th style={{ padding: '0.65rem 0.75rem' }}>Status</th>
                <th style={{ padding: '0.65rem 0.75rem' }}>Time</th>
                <th style={{ padding: '0.65rem 0.75rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {alertsLoading ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--muted)' }}>
                    <RefreshCw size={20} className="animate-spin" style={{ margin: '0 auto 0.5rem auto' }} />
                    Loading DLP incident ledger…
                  </td>
                </tr>
              ) : filteredAlerts.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--muted)' }}>
                    <CheckCircle2 size={32} style={{ color: 'var(--success)', opacity: 0.8, margin: '0 auto 0.5rem auto' }} />
                    No DLP incidents match current filters.
                  </td>
                </tr>
              ) : (
                filteredAlerts.map((alert) => {
                  const sevColor = SEVERITY_COLORS[alert.severity] || 'var(--muted)'
                  const statusConf = STATUS_BADGES[alert.status] || { label: alert.status, bg: 'var(--border)', color: 'var(--text)' }

                  return (
                    <tr key={alert.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      {/* Severity */}
                      <td style={{ padding: '0.65rem 0.75rem' }}>
                        <span
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            padding: '0.2rem 0.45rem',
                            borderRadius: '4px',
                            background: `color-mix(in srgb, ${sevColor} 15%, transparent)`,
                            color: sevColor,
                            border: `1px solid color-mix(in srgb, ${sevColor} 30%, transparent)`
                          }}
                        >
                          {alert.severity}
                        </span>
                      </td>

                      {/* Rule & Description */}
                      <td style={{ padding: '0.65rem 0.75rem', maxWidth: '280px' }}>
                        <p style={{ fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {alert.ruleTriggered}
                        </p>
                        <p style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: '0.1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {alert.description}
                        </p>
                      </td>

                      {/* Channel */}
                      <td style={{ padding: '0.65rem 0.75rem' }}>
                        <span style={{ fontSize: '0.75rem', color: CHANNEL_COLORS[alert.channel] || 'var(--text)', fontWeight: 600 }}>
                          {CHANNEL_LABELS[alert.channel] || alert.channel}
                        </span>
                      </td>

                      {/* File */}
                      <td style={{ padding: '0.65rem 0.75rem', maxWidth: '160px' }}>
                        {alert.file ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <File size={13} style={{ color: 'var(--muted)', flexShrink: 0 }} />
                            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text)' }}>
                              {alert.file.originalName}
                            </span>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--muted)' }}>—</span>
                        )}
                      </td>

                      {/* User / IP */}
                      <td style={{ padding: '0.65rem 0.75rem' }}>
                        <p style={{ color: 'var(--text)', fontWeight: 500 }}>
                          {alert.user ? alert.user.name || alert.user.email : 'Anonymous'}
                        </p>
                        {alert.ipAddress && (
                          <p style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>{alert.ipAddress}</p>
                        )}
                      </td>

                      {/* Risk Score */}
                      <td style={{ padding: '0.65rem 0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span style={{ fontWeight: 700, color: alert.riskScore >= 75 ? 'var(--danger)' : alert.riskScore >= 50 ? 'var(--warning)' : 'var(--text)' }}>
                            {alert.riskScore}
                          </span>
                          <div style={{ width: '32px', height: '4px', background: 'var(--border)', borderRadius: '2px' }}>
                            <div
                              style={{
                                width: `${alert.riskScore}%`,
                                height: '100%',
                                background: alert.riskScore >= 75 ? 'var(--danger)' : alert.riskScore >= 50 ? 'var(--warning)' : 'var(--success)',
                                borderRadius: '2px'
                              }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '0.65rem 0.75rem' }}>
                        <span
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            padding: '0.2rem 0.5rem',
                            borderRadius: '9999px',
                            background: statusConf.bg,
                            color: statusConf.color
                          }}
                        >
                          {statusConf.label}
                        </span>
                      </td>

                      {/* Time */}
                      <td style={{ padding: '0.65rem 0.75rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                        {new Date(alert.createdAt).toLocaleDateString()} {new Date(alert.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>

                      {/* Action */}
                      <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right' }}>
                        <button
                          onClick={() => {
                            setSelectedAlert(alert)
                            setMitigateAction(alert.status === 'OPEN' ? 'RESOLVE' : 'INVESTIGATE')
                            setMitigateNote(alert.mitigationNote || '')
                          }}
                          className="btn-secondary"
                          style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                        >
                          Mitigate
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Mitigation Modal ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedAlert && (
          <div
            style={{
              position: 'fixed', inset: 0, zIndex: 1000,
              background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="card"
              style={{ width: '100%', maxWidth: '520px', padding: '1.5rem', border: '1px solid var(--border)' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                  <span className="badge badge-warning">Incident Action</span>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text)', marginTop: '0.3rem' }}>
                    Mitigate DLP Alert
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedAlert(null)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}
                >
                  <XCircle size={20} />
                </button>
              </div>

              <div style={{ background: 'var(--bg)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', marginBottom: '1rem' }}>
                <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text)' }}>
                  {selectedAlert.ruleTriggered}
                </p>
                <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.2rem' }}>
                  {selectedAlert.description}
                </p>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--muted)' }}>
                  <span>Channel: <strong>{CHANNEL_LABELS[selectedAlert.channel] || selectedAlert.channel}</strong></span>
                  <span>•</span>
                  <span>Risk Score: <strong style={{ color: 'var(--danger)' }}>{selectedAlert.riskScore}/100</strong></span>
                </div>
              </div>

              <form onSubmit={handleMitigateSubmit}>
                {/* Mitigation Action Radio */}
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text)', marginBottom: '0.4rem' }}>
                    Choose Remediation Action
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => setMitigateAction('RESOLVE')}
                      style={{
                        padding: '0.6rem 0.4rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600,
                        border: mitigateAction === 'RESOLVE' ? '2px solid var(--success)' : '1px solid var(--border)',
                        background: mitigateAction === 'RESOLVE' ? 'rgba(16, 185, 129, 0.12)' : 'var(--card)',
                        color: mitigateAction === 'RESOLVE' ? 'var(--success)' : 'var(--text)',
                        cursor: 'pointer'
                      }}
                    >
                      ✓ Resolve
                    </button>
                    <button
                      type="button"
                      onClick={() => setMitigateAction('INVESTIGATE')}
                      style={{
                        padding: '0.6rem 0.4rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600,
                        border: mitigateAction === 'INVESTIGATE' ? '2px solid var(--warning)' : '1px solid var(--border)',
                        background: mitigateAction === 'INVESTIGATE' ? 'rgba(245, 158, 11, 0.12)' : 'var(--card)',
                        color: mitigateAction === 'INVESTIGATE' ? 'var(--warning)' : 'var(--text)',
                        cursor: 'pointer'
                      }}
                    >
                      🔍 Investigate
                    </button>
                    <button
                      type="button"
                      onClick={() => setMitigateAction('BLOCK')}
                      style={{
                        padding: '0.6rem 0.4rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600,
                        border: mitigateAction === 'BLOCK' ? '2px solid var(--danger)' : '1px solid var(--border)',
                        background: mitigateAction === 'BLOCK' ? 'rgba(239, 68, 68, 0.12)' : 'var(--card)',
                        color: mitigateAction === 'BLOCK' ? 'var(--danger)' : 'var(--text)',
                        cursor: 'pointer'
                      }}
                    >
                      🚫 Block & Revoke
                    </button>
                  </div>
                </div>

                {/* Mitigation Note */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text)', marginBottom: '0.4rem' }}>
                    Audit Note / Mitigation Rationale
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Document action taken for statutory DPDP audit trail…"
                    value={mitigateNote}
                    onChange={(e) => setMitigateNote(e.target.value)}
                    style={{
                      width: '100%', padding: '0.5rem', fontSize: '0.8rem',
                      background: 'var(--bg)', border: '1px solid var(--border)',
                      borderRadius: '6px', color: 'var(--text)', resize: 'vertical'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setSelectedAlert(null)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={mitigateMutation.isPending}
                    className="btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    {mitigateMutation.isPending ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : null}
                    Confirm Action
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
