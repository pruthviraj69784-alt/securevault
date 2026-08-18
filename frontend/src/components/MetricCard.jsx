import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown } from 'lucide-react'

export default function MetricCard({ icon: Icon, label, value, sub, color = 'var(--accent)', trend, index = 0 }) {
  return (
    <motion.div
      className="card-metric"
      style={{ '--metric-color': color }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -3 }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
        <motion.div
          style={{
            width: '2.75rem', height: '2.75rem', borderRadius: '0.875rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            background: `color-mix(in srgb, ${color} 14%, transparent)`,
            border: `1px solid color-mix(in srgb, ${color} 22%, transparent)`,
          }}
          whileHover={{ scale: 1.08, rotate: 3 }}
          transition={{ type: 'spring', stiffness: 400 }}
        >
          <Icon size={20} style={{ color }} />
        </motion.div>

        {trend != null && (
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.07 + 0.2 }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
              fontSize: '0.7rem', fontWeight: 700,
              padding: '0.2rem 0.5rem', borderRadius: '9999px',
              background: trend >= 0 ? 'var(--success-soft)' : 'var(--danger-soft)',
              color: trend >= 0 ? 'var(--success)' : 'var(--danger)',
            }}
          >
            {trend >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
            {Math.abs(trend)}%
          </motion.span>
        )}
      </div>

      <div style={{ marginTop: '1rem', position: 'relative', zIndex: 1 }}>
        <p style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.025em', lineHeight: 1 }}>
          {value}
        </p>
        <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text)', marginTop: '0.4rem' }}>{label}</p>
        {sub && <p style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: '0.2rem', lineHeight: 1.4 }}>{sub}</p>}
      </div>
    </motion.div>
  )
}
