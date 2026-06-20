import { ArrowUp, ArrowDown, Minus } from 'lucide-react'

function StatCard({ 
  label, 
  value, 
  icon: Icon, 
  trend, 
  trendUp, 
  color = 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300',
  className = '',
  onClick 
}) {
  return (
    <div 
      className={`stat-card cursor-pointer hover:shadow-md transition-shadow ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
          {Icon && <Icon size={20} />}
        </div>
        {trend !== undefined && trend !== null && (
          <span className={`flex items-center text-xs font-medium ${
            trendUp === true ? 'text-green-600 dark:text-green-400' : 
            trendUp === false ? 'text-red-600 dark:text-red-400' : 
            'text-gray-400 dark:text-gray-500'
          }`}>
            {trendUp === true && <ArrowUp size={14} className="mr-0.5" />}
            {trendUp === false && <ArrowDown size={14} className="mr-0.5" />}
            {trendUp === null && <Minus size={14} className="mr-0.5" />}
            {trend}
          </span>
        )}
      </div>
      <div className="stat-card-value">
        {value}
      </div>
      <div className="stat-card-label">
        {label}
      </div>
    </div>
  )
}

export default StatCard