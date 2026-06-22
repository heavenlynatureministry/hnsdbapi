import { useState, useEffect, useCallback, useRef } from 'react'

/**
 * Custom hook for debouncing a value
 * Delays updating the value until after the specified delay
 * 
 * @param {*} value - The value to debounce
 * @param {number} delay - Delay in milliseconds (default: 300ms)
 * @returns {*} The debounced value
 * 
 * @example
 * const [search, setSearch] = useState('')
 * const debouncedSearch = useDebounce(search, 500)
 * // Use debouncedSearch for API calls
 */
export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(timer)
    }
  }, [value, delay])

  return debouncedValue
}

/**
 * Custom hook for debouncing a callback function
 * Ensures the callback is only called once after the specified delay
 * 
 * @param {Function} callback - The function to debounce
 * @param {number} delay - Delay in milliseconds (default: 300ms)
 * @param {Array} deps - Additional dependencies for the callback
 * @returns {Function} The debounced function
 * 
 * @example
 * const debouncedSearch = useDebouncedCallback(
 *   (query) => fetchResults(query),
 *   500,
 *   []
 * )
 * // <input onChange={(e) => debouncedSearch(e.target.value)} />
 */
export function useDebouncedCallback(callback, delay = 300, deps = []) {
  const timeoutRef = useRef(null)
  const callbackRef = useRef(callback)
  const isMountedRef = useRef(true)

  // Update callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback
  }, [callback, ...deps])

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const debouncedFn = useCallback((...args) => {
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        callbackRef.current(...args)
      }
    }, delay)
  }, [delay])

  // Method to cancel pending execution
  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  // Method to immediately flush pending execution
  const flush = useCallback((...args) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
      if (isMountedRef.current) {
        callbackRef.current(...args)
      }
    }
  }, [])

  // Attach cancel and flush methods to the debounced function
  debouncedFn.cancel = cancel
  debouncedFn.flush = flush

  return debouncedFn
}

export default useDebounce
