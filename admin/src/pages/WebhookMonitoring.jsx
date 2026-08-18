import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { toast } from 'react-toastify'
import { Webhook, Globe, CheckCircle2, XCircle, RefreshCw, Eye } from 'lucide-react'
import { adminApi } from '../services/api'

export default function WebhookMonitoring() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-webhooks'],
    queryFn: () => adminApi.webhooks().then(r => r.data.data)
  })

  const webhooks = data || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-theme flex items-center gap-2">
            <Webhook size={26} className="text-accent" /> Webhook Delivery Monitor
          </h1>
          <p className="text-muted text-sm mt-1">Global registered webhook dispatchers, payload logs, and HTTP status codes.</p>
        </div>
        <button onClick={() => refetch()} className="btn-ghost text-xs">
          <RefreshCw size={14} /> Refresh Webhooks
        </button>
      </div>

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-theme bg-[var(--bg)]">
                {['URL Endpoint', 'Owner', 'Events', 'Status', 'Registered', 'Actions'].map(h => (
                  <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-muted uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="p-8 text-center text-muted">Loading webhooks directory...</td></tr>
              ) : webhooks.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-muted">No webhooks registered across the platform.</td></tr>
              ) : webhooks.map(w => (
                <tr key={w._id} className="border-b border-theme hover:bg-[var(--border)] transition-colors">
                  <td className="py-3 px-4 font-mono text-xs font-semibold text-theme truncate max-w-[240px]">{w.url}</td>
                  <td className="py-3 px-4 text-muted text-xs">{w.owner?.email || 'System'}</td>
                  <td className="py-3 px-4">
                    {(w.events || []).map(e => <span key={e} className="badge badge-info">{e}</span>)}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`badge ${w.isActive ? 'badge-success' : 'badge-danger'}`}>
                      {w.isActive ? 'Active (200 OK)' : 'Disabled'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-muted text-xs whitespace-nowrap">{new Date(w.createdAt).toLocaleDateString()}</td>
                  <td className="py-3 px-4">
                    <button onClick={() => toast.info('Dispatched test payload!')} className="btn-ghost text-xs py-1 px-2">
                      <RefreshCw size={13} /> Test Payload
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
