import { Inbox } from 'lucide-react'
import { isValidElement } from 'react'

function EmptyState({ 
  icon: IconComponent, 
  title = 'No data found', 
  description = '', 
  action,
  className = ''
}) {
  // Handle both component references and JSX elements
  const renderIcon = () => {
    if (!IconComponent) return <Inbox size={36} className="text-gray-400 dark:text-gray-500" />
    if (isValidElement(IconComponent)) return IconComponent
    if (typeof IconComponent === 'function') {
      const Icon = IconComponent
      return <Icon size={36} className="text-gray-400 dark:text-gray-500" />
    }
    return <Inbox size={36} className="text-gray-400 dark:text-gray-500" />
  }

  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}>
      <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
        {renderIcon()}
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-4">
          {description}
        </p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

export default EmptyState
