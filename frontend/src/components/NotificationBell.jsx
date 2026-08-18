import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, Check, Trash2, ExternalLink, ShieldAlert, CheckCircle2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data: countData } = useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: () => api.get('/notifications/unread-count').then(r => r.data.data),
    refetchInterval: 15000
  })

  const { data: listData } = useQuery({
    queryKey: ['notifications-list-top'],
    queryFn: () => api.get('/notifications?limit=6').then(r => r.data.data),
    enabled: open
  })

  const markReadMutation = useMutation({
    mutationFn: id => api.patch(`/notifications/${id}/read`),
    onSuccess: () => {
      qc.invalidateQueries(['notifications-unread-count'])
      qc.invalidateQueries(['notifications-list-top'])
    }
  })

  const markAllReadMutation = useMutation({
    mutationFn: () => api.patch('/notifications/read-all'),
    onSuccess: () => {
      qc.invalidateQueries(['notifications-unread-count'])
      qc.invalidateQueries(['notifications-list-top'])
    }
  })

  const unreadCount = countData?.count || 0
  const notifications = listData?.notifications || []

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2.5 rounded-xl border border-theme bg-[var(--card)] hover:bg-[var(--border)] transition-colors text-theme"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse shadow-md">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="absolute right-0 mt-2 w-80 sm:w-96 card glass z-50 p-4 shadow-2xl border border-theme"
            >
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-theme">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-theme text-sm">Notifications</h3>
                  {unreadCount > 0 && <span className="badge badge-warning text-[10px]">{unreadCount} new</span>}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllReadMutation.mutate()}
                    className="text-xs text-accent hover:underline flex items-center gap-1 font-semibold"
                  >
                    <Check size={12} /> Mark all read
                  </button>
                )}
              </div>

              <div className="space-y-2 max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="text-center py-6 text-muted text-xs">
                    <CheckCircle2 size={24} className="mx-auto mb-2 text-emerald-500 opacity-60" />
                    No notifications yet.
                  </div>
                ) : (
                  notifications.map(n => (
                    <div
                      key={n._id}
                      onClick={() => {
                        if (!n.isRead) markReadMutation.mutate(n._id)
                        if (n.actionUrl) { navigate(n.actionUrl); setOpen(false) }
                      }}
                      className={`p-3 rounded-xl border border-theme cursor-pointer transition-colors text-xs space-y-1 ${!n.isRead ? 'bg-accent/10 border-accent/30 font-semibold' : 'bg-[var(--bg)] opacity-80'}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-theme truncate max-w-[200px]">{n.title}</span>
                        <span className="text-[10px] text-muted">{new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-muted text-[11px] leading-relaxed">{n.message}</p>
                    </div>
                  ))
                )}
              </div>

              <div className="pt-3 mt-3 border-t border-theme text-center">
                <button
                  onClick={() => { navigate('/notifications'); setOpen(false) }}
                  className="text-xs font-bold text-accent hover:underline inline-flex items-center gap-1"
                >
                  View All Notifications <ExternalLink size={12} />
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
