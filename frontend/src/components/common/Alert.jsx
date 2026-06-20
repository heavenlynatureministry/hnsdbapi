import { AlertTriangle, CheckCircle, Info, XCircle, X } from 'lucide-react'
import { useState } from 'react'

const variants = {
  success: {
    icon: CheckCircle,
    bg: 'bg-green-50 dark:bg-green-900/20',
    border: 'border-green-200 dark:border-green-800',
    text: 'text-green-800 dark:text-green-300',
    iconColor: 'text-green-500',
  },
  error: {
    icon: XCircle,
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-200 dark:border-red-800',
    text: 'text-red-800 dark:text-red-300',
    iconColor: 'text-red-500',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'bg-yellow-50 dark:bg-yellow-900/20',
    border: 'border-yellow-200 dark:border-yellow-800',
    text: 'text-yellow-800 dark:text-yellow-300',
    iconColor: 'text-yellow-500',
  },
  info: {
    icon: Info,
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-200 dark:border-blue-800',
    text: 'text-blue-800 dark:text-blue-300',
    iconColor: 'text-blue-500',
  },
}

function Alert({ variant = 'info', title, children, onClose, className = '' }) {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  const config = variants[variant] || variants.info
  const Icon = config.icon

  return (
    <div className={`flex items-start gap-3 p-4 rounded-lg border ${config.bg} ${config.border} animate-scale-in ${className}`}>
      <Icon size={20} className={`flex-shrink-0 mt-0.5 ${config.iconColor}`} />
      <div className={`flex-1 text-sm ${config.text}`}>
        {title && <p className="font-semibold mb-1">{title}</p>}
        {children && <div>{children}</div>}
      </div>
      {onClose && (
        <button onClick={() => { setDismissed(true); onClose?.() }} className={`flex-shrink-0 p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 transition-colors ${config.text}`}>
          <X size={16} />
        </button>
      )}
    </div>
  )
}

export default Alert