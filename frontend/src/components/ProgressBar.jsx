import { motion } from 'framer-motion'

export default function ProgressBar({ progress = 0, color = 'var(--accent)', height = 6, showLabel = false }) {
  const clampedProgress = Math.min(100, Math.max(0, progress))
  const isWarning = clampedProgress >= 80
  const isDanger  = clampedProgress >= 95

  const barColor = isDanger ? 'var(--danger)' : isWarning ? 'var(--warning)' : color

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
      {showLabel && (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: 600, color: 'var(--muted)' }}>
          <span>Usage</span>
          <span style={{ color: barColor }}>{clampedProgress}%</span>
        </div>
      )}
      <div style={{
        width: '100%', height: `${height}px`,
        borderRadius: '9999px',
        background: 'color-mix(in srgb, var(--border) 80%, transparent)',
        overflow: 'hidden',
      }}>
        <motion.div
          style={{
            height: '100%',
            borderRadius: '9999px',
            background: `linear-gradient(90deg, ${barColor}, color-mix(in srgb, ${barColor} 70%, white 30%))`,
            boxShadow: `0 0 10px color-mix(in srgb, ${barColor} 40%, transparent)`,
            transformOrigin: 'left center',
          }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: clampedProgress / 100 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </div>
  )
}
