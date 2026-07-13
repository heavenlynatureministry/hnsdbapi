import axios from 'axios'
import { getToken, removeToken, clearAll } from '../utils/storage'

const API_URL = import.meta.env.VITE_API_URL || 'https://hns-api.onrender.com/api/v1'

// Lazy import to avoid circular dependency
let offlineManager = null
const getOfflineManager = async () => {
  if (!offlineManager) {
    try {
      const module = await import('../utils/offlineManager')
      offlineManager = module.getOfflineManager()
    } catch (e) {
      console.warn('[Axios] Could not load offline manager:', e.message)
    }
  }
  return offlineManager
}

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
    // ✅ Return the unwrapped data
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

    // ✅ Network error (status 0) - Queue for offline sync
    console.warn('[Axios] 📵 Network error - queueing request for sync:', config.method?.toUpperCase(), config.url)

    const isMutation = ['post', 'put', 'patch', 'delete'].includes(config.method?.toLowerCase())
    const isGet = config.method?.toLowerCase() === 'get'

    if (isMutation) {
      // Queue mutations for later sync
      try {
        const om = await getOfflineManager()
        if (om) {
          await om.queueRequest(
            config.method.toUpperCase(),
            `${API_URL}${config.url}`,
            config.data ? JSON.parse(JSON.stringify(config.data)) : null
          )
          // Return a success-like response so the UI doesn't show an error
          return Promise.resolve({
            success: true,
            queued: true,
            message: 'Saved offline. Will sync when connection is restored.',
            data: config.data ? JSON.parse(JSON.stringify(config.data)) : null,
          })
        }
      } catch (queueError) {
        console.error('[Axios] Failed to queue offline request:', queueError)
      }
    } else if (isGet) {
      // For GET requests, try to return cached data
      try {
        const om = await getOfflineManager()
        if (om) {
          const cached = await om.getCachedResponse(config.url)
          if (cached) {
            console.log('[Axios] 📦 Returning cached response for:', config.url)
            return Promise.resolve(cached.data)
          }
        }
      } catch (cacheError) {
        console.warn('[Axios] Could not get cached response:', cacheError)
      }
    }

    // If we can't queue or cache, reject with a helpful message
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
