import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { toast } from 'react-toastify'
import { Webhook, Plus, Trash2, Globe, CheckCircle, XCircle, Zap, X } from 'lucide-react'
import { webhookApi } from '../services/api'
import { SkeletonCard } from '../components/Skeletons'

function formatDate(d) {
  return new Date(d).toLocaleDateString('en', { dateStyle: 'medium' })
}

const EVENT_OPTIONS = [
  { value: 'FILE_UPLOADED',  label: 'File Uploaded',  color: 'var(--accent)' },
  { value: 'FILE_SHARED',    label: 'File Shared',    color: 'var(--info)' },
  { value: 'FILE_DOWNLOADED',label: 'File Downloaded',color: 'var(--success)' },
  { value: 'VIRUS_DETECTED', label: 'Virus Detected', color: 'var(--danger)' },
  { value: 'FILE_DELETED',   label: 'File Deleted',   color: 'var(--warning)' },
]

export default function Webhooks() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [selectedEvents, setSelectedEvents] = useState(['FILE_SHARED'])

  const { data, isLoading } = useQuery({
    queryKey: ['webhooks'],
    queryFn:  () => webhookApi.list().then(r => r.data.data),
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  const createMut = useMutation({
    mutationFn: (d) => webhookApi.create(d),
    onSuccess:  () => { toast.success('Webhook registered!'); qc.invalidateQueries(['webhooks']); reset(); setShowForm(false); setSelectedEvents(['FILE_SHARED']) },
    onError:    (err) => toast.error(err.response?.data?.errors?.[0]?.msg || 'Failed to create webhook'),
  })
  const deleteMut = useMutation({
    mutationFn: (id) => webhookApi.remove(id),
    onSuccess:  () => { toast.success('Webhook deleted'); qc.invalidateQueries(['webhooks']) },
    onError:    () => toast.error('Failed to delete webhook'),
  })

  const webhooks = data || []
  const onSubmit = (d) => createMut.mutate({ url: d.url, events: selectedEvents })
  const toggleEvent = (ev) => setSelectedEvents(prev => prev.includes(ev) ? prev.filter(e => e !== ev) : [...prev, ev])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="page-header">
        <div className="page-header-left">
          <span className="page-tag"><Webhook size={11} /> Integrations</span>
          <h1 className="page-title">Webhooks</h1>
          <p className="page-sub">{webhooks.length} webhook{webhooks.length !== 1 ? 's' : ''} registered for event dispatching</p>
        </div>
        <motion.button onClick={() => setShowForm(f => !f)} className="btn-primary" style={{ fontSize: '0.85rem' }} whileHover={{ scale: 1.04 }}>
          {showForm ? <><X size={15} /> Cancel</> : <><Plus size={15} /> Add Webhook</>}
        </motion.button>
      </div>

      {/* Create Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div className="card" initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
            <h2 className="section-title" style={{ marginBottom: '1rem' }}><Plus size={15} style={{ color: 'var(--accent)' }} /> Register New Webhook</h2>
            <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>Endpoint URL</label>
                <div style={{ position: 'relative' }}>
                  <Globe size={14} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
                  <input
                    {...register('url', { required: 'URL is required', pattern: { value: /^https?:\/\/.+/, message: 'Must be a valid HTTP/HTTPS URL' } })}
                    placeholder="https://your-server.com/webhook"
                    className="input-field"
                    style={{ paddingLeft: '2.5rem' }}
                  />
                </div>
                {errors.url && <p style={{ fontSize: '0.72rem', color: 'var(--danger)', marginTop: '0.25rem' }}>{errors.url.message}</p>}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.6rem' }}>Trigger Events</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {EVENT_OPTIONS.map(ev => (
                    <button key={ev.value} type="button" onClick={() => toggleEvent(ev.value)} style={{
                      padding: '0.4rem 0.875rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', border: '1px solid',
                      borderColor: selectedEvents.includes(ev.value) ? ev.color : 'var(--border)',
                      background: selectedEvents.includes(ev.value) ? `color-mix(in srgb, ${ev.color} 12%, transparent)` : 'transparent',
                      color: selectedEvents.includes(ev.value) ? ev.color : 'var(--muted)',
                      transition: 'all 0.2s',
                    }}>
                      {ev.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="submit" disabled={createMut.isPending || selectedEvents.length === 0} className="btn-primary">
                  <Zap size={14} /> {createMut.isPending ? 'Registering…' : 'Register Webhook'}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Webhook Cards */}
      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
          {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : webhooks.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-state-icon"><Webhook size={26} style={{ color: 'var(--accent)' }} /></div>
          <h3>No webhooks configured</h3>
          <p>Register an endpoint to receive real-time event notifications from your vault. Supports FILE_UPLOADED, FILE_SHARED, VIRUS_DETECTED and more.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <AnimatePresence>
            {webhooks.map((wh, i) => (
              <motion.div key={wh._id} className="card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ delay: i * 0.04 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', flex: 1, minWidth: 0 }}>
                    <div style={{ width: '2.75rem', height: '2.75rem', borderRadius: '0.75rem', background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Webhook size={18} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {wh.url}
                      </p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '0.4rem' }}>
                        {(wh.events || []).map(ev => (
                          <span key={ev} className="badge badge-info" style={{ fontSize: '0.65rem' }}>{ev}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      {wh.isActive ? (
                        <><CheckCircle size={14} style={{ color: 'var(--success)' }} /> <span style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 600 }}>Active</span></>
                      ) : (
                        <><XCircle size={14} style={{ color: 'var(--muted)' }} /> <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 600 }}>Inactive</span></>
                      )}
                    </div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>Added {formatDate(wh.createdAt)}</span>
                    <motion.button onClick={() => deleteMut.mutate(wh._id)} className="btn-icon" style={{ color: 'var(--danger)' }} whileHover={{ scale: 1.1 }}>
                      <Trash2 size={14} />
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
