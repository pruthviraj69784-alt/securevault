import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Shield, Users, Files, AlertTriangle, Activity,
  CheckCircle, XCircle, RefreshCw, Lock, HardDrive, ShieldAlert, CheckCircle2
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'
import { adminApi } from '../services/api'
import MetricCard from '../components/MetricCard'
import { SkeletonCard, SkeletonTable } from '../components/Skeletons'

function formatBytes(b = 0) {
  if (b < 1024 ** 2) return `${(b / 1024).toFixed(1)} KB`
  if (b < 1024 ** 3) return `${(b / 1024 ** 2).toFixed(1)} MB`
  return `${(b / 1024 ** 3).toFixed(2)} GB`
}

const COLORS = ['#7c4dff', '#34d399', '#f59e0b', '#ff5b6a', '#38bdf8']

export default function Admin() {
  const qc = useQueryClient()

  const { data: metricsRaw, isLoading: mLoading } = useQuery({
    queryKey: ['admin-metrics'],
    queryFn:  () => adminApi.metrics().then(r => r.data.data),
  })

  const { data: usersRaw, isLoading: uLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn:  () => adminApi.users().then(r => r.data.data),
  })

  const { data: flaggedRaw, isLoading: fLoading } = useQuery({
    queryKey: ['admin-flagged'],
    queryFn:  () => adminApi.flagged().then(r => r.data.data),
  })

  const metrics = metricsRaw || {}
  const users   = usersRaw   || []
  const flagged = flaggedRaw || []

  const ADMIN_METRICS = [
    { label: 'Total Users',   value: metrics.totalUsers   || 0,  icon: Users,  color: 'var(--accent)', sub: 'Active accounts' },
    { label: 'Total Files',   value: metrics.totalFiles   || 0,  icon: Files,  color: '#8b5cf6', sub: 'In system vault' },
    { label: 'Storage Used',  value: formatBytes(metrics.totalSize || 0), icon: HardDrive, color: 'var(--success)', sub: 'Aggregate volume' },
    { label: 'Flagged Files', value: metrics.flaggedFiles || 0,  icon: AlertTriangle, color: 'var(--danger)', sub: 'Threats isolated' },
  ]

  const uploadData = metrics.uploadsByDay || []
  const statusData = metrics.statusBreakdown
    ? Object.entries(metrics.statusBreakdown).map(([name, value]) => ({ name, value }))
    : [
        { name: 'READY',      value: metrics.readyFiles      || 0 },
        { name: 'PROCESSING', value: metrics.processingFiles || 0 },
        { name: 'INFECTED',   value: metrics.infectedFiles   || 0 },
      ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      <div className="page-header">
        <div className="page-header-left">
          <span className="page-tag" style={{ background: 'var(--warning-soft)', color: 'var(--warning)', borderColor: 'color-mix(in srgb, var(--warning) 25%, transparent)' }}>
            <Shield size={11} /> Threat Operations
          </span>
          <h1 className="page-title">Enterprise Admin Console</h1>
          <p className="page-sub">Monitor overall security posture, user fleets, and flagged threats from one command center.</p>
        </div>
        <button onClick={() => qc.invalidateQueries()} className="btn-ghost" style={{ fontSize: '0.8rem' }}>
          <RefreshCw size={14} /> Refresh All
        </button>
      </div>

      {/* Admin Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
        {mLoading
          ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          : ADMIN_METRICS.map((m, i) => <MetricCard key={m.label} index={i} {...m} />)
        }
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
        <motion.div className="card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={{ gridColumn: 'span 2' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <h2 className="section-title">
              <Activity size={16} style={{ color: 'var(--accent)' }} />
              Upload Activity Trend
            </h2>
            <span className="badge badge-info">Live telemetry</span>
          </div>
          {mLoading ? (
            <div className="skeleton" style={{ height: '200px', borderRadius: '0.75rem' }} />
          ) : uploadData.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--muted)', fontSize: '0.875rem' }}>No upload data available yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={uploadData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text)', fontSize: 12 }} />
                <Bar dataKey="count" fill="var(--accent)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </motion.div>

        <motion.div className="card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h2 className="section-title">
              <ShieldAlert size={16} style={{ color: 'var(--danger)' }} />
              Threat Surface
            </h2>
            <span className="badge badge-danger">Monitoring</span>
          </div>
          {mLoading ? (
            <div className="skeleton" style={{ height: '200px', borderRadius: '0.75rem' }} />
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={45} outerRadius={70}
                     dataKey="value" nameKey="name" paddingAngle={4}>
                  {statusData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text)', fontSize: 12 }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: 'var(--muted)' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
          <div style={{ marginTop: '0.875rem', padding: '0.65rem 0.85rem', borderRadius: '0.65rem', border: '1px solid var(--border)', background: 'color-mix(in srgb, var(--bg) 60%, transparent)', fontSize: '0.75rem', color: 'var(--muted)' }}>
            <p style={{ fontWeight: 700, color: 'var(--text)' }}>Security Posture</p>
            <p style={{ marginTop: '0.2rem' }}>Scans, quarantine statuses, and risky payloads summarized in real-time.</p>
          </div>
        </motion.div>
      </div>

      {/* Users table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
          <Users size={18} style={{ color: 'var(--accent)' }} />
          <h2 className="section-title" style={{ margin: 0 }}>Registered Users</h2>
          <span className="badge badge-info" style={{ marginLeft: 'auto' }}>{users.length}</span>
        </div>
        {uLoading ? <SkeletonTable rows={4} /> : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  {['Name', 'Email', 'Role', 'Files', 'Joined', 'Status'].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u._id}>
                    <td style={{ fontWeight: 600, color: 'var(--text)' }}>{u.name}</td>
                    <td style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>{u.email}</td>
                    <td>
                      <span className={u.role?.toLowerCase() === 'admin' ? 'badge badge-warning' : 'badge badge-info'}>{u.role}</span>
                    </td>
                    <td style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>{u.fileCount || 0}</td>
                    <td style={{ color: 'var(--muted)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                      {new Date(u.createdAt).toLocaleDateString('en', { dateStyle: 'medium' })}
                    </td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', fontWeight: 600 }}>
                        {u.isActive !== false
                          ? <><CheckCircle2 size={13} style={{ color: 'var(--success)' }} /><span style={{ color: 'var(--success)' }}>Active</span></>
                          : <><XCircle size={13} style={{ color: 'var(--muted)' }} /><span style={{ color: 'var(--muted)' }}>Inactive</span></>
                        }
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Flagged files */}
      {!fLoading && flagged.length > 0 && (
        <motion.div className="card" style={{ padding: 0, overflow: 'hidden', borderColor: 'color-mix(in srgb, var(--danger) 30%, var(--border))' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', background: 'var(--danger-soft)' }}>
            <AlertTriangle size={18} style={{ color: 'var(--danger)' }} />
            <h2 className="section-title" style={{ margin: 0, color: 'var(--danger)' }}>Infected / Flagged Files</h2>
            <span className="badge badge-danger" style={{ marginLeft: 'auto' }}>{flagged.length}</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  {['File Name', 'Owner', 'Signature', 'Flagged At'].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {flagged.map(f => (
                  <tr key={f._id}>
                    <td style={{ fontWeight: 600, color: 'var(--text)' }}>{f.originalName}</td>
                    <td style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>{f.owner?.email || f.owner}</td>
                    <td>
                      <span className="badge badge-danger">{f.flaggedVersion?.signature || 'Quarantine (ClamAV)'}</span>
                    </td>
                    <td style={{ color: 'var(--muted)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                      {new Date(f.updatedAt).toLocaleString('en', { dateStyle: 'medium', timeStyle: 'short' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </div>
  )
}
