import { useAuth } from './context/AuthContext'
import LoadingSpinner from './components/common/LoadingSpinner'
import AppRoutes from './routes/AppRoutes'

function App() {
  const { loading } = useAuth()

  // Show loading spinner while checking authentication
  if (loading) {
    return <LoadingSpinner fullScreen message="Loading application..." />
  }

  return <AppRoutes />
}

export default App
