import axios from 'axios'
import { getToken, removeToken, clearAll } from '../utils/storage'

const API_URL = import.meta.env.VITE_API_URL || 'https://hns-api.onrender.com/api/v1'

const api = axios.create({
  baseURL: API_URL,
  timeout: 120000, // 2 minutes for Render cold starts
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
      if (status === 401 && !config.url?.includes('/auth/login')) {
        clearAll()
        // Use window.location.origin to handle any base path
        if (window.location.pathname !== '/login') {
          window.location.href = window.location.origin + '/login'
        }
        return Promise.reject({ status: 401, message: 'Session expired' })
      }

      // For login failures, pass through
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

    // Network error - likely cold start
    console.error('Network error:', error.message)
    return Promise.reject({
      status: 0,
      message: 'Server is waking up (free tier). Please wait 30-60 seconds and try again.',
      errors: null,
      data: null,
    })
  }
)

export default api
