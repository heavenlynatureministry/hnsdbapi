import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import reportsAPI from '../../api/reports'
import PageHeader from '../../components/common/PageHeader'
import Card from '../../components/common/Card'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import { 
  BarChart3, GraduationCap, ClipboardCheck, DollarSign, 
  Users, FileText, Download, TrendingUp, Calendar,
  ArrowRight
} from 'lucide-react'

function ReportsPage() {
  const { updatePageTitle, updateBreadcrumbs } = useApp()
  const [loading, setLoading] = useState(false)
  const [overview, setOverview] = useState(null)

  useEffect(() => {
    updatePageTitle('Reports')
    updateBreadcrumbs([{ label: 'Dashboard', path: '/dashboard' }, { label: 'Reports' }])
    fetchOverview()
  }, [updatePageTitle, updateBreadcrumbs])

  const fetchOverview = async () => {
    setLoading(true)
    try {
      const response = await reportsAPI.getOverview()
      if (response?.success && response.data) {
        setOverview(response.data)
      }
    } catch (error) {
      console.error('Failed to fetch reports overview:', error)
    } finally {
      setLoading(false)
    }
  }

  const reports = [
    {
      id: 'academic',
      title: 'Academic Report',
      description: 'View class performance, student grades, subject analytics, and examination results.',
      icon: GraduationCap,
      color: 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300',
      path: '/reports/academic',
      features: ['Class Performance', 'Student Grades', 'Subject Analytics', 'Exam Results'],
    },
    {
      id: 'attendance',
      title: 'Attendance Report',
      description: 'Track attendance rates, identify chronic absentees, and monitor daily attendance trends.',
      icon: ClipboardCheck,
      color: 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300',
      path: '/reports/attendance',
      features: ['Attendance Rates', 'Chronic Absentees', 'Daily Trends', 'Class Comparison'],
    },
    {
      id: 'financial',
      title: 'Financial Report',
      description: 'Analyze income, expenses, fee collection, budgets, and financial projections.',
      icon: DollarSign,
      color: 'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300',
      path: '/reports/financial',
      features: ['Income Statement', 'Fee Collection', 'Budget Analysis', 'Cash Flow'],
    },
    {
      id: 'enrollment',
      title: 'Enrollment Report',
      description: 'Monitor student enrollment trends, demographics, and class distribution.',
      icon: Users,
      color: 'bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-300',
      path: '/reports/enrollment',
      features: ['Enrollment Trends', 'Demographics', 'Class Distribution', 'Retention Rates'],
    },
    {
      id: 'annual',
      title: 'Annual School Report',
      description: 'Comprehensive yearly report covering all aspects of school performance.',
      icon: FileText,
      color: 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-300',
      path: '/reports/annual',
      features: ['Academic Summary', 'Financial Overview', 'Staff Statistics', 'Achievements'],
    },
  ]

  const recentReports = overview?.recent_reports || []

  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader
        title="Reports Center"
        subtitle="Generate and view comprehensive school reports"
      />

      {/* Report Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reports.map((report) => (
          <Link key={report.id} to={report.path}>
            <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer group">
              <div className="flex items-start gap-4 mb-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${report.color}`}>
                  <report.icon size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-primary-600 transition-colors">
                    {report.title}
                  </h3>
                </div>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                {report.description}
              </p>
              <div className="space-y-1">
                {report.features.map((feature, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-gray-500">
                    <div className="w-1 h-1 rounded-full bg-primary-600" />
                    {feature}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-1 mt-4 text-sm text-primary-600 font-medium">
                Generate Report <ArrowRight size={14} />
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {/* Recent Reports */}
      <Card title="Recently Generated Reports">
        {loading ? (
          <LoadingSpinner />
        ) : recentReports.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">No reports generated yet.</p>
        ) : (
          <div className="space-y-2">
            {recentReports.map((report, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div>
                  <p className="font-medium text-sm">{report.name || report.title}</p>
                  <p className="text-xs text-gray-500">
                    {report.type || 'Report'} • Generated by {report.generated_by || 'System'}
                  </p>
                </div>
                <span className="text-xs text-gray-400">
                  {report.date ? new Date(report.date).toLocaleDateString() : 
                   report.generated_at ? new Date(report.generated_at).toLocaleDateString() : 'N/A'}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Reports Generated', value: overview?.total_reports || '0', icon: FileText, color: 'bg-blue-100 text-blue-600' },
          { label: 'This Month', value: overview?.this_month || '0', icon: Calendar, color: 'bg-green-100 text-green-600' },
          { label: 'Downloaded', value: overview?.downloaded || '0', icon: Download, color: 'bg-purple-100 text-purple-600' },
          { label: 'Scheduled', value: overview?.scheduled || '0', icon: BarChart3, color: 'bg-orange-100 text-orange-600' },
        ].map((stat, i) => (
          <div key={i} className="stat-card">
            <div className={`stat-card-icon ${stat.color}`}><stat.icon size={20} /></div>
            <div className="stat-card-value">{stat.value}</div>
            <div className="stat-card-label">{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default ReportsPage
