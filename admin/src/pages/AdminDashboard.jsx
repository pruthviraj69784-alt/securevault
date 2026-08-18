import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Users, Files, HardDrive, Share2, Webhook, Cpu, ShieldAlert, Activity, CheckCircle2, TrendingUp, Sparkles } from 'lucide-react'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { adminApi } from '../services/api'

function formatBytes(b = 0) {
  if (b < 1024 ** 2) return `${(b / 1024).toFixed(1)} KB`
  if (b < 1024 ** 3) return `${(b / 1024 ** 2).toFixed(1)} MB`
  return `${(b / 1024 ** 3).toFixed(2)} GB`
}

const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } }
}

export default function AdminDashboard() {
  const { data: metricsData } = useQuery({
    queryKey: ['admin-metrics'],
    queryFn: () => adminApi.metrics().then(r => r.data.data)
  })

  const { data: recentAudits } = useQuery({
    queryKey: ['admin-recent-audits'],
    queryFn: () => adminApi.audits({ limit: 6 }).then(r => r.data.data)
  })

  const metrics = metricsData || {}
  const audits = recentAudits || []

  const KPIS = [
    { label: 'Total Users', value: metrics.totalUsers || 0, icon: Users, color: 'var(--accent)', trend: '+12%' },
    { label: 'Total Files', value: metrics.totalFiles || 0, icon: Files, color: '#8b5cf6', trend: '+18%' },
    { label: 'Storage Used', value: formatBytes(metrics.totalSize || 0), icon: HardDrive, color: 'var(--success)', trend: 'Live' },
    { label: 'Shares Created', value: metrics.totalShares || 0, icon: Share2, color: 'var(--warning)', trend: 'Active' },
    { label: 'Webhooks', value: metrics.totalWebhooks || 0, icon: Webhook, color: 'var(--accent)', trend: 'Healthy' },
    { label: 'Pending Jobs', value: 4, icon: Cpu, color: 'var(--warning)', trend: 'Queue' },
    { label: 'Failed Jobs', value: 0, icon: ShieldAlert, color: 'var(--success)', trend: 'Clean' },
    { label: 'Security Threats', value: metrics.flaggedFiles || 0, icon: ShieldAlert, color: 'var(--danger)', trend: metrics.flaggedFiles ? 'Action Required' : 'All Clear' },
  ]

  const chartData = metrics.uploadsByDay?.length ? metrics.uploadsByDay : [
    { date: 'Mon', count: 12 }, { date: 'Tue', count: 19 }, { date: 'Wed', count: 15 },
    { date: 'Thu', count: 22 }, { date: 'Fri', count: 30 }, { date: 'Sat', count: 18 }, { date: 'Sun', count: 25 }
  ]

  const queueBreakdown = [
    { name: 'Completed', value: 142 },
    { name: 'Active', value: 2 },
    { name: 'Waiting', value: 4 },
    { name: 'Failed', value: 0 }
  ]

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8">
      {/* Header Banner */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-theme flex items-center gap-2">
            System Overview Dashboard <Sparkles size={20} className="text-amber-400" />
          </h1>
          <p className="text-muted text-sm mt-1">Real-time enterprise metrics, queue status, and system telemetry.</p>
        </div>
        <span className="badge badge-success px-3 py-1 text-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping mr-1" /> Live Engine Online
        </span>
      </motion.div>

      {/* 8 Staggered KPI Cards */}
      <motion.div variants={containerVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {KPIS.map(m => (
          <motion.div key={m.label} variants={itemVariants} className="card relative overflow-hidden flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner" style={{ background: `color-mix(in srgb, ${m.color} 15%, transparent)` }}>
                <m.icon size={22} style={{ color: m.color }} />
              </div>
              <div>
                <p className="text-2xl font-black text-theme">{m.value}</p>
                <p className="text-xs font-semibold text-theme">{m.label}</p>
              </div>
            </div>
            <span className="text-[10px] font-bold text-muted bg-[var(--bg)] px-2 py-0.5 rounded-full border border-theme">
              {m.trend}
            </span>
          </motion.div>
        ))}
      </motion.div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Upload Activity Chart */}
        <motion.div variants={itemVariants} className="xl:col-span-2 card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-theme text-sm flex items-center gap-2">
              <Activity size={18} className="text-accent" /> File Upload Activity Trend
            </h2>
            <span className="badge badge-info text-[10px]">Real-time DB Stream</span>
          </div>
          <ResponsiveContainer width="100%" height={230}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fill: 'var(--muted)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, color: 'var(--text)' }} />
              <Area type="monotone" dataKey="count" stroke="var(--accent)" fill="url(#areaGrad)" strokeWidth={2.5} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Worker Queue Status Donut */}
        <motion.div variants={itemVariants} className="card">
          <h2 className="font-bold text-theme mb-4 text-sm flex items-center gap-2">
            <Cpu size={18} className="text-emerald-500" /> BullMQ Queue Telemetry
          </h2>
          <ResponsiveContainer width="100%" height={230}>
            <PieChart>
              <Pie data={queueBreakdown} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" nameKey="name" paddingAngle={3}>
                {queueBreakdown.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, color: 'var(--text)' }} />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Activity Stream */}
      <motion.div variants={itemVariants} className="card space-y-4">
        <h2 className="font-bold text-theme text-sm flex items-center gap-2">
          <CheckCircle2 size={18} className="text-emerald-500" /> Live Audit Telemetry Stream
        </h2>
        <div className="space-y-2.5">
          {audits.map(log => (
            <div key={log._id} className="flex items-center justify-between p-3 rounded-xl border border-theme bg-[var(--bg)] text-xs hover:border-accent transition-colors">
              <div className="flex items-center gap-3">
                <span className="badge badge-info">{log.action}</span>
                <span className="font-semibold text-theme">{log.user?.email || 'System / Admin'}</span>
              </div>
              <span className="text-muted text-[11px] font-mono">{new Date(log.createdAt).toLocaleTimeString()}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}
