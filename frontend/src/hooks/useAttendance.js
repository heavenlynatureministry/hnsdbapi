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
    try {
      const response = await attendanceAPI.getToday(params)
      if (response.success) {
        setStatistics(response.data)
      }
      return response
    } catch (err) {
      setError(err.message)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchClassAttendance = useCallback(async (classId, params = {}) => {
    setLoading(true)
    try {
      const response = await attendanceAPI.getByClass(classId, params)
      if (response.success) {
        setRecords(response.data?.students || [])
        setStatistics(response.data?.statistics || null)
      }
      return response
    } catch (err) {
      setError(err.message)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchStudentAttendance = useCallback(async (studentId, params = {}) => {
    setLoading(true)
    try {
      const response = await attendanceAPI.getByStudent(studentId, params)
      return response?.data || null
    } catch (err) {
      setError(err.message)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const markAttendance = useCallback(async (data) => {
    setLoading(true)
    try {
      const response = await attendanceAPI.mark(data)
      if (response.success) {
        toast.success('Attendance marked successfully')
        return true
      }
    } catch (err) {
      toast.error(err.message || 'Failed to mark attendance')
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  const bulkMarkAttendance = useCallback(async (data) => {
    setLoading(true)
    try {
      const response = await attendanceAPI.bulkMark(data)
      if (response.success) {
        toast.success(`Attendance saved! ${response.data?.successful || 0} marked.`)
        return response.data
      }
    } catch (err) {
      toast.error('Failed to save attendance')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const getAnalytics = useCallback(async (params = {}) => {
    setLoading(true)
    try {
      const response = await attendanceAPI.getAnalytics(params)
      return response?.data || null
    } catch (err) {
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const generateReport = useCallback(async (params = {}) => {
    setLoading(true)
    try {
      const response = await attendanceAPI.generateReport(params)
      return response?.data || null
    } catch (err) {
      toast.error('Failed to generate report')
      return null
    } finally {
      setLoading(false)
    }
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
  }
}

export default useAttendance