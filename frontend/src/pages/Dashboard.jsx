import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  Files, HardDrive, Upload, Share2, ShieldAlert,
  Star, Lock, ShieldCheck, Activity, Clock, Trash2, ArrowUpRight, Zap, TrendingUp
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import { fileApi, auditApi } from '../services/api'
import { useSecurityScore } from '../hooks/useSecurityScore'
import MetricCard from '../components/MetricCard'
import ProgressBar from '../components/ProgressBar'
import { SkeletonCard, SkeletonTable } from '../components/Skeletons'
import { useAuth } from '../context/AuthContext'

function formatBytes(bytes = 0) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 ** 3) return `${(bytes / (1024 ** 2)).toFixed(1)} MB`
  return `${(bytes / (1024 ** 3)).toFixed(2)} GB`
}

function relativeTime(date) {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

const ACTION_COLORS = {
  UPLOAD:          { cls: 'badge-info',    bg: 'var(--info-soft)',    color: 'var(--info)' },
  DOWNLOAD:        { cls: 'badge-success', bg: 'var(--success-soft)', color: 'var(--success)' },
  CREATE_SHARE:    { cls: 'badge-warning', bg: 'var(--warning-soft)', color: 'var(--warning)' },
  ACCESS_SHARE:    { cls: 'badge-warning', bg: 'var(--warning-soft)', color: 'var(--warning)' },
  RESTORE_VERSION: { cls: 'badge-info',    bg: 'var(--info-soft)',    color: 'var(--info)' },
  DELETE:          { cls: 'badge-danger',  bg: 'var(--danger-soft)',  color: 'var(--danger)' },
}

const greet = () => {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

const QUICK_ACTIONS = [
  { to: '/upload',    Icon: Upload,  label: 'Upload',    color: 'var(--accent)',  bg: 'var(--accent-soft)' },
  { to: '/files',     Icon: Files,   label: 'My Files',  color: 'var(--info)',    bg: 'var(--info-soft)' },
  { to: '/favorites', Icon: Star,    label: 'Favorites', color: 'var(--warning)', bg: 'var(--warning-soft)' },
  { to: '/trash',     Icon: Trash2,  label: 'Trash',     color: 'var(--danger)',  bg: 'var(--danger-soft)' },
]

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] },
})

