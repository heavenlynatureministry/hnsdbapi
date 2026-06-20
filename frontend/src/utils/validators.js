/**
 * Validation Utilities
 * Form and data validation functions
 */

// =========================================================================
// REQUIRED VALIDATORS
// =========================================================================

/**
 * Check if value is required (not empty)
 */
export function required(value, fieldName = 'Field') {
  if (value === null || value === undefined) return `${fieldName} is required`
  if (typeof value === 'string' && !value.trim()) return `${fieldName} is required`
  if (Array.isArray(value) && value.length === 0) return `${fieldName} is required`
  return ''
}

/**
 * Validate multiple required fields
 */
export function validateRequired(data, fields) {
  const errors = {}
  fields.forEach(field => {
    const error = required(data[field], field)
    if (error) errors[field] = error
  })
  return errors
}

// =========================================================================
// EMAIL VALIDATOR
// =========================================================================

/**
 * Validate email format
 */
export function validateEmail(email) {
  if (!email || !email.trim()) return 'Email is required'
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
  if (!emailRegex.test(email)) return 'Please enter a valid email address'
  return ''
}

// =========================================================================
// PASSWORD VALIDATORS
// =========================================================================

/**
 * Validate password strength
 */
export function validatePassword(password) {
  if (!password) return 'Password is required'
  if (password.length < 8) return 'Password must be at least 8 characters'
  if (!/[A-Z]/.test(password)) return 'Password must contain an uppercase letter'
  if (!/[a-z]/.test(password)) return 'Password must contain a lowercase letter'
  if (!/\d/.test(password)) return 'Password must contain a number'
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return 'Password must contain a special character'
  return ''
}

/**
 * Validate password confirmation
 */
export function validatePasswordConfirm(password, confirmPassword) {
  if (!confirmPassword) return 'Please confirm your password'
  if (password !== confirmPassword) return 'Passwords do not match'
  return ''
}

// =========================================================================
// PHONE VALIDATOR
// =========================================================================

/**
 * Validate phone number format
 */
export function validatePhone(phone) {
  if (!phone || !phone.trim()) return 'Phone number is required'
  const cleaned = phone.replace(/[\s\-\(\)\.]/g, '')
  const phoneRegex = /^\+?[\d]{7,15}$/
  if (!phoneRegex.test(cleaned)) return 'Please enter a valid phone number'
  return ''
}

// =========================================================================
// NUMBER VALIDATORS
// =========================================================================

/**
 * Validate number is within range
 */
export function validateNumber(value, { min, max, fieldName = 'Value' } = {}) {
  if (value === null || value === undefined || value === '') return `${fieldName} is required`
  const num = Number(value)
  if (isNaN(num)) return `${fieldName} must be a valid number`
  if (min !== undefined && num < min) return `${fieldName} must be at least ${min}`
  if (max !== undefined && num > max) return `${fieldName} must be at most ${max}`
  return ''
}

/**
 * Validate positive number
 */
export function validatePositive(value, fieldName = 'Value') {
  return validateNumber(value, { min: 0, fieldName })
}

// =========================================================================
// DATE VALIDATORS
// =========================================================================

/**
 * Validate date is not in the past
 */
export function validateDateNotPast(date, fieldName = 'Date') {
  if (!date) return `${fieldName} is required`
  const selected = new Date(date)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (selected < today) return `${fieldName} cannot be in the past`
  return ''
}

/**
 * Validate date range
 */
export function validateDateRange(startDate, endDate) {
  if (!startDate) return { startDate: 'Start date is required' }
  if (!endDate) return { endDate: 'End date is required' }
  if (new Date(endDate) < new Date(startDate)) {
    return { endDate: 'End date must be after start date' }
  }
  return {}
}

// =========================================================================
// STRING VALIDATORS
// =========================================================================

/**
 * Validate string length
 */
export function validateLength(value, { min, max, fieldName = 'Field' } = {}) {
  if (!value && min > 0) return `${fieldName} is required`
  if (min && value.length < min) return `${fieldName} must be at least ${min} characters`
  if (max && value.length > max) return `${fieldName} must be at most ${max} characters`
  return ''
}

/**
 * Validate URL format
 */
export function validateURL(url) {
  if (!url || !url.trim()) return ''
  try {
    new URL(url)
    return ''
  } catch {
    return 'Please enter a valid URL'
  }
}

// =========================================================================
// FILE VALIDATORS
// =========================================================================

/**
 * Validate file size
 */
export function validateFileSize(file, maxSizeMB = 5) {
  if (!file) return 'File is required'
  const maxSize = maxSizeMB * 1024 * 1024
  if (file.size > maxSize) return `File size must be less than ${maxSizeMB}MB`
  return ''
}

/**
 * Validate file type
 */
export function validateFileType(file, allowedTypes = ['image/jpeg', 'image/png']) {
  if (!file) return 'File is required'
  if (!allowedTypes.includes(file.type)) {
    return `File type must be: ${allowedTypes.join(', ')}`
  }
  return ''
}

// =========================================================================
// ACADEMIC VALIDATORS
// =========================================================================

/**
 * Validate academic year format (YYYY/YYYY)
 */
export function validateAcademicYear(year) {
  if (!year) return 'Academic year is required'
  const regex = /^\d{4}\/\d{4}$/
  if (!regex.test(year)) return 'Academic year must be in format YYYY/YYYY'
  const [year1, year2] = year.split('/').map(Number)
  if (year2 !== year1 + 1) return 'Years must be consecutive'
  return ''
}

/**
 * Validate student age (minimum 3 years)
 */
export function validateStudentAge(dateOfBirth) {
  if (!dateOfBirth) return 'Date of birth is required'
  const dob = new Date(dateOfBirth)
  const today = new Date()
  let age = today.getFullYear() - dob.getFullYear()
  const monthDiff = today.getMonth() - dob.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--
  }
  if (age < 3) return 'Student must be at least 3 years old'
  if (age > 25) return 'Student age seems invalid'
  return ''
}

/**
 * Validate exam score
 */
export function validateScore(score, maxScore = 100) {
  if (score === null || score === undefined || score === '') return 'Score is required'
  const num = Number(score)
  if (isNaN(num)) return 'Score must be a number'
  if (num < 0) return 'Score cannot be negative'
  if (num > maxScore) return `Score cannot exceed ${maxScore}`
  return ''
}

// =========================================================================
// FORM VALIDATOR BUILDER
// =========================================================================

/**
 * Create a form validator from validation rules
 * @param {Object} rules - Validation rules { fieldName: [validatorFn, ...] }
 * @returns {Function} Validation function
 * 
 * @example
 * const validate = createValidator({
 *   email: [(v) => required(v, 'Email'), validateEmail],
 *   password: [validatePassword],
 * })
 * const errors = validate(formData)
 */
export function createValidator(rules) {
  return (data) => {
    const errors = {}
    for (const [field, validators] of Object.entries(rules)) {
      for (const validator of validators) {
        const error = validator(data[field], data)
        if (error) {
          errors[field] = error
          break // Stop at first error for this field
        }
      }
    }
    return errors
  }
}