import { Outlet } from 'react-router-dom'

/**
 * AuthLayout - Clean layout for authentication pages (login, forgot password, etc.)
 * No sidebar or header, just centered content
 */
function AuthLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Top branding bar */}
      <div className="py-6 text-center">
        <div className="inline-flex items-center gap-3">
          <img 
            src="/logo.png" 
            alt="Heavenly Nature School Logo" 
            className="w-12 h-12 rounded-xl object-cover shadow-md"
            onError={(e) => { e.target.style.display = 'none' }}
          />
          <div className="text-left">
            <p className="text-sm font-bold text-gray-900 dark:text-white">Heavenly Nature School</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Management System</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4 pb-12">
        <Outlet />
      </div>

      {/* Footer */}
      <div className="py-4 text-center text-xs text-gray-400 dark:text-gray-600">
        &copy; {new Date().getFullYear()} Heavenly Nature Nursery & Primary School. All rights reserved.
      </div>
    </div>
  )
}

export default AuthLayout
