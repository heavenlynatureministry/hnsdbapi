import axios from 'axios'
import { getToken, removeToken, getRefreshToken, setToken, removeUser, clearAll } from '../utils/storage'

// Create axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://hns-api.onrender.com/api/v1',
  timeout: 60000, // 60 seconds for cold starts
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

// Response interceptor - Handle errors globally
api.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const { response, config } = error

    if (response) {
      const { status, data } = response

      // Handle 401 - Try token refresh or redirect to login
      if (status === 401 && !config._retry) {
        config._retry = true
        
        const refreshToken = getRefreshToken()
        if (refreshToken) {
          try {
            const refreshResponse = await axios.post(
              `${import.meta.env.VITE_API_URL || 'https://hns-api.onrender.com/api/v1'}/auth/login`,
              { email: '', password: '' } // This won't work for refresh, skip
            )
          } catch (refreshError) {
            // Refresh failed - full logout
          }
        }
        
        // Clear everything and redirect
        clearAll()
        if (window.location.pathname !== '/login') {
          window.location.href = '/login'
        }
        return Promise.reject({ status: 401, message: 'Session expired. Please login again.' })
      }

      // Handle other errors
      switch (status) {
        case 403:
          console.error('Access denied:', data?.message || 'Insufficient permissions')
          break
        case 404:
          console.error('Resource not found:', data?.message || 'Not found')
          break
        case 422:
          console.error('Validation error:', data?.errors || data?.message)
          break
        case 429:
          console.error('Rate limited:', data?.message || 'Too many requests')
          break
        case 500:
          console.error('Server error:', data?.message || 'Internal server error')
          break
      }

      return Promise.reject({
        status,
        message: data?.message || 'An error occurred',
        errors: data?.errors || null,
        data: data?.data || null,
      })
    }

    // Network error - likely Render cold start
    console.error('Network error:', error.message)
    return Promise.reject({
      status: 0,
      message: 'Network error. Server may be waking up. Please try again in 30 seconds.',
      errors: null,
      data: null,
    })
  }
)

export default api
