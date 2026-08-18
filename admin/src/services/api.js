import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sv_admin_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response && err.response.status === 401) {
      localStorage.removeItem('sv_admin_token')
      localStorage.removeItem('sv_admin_user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export const adminApi = {
  login: (data) => api.post('auth/login', data),
  me: () => api.get('auth/profile'),
  metrics: () => api.get('admin/metrics'),
  users: (params) => api.get('admin/users', { params }),
  userDetails: (id) => api.get(`admin/users/${id}/details`),
  updateUserStatus: (id, status) => api.put(`admin/users/${id}/status`, { status }),
  updateUserRole: (id, role) => api.put(`admin/users/${id}/role`, { role }),
  deleteUser: (id) => api.delete(`admin/users/${id}`),
  files: (params) => api.get('admin/files', { params }),
  deleteFile: (id) => api.delete(`admin/files/${id}`),
  shares: (params) => api.get('admin/shares', { params }),
  disableShare: (id) => api.patch(`admin/shares/${id}/disable`),
  enableShare: (id) => api.patch(`admin/shares/${id}/enable`),
  audits: (params) => api.get('admin/audits', { params }),
  queues: () => api.get('admin/queues'),
  webhooks: () => api.get('admin/webhooks'),
  storage: () => api.get('admin/storage'),
  security: () => api.get('admin/security'),
  settings: () => api.get('admin/settings'),
  qrStats: () => api.get('qr/admin/stats'),
}

export default api
