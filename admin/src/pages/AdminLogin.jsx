import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { motion } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff, Shield, ShieldCheck, ArrowRight } from 'lucide-react'
import { toast } from 'react-toastify'
import { useAdminAuth } from '../context/AdminAuthContext'

export default function AdminLogin() {
  const { login } = useAdminAuth()
  const navigate = useNavigate()
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      email: 'admin0440@gmail.com',
      password: ''
    }
  })

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      await login(data.email, data.password)
      toast.success('Administrator authenticated successfully!')
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.message || err.response?.data?.message || 'Admin authentication failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[var(--bg)]">
      {/* Ambient background glows */}
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-sky-500/15 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-purple-500/15 blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Header Branding */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.1 }}
            className="inline-flex w-20 h-20 rounded-3xl items-center justify-center text-white font-black text-3xl mb-4 shadow-2xl relative"
            style={{ background: 'linear-gradient(135deg, var(--accent), #8b5cf6)' }}
          >
            <Shield size={38} className="drop-shadow-md" />
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 border-2 border-[var(--bg)] animate-pulse" />
          </motion.div>
          <h1 className="text-3xl font-black text-theme tracking-tight">SecureVault</h1>
          <p className="text-muted mt-1 text-xs font-mono uppercase tracking-widest flex items-center justify-center gap-1.5">
            <ShieldCheck size={14} className="text-emerald-500" /> Enterprise Admin Portal
          </p>
        </div>

        {/* Login Form Card */}
        <div className="card glass p-8 shadow-2xl relative overflow-hidden border border-theme">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-theme">
            <div>
              <h2 className="text-xl font-bold text-theme">Administrator Sign In</h2>
              <p className="text-xs text-muted mt-0.5">Port 3001 Restricted Access</p>
            </div>
            <span className="badge badge-info text-[10px]">VERIFIED</span>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-muted mb-1.5 uppercase tracking-wider">Admin Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  {...register('email', { required: 'Email is required' })}
                  type="email"
                  placeholder="admin0440@gmail.com"
                  className="input-field pl-10"
                />
              </div>
              {errors.email && <p className="mt-1 text-xs text-rose-500 font-semibold">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold text-muted mb-1.5 uppercase tracking-wider">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  {...register('password', { required: 'Password is required' })}
                  type={show ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="input-field pl-10 pr-10 font-mono"
                />
                <button type="button" onClick={() => setShow(s => !s)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted hover:text-theme">
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-rose-500 font-semibold">{errors.password.message}</p>}
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3 text-sm font-bold mt-2 shadow-lg">
              {loading ? (
                <span className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
              ) : (
                <>Authenticate Admin <ArrowRight size={16} /></>
              )}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-theme text-center">
            <p className="text-[11px] text-muted">
              Protected by 256-bit SSL & RSA token session guards.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
