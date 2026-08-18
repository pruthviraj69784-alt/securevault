import { useState } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'react-toastify'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { authApi } from '../services/api'
import {
  Sliders, Shield, Bell, Moon, Sun, Save, Lock, Globe, Clock,
  CheckCircle2, Settings as SettingsIcon, Palette
} from 'lucide-react'

const TABS = [
  { id: 'general',       label: 'General',       icon: Sliders },
  { id: 'security',      label: 'Security',      icon: Shield },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'appearance',    label: 'Appearance',    icon: Palette },
]

const NOTIF_OPTIONS = [
  { key: 'fileShared',      title: 'File Shared / Link Created', desc: 'Alert when a share token is generated.' },
  { key: 'shareDownloaded', title: 'Share Link Downloaded',     desc: 'Alert when someone downloads via your token.' },
  { key: 'virusDetected',   title: 'Virus / Malware Detected',  desc: 'Critical alert if ClamAV flags a file.' },
  { key: 'loginAlert',      title: 'New Login Detected',        desc: 'Alert on new browser or IP sign-in.' },
  { key: 'storageWarning',  title: 'Storage Capacity Warning',  desc: 'Alert when usage reaches 90%.' },
  { key: 'webhookFailed',   title: 'Webhook Dispatch Failure',  desc: 'Notify if a webhook POST fails.' },
]

