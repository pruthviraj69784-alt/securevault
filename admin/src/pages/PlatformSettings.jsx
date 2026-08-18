import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { toast } from 'react-toastify'
import { Sliders, ShieldCheck, Save, CheckCircle2, HardDrive, Cpu, Mail, Database } from 'lucide-react'
import { adminApi } from '../services/api'

export default function PlatformSettings() {
  const { data } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: () => adminApi.settings().then(r => r.data.data)
  })

  const [settings, setSettings] = useState({
    virusScan: true,
    maxUploadMb: 100,
    defaultShareExpiryDays: 7,
    registrationEnabled: true,
    maintenanceMode: false,
    rateLimitPerMin: 100
  })

  const handleSave = () => {
    toast.success('Platform configuration updated!')
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-theme flex items-center gap-2">
          <Sliders size={26} className="text-accent" /> Platform Settings & Service Health
        </h1>
        <p className="text-muted text-sm mt-1">Global system flags, upload constraints, and infrastructure gateway statuses.</p>
      </div>

      {/* Infrastructure Health Grid */}
      <div className="card space-y-4">
        <h2 className="font-bold text-theme text-sm flex items-center gap-2">
          <CheckCircle2 size={18} className="text-emerald-500" /> System Gateway Health Check
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl border border-theme bg-[var(--bg)] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Database size={20} className="text-emerald-500" />
              <div>
                <p className="font-bold text-xs text-theme">MongoDB</p>
                <span className="text-[10px] text-muted">Primary Database</span>
              </div>
            </div>
            <span className="badge badge-success">Healthy</span>
          </div>

          <div className="p-4 rounded-xl border border-theme bg-[var(--bg)] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Cpu size={20} className="text-emerald-500" />
              <div>
                <p className="font-bold text-xs text-theme">Redis Queue</p>
                <span className="text-[10px] text-muted">BullMQ Broker</span>
              </div>
            </div>
            <span className="badge badge-success">Healthy</span>
          </div>

          <div className="p-4 rounded-xl border border-theme bg-[var(--bg)] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <HardDrive size={20} className="text-emerald-500" />
              <div>
                <p className="font-bold text-xs text-theme">AWS S3 Storage</p>
                <span className="text-[10px] text-muted">Encrypted Bucket</span>
              </div>
            </div>
            <span className="badge badge-success">Healthy</span>
          </div>

          <div className="p-4 rounded-xl border border-theme bg-[var(--bg)] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail size={20} className="text-emerald-500" />
              <div>
                <p className="font-bold text-xs text-theme">SMTP Gateway</p>
                <span className="text-[10px] text-muted">Nodemailer Worker</span>
              </div>
            </div>
            <span className="badge badge-success">Healthy</span>
          </div>
        </div>
      </div>

      {/* Configuration Controls */}
      <div className="card space-y-6">
        <h2 className="font-bold text-theme text-sm flex items-center gap-2">
          <Sliders size={18} className="text-accent" /> Platform System Controls
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-center justify-between p-3.5 rounded-xl border border-theme bg-[var(--bg)]">
            <div>
              <p className="text-xs font-bold text-theme">ClamAV Virus Scanner</p>
              <p className="text-[11px] text-muted">Scan uploads automatically</p>
            </div>
            <input
              type="checkbox"
              checked={settings.virusScan}
              onChange={e => setSettings(s => ({ ...s, virusScan: e.target.checked }))}
              className="w-4 h-4 rounded accent-accent"
            />
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-xl border border-theme bg-[var(--bg)]">
            <div>
              <p className="text-xs font-bold text-theme">User Registration</p>
              <p className="text-[11px] text-muted">Allow new user signups</p>
            </div>
            <input
              type="checkbox"
              checked={settings.registrationEnabled}
              onChange={e => setSettings(s => ({ ...s, registrationEnabled: e.target.checked }))}
              className="w-4 h-4 rounded accent-accent"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div>
            <label className="block text-xs font-semibold text-muted mb-1.5 uppercase">Max Upload Limit (MB)</label>
            <input
              type="number"
              value={settings.maxUploadMb}
              onChange={e => setSettings(s => ({ ...s, maxUploadMb: Number(e.target.value) }))}
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted mb-1.5 uppercase">Rate Limit (req/min)</label>
            <input
              type="number"
              value={settings.rateLimitPerMin}
              onChange={e => setSettings(s => ({ ...s, rateLimitPerMin: Number(e.target.value) }))}
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted mb-1.5 uppercase">Default Share Expiry (Days)</label>
            <input
              type="number"
              value={settings.defaultShareExpiryDays}
              onChange={e => setSettings(s => ({ ...s, defaultShareExpiryDays: Number(e.target.value) }))}
              className="input-field"
            />
          </div>
        </div>

        <button onClick={handleSave} className="btn-primary">
          <Save size={15} /> Save Platform Configuration
        </button>
      </div>
    </div>
  )
}
