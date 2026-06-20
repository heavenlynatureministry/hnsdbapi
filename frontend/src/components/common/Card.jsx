function Card({ title, subtitle, icon, actions, children, className = '', padding = true, hover = false, onClick }) {
  return (
    <div 
      className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm transition-all duration-200 ${hover ? 'hover:shadow-md cursor-pointer' : ''} ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
    >
      {/* Card Header */}
      {(title || actions) && (
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            {icon && <span className="text-primary-600">{icon}</span>}
            <div>
              {title && <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>}
              {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
            </div>
          </div>
          {actions && <div>{actions}</div>}
        </div>
      )}
      
      {/* Card Body */}
      <div className={padding ? 'p-5' : ''}>
        {children}
      </div>
    </div>
  )
}

export default Card