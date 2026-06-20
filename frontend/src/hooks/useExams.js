import { useState, useCallback } from 'react'
import examsAPI from '../api/exams'
import toast from 'react-hot-toast'

/**
 * Custom hook for exam operations
 */
export function useExams() {
  const [exams, setExams] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [total, setTotal] = useState(0)

  const fetchExams = useCallback(async (params = {}) => {
    setLoading(true)
    try {
      const response = await examsAPI.list(params)
      if (response.success) {
        setExams(response.data?.exams || [])
        setTotal(response.data?.total || 0)
      }
      return response
    } catch (err) {
      setError(err.message)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const getExam = useCallback(async (id) => {
    setLoading(true)
    try {
      const response = await examsAPI.getById(id)
      return response?.data || null
    } catch (err) {
      toast.error('Failed to fetch exam')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const createExam = useCallback(async (data) => {
    setLoading(true)
    try {
      const response = await examsAPI.create(data)
      if (response.success) {
        toast.success('Exam created successfully')
        return response.data
      }
    } catch (err) {
      toast.error(err.message || 'Failed to create exam')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const getResults = useCallback(async (examId, params = {}) => {
    setLoading(true)
    try {
      const response = await examsAPI.getResults(examId, params)
      return response?.data || null
    } catch (err) {
      toast.error('Failed to fetch results')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const recordResult = useCallback(async (data) => {
    setLoading(true)
    try {
      const response = await examsAPI.recordResult(data)
      if (response.success) {
        toast.success('Result recorded')
        return true
      }
    } catch (err) {
      toast.error(err.message || 'Failed to record result')
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  const bulkRecordResults = useCallback(async (data) => {
    setLoading(true)
    try {
      const response = await examsAPI.bulkRecordResults(data)
      if (response.success) {
        toast.success(`Results saved! ${response.data?.successful || 0} recorded.`)
        return response.data
      }
    } catch (err) {
      toast.error('Failed to save results')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const generateReportCard = useCallback(async (data) => {
    setLoading(true)
    try {
      const response = await examsAPI.generateReportCard(data)
      return response?.data || null
    } catch (err) {
      toast.error('Failed to generate report card')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const getClassRanking = useCallback(async (classId, params = {}) => {
    setLoading(true)
    try {
      const response = await examsAPI.getClassRanking(classId, params)
      return response?.data?.rankings || []
    } catch (err) {
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    exams,
    loading,
    error,
    total,
    fetchExams,
    getExam,
    createExam,
    getResults,
    recordResult,
    bulkRecordResults,
    generateReportCard,
    getClassRanking,
  }
}

export default useExams