import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import LoadingSpinner from '../components/common/LoadingSpinner'

/**
 * RoleRoute - Protects routes that require specific roles
 * Redirects to dashboard if user doesn't have required role
 * 
 * @param {Object} props
 * @param {string[]} props.roles - Array of allowed roles
 * @param {string} [props.redirectTo='/dashboard'] - Redirect path for unauthorized users
 */
function RoleRoute({ roles = [], redirectTo = '/dashboard' }) {
  const { user, loading, hasRole } = useAuth()
  const location = useLocation()

  // Show loading spinner while checking auth state
  if (loading) {
    return <LoadingSpinner fullScreen message="Verifying permissions..." />
  }

  // If no user, redirect to login
  if (!user) {
    return (
      <Navigate
        to="/login"
        state={{ from: location }}
        replace
      />
    )
  }

  // Check if user has required role
  if (!hasRole(roles)) {
    return (
      <Navigate
        to={redirectTo}
        state={{
          from: location,
          error: 'You do not have permission to access this page.',
        }}
        replace
      />
    )
  }

  // Render child routes if authorized
  return <Outlet />
}

/**
 * PermissionRoute - Protects routes that require specific permissions
 * 
 * @param {Object} props
 * @param {string[]} props.permissions - Array of required permissions
 * @param {string} [props.redirectTo='/dashboard'] - Redirect path
 */
export function PermissionRoute({ permissions = [], redirectTo = '/dashboard' }) {
  const { user, loading, hasPermission } = useAuth()
  const location = useLocation()

  if (loading) {
    return <LoadingSpinner fullScreen message="Verifying permissions..." />
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        state={{ from: location }}
        replace
      />
    )
  }

  // Check if user has all required permissions
  const hasAllPermissions = permissions.every((perm) => hasPermission(perm))

  if (!hasAllPermissions) {
    return (
      <Navigate
        to={redirectTo}
        state={{
          from: location,
          error: 'You do not have sufficient permissions to access this page.',
        }}
        replace
      />
    )
  }

  return <Outlet />
}

/**
 * AdminRoute - Shortcut for admin-only routes
 */
export function AdminRoute() {
  return <RoleRoute roles={['admin']} />
}

/**
 * TeacherRoute - Shortcut for teacher-only routes
 */
export function TeacherRoute() {
  return <RoleRoute roles={['admin', 'teacher']} />
}

/**
 * AccountantRoute - Shortcut for accountant routes
 */
export function AccountantRoute() {
  return <RoleRoute roles={['admin', 'accountant']} />
}

export default RoleRoute