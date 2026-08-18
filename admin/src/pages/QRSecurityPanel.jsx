import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  QrCode, ShieldCheck, Clock, CheckCircle2, ShieldOff,
  AlertCircle, RefreshCw, Activity, Lock, Users, Radio
} from 'lucide-react'
import { adminApi } from '../services/api'

export default function QRSecurityPanel() {
  const [liveConnected, setLiveConnected] = useState(false)
  const [liveEvents, setLiveEvents] = useState([])

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-qr-stats'],
    queryFn: () => adminApi.qrStats().then(r => r.data.data),
    refetchInterval: 10000
  })

  useEffect(() => {
    const token = localStorage.getItem('sv_token')
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${window.location.hostname}:5000/ws?token=${token || ''}`

    let ws = null;
    try {
      ws = new WebSocket(wsUrl)

      ws.onopen = () => setLiveConnected(true)
      ws.onclose = () => setLiveConnected(false)
      ws.onerror = () => setLiveConnected(false)

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)
          if (msg.type === 'AUDIT_LOG' && msg.data?.action?.startsWith('QR_')) {
            setLiveEvents(prev => [msg.data, ...prev.slice(0, 19)])
            refetch()
          }
        } catch {}
      }
    } catch {}

    return () => {
      if (ws) ws.close()
    }
  }, [refetch])

  const baseStats = data || {
    createdCount: 0,
    scannedCount: 0,
    consumedCount: 0,
    revokedCount: 0,
    expiredCount: 0,
    recentEvents: []
  }

  const mergedEvents = liveEvents.length > 0
    ? [...liveEvents, ...baseStats.recentEvents.filter(e => !liveEvents.some(le => le._id === e._id))].slice(0, 20)
    : baseStats.recentEvents

  const stats = { ...baseStats, recentEvents: mergedEvents }

  const CARDS = [
    { label: 'Total Generated', value: stats.createdCount, icon: QrCode, color: 'var(--accent)' },
    { label: 'QR Scanned', value: stats.scannedCount, icon: Activity, color: '#3b82f6' },
    { label: 'Consumed (Single-Use)', value: stats.consumedCount, icon: CheckCircle2, color: '#10b981' },
    { label: 'Revoked by Owner', value: stats.revokedCount, icon: ShieldOff, color: '#f59e0b' },
    { label: 'Expired Sessions', value: stats.expiredCount, icon: Clock, color: '#ef4444' },
  ]

  const EVENT_BADGES = {
    QR_CREATED: { label: 'CREATED', color: 'badge-accent' },
    QR_SCANNED: { label: 'SCANNED', color: 'badge-info' },
    QR_AUTHENTICATION_SUCCESS: { label: 'VERIFIED', color: 'badge-success' },
    QR_CONSUMED: { label: 'CONSUMED', color: 'badge-success' },
    QR_REVOKED: { label: 'REVOKED', color: 'badge-warning' },
    QR_EXPIRED: { label: 'EXPIRED', color: 'badge-danger' },
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-theme flex items-center gap-2">
            <QrCode size={26} className="text-accent" /> QR Security & Session Telemetry
            {liveConnected ? (
              <span className="badge badge-success text-[10px] flex items-center gap-1 font-mono uppercase">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> WSS LIVE
              </span>
            ) : (
              <span className="badge badge-warning text-[10px] flex items-center gap-1 font-mono uppercase">
                POLLING
              </span>
            )}
          </h1>
          <p className="text-muted text-sm mt-1">Real-time monitoring of short-lived, single-use QR share sessions and authorization nonces.</p>
        </div>
        <button onClick={() => refetch()} className="btn-ghost flex items-center gap-2 text-xs">
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {CARDS.map(m => (
          <div key={m.label} className="card flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `color-mix(in srgb, ${m.color} 15%, transparent)` }}>
              <m.icon size={20} style={{ color: m.color }} />
            </div>
            <div>
              <p className="text-xl font-bold text-theme">{m.value}</p>
              <p className="text-[11px] font-semibold text-muted">{m.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* QR Architecture & Rules summary */}
      <div className="card space-y-3">
        <h2 className="font-bold text-theme text-sm flex items-center gap-2">
          <Lock size={16} className="text-accent" /> Active QR Security Controls
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-3 rounded-xl bg-[var(--bg)] border border-theme space-y-1">
            <p className="font-bold text-theme flex items-center gap-1.5"><Clock size={13} className="text-amber-400" /> Short TTL Expiry</p>
            <p className="text-muted">QR payload tokens automatically self-destruct in 60 seconds (stored in Redis with PTTL).</p>
          </div>
          <div className="p-3 rounded-xl bg-[var(--bg)] border border-theme space-y-1">
            <p className="font-bold text-theme flex items-center gap-1.5"><CheckCircle2 size={13} className="text-emerald-400" /> Single-Use Execution</p>
            <p className="text-muted">Payload is deleted immediately upon file consumption, rendering replay attacks impossible.</p>
          </div>
          <div className="p-3 rounded-xl bg-[var(--bg)] border border-theme space-y-1">
            <p className="font-bold text-theme flex items-center gap-1.5"><ShieldCheck size={13} className="text-accent" /> Cryptographic Nonce</p>
            <p className="text-muted">High-entropy cryptographic nonces bind the session to the authenticated recipient identity.</p>
          </div>
        </div>
      </div>

      {/* Live QR Audit Log */}
      <div className="card space-y-4">
        <h2 className="font-bold text-theme text-sm flex items-center gap-2">
          <Activity size={16} className="text-accent" /> Live QR Audit Feed
        </h2>
        {stats.recentEvents.length === 0 ? (
          <div className="p-8 text-center text-muted text-xs">
            <CheckCircle2 size={24} className="mx-auto mb-2 text-emerald-500" />
            No QR session audit events recorded yet.
          </div>
        ) : (
          <div className="space-y-2">
            {stats.recentEvents.map(evt => {
              const badge = EVENT_BADGES[evt.action] || { label: evt.action, color: 'badge-accent' }
              return (
                <div key={evt._id} className="flex items-center justify-between p-3 rounded-xl border border-theme bg-[var(--bg)] text-xs">
                  <div className="flex items-center gap-3">
                    <span className={`badge ${badge.color}`}>{badge.label}</span>
                    <div>
                      <p className="font-semibold text-theme">{evt.details?.filename || evt.targetResource || 'QR Session'}</p>
                      <p className="text-[11px] text-muted">User: {evt.user?.email || evt.user || 'Anonymous'} | IP: {evt.ipAddress || '—'}</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono text-muted">{new Date(evt.createdAt).toLocaleTimeString()}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
