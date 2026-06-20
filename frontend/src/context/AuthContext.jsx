import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import toast from 'react-hot-toast'
import authAPI from '../api/auth'
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
        setUserState(savedUser)
        setIsAuthenticated(true)

        // Verify token is still valid
        try {
          const response = await authAPI.verifyToken()
          if (response.success) {
            setUserState((prev) => ({ ...prev, ...response.data }))
            setUser({ ...savedUser, ...response.data })
          }
        } catch (error) {
          // Token invalid, try refresh
          try {
            const refreshToken = getRefreshToken()
            if (refreshToken) {
              const refreshResponse = await authAPI.refreshToken(refreshToken)
              if (refreshResponse.success) {
                setToken(refreshResponse.data.access_token)
                setRefreshToken(refreshResponse.data.refresh_token)
              } else {
                throw new Error('Refresh failed')
              }
            }
          } catch (refreshError) {
            // Both tokens invalid, logout
            handleLogout(true)
          }
        }
      }

      setLoading(false)
    }

    initAuth()
  }, [])

  // Login
  const handleLogin = useCallback(
    async (credentials) => {
      try {
        setLoading(true)
        const response = await authAPI.login(credentials)

        if (response.success) {
          const { access_token, refresh_token, user: userData } = response.data

          // Store tokens
          setToken(access_token)
          setRefreshToken(refresh_token)

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
        removeToken()
        removeRefreshToken()
        removeUser()
        setUserState(null)
        setIsAuthenticated(false)

        if (!silent) {
          toast.success('Logged out successfully')
          navigate('/login', { replace: true })
        }
      }
    },
    [navigate]
  )

  // Update user profile
  const handleUpdateProfile = useCallback(async (data) => {
    try {
      const response = await authAPI.updateProfile(data)
      if (response.success) {
        const updatedUser = { ...user, ...response.data }
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

  // Change password
  const handleChangePassword = useCallback(async (data) => {
    try {
      const response = await authAPI.changePassword(data)
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