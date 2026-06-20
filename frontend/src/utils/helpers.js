/**
 * Helper Utilities
 * General-purpose helper functions
 */

// =========================================================================
// ID GENERATION
// =========================================================================

/**
 * Generate a unique ID
 */
export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
}

/**
 * Generate a short ID
 */
export function generateShortId(length = 8) {
  return Math.random().toString(36).substring(2, 2 + length)
}

// =========================================================================
// ARRAY HELPERS
// =========================================================================

/**
 * Group array by key
 */
export function groupBy(array, key) {
  return array.reduce((result, item) => {
    const groupKey = item[key] || 'unknown'
    if (!result[groupKey]) result[groupKey] = []
    result[groupKey].push(item)
    return result
  }, {})
}

/**
 * Sort array by key
 */
export function sortBy(array, key, direction = 'asc') {
  return [...array].sort((a, b) => {
    const valA = a[key] ?? ''
    const valB = b[key] ?? ''
    if (valA < valB) return direction === 'asc' ? -1 : 1
    if (valA > valB) return direction === 'asc' ? 1 : -1
    return 0
  })
}

/**
 * Chunk array into smaller arrays
 */
export function chunkArray(array, size = 100) {
  const chunks = []
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size))
  }
  return chunks
}

/**
 * Remove duplicates from array
 */
export function uniqueArray(array, key) {
  if (key) {
    return array.filter((item, index, self) =>
      index === self.findIndex(t => t[key] === item[key])
    )
  }
  return [...new Set(array)]
}

/**
 * Get random item from array
 */
export function randomItem(array) {
  return array[Math.floor(Math.random() * array.length)]
}

// =========================================================================
// OBJECT HELPERS
// =========================================================================

/**
 * Pick specific keys from object
 */
export function pick(obj, keys) {
  return keys.reduce((result, key) => {
    if (obj.hasOwnProperty(key)) result[key] = obj[key]
    return result
  }, {})
}

/**
 * Omit specific keys from object
 */
export function omit(obj, keys) {
  return Object.keys(obj).reduce((result, key) => {
    if (!keys.includes(key)) result[key] = obj[key]
    return result
  }, {})
}

/**
 * Deep clone object
 */
export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj))
}

/**
 * Check if object is empty
 */
export function isEmpty(obj) {
  if (!obj) return true
  if (Array.isArray(obj)) return obj.length === 0
  return Object.keys(obj).length === 0
}

// =========================================================================
// STRING HELPERS
// =========================================================================

/**
 * Capitalize first letter
 */
export function capitalize(str) {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

/**
 * Convert string to title case
 */
export function titleCase(str) {
  if (!str) return ''
  return str.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase())
}

/**
 * Convert string to slug
 */
export function slugify(str) {
  return str.toLowerCase().replace(/[^\w]+/g, '-').replace(/^-+|-+$/g, '')
}

/**
 * Mask sensitive data
 */
export function maskEmail(email) {
  if (!email || !email.includes('@')) return email
  const [name, domain] = email.split('@')
  const maskedName = name.charAt(0) + '***' + name.charAt(name.length - 1)
  return `${maskedName}@${domain}`
}

// =========================================================================
// COLOR HELPERS
// =========================================================================

/**
 * Generate random hex color
 */
export function randomColor() {
  return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')
}

/**
 * Get contrasting text color (black/white) for background
 */
export function getContrastColor(hexColor) {
  const r = parseInt(hexColor.slice(1, 3), 16)
  const g = parseInt(hexColor.slice(3, 5), 16)
  const b = parseInt(hexColor.slice(5, 7), 16)
  const brightness = (r * 299 + g * 587 + b * 114) / 1000
  return brightness > 128 ? '#000000' : '#ffffff'
}

// =========================================================================
// DEBOUNCE & THROTTLE
// =========================================================================

/**
 * Debounce function
 */
export function debounce(func, wait = 300) {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

/**
 * Throttle function
 */
export function throttle(func, limit = 300) {
  let inThrottle
  return function executedFunction(...args) {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => { inThrottle = false }, limit)
    }
  }
}

// =========================================================================
// DOM HELPERS
// =========================================================================

/**
 * Download file from URL
 */
export function downloadFile(url, filename) {
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Fallback
    const textarea = document.createElement('textarea')
    textarea.value = text
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
    return true
  }
}

/**
 * Scroll to element
 */
export function scrollTo(elementId, offset = 80) {
  const element = document.getElementById(elementId)
  if (element) {
    const top = element.getBoundingClientRect().top + window.pageYOffset - offset
    window.scrollTo({ top, behavior: 'smooth' })
  }
}

// =========================================================================
// CLASSNAME HELPERS
// =========================================================================

/**
 * Combine class names conditionally
 */
export function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}

// =========================================================================
// STORAGE HELPERS
// =========================================================================

/**
 * Safe JSON parse
 */
export function safeJSONParse(str, fallback = null) {
  try {
    return JSON.parse(str)
  } catch {
    return fallback
  }
}

/**
 * Set nested object value
 */
export function setNestedValue(obj, path, value) {
  const keys = path.split('.')
  const lastKey = keys.pop()
  const target = keys.reduce((o, key) => (o[key] = o[key] || {}), obj)
  target[lastKey] = value
  return obj
}

/**
 * Get nested object value
 */
export function getNestedValue(obj, path, fallback = undefined) {
  const keys = path.split('.')
  return keys.reduce((o, key) => (o && o[key] !== undefined ? o[key] : fallback), obj)
}