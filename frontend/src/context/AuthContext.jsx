import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import toast from 'react-hot-toast'
import authAPI from '../api/auth'
import api from '../api/axios'
import {
  getToken,
  setToken,
  removeToken,
  getRefreshToken,
  setRefreshToken,
  removeRefreshToken,
  getUser,
  setUser,
  removeUser,
  clearAll,
} from '../utils/storage'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUserState] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      const token = getToken()
      const savedUser = getUser()

      if (token && savedUser) {
        // Set user immediately from storage (don't wait for verification)
        setUserState(savedUser)
        setIsAuthenticated(true)

        // Verify token in background
        try {
          const response = await authAPI.verifyToken()
          if (response.success) {
            const updatedUser = { ...savedUser, ...response.data }
            setUserState(updatedUser)
            setUser(updatedUser)
          }
        } catch (error) {
          console.log('Token verification failed, logging out')
          // Token invalid - silent logout
          clearAll()
          setUserState(null)
          setIsAuthenticated(false)
        }
      } else {
        // No token, just stop loading
        setIsAuthenticated(false)
        setUserState(null)
      }

      setLoading(false)
    }

    initAuth()
  }, [])

  // Login
  const handleLogin = useCallback(
    async (credentials) => {
      setLoading(true)
      try {
        const response = await authAPI.login(credentials)

        if (response.success) {
          const { access_token, refresh_token, user: userData } = response.data

          // Store tokens first
          setToken(access_token)
          if (refresh_token) setRefreshToken(refresh_token)

          // Store user
          setUser(userData)
          setUserState(userData)
          setIsAuthenticated(true)

          toast.success(`Welcome back, ${userData.first_name}!`)

          // Redirect to dashboard or previous page
          const from = location.state?.from?.pathname || '/dashboard'
          navigate(from, { replace: true })

          return { success: true }
        }
      } catch (error) {
        const message = error.message || 'Invalid email or password'
        toast.error(message)
        return { success: false, message }
      } finally {
        setLoading(false)
      }
    },
    [navigate, location]
  )

  // Logout
  const handleLogout = useCallback(
    async (silent = false) => {
      try {
        if (!silent) {
          await authAPI.logout()
        }
      } catch (error) {
        // Ignore logout errors
      } finally {
        clearAll()
        setUserState(null)
        setIsAuthenticated(false)

        if (!silent) {
          navigate('/login', { replace: true })
        }
      }
    },
    [navigate]
  )

  // Update user profile - uses direct API call
  const handleUpdateProfile = useCallback(async (data) => {
    try {
      const response = await api.put('/auth/me', data)
      if (response.success) {
        const updatedUser = { ...user, ...data }
        setUserState(updatedUser)
        setUser(updatedUser)
        toast.success('Profile updated successfully')
        return { success: true }
      }
    } catch (error) {
      toast.error(error.message || 'Failed to update profile')
      return { success: false, message: error.message }
    }
  }, [user])

  // Change password - uses direct API call
  const handleChangePassword = useCallback(async (data) => {
    try {
      const response = await api.post('/auth/change-password', data)
      if (response.success) {
        toast.success('Password changed successfully')
        return { success: true }
      }
    } catch (error) {
      toast.error(error.message || 'Failed to change password')
      return { success: false, message: error.message }
    }
  }, [])

  // Check if user has role
  const hasRole = useCallback(
    (roles) => {
      if (!user) return false
      if (Array.isArray(roles)) {
        return roles.includes(user.role)
      }
      return user.role === roles
    },
    [user]
  )

  // Check if user has permission
  const hasPermission = useCallback(
    (permission) => {
      if (!user) return false
      if (user.role === 'admin') return true
      if (user.permissions?.includes('*')) return true
      return user.permissions?.includes(permission)
    },
    [user]
  )

  const value = {
    user,
    loading,
    isAuthenticated,
    login: handleLogin,
    logout: handleLogout,
    updateProfile: handleUpdateProfile,
    changePassword: handleChangePassword,
    hasRole,
    hasPermission,
    setUser: setUserState,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export default AuthContext