export default function Settings() {
  const { zkPassphrase, setZkPassphrase } = useAuth()
  const { dark, toggle } = useTheme()
  const [activeTab, setActiveTab] = useState('general')
  const [pass, setPass] = useState(zkPassphrase || '')
  const [prefs, setPrefs] = useState({ fileShared: true, shareDownloaded: true, virusDetected: true, loginAlert: true, storageWarning: true, webhookFailed: true })
  const [generalOpts, setGeneralOpts] = useState({ timezone: 'UTC (+00:00)', language: 'English (US)', defaultExpiry: '24', autoDeleteTrashDays: '30' })

  const handleSaveZK = () => { setZkPassphrase(pass); toast.success('ZK passphrase saved in session memory.') }
  const handleSaveNotifs = async () => {
    try { await authApi.updateNotificationPreferences(prefs); toast.success('Notification preferences updated!') }
    catch { toast.error('Failed to update') }
  }

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      <div>
        <span className="page-tag"><SettingsIcon size={11} /> Configuration</span>
        <h1 className="page-title">Settings & Preferences</h1>
        <p className="page-sub">Manage platform settings, notification preferences, and security options.</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', gap: '0.25rem', overflowX: 'auto', paddingBottom: '1px' }}>
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setActiveTab(id)} style={{
            display: 'flex', alignItems: 'center', gap: '0.45rem',
            padding: '0.65rem 1.1rem', borderRadius: '0.5rem 0.5rem 0 0',
            fontSize: '0.825rem', fontWeight: 600, whiteSpace: 'nowrap',
            border: 'none', cursor: 'pointer', fontFamily: 'inherit',
            transition: 'all 0.2s',
            background: activeTab === id ? 'var(--card)' : 'transparent',
            color: activeTab === id ? 'var(--accent)' : 'var(--muted)',
            borderBottom: activeTab === id ? '2px solid var(--accent)' : '2px solid transparent',
          }}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {/* Tab: General */}
      {activeTab === 'general' && (
        <motion.div className="card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <h2 className="section-title"><Sliders size={16} style={{ color: 'var(--accent)' }} /> General Preferences</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            {[
              { label: 'Language', icon: Globe, key: 'language', options: ['English (US)', 'Spanish (ES)', 'French (FR)', 'German (DE)'] },
              { label: 'Timezone', icon: Clock, key: 'timezone', options: ['UTC (+00:00)', 'EST (-05:00)', 'PST (-08:00)', 'IST (+05:30)'] },
            ].map(({ label, icon: Icon, key, options }) => (
              <div key={key}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>{label}</label>
                <div style={{ position: 'relative' }}>
                  <Icon size={14} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
                  <select value={generalOpts[key]} onChange={e => setGeneralOpts(g => ({ ...g, [key]: e.target.value }))} className="input-field" style={{ paddingLeft: '2.4rem' }}>
                    {options.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              </div>
            ))}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>Default Share Expiry (Hours)</label>
              <input type="number" value={generalOpts.defaultExpiry} onChange={e => setGeneralOpts(g => ({ ...g, defaultExpiry: e.target.value }))} className="input-field" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>Trash Retention (Days)</label>
              <input type="number" value={generalOpts.autoDeleteTrashDays} onChange={e => setGeneralOpts(g => ({ ...g, autoDeleteTrashDays: e.target.value }))} className="input-field" />
            </div>
          </div>
          <div><motion.button onClick={() => toast.success('Preferences saved.')} className="btn-primary" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}><Save size={14} /> Save Preferences</motion.button></div>
        </motion.div>
      )}

      {/* Tab: Security */}
      {activeTab === 'security' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h2 className="section-title"><Lock size={16} style={{ color: 'var(--success)' }} /> Zero-Knowledge Passphrase</h2>
            <div style={{ padding: '0.875rem 1rem', borderRadius: '0.75rem', background: 'var(--warning-soft)', borderLeft: '3px solid var(--warning)' }}>
              <p style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--warning)' }}>In-Memory Security Notice</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.3rem', lineHeight: 1.5 }}>
                Your ZK passphrase is used for browser-side AES-GCM-256 encryption. It is stored in memory only and reset on logout.
              </p>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>ZK Passphrase</label>
              <input type="password" value={pass} onChange={e => setPass(e.target.value)} placeholder="Enter your passphrase" className="input-field" />
            </div>
            <div><motion.button onClick={handleSaveZK} className="btn-primary" whileHover={{ scale: 1.02 }}><Save size={14} /> Save to Session</motion.button></div>
          </div>
        </motion.div>
      )}

      {/* Tab: Notifications */}
      {activeTab === 'notifications' && (
        <motion.div className="card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h2 className="section-title"><Bell size={16} style={{ color: 'var(--accent)' }} /> Notification Triggers</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {NOTIF_OPTIONS.map(item => (
              <label key={item.key} style={{
                display: 'flex', alignItems: 'flex-start', gap: '0.875rem',
                padding: '0.875rem 1rem', borderRadius: '0.75rem',
                border: `1px solid ${prefs[item.key] ? 'color-mix(in srgb, var(--accent) 25%, var(--border))' : 'var(--border)'}`,
                background: prefs[item.key] ? 'var(--accent-soft)' : 'color-mix(in srgb, var(--bg) 60%, transparent)',
                cursor: 'pointer', transition: 'all 0.2s',
              }}>
                <div style={{ position: 'relative', marginTop: '0.15rem' }}>
                  <input type="checkbox" checked={prefs[item.key]} onChange={e => setPrefs(p => ({ ...p, [item.key]: e.target.checked }))} style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }} />
                  <div style={{
                    width: '1.1rem', height: '1.1rem', borderRadius: '0.3rem', flexShrink: 0,
                    border: `2px solid ${prefs[item.key] ? 'var(--accent)' : 'var(--border)'}`,
                    background: prefs[item.key] ? 'var(--accent)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.2s',
                  }}>
                    {prefs[item.key] && <CheckCircle2 size={10} color="#fff" />}
                  </div>
                </div>
                <div>
                  <p style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text)' }}>{item.title}</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.2rem' }}>{item.desc}</p>
                </div>
              </label>
            ))}
          </div>
          <div><motion.button onClick={handleSaveNotifs} className="btn-primary" whileHover={{ scale: 1.02 }}><Save size={14} /> Save Preferences</motion.button></div>
        </motion.div>
      )}

      {/* Tab: Appearance */}
      {activeTab === 'appearance' && (
        <motion.div className="card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h2 className="section-title">{dark ? <Moon size={16} style={{ color: 'var(--accent)' }} /> : <Sun size={16} style={{ color: 'var(--warning)' }} />} Theme & Display</h2>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.1rem 1.25rem', borderRadius: '0.875rem', border: '1px solid var(--border)', background: 'color-mix(in srgb, var(--bg) 60%, transparent)' }}>
            <div>
              <p style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)' }}>{dark ? '🌙 Dark Mode' : '☀️ Light Mode'}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.2rem' }}>Switch between dark and light interface theme</p>
            </div>
            <motion.button onClick={toggle} style={{
              position: 'relative', width: '3.5rem', height: '1.75rem', borderRadius: '9999px',
              border: 'none', cursor: 'pointer',
              background: dark ? 'linear-gradient(135deg, var(--accent), var(--accent-hover))' : 'var(--border)',
              boxShadow: dark ? '0 0 16px var(--accent-glow)' : 'none',
              transition: 'all 0.3s',
            }}>
              <motion.span style={{
                position: 'absolute', top: '0.22rem', left: '0.22rem',
                width: '1.3rem', height: '1.3rem', borderRadius: '50%',
                background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
                animate={{ x: dark ? '1.75rem' : '0rem' }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              >
                {dark ? <Moon size={9} color="#7446f4" /> : <Sun size={9} color="#f59e0b" />}
              </motion.span>
            </motion.button>
          </div>
        </motion.div>
      )}
    </div>
  )
}
