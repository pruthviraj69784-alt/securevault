import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mail, Lock, Eye, EyeOff, Shield, ShieldCheck,
  Share2, Fingerprint, ArrowRight, Sparkles, Zap
} from 'lucide-react'
import { toast } from 'react-toastify'
import { useAuth } from '../context/AuthContext'

/* ─── Animated Canvas Background ─── */
function ParticleCanvas() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let animId
    let w = canvas.width = window.innerWidth
    let h = canvas.height = window.innerHeight

    const particles = Array.from({ length: 70 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 1.5 + 0.4,
      dx: (Math.random() - 0.5) * 0.4,
      dy: (Math.random() - 0.5) * 0.4,
      o: Math.random() * 0.5 + 0.15,
    }))

    const resize = () => {
      w = canvas.width = window.innerWidth
      h = canvas.height = window.innerHeight
    }
    window.addEventListener('resize', resize)

    const draw = () => {
      ctx.clearRect(0, 0, w, h)

      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 130) {
            ctx.beginPath()
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.strokeStyle = `rgba(116,70,244,${0.15 * (1 - dist / 130)})`
            ctx.lineWidth = 0.6
            ctx.stroke()
          }
        }
      }

      // Draw particles
      particles.forEach(p => {
        p.x += p.dx
        p.y += p.dy
        if (p.x < 0 || p.x > w) p.dx *= -1
        if (p.y < 0 || p.y > h) p.dy *= -1

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(139,97,255,${p.o})`
        ctx.fill()
      })

      animId = requestAnimationFrame(draw)
    }

    draw()
    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }} />
}

/* ─── Feature badges ─── */
const features = [
  { icon: Lock, label: 'AES-256 Encrypted' },
  { icon: Fingerprint, label: 'Zero-Knowledge' },
  { icon: ShieldCheck, label: 'SOC-2 Inspired' },
  { icon: Share2, label: 'Secure Sharing' },
]

/* ─── Main Login ─── */
export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [focusedField, setFocusedField] = useState(null)

  const { register, handleSubmit, formState: { errors } } = useForm()

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      await login(data.email, data.password)
      toast.success('Welcome back! 👋')
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed. Check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.page}>
      <ParticleCanvas />

      {/* Glow orbs */}
      <div style={styles.orbTopRight} />
      <div style={styles.orbBottomLeft} />
      <div style={styles.orbCenter} />

      <motion.div
        style={styles.shell}
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* ── Left Brand Panel ── */}
        <motion.section
          style={styles.brandPanel}
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
        >
          <div style={styles.brandInner}>
            {/* Logo */}
            <motion.div
              style={styles.logoWrap}
              whileHover={{ scale: 1.05, rotate: 3 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              <Shield size={30} color="#fff" />
              <div style={styles.logoPulse} />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              <p style={styles.brandTag}>
                <Sparkles size={11} style={{ display: 'inline', marginRight: 4 }} />
                Private by design
              </p>
              <h1 style={styles.brandTitle}>
                Security for every<br />
                <span style={styles.gradientText}>file, link &amp; decision.</span>
              </h1>
              <p style={styles.brandSub}>
                SecureVault combines encrypted storage, controlled sharing, and a complete audit trail in one elegant workspace.
              </p>
            </motion.div>

            {/* Feature badges */}
            <div style={styles.featureGrid}>
              {features.map(({ icon: Icon, label }, i) => (
                <motion.div
                  key={label}
                  style={styles.featureBadge}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 + i * 0.07 }}
                  whileHover={{ y: -2, borderColor: 'rgba(116,70,244,0.5)' }}
                >
                  <div style={styles.featureIconWrap}>
                    <Icon size={13} color="#8b61ff" />
                  </div>
                  <span style={styles.featureLabel}>{label}</span>
                </motion.div>
              ))}
            </div>

            {/* Animated stat strip */}
            <motion.div
              style={styles.statStrip}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.65 }}
            >
              {[['10K+', 'Users Protected'], ['99.9%', 'Uptime'], ['256-bit', 'Encryption']].map(([val, lbl]) => (
                <div key={lbl} style={styles.stat}>
                  <span style={styles.statVal}>{val}</span>
                  <span style={styles.statLbl}>{lbl}</span>
                </div>
              ))}
            </motion.div>
          </div>
        </motion.section>

        {/* ── Right Glass Form ── */}
        <motion.div
          style={styles.glassCard}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, delay: 0.15 }}
        >
          {/* Card header */}
          <div style={styles.cardHeader}>
            <div style={styles.cardLogoSmall}>
              <Shield size={17} color="#fff" />
            </div>
            <div>
              <p style={styles.cardTitle}>SecureVault</p>
              <p style={styles.cardSub}>Encrypted workspace access</p>
            </div>
            <div style={{ marginLeft: 'auto' }}>
              <span style={styles.liveBadge}>
                <span style={styles.liveDot} />
                Secured
              </span>
            </div>
          </div>

          <div style={styles.divider} />

          <h2 style={styles.formTitle}>Sign in to your account</h2>
          <p style={styles.formSub}>Enter your credentials to continue</p>

          <form onSubmit={handleSubmit(onSubmit)} style={{ marginTop: '1.5rem' }}>
            {/* Email */}
            <div style={styles.fieldWrap}>
              <label style={styles.label}>Email address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={15} style={{ ...styles.fieldIcon, color: focusedField === 'email' ? '#8b61ff' : '#6b7280' }} />
                <input
                  {...register('email', {
                    required: 'Email is required',
                    pattern: { value: /\S+@\S+\.\S+/, message: 'Invalid email' }
                  })}
                  type="email"
                  placeholder="you@example.com"
                  id="login-email"
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  style={{
                    ...styles.input,
                    ...(focusedField === 'email' ? styles.inputFocused : {}),
                    ...(errors.email ? styles.inputError : {}),
                  }}
                />
              </div>
              <AnimatePresence>
                {errors.email && (
                  <motion.p
                    style={styles.errorMsg}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    {errors.email.message}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            {/* Password */}
            <div style={{ ...styles.fieldWrap, marginTop: '1rem' }}>
              <label style={styles.label}>Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} style={{ ...styles.fieldIcon, color: focusedField === 'password' ? '#8b61ff' : '#6b7280' }} />
                <input
                  {...register('password', { required: 'Password is required' })}
                  type={show ? 'text' : 'password'}
                  placeholder="••••••••"
                  id="login-password"
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  style={{
                    ...styles.input,
                    paddingRight: '2.8rem',
                    ...(focusedField === 'password' ? styles.inputFocused : {}),
                    ...(errors.password ? styles.inputError : {}),
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShow(s => !s)}
                  style={styles.eyeBtn}
                >
                  {show ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <AnimatePresence>
                {errors.password && (
                  <motion.p
                    style={styles.errorMsg}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    {errors.password.message}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            {/* Submit */}
            <motion.button
              type="submit"
              id="login-submit"
              disabled={loading}
              style={styles.submitBtn}
              whileHover={!loading ? { scale: 1.02, boxShadow: '0 8px 28px rgba(116,70,244,0.45)' } : {}}
              whileTap={!loading ? { scale: 0.98 } : {}}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={styles.spinner} />
                  Signing in…
                </span>
              ) : (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  Sign In
                  <ArrowRight size={16} />
                </span>
              )}
            </motion.button>
          </form>

          <p style={styles.switchText}>
            Don&apos;t have an account?{' '}
            <Link to="/register" style={styles.switchLink}>
              Create account <Zap size={12} style={{ display: 'inline' }} />
            </Link>
          </p>

          {/* Security footer */}
          <div style={styles.secureFooter}>
            <ShieldCheck size={13} color="#35d38a" />
            <span>256-bit SSL • Zero-knowledge architecture</span>
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}

/* ─── Inline Styles ─── */
const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1.5rem',
    background: 'linear-gradient(135deg, #04080f 0%, #070d1a 50%, #0a0818 100%)',
    position: 'relative',
    overflow: 'hidden',
  },
  orbTopRight: {
    position: 'fixed',
    top: '-8rem',
    right: '-6rem',
    width: '28rem',
    height: '28rem',
    borderRadius: '9999px',
    background: 'radial-gradient(circle, rgba(116,70,244,0.22) 0%, transparent 70%)',
    filter: 'blur(2px)',
    pointerEvents: 'none',
    zIndex: 0,
  },
  orbBottomLeft: {
    position: 'fixed',
    bottom: '-6rem',
    left: '-5rem',
    width: '22rem',
    height: '22rem',
    borderRadius: '9999px',
    background: 'radial-gradient(circle, rgba(53,211,138,0.14) 0%, transparent 70%)',
    pointerEvents: 'none',
    zIndex: 0,
  },
  orbCenter: {
    position: 'fixed',
    top: '40%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '40rem',
    height: '20rem',
    borderRadius: '9999px',
    background: 'radial-gradient(ellipse, rgba(116,70,244,0.07) 0%, transparent 70%)',
    pointerEvents: 'none',
    zIndex: 0,
  },
  shell: {
    width: 'min(100%, 1100px)',
    display: 'grid',
    gridTemplateColumns: '1.15fr 0.85fr',
    gap: '1.5rem',
    alignItems: 'center',
    position: 'relative',
    zIndex: 1,
  },
  brandPanel: {
    background: 'linear-gradient(145deg, rgba(11,18,36,0.95), rgba(7,13,26,0.98))',
    border: '1px solid rgba(116,70,244,0.18)',
    borderRadius: '1.5rem',
    backdropFilter: 'blur(24px)',
    boxShadow: '0 24px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)',
    padding: '2.5rem',
    position: 'relative',
    overflow: 'hidden',
  },
  brandInner: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.4rem',
  },
  logoWrap: {
    width: '3.5rem',
    height: '3.5rem',
    borderRadius: '1rem',
    background: 'linear-gradient(135deg, #7446f4, #5628d9)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 8px 24px rgba(116,70,244,0.45)',
    position: 'relative',
    cursor: 'default',
  },
  logoPulse: {
    position: 'absolute',
    inset: '-4px',
    borderRadius: '1.2rem',
    border: '1px solid rgba(116,70,244,0.35)',
    animation: 'pulse-ring 3s ease-in-out infinite',
  },
  brandTag: {
    fontSize: '0.7rem',
    fontWeight: 700,
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
    color: '#8b61ff',
    marginBottom: '0.5rem',
  },
  brandTitle: {
    fontSize: 'clamp(1.6rem, 2.8vw, 2.4rem)',
    fontWeight: 800,
    lineHeight: 1.15,
    color: '#f0f2ff',
    letterSpacing: '-0.02em',
  },
  gradientText: {
    background: 'linear-gradient(90deg, #8b61ff, #35d38a)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  brandSub: {
    fontSize: '0.875rem',
    color: '#6b7a9a',
    lineHeight: 1.65,
    maxWidth: '30rem',
  },
  featureGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '0.55rem',
  },
  featureBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.55rem 0.8rem',
    borderRadius: '0.65rem',
    border: '1px solid rgba(116,70,244,0.2)',
    background: 'rgba(116,70,244,0.06)',
    cursor: 'default',
    transition: 'all 0.2s ease',
  },
  featureIconWrap: {
    width: '1.5rem',
    height: '1.5rem',
    borderRadius: '0.4rem',
    background: 'rgba(139,97,255,0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  featureLabel: {
    fontSize: '0.74rem',
    fontWeight: 600,
    color: '#a8b4cc',
  },
  statStrip: {
    display: 'flex',
    gap: '0',
    borderTop: '1px solid rgba(116,70,244,0.15)',
    paddingTop: '1.2rem',
  },
  stat: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '0.15rem',
    borderRight: '1px solid rgba(116,70,244,0.12)',
    paddingRight: '1rem',
    marginRight: '1rem',
  },
  statVal: {
    fontSize: '1.1rem',
    fontWeight: 800,
    color: '#8b61ff',
    letterSpacing: '-0.02em',
  },
  statLbl: {
    fontSize: '0.68rem',
    color: '#5a6480',
    fontWeight: 500,
  },
  // Glass card
  glassCard: {
    background: 'linear-gradient(145deg, rgba(11,18,36,0.97), rgba(8,12,24,0.99))',
    border: '1px solid rgba(116,70,244,0.22)',
    borderRadius: '1.5rem',
    backdropFilter: 'blur(32px)',
    boxShadow: '0 32px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
    padding: '2rem',
    position: 'relative',
    overflow: 'hidden',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.7rem',
  },
  cardLogoSmall: {
    width: '2.2rem',
    height: '2.2rem',
    borderRadius: '0.6rem',
    background: 'linear-gradient(135deg, #7446f4, #5628d9)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(116,70,244,0.4)',
    flexShrink: 0,
  },
  cardTitle: {
    fontWeight: 700,
    fontSize: '0.875rem',
    color: '#e2e8f0',
  },
  cardSub: {
    fontSize: '0.7rem',
    color: '#4a5568',
    marginTop: '0.1rem',
  },
  liveBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.35rem',
    padding: '0.25rem 0.65rem',
    borderRadius: '9999px',
    background: 'rgba(53,211,138,0.1)',
    border: '1px solid rgba(53,211,138,0.25)',
    fontSize: '0.68rem',
    fontWeight: 600,
    color: '#35d38a',
  },
  liveDot: {
    width: '0.45rem',
    height: '0.45rem',
    borderRadius: '9999px',
    background: '#35d38a',
    boxShadow: '0 0 6px rgba(53,211,138,0.7)',
    animation: 'blink 2s ease-in-out infinite',
    display: 'inline-block',
  },
  divider: {
    height: '1px',
    background: 'linear-gradient(90deg, transparent, rgba(116,70,244,0.25), transparent)',
    margin: '1.25rem 0',
  },
  formTitle: {
    fontSize: '1.35rem',
    fontWeight: 800,
    color: '#eef2ff',
    letterSpacing: '-0.02em',
  },
  formSub: {
    fontSize: '0.8rem',
    color: '#4a5568',
    marginTop: '0.25rem',
  },
  fieldWrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.45rem',
  },
  label: {
    fontSize: '0.8rem',
    fontWeight: 600,
    color: '#94a3b8',
  },
  fieldIcon: {
    position: 'absolute',
    left: '0.875rem',
    top: '50%',
    transform: 'translateY(-50%)',
    transition: 'color 0.2s',
    pointerEvents: 'none',
  },
  input: {
    width: '100%',
    padding: '0.7rem 1rem 0.7rem 2.5rem',
    borderRadius: '0.75rem',
    fontSize: '0.875rem',
    background: 'rgba(255,255,255,0.04)',
    border: '1.5px solid rgba(255,255,255,0.08)',
    color: '#e2e8f0',
    outline: 'none',
    transition: 'all 0.2s ease',
    fontFamily: 'inherit',
  },
  inputFocused: {
    border: '1.5px solid rgba(116,70,244,0.6)',
    background: 'rgba(116,70,244,0.06)',
    boxShadow: '0 0 0 3px rgba(116,70,244,0.12)',
  },
  inputError: {
    border: '1.5px solid rgba(255,91,106,0.6)',
    boxShadow: '0 0 0 3px rgba(255,91,106,0.1)',
  },
  eyeBtn: {
    position: 'absolute',
    right: '0.875rem',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'transparent',
    border: 'none',
    color: '#4a5568',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    transition: 'color 0.2s',
    padding: 0,
  },
  errorMsg: {
    fontSize: '0.73rem',
    color: '#ff5b6a',
    marginTop: '0.25rem',
  },
  submitBtn: {
    width: '100%',
    marginTop: '1.5rem',
    padding: '0.85rem',
    borderRadius: '0.75rem',
    fontWeight: 700,
    fontSize: '0.925rem',
    background: 'linear-gradient(135deg, #7446f4, #5628d9)',
    color: '#fff',
    border: 'none',
    cursor: 'pointer',
    boxShadow: '0 6px 20px rgba(116,70,244,0.35)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
    fontFamily: 'inherit',
  },
  spinner: {
    width: '1rem',
    height: '1rem',
    borderRadius: '9999px',
    border: '2px solid rgba(255,255,255,0.3)',
    borderTopColor: '#fff',
    display: 'inline-block',
    animation: 'spin 0.7s linear infinite',
  },
  switchText: {
    textAlign: 'center',
    fontSize: '0.8rem',
    color: '#4a5568',
    marginTop: '1.25rem',
  },
  switchLink: {
    color: '#8b61ff',
    fontWeight: 700,
    textDecoration: 'none',
    marginLeft: '0.25rem',
  },
  secureFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.4rem',
    marginTop: '1.25rem',
    paddingTop: '1rem',
    borderTop: '1px solid rgba(255,255,255,0.05)',
    fontSize: '0.68rem',
    color: '#3d4a5e',
    fontWeight: 500,
  },
}
