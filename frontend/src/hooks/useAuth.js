import { useContext } from 'react'
import AuthContext from '../context/AuthContext'

/**
 * Custom hook for authentication
 * Provides access to user data, login, logout, and permission checks
 */
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export default useAuth