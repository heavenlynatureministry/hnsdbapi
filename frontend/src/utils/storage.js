/**
 * Local Storage Utility Functions
 * Production-ready with error handling
 */

const TOKEN_KEY = 'hns_access_token'
const REFRESH_TOKEN_KEY = 'hns_refresh_token'
const USER_KEY = 'hns_user'
const THEME_KEY = 'hns_theme'
const SETTINGS_KEY = 'hns_settings'

// =========================================================================
// TOKEN STORAGE
// =========================================================================

export const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch (e) {
    return null
  }
}

export const setToken = (token) => {
  try {
    localStorage.setItem(TOKEN_KEY, token)
  } catch (e) {
    console.error('Failed to save token:', e)
  }
}

export const removeToken = () => {
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch (e) {
    // Ignore
  }
}

export const getRefreshToken = () => {
  try {
    return localStorage.getItem(REFRESH_TOKEN_KEY)
  } catch (e) {
    return null
  }
}

export const setRefreshToken = (token) => {
  try {
    localStorage.setItem(REFRESH_TOKEN_KEY, token)
  } catch (e) {
    console.error('Failed to save refresh token:', e)
  }
}

export const removeRefreshToken = () => {
  try {
    localStorage.removeItem(REFRESH_TOKEN_KEY)
  } catch (e) {
    // Ignore
  }
}

// =========================================================================
// USER STORAGE
// =========================================================================

export const getUser = () => {
  try {
    const user = localStorage.getItem(USER_KEY)
    return user ? JSON.parse(user) : null
  } catch (e) {
    // Corrupted data - clear it
    localStorage.removeItem(USER_KEY)
    return null
  }
}

export const setUser = (user) => {
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  } catch (e) {
    console.error('Failed to save user:', e)
  }
}

export const removeUser = () => {
  try {
    localStorage.removeItem(USER_KEY)
  } catch (e) {
    // Ignore
  }
}

// =========================================================================
// THEME STORAGE
// =========================================================================

export const getTheme = () => {
  try {
    return localStorage.getItem(THEME_KEY) || 'light'
  } catch (e) {
    return 'light'
  }
}

export const setTheme = (theme) => {
  try {
    localStorage.setItem(THEME_KEY, theme)
  } catch (e) {
    // Ignore
  }
}

// =========================================================================
// SETTINGS STORAGE
// =========================================================================

export const getSettings = () => {
  try {
    const settings = localStorage.getItem(SETTINGS_KEY)
    return settings ? JSON.parse(settings) : {}
  } catch (e) {
    localStorage.removeItem(SETTINGS_KEY)
    return {}
  }
}

export const setSettings = (settings) => {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch (e) {
    console.error('Failed to save settings:', e)
  }
}

// =========================================================================
// CLEAR ALL
// =========================================================================

export const clearAll = () => {
  try {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  } catch (e) {
    // Ignore - storage might be unavailable
  }
}
