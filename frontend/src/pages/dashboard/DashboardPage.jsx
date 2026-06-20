import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useApp } from '../../context/AppContext'
import StatsOverview from './widgets/StatsOverview'
import RecentStudents from './widgets/RecentStudents'
import AttendanceChart from './widgets/AttendanceChart'
import FinancialSummary from './widgets/FinancialSummary'
import UpcomingEvents from './widgets/UpcomingEvents'
import QuickActions from './widgets/QuickActions'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import { 
  GraduationCap, Users, School, ClipboardCheck, 
  DollarSign, Calendar, BarChart3, Bell
} from 'lucide-react'

function DashboardPage() {
  const { user } = useAuth()
  const { 
    dashboardData, 
    appLoading, 
    updatePageTitle, 
    updateBreadcrumbs,
    refreshDashboard 
  } = useApp()

  useEffect(() => {
    updatePageTitle('Dashboard')
    updateBreadcrumbs([{ label: 'Dashboard' }])
  }, [updatePageTitle, updateBreadcrumbs])

  if (appLoading) {
    return <LoadingSpinner fullScreen message="Loading dashboard..." />
  }

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good Morning'
    if (hour < 17) return 'Good Afternoon'
    return 'Good Evening'
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {getGreeting()}, {user?.first_name || 'User'}!
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Here's what's happening at Heavenly Nature School today.
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={refreshDashboard}
            className="btn btn-secondary btn-sm"
          >
            <BarChart3 size={16} />
            Refresh
          </button>
          <Link to="/reports" className="btn btn-primary btn-sm">
            <BarChart3 size={16} />
            View Reports
          </Link>
        </div>
      </div>

      {/* Stats Overview */}
      <StatsOverview data={dashboardData} />

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - 2/3 width */}
        <div className="lg:col-span-2 space-y-6">
          {/* Attendance Chart */}
          <AttendanceChart data={dashboardData?.attendance} />

          {/* Recent Students */}
          <RecentStudents />
        </div>

        {/* Right Column - 1/3 width */}
        <div className="space-y-6">
          {/* Financial Summary */}
          <FinancialSummary data={dashboardData?.financial} />

          {/* Upcoming Events */}
          <UpcomingEvents data={dashboardData?.events} />

          {/* Quick Actions */}
          <QuickActions />
        </div>
      </div>

      {/* Bottom Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { 
            label: 'Quick Links',
            items: [
              { name: 'Mark Attendance', path: '/attendance', color: 'bg-blue-500' },
              { name: 'Add Student', path: '/students/new', color: 'bg-green-500' },
              { name: 'Record Payment', path: '/financial/payments', color: 'bg-purple-500' },
              { name: 'Enter Results', path: '/exams', color: 'bg-orange-500' },
            ]
          },
        ].map((section, i) => (
          <div key={i} className="card md:col-span-4">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">{section.label}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {section.items.map((item, j) => (
                <Link
                  key={j}
                  to={item.path}
                  className={`${item.color} text-white p-3 rounded-lg hover:opacity-90 transition-opacity text-center text-sm font-medium`}
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default DashboardPage