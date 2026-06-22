import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import LoadingSpinner from '../components/common/LoadingSpinner'

function PrivateRoute() {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()

  // Show loading spinner while checking auth state
  if (loading) {
    return <LoadingSpinner fullScreen message="Checking authentication..." />
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    // Don't redirect if already on login page
    if (location.pathname === '/login') {
      return <Outlet />
    }
    
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Render child routes if authenticated
  return <Outlet />
}

export default PrivateRoute
