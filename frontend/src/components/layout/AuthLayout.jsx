import { Outlet } from 'react-router-dom'
import { School } from 'lucide-react'

/**
 * AuthLayout - Clean layout for authentication pages (login, forgot password, etc.)
 * No sidebar or header, just centered content
 */
function AuthLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Optional top branding bar */}
      <div className="py-6 text-center">
        <div className="inline-flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center">
            <School size={22} className="text-white" />
          </div>
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