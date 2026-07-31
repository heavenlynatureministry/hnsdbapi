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
    // Return the full response so callers can access response.data, response.status, etc.
    return response
  },
  async (error) => {
    const { response, config } = error

    // Handle server responses with errors
    if (response) {
      const { status, data } = response

      // 🔐 Unauthorized - Clear auth and redirect to login
      if (status === 401 && !config.url?.includes('/auth/login')) {
        clearAll()
        if (window.location.pathname !== '/login') {
          window.location.href = window.location.origin + '/login'
        }
        return Promise.reject({ 
          status: 401, 
          message: 'Session expired. Please login again.',
          data: null 
        })
      }

      // 🔐 Login-specific 401
      if (status === 401 && config.url?.includes('/auth/login')) {
        return Promise.reject({ 
          status: 401, 
          message: data?.message || data?.detail || 'Invalid email or password',
          data: null 
        })
      }

      // ⚠️ Forbidden
      if (status === 403) {
        return Promise.reject({
          status: 403,
          message: data?.message || data?.detail || 'You do not have permission to perform this action',
          data: data?.data || null,
        })
      }

      // ❌ Not Found
      if (status === 404) {
        return Promise.reject({
          status: 404,
          message: data?.message || data?.detail || 'Resource not found',
          data: data?.data || null,
        })
      }

      // ⚠️ Validation Error
      if (status === 422) {
        const validationErrors = data?.detail || data?.errors || null
        return Promise.reject({
          status: 422,
          message: 'Validation error',
          errors: Array.isArray(validationErrors) 
            ? validationErrors.map(e => e.msg || e.message || JSON.stringify(e))
            : [validationErrors],
          data: data?.data || null,
        })
      }

      // ❌ Server Error
      if (status >= 500) {
        console.error('Server error:', status, data?.message || data?.detail)
        return Promise.reject({
          status,
          message: data?.message || data?.detail || 'Server error. Please try again later.',
          data: data?.data || null,
        })
      }

      // 🔄 Other errors (400, 409, etc.)
      return Promise.reject({
        status,
        message: data?.message || data?.detail || 'An error occurred',
        errors: data?.errors || null,
        data: data?.data || null,
      })
    }

    // 📵 Network error (status 0) - Queue for offline sync
    console.warn('[Offline] 📵 No connection - Queueing request:', config.method?.toUpperCase(), config.url)

    const isMutation = ['post', 'put', 'patch', 'delete'].includes(config.method?.toLowerCase())

    if (isMutation) {
      try {
        // Direct import from offlineDB to avoid circular dependency
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

        console.log('[Offline] ✅ Queued for sync:', config.method.toUpperCase(), config.url)

        // Return success so UI doesn't break
        return Promise.resolve({
          data: {
            success: true,
            queued: true,
            message: 'Saved offline. Will sync when connection is restored.',
            data: config.data ? JSON.parse(JSON.stringify(config.data)) : null,
          },
          status: 200,
          statusText: 'OK (Offline)',
          headers: {},
          config: config,
        })
      } catch (queueError) {
        console.error('[Offline] ❌ Failed to queue:', queueError)
      }
    }

    // Reject with offline message for GET requests or failed queue
    return Promise.reject({
      status: 0,
      message: 'You are offline. Please check your internet connection.',
      errors: null,
      data: null,
      offline: true,
    })
  }
)

export default api
