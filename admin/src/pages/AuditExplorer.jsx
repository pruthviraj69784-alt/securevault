import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ClipboardList, Search, Filter, Download } from 'lucide-react'
import { adminApi } from '../services/api'

export default function AuditExplorer() {
  const [search, setSearch] = useState('')
  const [severityFilter, setSeverityFilter] = useState('ALL')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-audits', search],
    queryFn: () => adminApi.audits({ search, limit: 50 }).then(r => r.data.data)
  })

  const audits = data || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-theme flex items-center gap-2">
            <ClipboardList size={26} className="text-accent" /> Global Audit Explorer
          </h1>
          <p className="text-muted text-sm mt-1">Full system-wide audit telemetry across all users and admin actions.</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search action or user..." className="input-field pl-10" />
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-theme bg-[var(--bg)]">
                {['Action', 'User', 'Resource ID', 'IP Address', 'User Agent', 'Timestamp'].map(h => (
                  <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-muted uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="p-8 text-center text-muted">Loading global audits...</td></tr>
              ) : audits.map(log => (
                <tr key={log._id} className="border-b border-theme hover:bg-[var(--border)] transition-colors">
                  <td className="py-3 px-4"><span className="badge badge-info">{log.action}</span></td>
                  <td className="py-3 px-4 font-semibold text-theme text-xs">{log.user?.email || 'System / Admin'}</td>
                  <td className="py-3 px-4 font-mono text-xs text-muted truncate max-w-[140px]">{log.resourceId || '—'}</td>
                  <td className="py-3 px-4 font-mono text-xs text-muted">{log.ipAddress || '127.0.0.1'}</td>
                  <td className="py-3 px-4 text-xs text-muted truncate max-w-[180px]">{log.userAgent || '—'}</td>
                  <td className="py-3 px-4 text-xs text-muted whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
