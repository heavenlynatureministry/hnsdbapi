import { useAuth } from './context/AuthContext'
import { useOffline } from './context/OfflineContext'
import LoadingSpinner from './components/common/LoadingSpinner'
import AppRoutes from './routes/AppRoutes'

function App() {
  const { loading } = useAuth()
  const { isOnline } = useOffline()

  // Show loading spinner while checking authentication
  if (loading) {
    return <LoadingSpinner fullScreen message="Loading application..." />
  }

  return (
    <>
      {/* Optional: Offline banner at top of app */}
      {!isOnline && (
        <div className="bg-yellow-500 text-black text-center py-2 text-sm font-medium">
          ⚠️ You are currently offline. Changes will be saved locally and synced when connection is restored.
        </div>
      )}
      <AppRoutes />
    </>
  )
}

export default App
