import { Outlet } from 'react-router-dom'
import { useTheme } from '../../context/ThemeContext'
import Sidebar from './Sidebar'
import Header from './Header'

/**
 * DashboardLayout - Layout without footer for dashboard pages
 */
function DashboardLayout() {
  const { sidebarCollapsed } = useTheme()

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Sidebar />
      <div className={`transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-[72px]' : 'lg:ml-[260px]'}`}>
        <Header />
        <main className="p-4 sm:p-6 lg:p-8 min-h-[calc(100vh-4rem)]">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default DashboardLayout