export function SkeletonCard() {
  return (
    <div className="card-metric" style={{ '--metric-color': 'var(--accent)' }}>
      <div className="skeleton" style={{ width: '2.75rem', height: '2.75rem', borderRadius: '0.875rem' }} />
      <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <div className="skeleton" style={{ height: '1.75rem', width: '60%', borderRadius: '0.4rem' }} />
        <div className="skeleton" style={{ height: '0.75rem', width: '80%', borderRadius: '0.4rem' }} />
        <div className="skeleton" style={{ height: '0.65rem', width: '90%', borderRadius: '0.4rem' }} />
      </div>
    </div>
  )
}

export function SkeletonTable({ rows = 5 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', padding: '0.75rem 0' }}>
          <div className="skeleton" style={{ width: '2.25rem', height: '2.25rem', borderRadius: '0.5rem', flexShrink: 0 }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <div className="skeleton" style={{ height: '0.75rem', width: `${55 + Math.sin(i) * 20}%`, borderRadius: '0.4rem' }} />
            <div className="skeleton" style={{ height: '0.6rem', width: `${35 + Math.cos(i) * 15}%`, borderRadius: '0.4rem' }} />
          </div>
          <div className="skeleton" style={{ width: '3rem', height: '1.5rem', borderRadius: '9999px' }} />
        </div>
      ))}
    </div>
  )
}

export function SkeletonText({ lines = 3 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="skeleton" style={{ height: '0.75rem', width: i === lines - 1 ? '60%' : '100%', borderRadius: '0.4rem' }} />
      ))}
    </div>
  )
}
