import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { useApp } from '../../context/AppContext'
import {
  Menu, Bell, Moon, Sun, Search, LogOut, User, Settings,
  ChevronDown, X
} from 'lucide-react'

function Header() {
  const { user, logout } = useAuth()
  const { theme, toggleTheme, toggleMobileSidebar } = useTheme()
  const { pageTitle, breadcrumbs, notifications, unreadNotifications, markAllNotificationsRead } = useApp()

  const [showProfile, setShowProfile] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showSearch, setShowSearch] = useState(false)

  return (
    <header className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 h-16 flex items-center px-4 lg:px-6">
      {/* Mobile Menu Button */}
      <button onClick={toggleMobileSidebar} className="lg:hidden mr-3 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
        <Menu size={22} />
      </button>

      {/* Page Title & Breadcrumbs */}
      <div className="flex-1 min-w-0">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white truncate">{pageTitle || 'Dashboard'}</h1>
        {Array.isArray(breadcrumbs) && breadcrumbs.length > 0 && (
          <nav className="hidden sm:flex items-center gap-1 text-xs text-gray-500 mt-0.5">
            {breadcrumbs.map((crumb, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <span>/</span>}
                {crumb?.path ? (
                  <Link to={crumb.path} className="hover:text-primary-600 transition-colors">
                    {crumb?.label || ''}
                  </Link>
                ) : (
                  <span className="text-gray-400">{crumb?.label || ''}</span>
                )}
              </span>
            ))}
          </nav>
        )}
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-1">
        {/* Search Toggle */}
        <button onClick={() => setShowSearch(!showSearch)} className="btn btn-ghost btn-sm btn-icon hidden sm:flex" title="Search">
          <Search size={18} />
        </button>

        {/* Notifications */}
        <div className="relative">
          <button onClick={() => { setShowNotifications(!showNotifications); setShowProfile(false) }} className="btn btn-ghost btn-sm btn-icon relative" title="Notifications">
            <Bell size={18} />
            {unreadNotifications > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold">
                {unreadNotifications > 9 ? '9+' : unreadNotifications}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowNotifications(false)} />
              <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-20 animate-scale-in">
                <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="font-semibold text-sm">Notifications</h3>
                  <button onClick={markAllNotificationsRead} className="text-xs text-primary-600 hover:text-primary-700">Mark all read</button>
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {!Array.isArray(notifications) || notifications.length === 0 ? (
                    <div className="text-center py-8 text-sm text-gray-500">No notifications</div>
                  ) : (
                    notifications.slice(0, 5).map((notif) => (
                      <div key={notif?.id || Math.random()} className={`px-4 py-3 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${!notif?.read ? 'bg-primary-50/50 dark:bg-primary-900/10' : ''}`}>
                        <p className="text-sm font-medium">{notif?.title || 'Notification'}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{notif?.message || ''}</p>
                        <p className="text-[10px] text-gray-400 mt-1">{notif?.timestamp ? new Date(notif.timestamp).toLocaleString() : ''}</p>
                      </div>
                    ))
                  )}
                </div>
                {Array.isArray(notifications) && notifications.length > 5 && (
                  <div className="p-3 text-center border-t border-gray-200 dark:border-gray-700">
                    <button className="text-xs text-primary-600 hover:text-primary-700">View all notifications</button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Theme Toggle */}
        <button onClick={toggleTheme} className="btn btn-ghost btn-sm btn-icon" title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Profile Dropdown */}
        <div className="relative">
          <button onClick={() => { setShowProfile(!showProfile); setShowNotifications(false) }} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ml-1">
            <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white font-medium text-sm">
              {user?.first_name?.[0]}{user?.last_name?.[0]}
            </div>
            <ChevronDown size={14} className="text-gray-400 hidden sm:block" />
          </button>

          {showProfile && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowProfile(false)} />
              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-20 py-1 animate-scale-in">
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                  <p className="font-medium text-sm">{user?.first_name || ''} {user?.last_name || ''}</p>
                  <p className="text-xs text-gray-500">{user?.email || ''}</p>
                  <span className="inline-block mt-1 text-[10px] font-medium bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 px-2 py-0.5 rounded-full capitalize">
                    {user?.role || ''}
                  </span>
                </div>
                <Link to="/profile" onClick={() => setShowProfile(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <User size={16} /> My Profile
                </Link>
                <Link to="/school/settings" onClick={() => setShowProfile(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <Settings size={16} /> Settings
                </Link>
                <hr className="my-1 border-gray-200 dark:border-gray-700" />
                <button onClick={() => { setShowProfile(false); logout() }} className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 w-full text-left">
                  <LogOut size={16} /> Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

export default Header
