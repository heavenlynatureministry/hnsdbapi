import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import financialAPI from '../../../api/financial'
import { 
  GraduationCap, Users, School, ClipboardCheck, 
  DollarSign
} from 'lucide-react'

function StatsOverview({ data = {} }) {
  const [financialData, setFinancialData] = useState(null)

  useEffect(() => {
    // Fetch financial dashboard data if not provided
    if (!data?.financial || data.financial.balance === undefined) {
      fetchFinancialData()
    } else {
      setFinancialData(data.financial)
    }
  }, [data])

  const fetchFinancialData = async () => {
    try {
      const response = await financialAPI.getDashboard()
      if (response?.success && response.data) {
        setFinancialData({
          balance: response.data.net_balance || 0,
          total_income: response.data.total_income || 0,
          total_expenses: response.data.total_expenses || 0,
          student_payments: response.data.student_payments || 0,
          donations_income: response.data.donations_income || 0,
          pending_approvals: response.data.pending_approvals || 0,
        })
      } else if (response?.data) {
        const d = response.data
        setFinancialData({
          balance: d.net_balance || 0,
          total_income: d.total_income || 0,
          total_expenses: d.total_expenses || 0,
          student_payments: d.student_payments || 0,
          donations_income: d.donations_income || 0,
          pending_approvals: d.pending_approvals || 0,
        })
      } else {
        setFinancialData({ balance: 0, total_income: 0, total_expenses: 0 })
      }
    } catch (error) {
      console.error('Failed to fetch financial data:', error)
      setFinancialData({ balance: 0, total_income: 0, total_expenses: 0 })
    }
  }

  const fin = financialData || data?.financial || {}

  const stats = [
    {
      label: 'Total Students',
      value: data?.students?.total_active || data?.total_students || 0,
      icon: GraduationCap,
      color: 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300',
      link: '/students',
    },
    {
      label: 'Teachers',
      value: data?.staff?.total_teachers || data?.total_teachers || 0,
      icon: Users,
      color: 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300',
      link: '/teachers',
    },
    {
      label: 'Classes',
      value: data?.staff?.total_classes || data?.total_classes || 0,
      icon: School,
      color: 'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300',
      link: '/classes',
    },
    {
      label: 'Staff',
      value: data?.staff?.total_staff || data?.total_staff || 0,
      icon: Users,
      color: 'bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-300',
      link: '/users',
    },
    {
      label: 'Upcoming Events',
      value: data?.events?.upcoming || 0,
      icon: ClipboardCheck,
      color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900 dark:text-emerald-300',
      link: '/school/events',
    },
    {
      label: 'Balance',
      value: fin.balance !== undefined && fin.balance !== null 
        ? `SSP ${Number(fin.balance).toLocaleString()}` 
        : 'SSP 0',
      icon: DollarSign,
      color: 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-300',
      link: '/financial',
    },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
      {stats.map((stat, index) => (
        <Link
          key={index}
          to={stat.link}
          className="card cursor-pointer hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between mb-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.color}`}>
              <stat.icon size={20} />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {stat.value}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {stat.label}
          </div>
        </Link>
      ))}
    </div>
  )
}

export default StatsOverview