export default function Dashboard() {
  const { user } = useAuth()
  const { score: realTimeScore, scoreColor, scoreLabel, isTampered } = useSecurityScore()

  const { data: filesData, isLoading: filesLoading } = useQuery({
    queryKey: ['my-files'],
    queryFn:  () => fileApi.myFiles().then(r => r.data.data),
  })
  const { data: auditData, isLoading: auditLoading } = useQuery({
    queryKey: ['audit-recent'],
    queryFn:  () => auditApi.myLogs(1).then(r => r.data.data),
  })

  const files  = filesData || []
  const audits = auditData?.logs || []

  const totalSize    = files.reduce((s, f) => s + (f.versions?.[f.versions.length - 1]?.size || 0), 0)
  const totalShares  = files.reduce((s, f) => s + (f.shareCount || 0), 0)
  const favoriteCount = files.filter(f => f.isFavorite).length
  const zkFilesCount  = files.filter(f => f.versions?.some(v => v.isZeroKnowledge)).length
  const STORAGE_LIMIT = 100 * 1024 * 1024
  const usagePct = Math.min(100, Math.round((totalSize / STORAGE_LIMIT) * 100))

  const categoryStats = files.reduce((acc, f) => {
    const size = f.versions?.[f.versions.length - 1]?.size || 0
    const ext = f.originalName?.split('.').pop()?.toLowerCase() || ''
    if (['pdf','doc','docx','txt','csv'].includes(ext)) acc.documents += size
    else if (['png','jpg','jpeg','svg','gif'].includes(ext)) acc.images += size
    else if (['mp4','mkv','avi','mov'].includes(ext)) acc.videos += size
    else acc.others += size
    return acc
  }, { documents: 0, images: 0, videos: 0, others: 0 })

  const METRICS = [
    { label: 'Files Uploaded',  value: files.length,           icon: Files,      color: 'var(--accent)',  sub: `${files.length} in vault` },
    { label: 'Storage Used',    value: formatBytes(totalSize),  icon: HardDrive,  color: '#8b5cf6',        sub: `${usagePct}% of 100 MB` },
    { label: 'Active Shares',   value: totalShares,             icon: Share2,     color: 'var(--info)',    sub: 'token links active' },
    { label: 'Favorites',       value: favoriteCount,           icon: Star,       color: 'var(--warning)', sub: 'starred files' },
    { label: 'Zero-Knowledge',  value: zkFilesCount,            icon: Lock,       color: 'var(--success)', sub: 'client-encrypted' },
    { label: 'Security Score',  value: `${realTimeScore}%`,     icon: isTampered ? ShieldAlert : ShieldCheck, color: scoreColor, sub: scoreLabel },
  ]

  const chartData = (() => {
    const map = {}
    files.forEach(f => {
      const d = new Date(f.createdAt).toLocaleDateString('en', { month: 'short', day: 'numeric' })
      map[d] = (map[d] || 0) + 1
    })
    return Object.entries(map).slice(-7).map(([date, uploads]) => ({ date, uploads }))
  })()

  const categoryList = [
    { label: 'Documents', size: categoryStats.documents, color: 'var(--accent)' },
    { label: 'Images',    size: categoryStats.images,    color: 'var(--success)' },
    { label: 'Videos',    size: categoryStats.videos,    color: 'var(--warning)' },
    { label: 'Others',    size: categoryStats.others,    color: '#8b5cf6' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>

      {/* ── Hero ── */}
      <motion.div className="vault-hero" {...fadeUp(0)}>
        <div style={{ flex: 1, minWidth: 0, position: 'relative', zIndex: 1 }}>
          <span className="page-tag">
            <ShieldCheck size={11} /> Protected Workspace
          </span>
          <h1 className="page-title">
            {greet()},{' '}
            <span style={{ color: 'var(--accent)' }}>{user?.name?.split(' ')[0]} 👋</span>
          </h1>
          <p className="page-sub">Your files, links, and activity are secured in one command center.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>
          <div className="vault-hero-status" style={{
            padding: '0.5rem 0.875rem', borderRadius: '9999px',
            border: '1px solid color-mix(in srgb, var(--success) 25%, transparent)',
            background: 'var(--success-soft)',
          }}>
            <ShieldCheck size={16} />
            <span><b>Protected</b><small>AES-256 active</small></span>
          </div>
          <Link to="/upload" className="btn-primary" style={{ fontSize: '0.8rem' }}>
            <Upload size={14} /> Upload File
          </Link>
        </div>
      </motion.div>

      {/* ── Metrics ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
        {filesLoading
          ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
          : METRICS.map((m, i) => <MetricCard key={m.label} index={i} {...m} />)
        }
      </div>

      {/* ── Storage + Quick Actions ── */}
      <motion.div
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}
        {...fadeUp(0.15)}
      >
        {/* Storage breakdown */}
        <div className="card" style={{ gridColumn: 'span 2' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h2 className="section-title">
              <HardDrive size={17} style={{ color: '#8b5cf6' }} /> Storage Breakdown
            </h2>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted)' }}>
              {formatBytes(totalSize)} / 100 MB
            </span>
          </div>
          <ProgressBar progress={usagePct} color="#8b5cf6" height={8} showLabel />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginTop: '1rem' }}>
            {categoryList.map(cat => (
              <div key={cat.label} style={{
                padding: '0.75rem', borderRadius: '0.75rem',
                background: 'color-mix(in srgb, var(--bg) 70%, transparent)',
                border: '1px solid var(--border)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
                  <span style={{ width: '0.5rem', height: '0.5rem', borderRadius: '50%', background: cat.color, display: 'inline-block' }} />
                  <span style={{ fontSize: '0.73rem', fontWeight: 600, color: 'var(--muted)' }}>{cat.label}</span>
                </div>
                <p style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--text)' }}>{formatBytes(cat.size)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card">
          <h2 className="section-title" style={{ marginBottom: '0.875rem' }}>
            <Zap size={16} style={{ color: 'var(--warning)' }} /> Quick Actions
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
            {QUICK_ACTIONS.map(({ to, Icon, label, color, bg }) => (
              <Link
                key={to}
                to={to}
                style={{
                  padding: '0.875rem', borderRadius: '0.75rem',
                  border: '1px solid var(--border)',
                  background: 'color-mix(in srgb, var(--bg) 60%, transparent)',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  gap: '0.4rem', textDecoration: 'none',
                  transition: 'all 0.2s ease',
                  textAlign: 'center',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = color
                  e.currentTarget.style.background = bg
                  e.currentTarget.style.transform = 'translateY(-2px)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'var(--border)'
                  e.currentTarget.style.background = 'color-mix(in srgb, var(--bg) 60%, transparent)'
                  e.currentTarget.style.transform = 'translateY(0)'
                }}
              >
                <Icon size={20} style={{ color }} />
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text)' }}>{label}</span>
              </Link>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ── Chart + Recent Uploads ── */}
      <motion.div
        style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.25rem' }}
        {...fadeUp(0.22)}
      >
        {/* Area Chart */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <h2 className="section-title">
              <Activity size={16} style={{ color: 'var(--accent)' }} /> Upload Activity
            </h2>
            <span className="badge badge-info">Last 7 days</span>
          </div>
          {filesLoading ? (
            <div className="skeleton" style={{ height: '180px', borderRadius: '0.75rem' }} />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
                <defs>
                  <linearGradient id="uploadGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="var(--accent)" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fill: 'var(--muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--muted)', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text)', fontSize: 12 }}
                  cursor={{ stroke: 'var(--border)' }}
                />
                <Area type="monotone" dataKey="uploads" stroke="var(--accent)" strokeWidth={2.5}
                      fill="url(#uploadGrad)" dot={{ fill: 'var(--accent)', r: 3, strokeWidth: 0 }} activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Recent Uploads */}
        <div className="card">
          <h2 className="section-title" style={{ marginBottom: '1rem' }}>
            <Upload size={16} style={{ color: 'var(--success)' }} /> Recent Uploads
          </h2>
          {filesLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: '3rem', borderRadius: '0.65rem' }} />)}
            </div>
          ) : files.length === 0 ? (
            <div className="empty-state" style={{ padding: '2rem 1rem' }}>
              <Files size={28} style={{ color: 'var(--muted)', opacity: 0.4 }} />
              <p style={{ fontSize: '0.8rem', color: 'var(--muted)', textAlign: 'center' }}>No files yet.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {files.slice(0, 6).map(f => {
                const ext = f.originalName?.split('.').pop()?.toUpperCase()?.slice(0, 3)
                return (
                  <motion.div
                    key={f._id}
                    whileHover={{ x: 3 }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.65rem',
                      padding: '0.55rem 0.65rem', borderRadius: '0.65rem',
                      cursor: 'default', transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'color-mix(in srgb, var(--border) 50%, transparent)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{
                      width: '2rem', height: '2rem', borderRadius: '0.45rem', flexShrink: 0,
                      background: 'var(--accent-soft)', color: 'var(--accent)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.6rem', fontWeight: 800,
                    }}>
                      {ext}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {f.originalName}
                      </p>
                      <p style={{ fontSize: '0.68rem', color: 'var(--muted)' }}>{relativeTime(f.createdAt)}</p>
                    </div>
                  </motion.div>
                )
              })}
              <Link to="/files" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem',
                marginTop: '0.5rem', padding: '0.5rem', borderRadius: '0.65rem',
                fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent)',
                textDecoration: 'none', background: 'var(--accent-soft)',
              }}>
                View all files <ArrowUpRight size={13} />
              </Link>
            </div>
          )}
        </div>
      </motion.div>

      {/* ── Recent Activity ── */}
      <motion.div className="card" {...fadeUp(0.3)}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h2 className="section-title">
            <Clock size={16} style={{ color: 'var(--warning)' }} /> Recent Vault Activity
          </h2>
          <Link to="/audit" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            View all <ArrowUpRight size={12} />
          </Link>
        </div>
        {auditLoading ? <SkeletonTable rows={4} /> : audits.length === 0 ? (
          <div className="empty-state" style={{ padding: '2.5rem 1rem' }}>
            <Clock size={28} style={{ color: 'var(--muted)', opacity: 0.4 }} />
            <p style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>No recent activity.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  {['Action', 'Resource', 'IP Address', 'Time'].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {audits.slice(0, 7).map(log => {
                  const ac = ACTION_COLORS[log.action] || ACTION_COLORS.UPLOAD
                  return (
                    <tr key={log._id || log.id}>
                      <td>
                        <span className={`badge ${ac.cls}`}>{log.action}</span>
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--muted)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {log.resourceId || '—'}
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--muted)' }}>{log.ipAddress || '—'}</td>
                      <td style={{ fontSize: '0.75rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>{relativeTime(log.createdAt)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  )
}
