import { useState, useCallback } from 'react'

/**
 * Custom hook for form state management and validation
 * 
 * @param {Object} options - Form options
 * @param {Object} options.initialValues - Initial form values
 * @param {Function} options.validate - Validation function that returns errors object
 * @param {Function} options.onSubmit - Submit handler
 * @returns {Object} Form state and handlers
 * 
 * @example
 * const { values, errors, handleChange, handleSubmit, resetForm } = useForm({
 *   initialValues: { name: '', email: '' },
 *   validate: (values) => {
 *     const errors = {}
 *     if (!values.name) errors.name = 'Required'
 *     return errors
 *   },
 *   onSubmit: (values) => console.log(values)
 * })
 */
export function useForm({ initialValues = {}, validate, onSubmit } = {}) {
  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitCount, setSubmitCount] = useState(0)

  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target
    const newValue = type === 'checkbox' ? checked : value

    setValues(prev => ({ ...prev, [name]: newValue }))

    // Clear error when field is modified
    setErrors(prev => {
      if (prev[name]) {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      }
      return prev
    })
  }, [])

  const handleBlur = useCallback((e) => {
    const { name } = e.target
    setTouched(prev => ({ ...prev, [name]: true }))

    // Validate single field on blur
    if (validate) {
      const validationErrors = validate(values)
      if (validationErrors[name]) {
        setErrors(prev => ({ ...prev, [name]: validationErrors[name] }))
      }
    }
  }, [values, validate])

  const setFieldValue = useCallback((name, value) => {
    setValues(prev => ({ ...prev, [name]: value }))
  }, [])

  const setFieldError = useCallback((name, error) => {
    setErrors(prev => ({ ...prev, [name]: error }))
  }, [])

  const setMultipleFields = useCallback((fields) => {
    setValues(prev => ({ ...prev, ...fields }))
  }, [])

  const resetForm = useCallback((newValues = initialValues) => {
    setValues(newValues)
    setErrors({})
    setTouched({})
    setIsSubmitting(false)
  }, [initialValues])

  const handleSubmit = useCallback(async (e) => {
    if (e) e.preventDefault()
    setSubmitCount(prev => prev + 1)

    // Validate all fields
    if (validate) {
      const validationErrors = validate(values) || {}
      setErrors(validationErrors)

      // Mark all fields as touched
      const allTouched = {}
      Object.keys(values).forEach(key => { allTouched[key] = true })
      setTouched(allTouched)

      if (Object.keys(validationErrors).length > 0) {
        return { success: false, errors: validationErrors }
      }
    }

    setIsSubmitting(true)
    try {
      if (onSubmit) {
        await onSubmit(values)
      }
      return { success: true }
    } catch (error) {
      return { success: false, error }
    } finally {
      setIsSubmitting(false)
    }
  }, [values, validate, onSubmit])

  const isValid = validate ? Object.keys(validate(values) || {}).length === 0 : true
  const isDirty = JSON.stringify(values) !== JSON.stringify(initialValues)

  return {
    values,
    errors,
    touched,
    isSubmitting,
    submitCount,
    isValid,
    isDirty,
    handleChange,
    handleBlur,
    handleSubmit,
    setFieldValue,
    setFieldError,
    setMultipleFields,
    resetForm,
  }
}

export default useForm