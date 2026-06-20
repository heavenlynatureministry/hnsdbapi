import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getTheme, setTheme as saveTheme } from '../utils/storage'

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    // Check saved theme or system preference
    const saved = getTheme()
    if (saved) return saved

    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark'
    }
    return 'light'
  })

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    saveTheme(theme)
  }, [theme])

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (e) => {
      const saved = getTheme()
      if (!saved) {
        setThemeState(e.matches ? 'dark' : 'light')
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  // Toggle theme
  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === 'light' ? 'dark' : 'light'))
  }, [])

  // Set specific theme
  const setTheme = useCallback((newTheme) => {
    if (['light', 'dark'].includes(newTheme)) {
      setThemeState(newTheme)
    }
  }, [])

  // Toggle sidebar
  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => !prev)
  }, [])

  // Mobile sidebar
  const toggleMobileSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev)
  }, [])

  const closeMobileSidebar = useCallback(() => {
    setSidebarOpen(false)
  }, [])

  // Responsive sidebar
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarCollapsed(true)
      }
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const value = {
    theme,
    isDark: theme === 'dark',
    toggleTheme,
    setTheme,
    sidebarCollapsed,
    sidebarOpen,
    toggleSidebar,
    toggleMobileSidebar,
    closeMobileSidebar,
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

export default ThemeContext