/**
 * Formatting Utilities
 * Consistent data formatting across the application
 */

// =========================================================================
// DATE FORMATTERS
// =========================================================================

/**
 * Format date to readable string
 * @param {string|Date} date - Date to format
 * @param {Object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date
 */
export function formatDate(date, options = {}) {
  if (!date) return 'N/A'
  const defaultOptions = { year: 'numeric', month: 'short', day: 'numeric' }
  return new Date(date).toLocaleDateString('en-US', { ...defaultOptions, ...options })
}

/**
 * Format date with time
 */
export function formatDateTime(date) {
  if (!date) return 'N/A'
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

/**
 * Format time only
 */
export function formatTime(date) {
  if (!date) return 'N/A'
  return new Date(date).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit',
  })
}

/**
 * Format date to ISO string (YYYY-MM-DD)
 */
export function formatDateISO(date) {
  if (!date) return ''
  const d = new Date(date)
  return d.toISOString().split('T')[0]
}

/**
 * Format date to relative time (e.g., "2 days ago")
 */
export function formatRelativeTime(date) {
  if (!date) return ''
  const now = new Date()
  const then = new Date(date)
  const diffMs = now - then
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)
  const diffWeeks = Math.floor(diffDays / 7)
  const diffMonths = Math.floor(diffDays / 30)
  const diffYears = Math.floor(diffDays / 365)

  if (diffSecs < 60) return 'just now'
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
  if (diffWeeks < 4) return `${diffWeeks} week${diffWeeks > 1 ? 's' : ''} ago`
  if (diffMonths < 12) return `${diffMonths} month${diffMonths > 1 ? 's' : ''} ago`
  return `${diffYears} year${diffYears > 1 ? 's' : ''} ago`
}

/**
 * Format date range
 */
export function formatDateRange(startDate, endDate) {
  const start = formatDate(startDate)
  const end = formatDate(endDate)
  if (start === end) return start
  return `${start} - ${end}`
}

// =========================================================================
// NUMBER FORMATTERS
// =========================================================================

/**
 * Format currency
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code (default: SSP)
 * @returns {string} Formatted currency
 */
export function formatCurrency(amount, currency = 'SSP') {
  if (amount === null || amount === undefined) return `${currency} 0.00`
  return `${currency} ${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/**
 * Format number with commas
 */
export function formatNumber(number) {
  if (number === null || number === undefined) return '0'
  return Number(number).toLocaleString('en-US')
}

/**
 * Format percentage
 */
export function formatPercentage(value, decimals = 1) {
  if (value === null || value === undefined) return '0%'
  return `${Number(value).toFixed(decimals)}%`
}

/**
 * Format ordinal number (1st, 2nd, 3rd, etc.)
 */
export function formatOrdinal(n) {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

// =========================================================================
// NAME FORMATTERS
// =========================================================================

/**
 * Format full name
 */
export function formatFullName(firstName, lastName, middleName = '') {
  const parts = [firstName, middleName, lastName].filter(Boolean)
  return parts.join(' ')
}

/**
 * Format initials
 */
export function formatInitials(firstName, lastName) {
  const first = firstName?.charAt(0)?.toUpperCase() || ''
  const last = lastName?.charAt(0)?.toUpperCase() || ''
  return `${first}${last}`
}

// =========================================================================
// STATUS FORMATTERS
// =========================================================================

/**
 * Format status with capitalization
 */
export function formatStatus(status) {
  if (!status) return ''
  return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

/**
 * Get status color variant
 */
export function getStatusColor(status) {
  const colors = {
    active: 'success', inactive: 'danger', suspended: 'warning',
    present: 'success', absent: 'danger', excused: 'warning', late: 'info',
    approved: 'success', pending: 'warning', rejected: 'danger',
    completed: 'success', ongoing: 'info', scheduled: 'info', cancelled: 'danger',
    paid: 'success', partial: 'warning', unpaid: 'danger',
  }
  return colors[status] || 'gray'
}

// =========================================================================
// PHONE FORMATTERS
// =========================================================================

/**
 * Format phone number
 */
export function formatPhone(phone) {
  if (!phone) return 'N/A'
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 10) {
    return `+${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`
  }
  return phone
}

// =========================================================================
// FILE SIZE FORMATTERS
// =========================================================================

/**
 * Format file size
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// =========================================================================
// TRUNCATION
// =========================================================================

/**
 * Truncate text with ellipsis
 */
export function truncateText(text, maxLength = 50) {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}