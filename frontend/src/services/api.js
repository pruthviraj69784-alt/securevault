import axios from 'axios'

const resolveApiBaseUrl = () => {
    const rawBaseUrl = import.meta.env.VITE_API_BASE_URL
    const configuredBaseUrl = rawBaseUrl ? rawBaseUrl.trim() : ''
    if (configuredBaseUrl) {
        return configuredBaseUrl.replace(/\/$/, '')
    }
    return '/api'
}

const api = axios.create({
    baseURL: resolveApiBaseUrl(),
    timeout: 30000,
})

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('sv_token')
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

api.interceptors.response.use(
    (res) => res,
    (err) => {
        if (err.response && err.response.status === 401) {
            localStorage.removeItem('sv_token')
            localStorage.removeItem('sv_user')
            window.location.href = '/login'
        }
        return Promise.reject(err)
    }
)

export const authApi = {
    register: (data) => api.post('auth/register', data),
    login: (data) => api.post('auth/login', data),
    me: () => api.get('auth/profile'),
    changePassword: (data) => api.post('auth/change-password', data),
    updateNotificationPreferences: (data) => api.put('auth/notification-preferences', data),
    deleteAccount: () => api.delete('auth/account'),
}

export const fileApi = {
    upload: (formData, onProgress) =>
        api.post('files/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            onUploadProgress: (e) => {
                if (onProgress) onProgress(Math.round((e.loaded * 100) / e.total))
            },
        }),
    myFiles: () => api.get('files/my-files'),
    download: (id, ver) => api.get(`files/download/${id}${ver ? `?version=${ver}` : ''}`, { responseType: 'blob' }),
    versions: (id) => api.get(`files/${id}/versions`),
    restore: (id, ver) => api.post(`files/${id}/restore`, { version: ver }),
    remove: (id) => api.delete(`files/${id}`),
    toggleFavorite: (id) => api.patch(`files/${id}/favorite`),
    moveToTrash: (id) => api.put(`files/${id}/trash`),
    restoreFromTrash: (id) => api.put(`files/${id}/restore-trash`),
    permanentlyDelete: (id) => api.delete(`files/${id}`),
    favorites: () => api.get('files/favorites'),
    trash: () => api.get('files/trash'),
    storageStats: () => api.get('files/storage-stats'),
}

export const shareApi = {
  create: (data) => api.post('shares', data),
  access: (token, password) => api.get(`shares/${token}`, {
    responseType: 'blob',
    params: { password },
  }),
  sharedWithMe: () => api.get('shares/with-me'),
  sharedByMe: () => api.get('shares/by-me'),
  revokeShare: (id) => api.delete(`shares/${id}`),
}

export const accessApi = {
  list: () => api.get('shares/requests'),
  approve: (id) => api.patch(`shares/requests/${id}/approve`),
  deny: (id) => api.patch(`shares/requests/${id}/deny`),
}

export const notifApi = {
  list: () => api.get('notifications'),
  markAllRead: () => api.patch('notifications/read-all'),
  delete: (id) => api.delete(`notifications/${id}`),
  unreadCount: () => api.get('notifications/unread-count'),
}

export const webhookApi = {
  list: () => api.get('webhooks'),
  create: (data) => api.post('webhooks', data),
  remove: (id) => api.delete(`webhooks/${id}`),
}

export const auditApi = {
  myLogs: (page = 1, action) => api.get(`audit?page=${page}${action ? `&action=${action}` : ''}`),
  verify:  () => api.get('audit/verify'),
  repair:  () => api.post('audit/repair'),
  clear:   () => api.delete('audit'),
  clearMyLogs: () => api.delete('audit'),
}

export const adminApi = {
  metrics: () => api.get('admin/metrics'),
  users: () => api.get('admin/users'),
  flagged: () => api.get('admin/flagged'),
}

export const healthApi = {
  check: () => api.get('health'),
}

export default api