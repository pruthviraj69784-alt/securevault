import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { motion, AnimatePresence } from 'framer-motion'
import {
  User, Mail, Lock, Eye, EyeOff, Shield, ShieldCheck,
  ArrowRight, CheckCircle2, Sparkles, Star
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
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 130) {
            ctx.beginPath()
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.strokeStyle = `rgba(53,211,138,${0.12 * (1 - dist / 130)})`
            ctx.lineWidth = 0.6
            ctx.stroke()
          }
        }
      }
      particles.forEach(p => {
        p.x += p.dx
        p.y += p.dy
        if (p.x < 0 || p.x > w) p.dx *= -1
        if (p.y < 0 || p.y > h) p.dy *= -1
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(116,70,244,${p.o * 0.7})`
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

/* ─── Password strength helper ─── */
function getStrength(pwd) {
  if (!pwd) return { score: 0, label: '', color: 'transparent' }
  let score = 0
  if (pwd.length >= 8) score++
  if (/[A-Z]/.test(pwd)) score++
  if (/[0-9]/.test(pwd)) score++
  if (/[^A-Za-z0-9]/.test(pwd)) score++
  const levels = [
    { label: 'Weak', color: '#ff5b6a' },
    { label: 'Fair', color: '#f7b733' },
    { label: 'Good', color: '#f7b733' },
    { label: 'Strong', color: '#35d38a' },
    { label: 'Very Strong', color: '#35d38a' },
  ]
  return { score, ...levels[score] }
}

/* ─── Benefits list ─── */
const benefits = [
  'End-to-end encrypted file storage',
  'Controlled internal & external sharing',
  'Real-time audit trail',
  'Role-based access control',
  'Zero-knowledge architecture',
]

export default function Register() {
  const { register: authRegister, login } = useAuth()
  const navigate = useNavigate()
  const [show, setShow] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [focusedField, setFocusedField] = useState(null)
  const [passwordVal, setPasswordVal] = useState('')

  const { register, handleSubmit, watch, formState: { errors } } = useForm()
  const password = watch('password', '')
  const strength = getStrength(password)

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      await authRegister({ name: data.name, email: data.email, password: data.password })
      toast.success('Account created! Signing you in…')
      await login(data.email, data.password)
      navigate('/dashboard')
    } catch (err) {
      const response = err.response?.data
      const serverMessage = response?.message || response?.errors?.[0]?.msg
      const message = serverMessage ||
        (err.response?.status === 409 ? 'Email already exists.' : '') ||
        err.message || 'Registration failed.'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = (field) => ({
    ...styles.input,
    ...(focusedField === field ? styles.inputFocused : {}),
    ...(errors[field] ? styles.inputError : {}),
  })

  return (
    <div style={styles.page}>
      <ParticleCanvas />

      {/* Glow orbs */}
      <div style={styles.orbTopLeft} />
      <div style={styles.orbBottomRight} />
      <div style={styles.orbCenter} />

      <motion.div
        style={styles.shell}
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* ── Left Glass Form ── */}
        <motion.div
          style={styles.glassCard}
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
        >
          {/* Header */}
          <div style={styles.cardHeader}>
            <div style={styles.cardLogoSmall}>
              <Shield size={17} color="#fff" />
            </div>
            <div>
              <p style={styles.cardTitle}>SecureVault</p>
              <p style={styles.cardSub}>Create your secure account</p>
            </div>
            <div style={{ marginLeft: 'auto' }}>
              <span style={styles.freeBadge}>
                <Star size={10} style={{ display: 'inline' }} />
                &nbsp;Free
              </span>
            </div>
          </div>

          <div style={styles.divider} />

          <h2 style={styles.formTitle}>Create your account</h2>
          <p style={styles.formSub}>Join thousands securing their files with SecureVault</p>

          <form onSubmit={handleSubmit(onSubmit)} style={{ marginTop: '1.4rem', display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            {/* Full Name */}
            <div style={styles.fieldWrap}>
              <label style={styles.label}>Full Name</label>
              <div style={{ position: 'relative' }}>
                <User size={15} style={{ ...styles.fieldIcon, color: focusedField === 'name' ? '#8b61ff' : '#4a5568' }} />
                <input
                  {...register('name', { required: 'Name is required', minLength: { value: 3, message: 'At least 3 characters' } })}
                  type="text"
                  placeholder="John Doe"
                  id="reg-name"
                  onFocus={() => setFocusedField('name')}
                  onBlur={() => setFocusedField(null)}
                  style={inputStyle('name')}
                />
              </div>
              <AnimatePresence>
                {errors.name && (
                  <motion.p style={styles.errorMsg} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    {errors.name.message}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            {/* Email */}
            <div style={styles.fieldWrap}>
              <label style={styles.label}>Email address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={15} style={{ ...styles.fieldIcon, color: focusedField === 'email' ? '#8b61ff' : '#4a5568' }} />
                <input
                  {...register('email', { required: 'Email is required', pattern: { value: /\S+@\S+\.\S+/, message: 'Invalid email' } })}
                  type="email"
                  placeholder="you@example.com"
                  id="reg-email"
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  style={inputStyle('email')}
                />
              </div>
              <AnimatePresence>
                {errors.email && (
                  <motion.p style={styles.errorMsg} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    {errors.email.message}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            {/* Password */}
            <div style={styles.fieldWrap}>
              <label style={styles.label}>Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} style={{ ...styles.fieldIcon, color: focusedField === 'password' ? '#8b61ff' : '#4a5568' }} />
                <input
                  {...register('password', { required: 'Password is required', minLength: { value: 8, message: 'At least 8 characters' } })}
                  type={show ? 'text' : 'password'}
                  placeholder="Min. 8 characters"
                  id="reg-password"
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  style={{ ...inputStyle('password'), paddingRight: '2.8rem' }}
                />
                <button type="button" onClick={() => setShow(s => !s)} style={styles.eyeBtn}>
                  {show ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>

              {/* Strength meter */}
              <AnimatePresence>
                {password && (
                  <motion.div
                    style={styles.strengthWrap}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <div style={styles.strengthBars}>
                      {[1, 2, 3, 4].map(i => (
                        <motion.div
                          key={i}
                          style={{
                            ...styles.strengthBar,
                            background: i <= strength.score ? strength.color : 'rgba(255,255,255,0.07)',
                          }}
                          animate={{ background: i <= strength.score ? strength.color : 'rgba(255,255,255,0.07)' }}
                          transition={{ duration: 0.3 }}
                        />
                      ))}
                    </div>
                    <span style={{ fontSize: '0.7rem', fontWeight: 600, color: strength.color }}>
                      {strength.label}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {errors.password && (
                  <motion.p style={styles.errorMsg} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    {errors.password.message}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            {/* Confirm Password */}
            <div style={styles.fieldWrap}>
              <label style={styles.label}>Confirm Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} style={{ ...styles.fieldIcon, color: focusedField === 'confirm' ? '#8b61ff' : '#4a5568' }} />
                <input
                  {...register('confirm', { validate: v => v === password || 'Passwords do not match' })}
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="Re-enter password"
                  id="reg-confirm"
                  onFocus={() => setFocusedField('confirm')}
                  onBlur={() => setFocusedField(null)}
                  style={{ ...inputStyle('confirm'), paddingRight: '2.8rem' }}
                />
                <button type="button" onClick={() => setShowConfirm(s => !s)} style={styles.eyeBtn}>
                  {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <AnimatePresence>
                {errors.confirm && (
                  <motion.p style={styles.errorMsg} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    {errors.confirm.message}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            {/* Submit */}
            <motion.button
              type="submit"
              id="reg-submit"
              disabled={loading}
              style={styles.submitBtn}
              whileHover={!loading ? { scale: 1.02, boxShadow: '0 8px 28px rgba(53,211,138,0.3)' } : {}}
              whileTap={!loading ? { scale: 0.98 } : {}}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={styles.spinner} />
                  Creating account…
                </span>
              ) : (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  Create Account
                  <ArrowRight size={16} />
                </span>
              )}
            </motion.button>
          </form>

          <p style={styles.switchText}>
            Already have an account?{' '}
            <Link to="/login" style={styles.switchLink}>Sign in</Link>
          </p>

          <div style={styles.secureFooter}>
            <ShieldCheck size={13} color="#35d38a" />
            <span>Free to join • No credit card required</span>
          </div>
        </motion.div>

        {/* ── Right Brand Panel ── */}
        <motion.section
          style={styles.brandPanel}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, delay: 0.15 }}
        >
          <div style={styles.brandInner}>
            <motion.div
              style={styles.logoWrap}
              whileHover={{ scale: 1.05, rotate: -3 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              <Shield size={30} color="#fff" />
              <div style={styles.logoPulse} />
            </motion.div>

            <div>
              <p style={styles.brandTag}>
                <Sparkles size={11} style={{ display: 'inline', marginRight: 4 }} />
                Create your shield
              </p>
              <h1 style={styles.brandTitle}>
                Start protecting your<br />
                <span style={styles.gradientText}>files today.</span>
              </h1>
              <p style={styles.brandSub}>
                Join SecureVault to manage encrypted storage, controlled sharing, and audit-ready access from one secure workspace.
              </p>
            </div>

            {/* Benefits */}
            <div style={styles.benefitsList}>
              {benefits.map((b, i) => (
                <motion.div
                  key={b}
                  style={styles.benefitItem}
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.35 + i * 0.08 }}
                >
                  <div style={styles.checkIcon}>
                    <CheckCircle2 size={13} color="#35d38a" />
                  </div>
                  <span style={styles.benefitLabel}>{b}</span>
                </motion.div>
              ))}
            </div>

            {/* Testimonial quote */}
            <motion.div
              style={styles.testimonial}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.75 }}
            >
              <div style={styles.testimonialStars}>
                {[1,2,3,4,5].map(s => (
                  <Star key={s} size={12} style={{ fill: '#f7b733', color: '#f7b733' }} />
                ))}
              </div>
              <p style={styles.testimonialText}>
                "SecureVault transformed how our team manages sensitive files. The audit trail alone saved us hours."
              </p>
              <p style={styles.testimonialAuthor}>— Security Team Lead, FinTech Corp</p>
            </motion.div>
          </div>
        </motion.section>
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
    background: 'linear-gradient(135deg, #04080f 0%, #07100f 50%, #060a18 100%)',
    position: 'relative',
    overflow: 'hidden',
  },
  orbTopLeft: {
    position: 'fixed',
    top: '-6rem',
    left: '-5rem',
    width: '26rem',
    height: '26rem',
    borderRadius: '9999px',
    background: 'radial-gradient(circle, rgba(53,211,138,0.15) 0%, transparent 70%)',
    pointerEvents: 'none',
    zIndex: 0,
  },
  orbBottomRight: {
    position: 'fixed',
    bottom: '-5rem',
    right: '-5rem',
    width: '24rem',
    height: '24rem',
    borderRadius: '9999px',
    background: 'radial-gradient(circle, rgba(116,70,244,0.18) 0%, transparent 70%)',
    pointerEvents: 'none',
    zIndex: 0,
  },
  orbCenter: {
    position: 'fixed',
    top: '40%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '50rem',
    height: '20rem',
    borderRadius: '9999px',
    background: 'radial-gradient(ellipse, rgba(53,211,138,0.05) 0%, transparent 70%)',
    pointerEvents: 'none',
    zIndex: 0,
  },
  shell: {
    width: 'min(100%, 1100px)',
    display: 'grid',
    gridTemplateColumns: '0.9fr 1.1fr',
    gap: '1.5rem',
    alignItems: 'start',
    position: 'relative',
    zIndex: 1,
  },
  // Glass card
  glassCard: {
    background: 'linear-gradient(145deg, rgba(11,18,36,0.97), rgba(8,12,24,0.99))',
    border: '1px solid rgba(53,211,138,0.15)',
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
    background: 'linear-gradient(135deg, #35d38a, #1db56e)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(53,211,138,0.35)',
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
  freeBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.2rem',
    padding: '0.25rem 0.65rem',
    borderRadius: '9999px',
    background: 'rgba(247,183,51,0.1)',
    border: '1px solid rgba(247,183,51,0.25)',
    fontSize: '0.68rem',
    fontWeight: 700,
    color: '#f7b733',
  },
  divider: {
    height: '1px',
    background: 'linear-gradient(90deg, transparent, rgba(53,211,138,0.2), transparent)',
    margin: '1.25rem 0',
  },
  formTitle: {
    fontSize: '1.3rem',
    fontWeight: 800,
    color: '#eef2ff',
    letterSpacing: '-0.02em',
  },
  formSub: {
    fontSize: '0.78rem',
    color: '#4a5568',
    marginTop: '0.25rem',
  },
  fieldWrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
  },
  label: {
    fontSize: '0.78rem',
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
    padding: '0.68rem 1rem 0.68rem 2.5rem',
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
    border: '1.5px solid rgba(53,211,138,0.5)',
    background: 'rgba(53,211,138,0.04)',
    boxShadow: '0 0 0 3px rgba(53,211,138,0.1)',
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
  },
  strengthWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.55rem',
    overflow: 'hidden',
  },
  strengthBars: {
    display: 'flex',
    gap: '0.3rem',
    flex: 1,
  },
  strengthBar: {
    flex: 1,
    height: '0.22rem',
    borderRadius: '9999px',
    transition: 'background 0.3s ease',
  },
  submitBtn: {
    width: '100%',
    marginTop: '0.5rem',
    padding: '0.85rem',
    borderRadius: '0.75rem',
    fontWeight: 700,
    fontSize: '0.925rem',
    background: 'linear-gradient(135deg, #35d38a, #1db56e)',
    color: '#fff',
    border: 'none',
    cursor: 'pointer',
    boxShadow: '0 6px 20px rgba(53,211,138,0.28)',
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
    color: '#35d38a',
    fontWeight: 700,
    textDecoration: 'none',
    marginLeft: '0.25rem',
  },
  secureFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.4rem',
    marginTop: '1rem',
    paddingTop: '1rem',
    borderTop: '1px solid rgba(255,255,255,0.05)',
    fontSize: '0.68rem',
    color: '#3d4a5e',
    fontWeight: 500,
  },
  // Brand panel
  brandPanel: {
    background: 'linear-gradient(145deg, rgba(11,18,36,0.95), rgba(7,13,26,0.98))',
    border: '1px solid rgba(53,211,138,0.15)',
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
    gap: '1.5rem',
  },
  logoWrap: {
    width: '3.5rem',
    height: '3.5rem',
    borderRadius: '1rem',
    background: 'linear-gradient(135deg, #35d38a, #1db56e)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 8px 24px rgba(53,211,138,0.4)',
    position: 'relative',
    cursor: 'default',
  },
  logoPulse: {
    position: 'absolute',
    inset: '-4px',
    borderRadius: '1.2rem',
    border: '1px solid rgba(53,211,138,0.35)',
    animation: 'pulse-ring 3s ease-in-out infinite',
  },
  brandTag: {
    fontSize: '0.7rem',
    fontWeight: 700,
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
    color: '#35d38a',
    marginBottom: '0.5rem',
  },
  brandTitle: {
    fontSize: 'clamp(1.5rem, 2.5vw, 2.2rem)',
    fontWeight: 800,
    lineHeight: 1.15,
    color: '#f0f2ff',
    letterSpacing: '-0.02em',
  },
  gradientText: {
    background: 'linear-gradient(90deg, #35d38a, #8b61ff)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  brandSub: {
    fontSize: '0.875rem',
    color: '#6b7a9a',
    lineHeight: 1.65,
  },
  benefitsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.65rem',
  },
  benefitItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.65rem',
  },
  checkIcon: {
    width: '1.5rem',
    height: '1.5rem',
    borderRadius: '50%',
    background: 'rgba(53,211,138,0.12)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  benefitLabel: {
    fontSize: '0.82rem',
    color: '#94a3b8',
    fontWeight: 500,
  },
  testimonial: {
    background: 'rgba(53,211,138,0.05)',
    border: '1px solid rgba(53,211,138,0.15)',
    borderRadius: '0.85rem',
    padding: '1rem 1.1rem',
  },
  testimonialStars: {
    display: 'flex',
    gap: '0.2rem',
    marginBottom: '0.55rem',
  },
  testimonialText: {
    fontSize: '0.8rem',
    color: '#94a3b8',
    lineHeight: 1.6,
    fontStyle: 'italic',
  },
  testimonialAuthor: {
    fontSize: '0.7rem',
    color: '#4a5568',
    marginTop: '0.5rem',
    fontWeight: 600,
  },
}
