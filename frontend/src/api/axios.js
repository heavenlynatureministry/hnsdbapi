import axios from 'axios'
import { getToken, removeToken, clearAll } from '../utils/storage'

const API_URL = import.meta.env.VITE_API_URL || 'https://hns-api.onrender.com/api/v1'

const api = axios.create({
  baseURL: API_URL,
  timeout: 120000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor - Add auth token
api.interceptors.request.use(
  (config) => {
    const token = getToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor - Handle errors and offline queuing
api.interceptors.response.use(
  (response) => {
    return response.data
  },
  async (error) => {
    const { response, config } = error

    if (response) {
      const { status, data } = response

      if (status === 401 && !config.url?.includes('/auth/login')) {
        clearAll()
        if (window.location.pathname !== '/login') {
          window.location.href = window.location.origin + '/login'
        }
        return Promise.reject({ status: 401, message: 'Session expired' })
      }

      if (status === 401 && config.url?.includes('/auth/login')) {
        return Promise.reject({ status: 401, message: data?.message || 'Invalid credentials' })
      }

      if (status === 500) {
        console.error('Server error:', data?.message)
      }

      return Promise.reject({
        status,
        message: data?.message || 'An error occurred',
        errors: data?.errors || null,
        data: data?.data || null,
      })
    }

    // ✅ Network error (status 0) - Queue directly to IndexedDB (no circular dependency)
    console.warn('[Offline] 📵 Queueing for sync:', config.method?.toUpperCase(), config.url)

    const isMutation = ['post', 'put', 'patch', 'delete'].includes(config.method?.toLowerCase())

    if (isMutation) {
      try {
        // ✅ Direct import from offlineDB - no circular dependency
        const { addToSyncQueue } = await import('../utils/offlineDB')
        
        await addToSyncQueue({
          url: `${API_URL}${config.url}`,
          method: config.method.toUpperCase(),
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': config.headers?.Authorization || '',
          },
          body: config.data ? JSON.parse(JSON.stringify(config.data)) : null,
        })

        console.log('[Offline] ✅ Queued:', config.method.toUpperCase(), config.url)

        // Return success so UI doesn't break
        return Promise.resolve({
          success: true,
          queued: true,
          message: 'Saved offline. Will sync when connection is restored.',
          data: config.data ? JSON.parse(JSON.stringify(config.data)) : null,
        })
      } catch (queueError) {
        console.error('[Offline] Queue failed:', queueError)
      }
    }

    // Reject with offline message
    return Promise.reject({
      status: 0,
      message: 'You are offline. Changes will be synced when connection is restored.',
      errors: null,
      data: null,
      offline: true,
    })
  }
)

export default api
