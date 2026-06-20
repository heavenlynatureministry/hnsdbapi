import axios from 'axios'
import { getToken, removeToken } from '../utils/storage'

// Create axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1',
  timeout: parseInt(import.meta.env.VITE_API_TIMEOUT) || 30000,
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
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor - Handle errors globally
api.interceptors.response.use(
  (response) => {
    return response.data
  },
  (error) => {
    const { response } = error

    if (response) {
      const { status, data } = response

      switch (status) {
        case 401:
          // Unauthorized - Clear token and redirect to login
          removeToken()
          if (window.location.pathname !== '/login') {
            window.location.href = '/login'
          }
          break

        case 403:
          // Forbidden - Insufficient permissions
          console.error('Access denied:', data?.message || 'Insufficient permissions')
          break

        case 404:
          // Not found
          console.error('Resource not found:', data?.message || 'Not found')
          break

        case 422:
          // Validation error
          console.error('Validation error:', data?.errors || data?.message)
          break

        case 429:
          // Rate limited
          console.error('Rate limited:', data?.message || 'Too many requests')
          break

        case 500:
          // Server error
          console.error('Server error:', data?.message || 'Internal server error')
          break

        default:
          console.error(`HTTP ${status}:`, data?.message || 'An error occurred')
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
      message: 'Network error. Please check your connection.',
      errors: null,
      data: null,
    })
  }
)

export default api