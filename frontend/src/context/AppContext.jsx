import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useAuth } from './AuthContext'
import schoolAPI from '../api/school'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const { isAuthenticated } = useAuth()

  // School Info
  const [schoolInfo, setSchoolInfo] = useState({
    school_name: 'Heavenly Nature Nursery & Primary School',
    motto: 'Nurturing Right Leaders',
    contact_email: 'info@heavenlynatureschools.com',
    contact_phone: '+211 922 273 334',
    logo_url: null,
  })

  // Dashboard Data
  const [dashboardData, setDashboardData] = useState({
    students: { total_active: 0, by_type: {} },
    staff: { total_teachers: 0, total_staff: 0, total_classes: 0 },
    attendance: { today_marked: 0, attendance_rate: 0 },
    events: { upcoming: 0 },
    financial: { total_income: 0, total_expenses: 0, balance: 0 },
  })

  // App State
  const [appLoading, setAppLoading] = useState(true)
  const [currentAcademicYear, setCurrentAcademicYear] = useState('2024/2025')
  const [currentTerm, setCurrentTerm] = useState('Term 1')
  const [notifications, setNotifications] = useState([])
  const [unreadNotifications, setUnreadNotifications] = useState(0)

  // Breadcrumbs
  const [breadcrumbs, setBreadcrumbs] = useState([])

  // Page Title
  const [pageTitle, setPageTitle] = useState('Dashboard')

  // Fetch school info
  const fetchSchoolInfo = useCallback(async () => {
    try {
      const response = await schoolAPI.getInfo()
      if (response?.success && response.data) {
        setSchoolInfo((prev) => ({ ...prev, ...response.data }))
      }
    } catch (error) {
      // Silently use defaults - API might not be available
      console.log('School info API not available, using defaults')
    }
  }, [])

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    try {
      const response = await schoolAPI.getDashboard()
      if (response?.success && response.data) {
        setDashboardData(response.data)
      }
    } catch (error) {
      // Silently use defaults - API might not be available
      console.log('Dashboard API not available, using defaults')
    }
  }, [])

  // Fetch current term
  const fetchCurrentTerm = useCallback(async () => {
    try {
      const response = await schoolAPI.getCurrentTerm()
      if (response?.success && response.data) {
        setCurrentAcademicYear(response.data.academic_year || currentAcademicYear)
        setCurrentTerm(response.data.term_name || currentTerm)
      }
    } catch (error) {
      // Silently use defaults
    }
  }, [])

  // Initialize app data
  useEffect(() => {
    const initApp = async () => {
      if (isAuthenticated) {
        setAppLoading(true)
        // Don't block on these - let them fail silently
        fetchSchoolInfo().catch(() => {})
        fetchDashboardData().catch(() => {})
        fetchCurrentTerm().catch(() => {})
        // Small delay to prevent flash
        setTimeout(() => setAppLoading(false), 500)
      } else {
        setAppLoading(false)
      }
    }

    initApp()
  }, [isAuthenticated, fetchSchoolInfo, fetchDashboardData, fetchCurrentTerm])

  // Refresh dashboard
  const refreshDashboard = useCallback(async () => {
    await fetchDashboardData()
  }, [fetchDashboardData])

  // Add notification
  const addNotification = useCallback((notification) => {
    const newNotification = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      read: false,
      ...notification,
    }
    setNotifications((prev) => [newNotification, ...prev].slice(0, 50))
    setUnreadNotifications((prev) => prev + 1)
  }, [])

  // Mark notification as read
  const markNotificationRead = useCallback((id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    )
    setUnreadNotifications((prev) => Math.max(0, prev - 1))
  }, [])

  // Mark all notifications as read
  const markAllNotificationsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    setUnreadNotifications(0)
  }, [])

  // Clear notifications
  const clearNotifications = useCallback(() => {
    setNotifications([])
    setUnreadNotifications(0)
  }, [])

  // Update breadcrumbs
  const updateBreadcrumbs = useCallback((crumbs) => {
    setBreadcrumbs(crumbs)
  }, [])

  // Update page title
  const updatePageTitle = useCallback((title) => {
    setPageTitle(title)
    document.title = `${title} | HNS Management System`
  }, [])

  const value = {
    // School Info
    schoolInfo,
    setSchoolInfo,
    fetchSchoolInfo,

    // Dashboard
    dashboardData,
    refreshDashboard,

    // Academic
    currentAcademicYear,
    currentTerm,
    setCurrentAcademicYear,
    setCurrentTerm,

    // App State
    appLoading,
    setAppLoading,

    // Notifications
    notifications,
    unreadNotifications,
    addNotification,
    markNotificationRead,
    markAllNotificationsRead,
    clearNotifications,

    // Navigation
    breadcrumbs,
    updateBreadcrumbs,
    pageTitle,
    updatePageTitle,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp must be used within an AppProvider')
  }
  return context
}

export default AppContext
