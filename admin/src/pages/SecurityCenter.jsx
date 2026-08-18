import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ShieldCheck, ShieldAlert, Key, Laptop, AlertCircle, Lock, CheckCircle2 } from 'lucide-react'
import { adminApi } from '../services/api'

export default function SecurityCenter() {
  const { data } = useQuery({
    queryKey: ['admin-security'],
    queryFn: () => adminApi.security().then(r => r.data.data)
  })

  const security = data || { failedLogins: 0, blockedAccounts: 0, virusFiles: 0, zeroKnowledgePct: 45, encryptedPct: 100, threats: [] }

  const THREAT_CARDS = [
    { label: 'Failed Login Attempts', value: security.failedLogins, icon: AlertCircle, color: 'var(--accent)' },
    { label: 'Blocked Accounts', value: security.blockedAccounts, icon: ShieldAlert, color: 'var(--warning)' },
    { label: 'Infected / Virus Files', value: security.virusFiles, icon: ShieldAlert, color: 'var(--danger)' },
    { label: 'Zero Knowledge Ratio', value: `${security.zeroKnowledgePct}%`, icon: Lock, color: 'var(--success)' },
    { label: 'Server AES-256 Ratio', value: `${security.encryptedPct}%`, icon: ShieldCheck, color: 'var(--success)' },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-theme flex items-center gap-2">
          <ShieldAlert size={26} className="text-rose-500" /> Enterprise Security Center
        </h1>
        <p className="text-muted text-sm mt-1">Real-time threat detection, audit anomaly signals, and virus payload monitoring.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {THREAT_CARDS.map(m => (
          <div key={m.label} className="card flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `color-mix(in srgb, ${m.color} 15%, transparent)` }}>
              <m.icon size={22} style={{ color: m.color }} />
            </div>
            <div>
              <p className="text-2xl font-bold text-theme">{m.value}</p>
              <p className="text-xs font-semibold text-theme">{m.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Threats Log */}
      <div className="card space-y-4">
        <h2 className="font-bold text-theme text-sm flex items-center gap-2">
          <AlertCircle size={18} className="text-rose-500" /> Active Security Threat Feed
        </h2>
        {security.threats?.length === 0 ? (
          <div className="p-8 text-center text-muted text-xs">
            <CheckCircle2 size={24} className="mx-auto mb-2 text-emerald-500" />
            Zero security threats detected. All systems healthy.
          </div>
        ) : (
          <div className="space-y-2">
            {security.threats?.map(t => (
              <div key={t._id} className="flex items-center justify-between p-3 rounded-xl border border-rose-500/30 bg-rose-500/5 text-xs">
                <div>
                  <p className="font-bold text-theme">{t.originalName}</p>
                  <p className="text-[11px] text-muted">Owner: {t.owner?.email || 'Unknown'}</p>
                </div>
                <span className="badge badge-danger">Infected Payload</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
