import { 
  GraduationCap, Users, School, ClipboardCheck, 
  DollarSign, TrendingUp, TrendingDown, Minus
} from 'lucide-react'

function StatsOverview({ data = {} }) {
  const stats = [
    {
      label: 'Total Students',
      value: data?.students?.total_active || 0,
      icon: GraduationCap,
      color: 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300',
      trend: '+12',
      trendUp: true,
      link: '/students',
    },
    {
      label: 'Teachers',
      value: data?.staff?.total_teachers || 0,
      icon: Users,
      color: 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300',
      trend: '+2',
      trendUp: true,
      link: '/teachers',
    },
    {
      label: 'Classes',
      value: data?.staff?.total_classes || 0,
      icon: School,
      color: 'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300',
      trend: '0',
      trendUp: null,
      link: '/classes',
    },
    {
      label: 'Attendance Today',
      value: `${data?.attendance?.attendance_rate || 0}%`,
      icon: ClipboardCheck,
      color: 'bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-300',
      trend: '-3%',
      trendUp: false,
      link: '/attendance',
    },
    {
      label: 'Fee Collection',
      value: `${data?.financial?.collection_rate || 0}%`,
      icon: DollarSign,
      color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900 dark:text-emerald-300',
      trend: '+5%',
      trendUp: true,
      link: '/financial/payments',
    },
    {
      label: 'Balance',
      value: `SSP ${(data?.financial?.balance || 0).toLocaleString()}`,
      icon: DollarSign,
      color: 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-300',
      trend: null,
      trendUp: null,
      link: '/financial',
    },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
      {stats.map((stat, index) => (
        <div
          key={index}
          className="card cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => window.location.href = stat.link}
        >
          <div className="flex items-center justify-between mb-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.color}`}>
              <stat.icon size={20} />
            </div>
            {stat.trend && (
              <span className={`flex items-center text-xs font-medium ${
                stat.trendUp === true ? 'text-green-600' : 
                stat.trendUp === false ? 'text-red-600' : 
                'text-gray-400'
              }`}>
                {stat.trendUp === true && <TrendingUp size={14} className="mr-0.5" />}
                {stat.trendUp === false && <TrendingDown size={14} className="mr-0.5" />}
                {stat.trendUp === null && <Minus size={14} className="mr-0.5" />}
                {stat.trend}
              </span>
            )}
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {stat.value}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {stat.label}
          </div>
        </div>
      ))}
    </div>
  )
}

export default StatsOverview