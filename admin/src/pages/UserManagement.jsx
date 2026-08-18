import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'react-toastify'
import { Users, Search, Filter, Eye, Shield, Ban, CheckCircle2, KeyRound, Trash2, ShieldAlert } from 'lucide-react'
import { adminApi } from '../services/api'
import UserDetailsDrawer from '../components/UserDetailsDrawer'

export default function UserManagement() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [inspectUserId, setInspectUserId] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', search],
    queryFn: () => adminApi.users({ search }).then(r => r.data.data)
  })

  const users = (data || []).filter(u => {
    if (roleFilter === 'ALL') return true
    return u.role?.toUpperCase() === roleFilter
  })

  const statusMut = useMutation({
    mutationFn: ({ id, status }) => adminApi.updateUserStatus(id, status),
    onSuccess: () => { toast.success('User status updated'); qc.invalidateQueries(['admin-users']) }
  })

  const roleMut = useMutation({
    mutationFn: ({ id, role }) => adminApi.updateUserRole(id, role),
    onSuccess: () => { toast.success('User role updated'); qc.invalidateQueries(['admin-users']) }
  })

  const deleteMut = useMutation({
    mutationFn: (id) => adminApi.deleteUser(id),
    onSuccess: () => { toast.success('User deleted'); qc.invalidateQueries(['admin-users']) }
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-theme flex items-center gap-2">
            <Users size={26} className="text-accent" /> User Management
          </h1>
          <p className="text-muted text-sm mt-1">Directory of all registered vault accounts, credentials, and access control.</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or email..." className="input-field pl-10" />
        </div>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="input-field max-w-[150px] cursor-pointer">
          <option value="ALL">All Roles</option>
          <option value="USER">User</option>
          <option value="ADMIN">Admin</option>
        </select>
      </div>

      {/* Users Directory Table */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-theme bg-[var(--bg)]">
                {['User', 'Email', 'Role', 'Status', 'Joined', 'Actions'].map(h => (
                  <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-muted uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="p-8 text-center text-muted">Loading users directory...</td></tr>
              ) : users.map(u => (
                <tr key={u._id} className="border-b border-theme hover:bg-[var(--border)] transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white bg-accent">
                        {u.name?.[0]?.toUpperCase()}
                      </div>
                      <span className="font-semibold text-theme">{u.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-muted">{u.email}</td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => roleMut.mutate({ id: u._id, role: u.role === 'ADMIN' ? 'USER' : 'ADMIN' })}
                      className={`badge cursor-pointer ${u.role === 'ADMIN' ? 'badge-warning' : 'badge-info'}`}
                      title="Click to toggle role"
                    >
                      {u.role}
                    </button>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`badge ${u.status === 'Suspended' ? 'badge-danger' : 'badge-success'}`}>
                      {u.status || 'Active'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-muted text-xs whitespace-nowrap">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setInspectUserId(u._id)} className="btn-ghost text-xs py-1 px-2" title="Inspect user details">
                        <Eye size={14} /> Details
                      </button>
                      <button
                        onClick={() => statusMut.mutate({ id: u._id, status: u.status === 'Suspended' ? 'Active' : 'Suspended' })}
                        className="btn-ghost text-xs py-1 px-2 text-amber-500"
                        title="Toggle status"
                      >
                        <Ban size={14} />
                      </button>
                      <button
                        onClick={() => { if (confirm('Delete this user?')) deleteMut.mutate(u._id) }}
                        className="btn-ghost text-xs py-1 px-2 text-rose-500"
                        title="Delete user"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Details Drawer */}
      <UserDetailsDrawer userId={inspectUserId} onClose={() => setInspectUserId(null)} />
    </div>
  )
}
