import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import {
  LayoutDashboard, GraduationCap, Users, School, ClipboardCheck,
  FileText, DollarSign, Calendar, Settings, BarChart3,
  Shield, UserCircle, ChevronLeft, ChevronRight, BookOpen,
  X
} from 'lucide-react'

const menuItems = [
  {
    title: 'MAIN',
    items: [
      { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'teacher', 'accountant', 'counselor', 'staff'] },
    ],
  },
  {
    title: 'ACADEMIC',
    items: [
      { path: '/students', label: 'Students', icon: GraduationCap, roles: ['admin', 'teacher'] },
      { path: '/teachers', label: 'Teachers', icon: Users, roles: ['admin'] },
      { path: '/classes', label: 'Classes', icon: School, roles: ['admin', 'teacher'] },
      { path: '/attendance', label: 'Attendance', icon: ClipboardCheck, roles: ['admin', 'teacher'] },
      { path: '/exams', label: 'Examinations', icon: FileText, roles: ['admin', 'teacher'] },
    ],
  },
  {
    title: 'ADMINISTRATION',
    items: [
      { path: '/financial', label: 'Financial', icon: DollarSign, roles: ['admin', 'accountant'] },
      { path: '/reports', label: 'Reports', icon: BarChart3, roles: ['admin', 'teacher', 'accountant'] },
      { path: '/school/events', label: 'Events', icon: Calendar, roles: ['admin'] },
      { path: '/school/info', label: 'School Info', icon: BookOpen, roles: ['admin'] },
    ],
  },
  {
    title: 'SYSTEM',
    items: [
      { path: '/users', label: 'Users', icon: Shield, roles: ['admin'] },
      { path: '/school/settings', label: 'Settings', icon: Settings, roles: ['admin'] },
    ],
  },
]

function Sidebar() {
  const { user, hasRole } = useAuth()
  const { sidebarCollapsed, toggleSidebar, sidebarOpen, closeMobileSidebar } = useTheme()
  const location = useLocation()

  return (
    <>
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={closeMobileSidebar} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full bg-gray-900 dark:bg-gray-950 text-white transition-all duration-300 flex flex-col ${
          sidebarCollapsed && !sidebarOpen ? 'w-[72px]' : 'w-[260px]'
        } ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-800">
          <div className={`flex items-center gap-3 ${sidebarCollapsed && !sidebarOpen ? 'justify-center w-full' : ''}`}>
            <img 
              src="/logo.png" 
              alt="HNS Logo" 
              className="w-9 h-9 rounded-lg object-cover flex-shrink-0"
              onError={(e) => { 
                e.target.style.display = 'none'
                e.target.parentNode.querySelector('.fallback-icon').style.display = 'flex'
              }}
            />
            <div className="w-9 h-9 rounded-lg bg-primary-600 items-center justify-center flex-shrink-0 hidden fallback-icon" style={{ display: 'none' }}>
              <GraduationCap size={20} className="text-white" />
            </div>
            {(!sidebarCollapsed || sidebarOpen) && (
              <div className="overflow-hidden">
                <p className="text-sm font-bold text-white truncate">HNS</p>
                <p className="text-[10px] text-gray-400 truncate">Management System</p>
              </div>
            )}
          </div>
          {/* Mobile close */}
          <button onClick={closeMobileSidebar} className="lg:hidden text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-6">
          {menuItems.map((section, sIdx) => {
            const visibleItems = section.items.filter(item => hasRole(item.roles))
            if (visibleItems.length === 0) return null

            return (
              <div key={sIdx}>
                {(!sidebarCollapsed || sidebarOpen) && (
                  <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-3 mb-2">
                    {section.title}
                  </p>
                )}
                <div className="space-y-0.5">
                  {visibleItems.map((item, iIdx) => {
                    const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/')
                    return (
                      <NavLink
                        key={iIdx}
                        to={item.path}
                        onClick={closeMobileSidebar}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
                          isActive
                            ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/25'
                            : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                        } ${sidebarCollapsed && !sidebarOpen ? 'justify-center px-2' : ''}`}
                        title={sidebarCollapsed && !sidebarOpen ? item.label : ''}
                      >
                        <item.icon size={20} className={`flex-shrink-0 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'}`} />
                        {(!sidebarCollapsed || sidebarOpen) && <span>{item.label}</span>}
                      </NavLink>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </nav>

        {/* User Info & Collapse Button */}
        <div className="border-t border-gray-800 p-3">
          <div className={`flex items-center gap-3 ${sidebarCollapsed && !sidebarOpen ? 'justify-center' : ''}`}>
            <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white font-medium text-sm flex-shrink-0">
              {user?.first_name?.[0]}{user?.last_name?.[0]}
            </div>
            {(!sidebarCollapsed || sidebarOpen) && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{user?.first_name} {user?.last_name}</p>
                <p className="text-xs text-gray-400 truncate capitalize">{user?.role}</p>
              </div>
            )}
          </div>
          <NavLink
            to="/profile"
            className={`mt-2 flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-colors ${sidebarCollapsed && !sidebarOpen ? 'justify-center' : ''}`}
          >
            <UserCircle size={18} />
            {(!sidebarCollapsed || sidebarOpen) && <span>My Profile</span>}
          </NavLink>
        </div>

        {/* Collapse Toggle (Desktop) */}
        <button
          onClick={toggleSidebar}
          className="hidden lg:flex absolute -right-3 top-20 w-6 h-6 rounded-full bg-primary-600 text-white items-center justify-center shadow-lg hover:bg-primary-700 transition-colors"
        >
          {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </aside>
    </>
  )
}

export default Sidebar
