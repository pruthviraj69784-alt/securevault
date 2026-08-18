import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'react-toastify'
import { useNavigate } from 'react-router-dom'
import {
  Bell, CheckCheck, Trash2, Info, AlertTriangle, CheckCircle2,
  XCircle, Upload, Share2, ShieldAlert, ArrowUpRight, Check
} from 'lucide-react'
import { notifApi } from '../services/api'
import { SkeletonTable } from '../components/Skeletons'

function relativeTime(date) {
  if (!date) return '—'
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

const TYPE_CONFIG = {
  INFO:          { Icon: Info,         color: 'var(--info)',    bg: 'var(--info-soft)' },
  WARNING:       { Icon: AlertTriangle,color: 'var(--warning)', bg: 'var(--warning-soft)' },
  SUCCESS:       { Icon: CheckCircle2, color: 'var(--success)', bg: 'var(--success-soft)' },
  ERROR:         { Icon: XCircle,      color: 'var(--danger)',  bg: 'var(--danger-soft)' },
  UPLOAD:        { Icon: Upload,       color: 'var(--accent)',  bg: 'var(--accent-soft)' },
  FILE_SHARED:   { Icon: Share2,       color: 'var(--info)',    bg: 'var(--info-soft)' },
  SHARE_ACCEPTED:{ Icon: CheckCircle2, color: 'var(--success)', bg: 'var(--success-soft)' },
  SHARE_DECLINED:{ Icon: XCircle,      color: 'var(--danger)',  bg: 'var(--danger-soft)' },
  SHARE_REVOKED: { Icon: ShieldAlert,  color: 'var(--danger)',  bg: 'var(--danger-soft)' },
}

export default function Notifications() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [filter, setFilter] = useState('ALL') // 'ALL', 'UNREAD', 'READ'

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn:  async () => {
      const res = await notifApi.list()
      const raw = res.data?.data
      if (Array.isArray(raw)) return raw
      if (raw && Array.isArray(raw.notifications)) return raw.notifications
      return []
    },
  })

  const notifs = Array.isArray(data) ? data : []
  const unreadCount = notifs.filter(n => !n.isRead).length

  const filteredNotifs = notifs.filter(n => {
    if (filter === 'UNREAD') return !n.isRead
    if (filter === 'READ') return n.isRead
    return true
  })

  const markAllRead = async () => {
    try {
      await notifApi.markAllRead()
      qc.invalidateQueries(['notifications'])
      qc.invalidateQueries(['notifications-unread-count'])
      toast.success('All notifications marked as read')
    } catch {
      toast.error('Failed to mark notifications as read')
    }
  }

  const deleteNotif = async (e, id) => {
    e.stopPropagation()
    try {
      await notifApi.delete(id)
      qc.invalidateQueries(['notifications'])
      qc.invalidateQueries(['notifications-unread-count'])
      toast.success('Notification removed')
    } catch {
      toast.error('Failed to remove notification')
    }
  }

  const handleCardClick = (n) => {
    if (n.actionUrl) {
      navigate(n.actionUrl)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="page-header">
        <div className="page-header-left">
          <span className="page-tag"><Bell size={11} /> Activity</span>
          <h1 className="page-title">Notifications</h1>
          <p className="page-sub">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}` : 'You are all caught up!'}
          </p>
        </div>
        {unreadCount > 0 && (
          <motion.button onClick={markAllRead} className="btn-ghost" style={{ fontSize: '0.8rem' }} whileHover={{ scale: 1.04 }}>
            <CheckCheck size={15} /> Mark all read
          </motion.button>
        )}
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
        {[
          { key: 'ALL', label: `All (${notifs.length})` },
          { key: 'UNREAD', label: `Unread (${unreadCount})` },
          { key: 'READ', label: `Read (${notifs.length - unreadCount})` }
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={filter === t.key ? 'btn-primary' : 'btn-ghost'}
            style={{ fontSize: '0.78rem', padding: '0.35rem 0.85rem', borderRadius: '0.5rem' }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <SkeletonTable rows={5} />
      ) : filteredNotifs.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-state-icon"><Bell size={26} style={{ color: 'var(--accent)' }} /></div>
          <h3>{filter === 'UNREAD' ? 'No unread notifications' : 'No notifications'}</h3>
          <p>Important security events and collaboration updates will appear here.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          <AnimatePresence>
            {filteredNotifs.map((n, i) => {
              const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.INFO
              const Icon = cfg.Icon
              const notifId = n._id || n.id

              return (
                <motion.div
                  key={notifId || i}
                  className="card"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: 15 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => handleCardClick(n)}
                  style={{
                    cursor: n.actionUrl ? 'pointer' : 'default',
                    borderColor: !n.isRead ? `color-mix(in srgb, ${cfg.color} 30%, var(--border))` : 'var(--border)',
                    background: !n.isRead ? `color-mix(in srgb, ${cfg.bg} 40%, var(--bg-card))` : 'var(--bg-card)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.875rem' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.875rem', flex: 1, minWidth: 0 }}>
                      <div style={{
                        width: '2.5rem', height: '2.5rem', borderRadius: '0.65rem',
                        background: cfg.bg, border: `1px solid color-mix(in srgb, ${cfg.color} 25%, transparent)`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                      }}>
                        <Icon size={16} style={{ color: cfg.color }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <p style={{ fontWeight: !n.isRead ? 700 : 600, fontSize: '0.875rem', color: 'var(--text)' }}>
                            {n.title}
                          </p>
                          {!n.isRead && (
                            <span className="badge badge-warning" style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}>New</span>
                          )}
                        </div>
                        {n.message && (
                          <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '0.25rem', lineHeight: 1.5 }}>
                            {n.message}
                          </p>
                        )}
                        {n.actionUrl && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--accent)', fontSize: '0.75rem', fontWeight: 600, marginTop: '0.4rem' }}>
                            <span>View details</span>
                            <ArrowUpRight size={12} />
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                        {relativeTime(n.createdAt)}
                      </span>
                      <button
                        onClick={(e) => deleteNotif(e, notifId)}
                        className="btn-icon"
                        style={{ color: 'var(--danger)', padding: '0.35rem' }}
                        title="Delete notification"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
