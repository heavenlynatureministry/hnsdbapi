import { useState, useCallback, useMemo } from 'react'

/**
 * Custom hook for pagination logic
 * 
 * @param {Object} options - Pagination options
 * @param {number} options.total - Total number of items
 * @param {number} options.initialPage - Starting page (default: 1)
 * @param {number} options.initialLimit - Items per page (default: 20)
 * @param {number} options.maxLimit - Maximum items per page (default: 100)
 * @returns {Object} Pagination state and handlers
 * 
 * @example
 * const { page, limit, skip, totalPages, setPage, setLimit, nextPage, prevPage } = usePagination({ total: 100 })
 */
export function usePagination({ total = 0, initialPage = 1, initialLimit = 20, maxLimit = 100 } = {}) {
  const [page, setPageState] = useState(initialPage)
  const [limit, setLimitState] = useState(initialLimit)

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(total / limit))
  }, [total, limit])

  const skip = useMemo(() => {
    return (page - 1) * limit
  }, [page, limit])

  const setPage = useCallback((newPage) => {
    const pageNum = Math.max(1, Math.min(newPage, totalPages))
    setPageState(pageNum)
  }, [totalPages])

  const setLimit = useCallback((newLimit) => {
    const limitNum = Math.max(1, Math.min(newLimit, maxLimit))
    setLimitState(limitNum)
    setPageState(1) // Reset to page 1 when limit changes
  }, [maxLimit])

  const nextPage = useCallback(() => {
    if (page < totalPages) {
      setPageState(prev => prev + 1)
    }
  }, [page, totalPages])

  const prevPage = useCallback(() => {
    if (page > 1) {
      setPageState(prev => prev - 1)
    }
  }, [page])

  const goToPage = useCallback((pageNum) => {
    setPage(pageNum)
  }, [setPage])

  const resetPagination = useCallback(() => {
    setPageState(initialPage)
    setLimitState(initialLimit)
  }, [initialPage, initialLimit])

  return {
    page,
    limit,
    skip,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
    setPage,
    setLimit,
    nextPage,
    prevPage,
    goToPage,
    resetPagination,
  }
}

export default usePagination