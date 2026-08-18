import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShieldCheck, ShieldAlert, Key, Laptop, Lock, Share2, Webhook,
  CheckCircle2, TrendingUp, AlertTriangle, Info, RefreshCw, Activity, Wrench
} from 'lucide-react'
import { useSecurityScore } from '../hooks/useSecurityScore'
import { auditApi } from '../services/api'
import { useQueryClient } from '@tanstack/react-query'
import ProgressBar from '../components/ProgressBar'
import MetricCard from '../components/MetricCard'
import { SkeletonCard } from '../components/Skeletons'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'

export default function SecurityCenter() {
  const qc = useQueryClient()
  const [
    repairing, setRepairing
  ] = useState(false)

  const {
    score,
    scoreColor,
    scoreLabel,
    isTampered,
    isLoading,
    breakdown,
    refetchIntegrity,
    stats
  } = useSecurityScore()

  const handleRefresh = async () => {
    await refetchIntegrity()
    toast.success('Security score refreshed with live vault telemetry!')
  }

  const handleRepair = async () => {
    setRepairing(true)
    try {
      const res = await auditApi.repair()
      const result = res.data?.data
      if (result.status === 'ALREADY_CLEAN') {
        toast.success(`Ledger is already clean — all ${result.total} blocks verified!`)
      } else {
        toast.success(`✅ Ledger repaired! ${result.repaired} of ${result.total} blocks re-hashed. Score updating…`)
      }
      await refetchIntegrity()
      qc.invalidateQueries(['audit-integrity'])
      qc.invalidateQueries(['audit-logs'])
    } catch (err) {
      toast.error(err.response?.data?.message || 'Repair failed. Please try from the Audit Logs page.')
    } finally {
      setRepairing(false)
    }
  }

  const METRICS = [
    { label: 'Security Score',    value: `${score}%`,           icon: isTampered ? ShieldAlert : ShieldCheck, color: scoreColor, sub: scoreLabel },
    { label: 'Password Strength', value: 'Strong',              icon: Key,         color: 'var(--accent)',  sub: 'Bcrypt 10 rounds' },
    { label: 'ZK Encrypted',      value: stats.zkFilesCount,    icon: Lock,       color: 'var(--success)', sub: `${stats.zkFilesCount} client-encrypted` },
    { label: 'Active Shares',     value: stats.totalShares,     icon: Share2,     color: 'var(--info)',    sub: 'Active share tokens' },
    { label: 'Webhooks',          value: stats.webhooksCount,   icon: Webhook,    color: 'var(--accent)',  sub: 'Automation endpoints' },
    { label: 'Active Sessions',   value: stats.devicesCount,    icon: Laptop,     color: '#8b5cf6',        sub: 'Authenticated clients' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <span className="page-tag"><ShieldCheck size={11} /> Real-Time Security Posture</span>
          <h1 className="page-title">Security Center</h1>
          <p className="page-sub">Live cryptographic evaluation of encryption, audit integrity, and access controls.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {isTampered && (
            <motion.button
              onClick={handleRepair}
              disabled={repairing}
              className="btn-primary"
              style={{ fontSize: '0.8rem', background: 'var(--danger)', borderColor: 'var(--danger)', boxShadow: '0 0 14px color-mix(in srgb, var(--danger) 40%, transparent)' }}
              whileHover={{ scale: 1.04 }}
              animate={{ scale: [1, 1.025, 1] }}
              transition={{ duration: 1.8, repeat: Infinity }}
            >
              {repairing ? <><RefreshCw size={13} className="spin" /> Repairing…</> : <><Wrench size={13} /> Repair Ledger</>}
            </motion.button>
          )}
          <motion.button
            onClick={handleRefresh}
            className="btn-ghost"
            style={{ fontSize: '0.8rem' }}
            whileHover={{ scale: 1.04 }}
          >
            <RefreshCw size={14} /> Recalculate Score
          </motion.button>
        </div>
      </div>

      {/* Score Hero */}
      <motion.div
        className="vault-hero"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{
          borderColor: isTampered ? 'color-mix(in srgb, var(--danger) 40%, var(--border))' : undefined,
          background: isTampered
            ? 'linear-gradient(135deg, color-mix(in srgb, var(--danger) 15%, var(--bg-card)), var(--bg-card))'
            : undefined
        }}
      >
        <div style={{ flex: 1, position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Real-Time Security Score
            </span>
            <span className="badge badge-success" style={{ fontSize: '0.65rem', padding: '0.1rem 0.45rem' }}>
              Live Telemetry
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 'clamp(2.75rem, 6vw, 4.25rem)', fontWeight: 900, color: scoreColor, lineHeight: 1, fontFamily: 'monospace' }}>
              {score}%
            </span>
            <div>
              <span className={`badge ${score >= 90 ? 'badge-success' : score >= 75 ? 'badge-info' : score >= 60 ? 'badge-warning' : 'badge-danger'}`} style={{ fontSize: '0.825rem', padding: '0.35rem 0.85rem' }}>
                {score >= 90 ? <><TrendingUp size={12} /> {scoreLabel}</> : <><AlertTriangle size={12} /> {scoreLabel}</>}
              </span>
              <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: '0.35rem' }}>
                {isTampered ? 'Tampering detected in audit ledger history!' : 'Derived dynamically from 6 active security dimensions'}
              </p>
            </div>
          </div>

          <div style={{ marginTop: '1.2rem', maxWidth: '30rem' }}>
            <ProgressBar progress={score} color={scoreColor} height={8} />
          </div>

          {/* Inline repair button inside hero when tampered */}
          {isTampered && (
            <motion.button
              onClick={handleRepair}
              disabled={repairing}
              className="btn-primary"
              style={{ marginTop: '1rem', background: 'var(--danger)', borderColor: 'var(--danger)', fontSize: '0.82rem' }}
              whileHover={{ scale: 1.04 }}
            >
              {repairing ? <><RefreshCw size={13} className="spin" /> Repairing Ledger…</> : <><Wrench size={13} /> Repair Audit Ledger &rarr; Restore +25 pts</>}
            </motion.button>
          )}
        </div>

        <div style={{ flexShrink: 0, position: 'relative', zIndex: 1 }}>
          <div style={{
            width: '5.25rem', height: '5.25rem', borderRadius: '1.35rem',
            background: `color-mix(in srgb, ${scoreColor} 12%, var(--bg-card))`,
            border: `2px solid ${scoreColor}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 0 35px color-mix(in srgb, ${scoreColor} 25%, transparent)`,
          }}>
            {isTampered ? <ShieldAlert size={38} style={{ color: scoreColor }} /> : <ShieldCheck size={38} style={{ color: scoreColor }} />}
          </div>
        </div>
      </motion.div>

      {/* Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
        {isLoading ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />) :
          METRICS.map((m, i) => <MetricCard key={m.label} index={i} {...m} />)}
      </div>

      {/* Real-time Dimensions Breakdown */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h2 className="section-title"><Activity size={16} style={{ color: 'var(--accent)' }} /> Security Scoring Breakdown</h2>
          <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Maximum 100 Points</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.85rem' }}>
          {breakdown.map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: '0.75rem',
                padding: '0.9rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--text)' }}>{item.label}</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: item.color, fontFamily: 'monospace' }}>
                  {item.points} / {item.max} pts
                </span>
              </div>

              <ProgressBar progress={Math.round((item.points / item.max) * 100)} color={item.color} height={6} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.2rem' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{item.desc}</span>
                <span className="badge" style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem', background: `color-mix(in srgb, ${item.color} 15%, transparent)`, color: item.color, border: `1px solid color-mix(in srgb, ${item.color} 30%, transparent)` }}>
                  {item.status}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Recommendations */}
      {stats.zkFilesCount === 0 && (
        <div className="card" style={{ borderColor: 'color-mix(in srgb, var(--accent) 30%, var(--border))', background: 'var(--accent-soft)' }}>
          <h2 className="section-title" style={{ marginBottom: '0.75rem' }}><Info size={16} style={{ color: 'var(--accent)' }} /> Security Recommendation</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '0.875rem', lineHeight: 1.6 }}>
            You haven't uploaded any files using <strong>Zero-Knowledge Encryption</strong> yet. Enabling ZK encryption will boost your security score by up to <strong>+15 points</strong> and ensure end-to-end client confidentiality.
          </p>
          <Link to="/upload" className="btn-primary" style={{ fontSize: '0.8rem', display: 'inline-flex' }}>Upload with ZK Encryption</Link>
        </div>
      )}
    </div>
  )
}
