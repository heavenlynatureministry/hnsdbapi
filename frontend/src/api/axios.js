import axios from 'axios'
import { getToken, removeToken, getRefreshToken, setToken, removeUser, clearAll } from '../utils/storage'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://hns-api.onrender.com/api/v1',
  timeout: 60000,
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

// Response interceptor - Handle errors
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const { response, config } = error

    if (response) {
      const { status, data } = response

      // Only redirect to login on 401 if NOT already on login page
      // AND if it's not a login attempt itself
      if (status === 401 && !config.url.includes('/auth/login')) {
        // Clear stored data
        clearAll()
        // Only redirect if not already on login page
        if (window.location.pathname !== '/login') {
          window.location.href = '/login'
        }
        return Promise.reject({
          status: 401,
          message: data?.message || 'Session expired',
        })
      }

      // For login failures, just pass the error through
      if (status === 401 && config.url.includes('/auth/login')) {
        return Promise.reject({
          status: 401,
          message: data?.message || 'Invalid credentials',
        })
      }

      // Other errors
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

    // Network error
    console.error('Network error:', error.message)
    return Promise.reject({
      status: 0,
      message: 'Network error. Server may be waking up. Please try again.',
      errors: null,
      data: null,
    })
  }
)

export default api
