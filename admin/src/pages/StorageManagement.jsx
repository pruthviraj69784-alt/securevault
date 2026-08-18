import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { HardDrive, Users, RefreshCw, Zap, Sliders, ArrowUpRight } from 'lucide-react'
import { adminApi } from '../services/api'
import ProgressBar from '../../../frontend/src/components/ProgressBar'

function formatBytes(b = 0) {
  if (b < 1024 ** 2) return `${(b / 1024).toFixed(1)} KB`
  if (b < 1024 ** 3) return `${(b / 1024 ** 2).toFixed(1)} MB`
  return `${(b / 1024 ** 3).toFixed(2)} GB`
}

export default function StorageManagement() {
  const { data: storageData } = useQuery({
    queryKey: ['admin-storage'],
    queryFn: () => adminApi.storage().then(r => r.data.data)
  })

  const { data: usersData } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => adminApi.users({ limit: 100 }).then(r => r.data.data)
  })

  const storage = storageData || { totalCapacity: 20000000000000, used: 18000000000, free: 19982000000000, avgPerUser: 13000000000 }
  const users = usersData || []

  const usagePct = Math.min(100, Math.round((storage.used / (20 * 1024 * 1024 * 1024 * 1024)) * 100))

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-theme flex items-center gap-2">
            <HardDrive size={26} className="text-purple-500" /> Storage Capacity & Allocation
          </h1>
          <p className="text-muted text-sm mt-1">S3 Object Storage pool telemetry and user quota management.</p>
        </div>
      </div>

      {/* Main Capacity Gauge Banner */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-theme">System Storage Capacity</h2>
            <p className="text-xs text-muted">Total S3 Object Store Allocation</p>
          </div>
          <span className="text-sm font-bold text-purple-500">{formatBytes(storage.used)} / 20 TB ({usagePct}%)</span>
        </div>

        <ProgressBar progress={usagePct || 5} color="#8b5cf6" />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="p-3 rounded-xl border border-theme bg-[var(--bg)]">
            <p className="text-xs text-muted">Total Capacity</p>
            <p className="text-lg font-bold text-theme">20.0 TB</p>
          </div>
          <div className="p-3 rounded-xl border border-theme bg-[var(--bg)]">
            <p className="text-xs text-muted">Used Storage</p>
            <p className="text-lg font-bold text-purple-500">{formatBytes(storage.used)}</p>
          </div>
          <div className="p-3 rounded-xl border border-theme bg-[var(--bg)]">
            <p className="text-xs text-muted">Available Free</p>
            <p className="text-lg font-bold text-emerald-500">19.9 TB</p>
          </div>
        </div>
      </div>

      {/* Top Storage Users Table */}
      <div className="card overflow-hidden p-0">
        <div className="px-5 py-4 border-b border-theme flex items-center justify-between">
          <h2 className="font-bold text-theme text-sm flex items-center gap-2">
            <Users size={18} className="text-accent" /> Top User Storage Allocation
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-theme bg-[var(--bg)]">
                {['User', 'Email', 'Role', 'Status'].map(h => (
                  <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-muted uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.slice(0, 5).map(u => (
                <tr key={u._id} className="border-b border-theme hover:bg-[var(--border)] transition-colors">
                  <td className="py-3 px-4 font-semibold text-theme">{u.name}</td>
                  <td className="py-3 px-4 text-muted">{u.email}</td>
                  <td className="py-3 px-4"><span className="badge badge-info">{u.role}</span></td>
                  <td className="py-3 px-4"><span className="badge badge-success">Active Quota (100MB)</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
