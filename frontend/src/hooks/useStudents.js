import { useState, useCallback } from 'react'
import studentsAPI from '../api/students'
import toast from 'react-hot-toast'

/**
 * Custom hook for student data operations
 * Provides loading states, error handling, and CRUD operations
 */
export function useStudents() {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [total, setTotal] = useState(0)

  const fetchStudents = useCallback(async (params = {}) => {
    setLoading(true)
    setError(null)
    try {
      const response = await studentsAPI.getAll(params)
      if (response.success) {
        setStudents(response.data?.students || [])
        setTotal(response.data?.total || 0)
      }
      return response
    } catch (err) {
      setError(err.message)
      toast.error('Failed to fetch students')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const getStudent = useCallback(async (id) => {
    setLoading(true)
    setError(null)
    try {
      const response = await studentsAPI.getById(id)
      return response?.data || null
    } catch (err) {
      setError(err.message)
      toast.error('Failed to fetch student')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const createStudent = useCallback(async (data) => {
    setLoading(true)
    setError(null)
    try {
      const response = await studentsAPI.create(data)
      if (response.success) {
        toast.success('Student enrolled successfully')
        return response.data
      }
    } catch (err) {
      setError(err.message)
      toast.error(err.message || 'Failed to create student')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const updateStudent = useCallback(async (id, data) => {
    setLoading(true)
    setError(null)
    try {
      const response = await studentsAPI.update(id, data)
      if (response.success) {
        toast.success('Student updated successfully')
        return response.data
      }
    } catch (err) {
      setError(err.message)
      toast.error(err.message || 'Failed to update student')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteStudent = useCallback(async (id, reason) => {
    setLoading(true)
    setError(null)
    try {
      const response = await studentsAPI.delete(id, reason)
      if (response.success) {
        toast.success('Student deactivated successfully')
        return true
      }
    } catch (err) {
      setError(err.message)
      toast.error(err.message || 'Failed to deactivate student')
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  const promoteStudent = useCallback(async (id, newClassId, academicYear) => {
    setLoading(true)
    setError(null)
    try {
      const response = await studentsAPI.promote(id, newClassId, academicYear)
      if (response.success) {
        toast.success('Student promoted successfully')
        return true
      }
    } catch (err) {
      setError(err.message)
      toast.error(err.message || 'Failed to promote student')
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  const bulkPromote = useCallback(async (data) => {
    setLoading(true)
    setError(null)
    try {
      const response = await studentsAPI.bulkPromote(data)
      if (response.success) {
        toast.success(`Promoted ${response.data?.promoted || 0} students`)
        return response.data
      }
    } catch (err) {
      setError(err.message)
      toast.error('Failed to promote students')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const searchStudents = useCallback(async (params) => {
    setLoading(true)
    setError(null)
    try {
      const response = await studentsAPI.search(params)
      if (response.success) {
        setStudents(response.data?.students || [])
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

  return {
    students,
    loading,
    error,
    total,
    fetchStudents,
    getStudent,
    createStudent,
    updateStudent,
    deleteStudent,
    promoteStudent,
    bulkPromote,
    searchStudents,
  }
}

export default useStudents