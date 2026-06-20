/**
 * Local Storage Utility Functions
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
  return localStorage.getItem(TOKEN_KEY)
}

export const setToken = (token) => {
  localStorage.setItem(TOKEN_KEY, token)
}

export const removeToken = () => {
  localStorage.removeItem(TOKEN_KEY)
}

export const getRefreshToken = () => {
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

export const setRefreshToken = (token) => {
  localStorage.setItem(REFRESH_TOKEN_KEY, token)
}

export const removeRefreshToken = () => {
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}

// =========================================================================
// USER STORAGE
// =========================================================================

export const getUser = () => {
  const user = localStorage.getItem(USER_KEY)
  return user ? JSON.parse(user) : null
}

export const setUser = (user) => {
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export const removeUser = () => {
  localStorage.removeItem(USER_KEY)
}

// =========================================================================
// THEME STORAGE
// =========================================================================

export const getTheme = () => {
  return localStorage.getItem(THEME_KEY) || 'light'
}

export const setTheme = (theme) => {
  localStorage.setItem(THEME_KEY, theme)
}

// =========================================================================
// SETTINGS STORAGE
// =========================================================================

export const getSettings = () => {
  const settings = localStorage.getItem(SETTINGS_KEY)
  return settings ? JSON.parse(settings) : {}
}

export const setSettings = (settings) => {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}

// =========================================================================
// CLEAR ALL
// =========================================================================

export const clearAll = () => {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}