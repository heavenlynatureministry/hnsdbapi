import { useState, useCallback } from 'react'
import attendanceAPI from '../api/attendance'
import toast from 'react-hot-toast'

/**
 * Custom hook for attendance operations
 */
export function useAttendance() {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [statistics, setStatistics] = useState(null)

  const fetchTodayAttendance = useCallback(async (params = {}) => {
    setLoading(true)
    setError(null)
    try {
      const response = await attendanceAPI.getToday(params)
      if (response.success) {
        setStatistics(response.data)
      }
      return response?.data || null
    } catch (err) {
      setError(err.message)
      toast.error('Failed to fetch today\'s attendance')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchClassAttendance = useCallback(async (classId, params = {}) => {
    setLoading(true)
    setError(null)
    try {
      const response = await attendanceAPI.getByClass(classId, params)
      if (response.success) {
        setRecords(response.data?.students || [])
        setStatistics(response.data?.statistics || null)
      }
      return response?.data || null
    } catch (err) {
      setError(err.message)
      toast.error('Failed to fetch class attendance')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchStudentAttendance = useCallback(async (studentId, params = {}) => {
    setLoading(true)
    setError(null)
    try {
      const response = await attendanceAPI.getByStudent(studentId, params)
      return response?.data || null
    } catch (err) {
      setError(err.message)
      toast.error('Failed to fetch student attendance')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const markAttendance = useCallback(async (data) => {
    setLoading(true)
    setError(null)
    try {
      const response = await attendanceAPI.mark(data)
      if (response.success) {
        toast.success('Attendance marked successfully')
        return response.data || true
      }
      return null
    } catch (err) {
      setError(err.message)
      toast.error(err.message || 'Failed to mark attendance')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const bulkMarkAttendance = useCallback(async (data) => {
    setLoading(true)
    setError(null)
    try {
      const response = await attendanceAPI.bulkMark(data)
      if (response.success) {
        const count = response.data?.successful || 0
        const failed = response.data?.failed || 0
        if (failed > 0) {
          toast.success(`Attendance saved! ${count} marked, ${failed} failed.`)
        } else {
          toast.success(`Attendance saved! ${count} marked.`)
        }
        return response.data
      }
      return null
    } catch (err) {
      setError(err.message)
      toast.error('Failed to save attendance')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const getAnalytics = useCallback(async (params = {}) => {
    setLoading(true)
    setError(null)
    try {
      const response = await attendanceAPI.getAnalytics(params)
      if (response?.data) {
        setStatistics(response.data)
      }
      return response?.data || null
    } catch (err) {
      setError(err.message)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const generateReport = useCallback(async (params = {}) => {
    setLoading(true)
    setError(null)
    try {
      const response = await attendanceAPI.generateReport(params)
      if (response?.data) {
        toast.success('Report generated successfully')
      }
      return response?.data || null
    } catch (err) {
      setError(err.message)
      toast.error('Failed to generate report')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const resetState = useCallback(() => {
    setRecords([])
    setStatistics(null)
    setError(null)
  }, [])

  return {
    records,
    loading,
    error,
    statistics,
    fetchTodayAttendance,
    fetchClassAttendance,
    fetchStudentAttendance,
    markAttendance,
    bulkMarkAttendance,
    getAnalytics,
    generateReport,
    clearError,
    resetState,
  }
}

export default useAttendance
