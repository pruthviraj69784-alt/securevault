import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { toast } from 'react-toastify'
import {
  User, Mail, Calendar, Shield, HardDrive, Files,
  Lock, Trash2, KeyRound, CheckCircle2, Clock, Edit3, ShieldCheck
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { fileApi, authApi } from '../services/api'
import ProgressBar from '../components/ProgressBar'

function formatBytes(b = 0) {
  if (b < 1024) return `${b} B`
  if (b < 1024 ** 2) return `${(b / 1024).toFixed(1)} KB`
  if (b < 1024 ** 3) return `${(b / 1024 ** 2).toFixed(1)} MB`
  return `${(b / 1024 ** 3).toFixed(2)} GB`
}

const AVATAR_COLORS = [
  'linear-gradient(135deg,#7c4dff,#5628d9)',
  'linear-gradient(135deg,#34d399,#059669)',
  'linear-gradient(135deg,#f59e0b,#d97706)',
  'linear-gradient(135deg,#3b82f6,#2563eb)',
]
function avatarGradient(name = '') {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]
}

export default function Profile() {
  const { user, logout } = useAuth()
  const [showPassModal, setShowPassModal] = useState(false)
  const [loadingPass, setLoadingPass] = useState(false)
  const { register: passReg, handleSubmit: handlePassSubmit, reset: resetPass, formState: { errors: passErrors } } = useForm()

  const { data: filesData } = useQuery({
    queryKey: ['my-files'],
    queryFn:  () => fileApi.myFiles().then(r => r.data.data),
  })
  const files = filesData || []
  const totalSize = files.reduce((s, f) => s + (f.versions?.[f.versions.length - 1]?.size || 0), 0)
  const STORAGE_LIMIT = 100 * 1024 * 1024
  const usagePct = Math.min(100, Math.round((totalSize / STORAGE_LIMIT) * 100))
  const favoriteCount = files.filter(f => f.isFavorite).length

  const onChangePassword = async (data) => {
    setLoadingPass(true)
    try {
      await authApi.changePassword({ currentPassword: data.currentPassword, newPassword: data.newPassword })
      toast.success('Password changed successfully!')
      resetPass(); setShowPassModal(false)
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to change password') }
    finally { setLoadingPass(false) }
  }

  const handleDeleteAccount = async () => {
    if (window.confirm('Delete your account? ALL FILES AND DATA WILL BE PERMANENTLY REMOVED.')) {
      try { await authApi.deleteAccount(); toast.info('Account deleted.'); logout() }
      catch { toast.error('Failed to delete account.') }
    }
  }

  const stats = [
    { label: 'Files', value: files.length, Icon: Files, color: 'var(--accent)' },
    { label: 'Storage', value: formatBytes(totalSize), Icon: HardDrive, color: '#8b5cf6' },
    { label: 'Favorites', value: favoriteCount, Icon: Shield, color: 'var(--warning)' },
    { label: 'Role', value: user?.role || 'USER', Icon: ShieldCheck, color: 'var(--success)' },
  ]

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div>
        <span className="page-tag"><User size={11} /> Account</span>
        <h1 className="page-title">My Profile</h1>
        <p className="page-sub">Manage your account details and security settings.</p>
      </div>

      {/* Identity card */}
      <motion.div className="card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}
        style={{ position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '5rem', background: `linear-gradient(135deg, color-mix(in srgb, var(--accent) 18%, transparent), color-mix(in srgb, var(--success) 10%, transparent))`, borderRadius: 'inherit', borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }} />
        <div style={{ position: 'relative', paddingTop: '2.5rem', display: 'flex', alignItems: 'flex-end', gap: '1.25rem', flexWrap: 'wrap' }}>
          <motion.div
            style={{ width: '5rem', height: '5rem', borderRadius: '50%', background: avatarGradient(user?.name), color: '#fff', fontWeight: 800, fontSize: '1.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '4px solid var(--card)', boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}
            whileHover={{ scale: 1.05 }}
          >
            {user?.name?.[0]?.toUpperCase()}
          </motion.div>
          <div style={{ flex: 1, minWidth: 0, paddingBottom: '0.25rem' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text)' }}>{user?.name}</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Mail size={13} /> {user?.email}
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
              <span className="badge badge-info">{user?.role || 'USER'}</span>
              <span className="badge badge-success"><ShieldCheck size={10} /> Verified</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.875rem' }}>
        {stats.map(({ label, value, Icon, color }, i) => (
          <motion.div key={label} className="card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            style={{ textAlign: 'center', padding: '1.1rem 0.875rem' }}>
            <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '0.65rem', background: `color-mix(in srgb, ${color} 14%, transparent)`, border: `1px solid color-mix(in srgb, ${color} 22%, transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.6rem' }}>
              <Icon size={18} style={{ color }} />
            </div>
            <p style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text)' }}>{value}</p>
            <p style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: '0.2rem', fontWeight: 600 }}>{label}</p>
          </motion.div>
        ))}
      </div>

      {/* Storage */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
        <h2 className="section-title"><HardDrive size={16} style={{ color: '#8b5cf6' }} /> Storage Usage</h2>
        <ProgressBar progress={usagePct} color="#8b5cf6" height={8} showLabel />
        <p style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>{formatBytes(totalSize)} used of 100 MB</p>
      </div>

      {/* Security */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
        <h2 className="section-title"><Lock size={16} style={{ color: 'var(--success)' }} /> Account Security</h2>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.875rem 1rem', borderRadius: '0.75rem', border: '1px solid var(--border)', background: 'color-mix(in srgb, var(--bg) 60%, transparent)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <KeyRound size={18} style={{ color: 'var(--accent)' }} />
            <div>
              <p style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text)' }}>Password</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Change your account password</p>
            </div>
          </div>
          <motion.button onClick={() => setShowPassModal(true)} className="btn-ghost" style={{ fontSize: '0.8rem' }} whileHover={{ scale: 1.04 }}>
            <Edit3 size={13} /> Change
          </motion.button>
        </div>

        <div style={{ padding: '0.875rem 1rem', borderRadius: '0.75rem', border: '1px solid color-mix(in srgb, var(--danger) 25%, var(--border))', background: 'var(--danger-soft)' }}>
          <p style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--danger)', marginBottom: '0.35rem' }}>⚠️ Danger Zone</p>
          <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: '0.65rem' }}>Permanently delete your account and all associated data. This cannot be undone.</p>
          <motion.button onClick={handleDeleteAccount} className="btn-danger" style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }} whileHover={{ scale: 1.04 }}>
            <Trash2 size={13} /> Delete Account
          </motion.button>
        </div>
      </div>

      {/* Change Password Modal */}
      <AnimatePresence>
        {showPassModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
            onClick={() => setShowPassModal(false)}>
            <motion.div className="card" style={{ width: '100%', maxWidth: '26rem' }} initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '0.65rem', background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <KeyRound size={18} style={{ color: 'var(--accent)' }} />
                </div>
                <div>
                  <h3 style={{ fontWeight: 800, color: 'var(--text)', fontSize: '1rem' }}>Change Password</h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Enter your current and new password</p>
                </div>
              </div>
              <form onSubmit={handlePassSubmit(onChangePassword)} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                {[
                  { id: 'currentPassword', label: 'Current Password', rules: { required: 'Required' } },
                  { id: 'newPassword',     label: 'New Password',     rules: { required: 'Required', minLength: { value: 8, message: 'Min 8 chars' } } },
                  { id: 'confirmPassword', label: 'Confirm Password', rules: { required: 'Required' } },
                ].map(({ id, label, rules }) => (
                  <div key={id}>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.35rem' }}>{label}</label>
                    <input type="password" {...passReg(id, rules)} className="input-field" placeholder="••••••••" />
                    {passErrors[id] && <p style={{ fontSize: '0.72rem', color: 'var(--danger)', marginTop: '0.25rem' }}>{passErrors[id].message}</p>}
                  </div>
                ))}
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                  <button type="button" onClick={() => { setShowPassModal(false); resetPass() }} className="btn-ghost" style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
                  <button type="submit" disabled={loadingPass} className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                    {loadingPass ? 'Saving…' : 'Save Password'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
