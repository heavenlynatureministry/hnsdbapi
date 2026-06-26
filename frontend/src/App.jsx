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



update the app with this
import { BrowserRouter } from 'react-router-dom';
import { OfflineProvider } from './context/OfflineContext';
import OfflineIndicator from './components/common/OfflineIndicator';
// ... other imports

function App() {
  return (
    <BrowserRouter>
      <OfflineProvider>
        {/* Your existing app content */}
        <OfflineIndicator />
      </OfflineProvider>
    </BrowserRouter>
  );
}

export default App;
