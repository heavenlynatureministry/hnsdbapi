import { useEffect } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import Button from './Button'

function ConfirmDialog({ 
  open = false, 
  onClose, 
  onConfirm, 
  title = 'Confirm Action', 
  message = 'Are you sure?', 
  confirmText = 'Confirm', 
  cancelText = 'Cancel',
  variant = 'danger',
  loading = false,
}) {
  // Close on Escape key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && open) onClose?.()
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      
      {/* Dialog */}
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scale-in">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
          <X size={18} />
        </button>

        <div className="text-center">
          <div className={`inline-flex items-center justify-center w-14 h-14 rounded-full mb-4 ${
            variant === 'danger' ? 'bg-red-100 dark:bg-red-900/30 text-red-600' :
            variant === 'warning' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600' :
            'bg-blue-100 dark:bg-blue-900/30 text-blue-600'
          }`}>
            <AlertTriangle size={26} />
          </div>
          
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {title}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            {message}
          </p>
        </div>

        <div className="flex gap-3">
          <Button
            variant={variant === 'danger' ? 'danger' : 'primary'}
            onClick={onConfirm}
            loading={loading}
            className="flex-1"
          >
            {confirmText}
          </Button>
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={loading}
            className="flex-1"
          >
            {cancelText}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmDialog