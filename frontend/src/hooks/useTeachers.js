import { useState, useCallback } from 'react'
import teachersAPI from '../api/teachers'
import toast from 'react-hot-toast'

/**
 * Custom hook for teacher data operations
 */
export function useTeachers() {
  const [teachers, setTeachers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [total, setTotal] = useState(0)

  const fetchTeachers = useCallback(async (params = {}) => {
    setLoading(true)
    setError(null)
    try {
      const response = await teachersAPI.getAll(params)
      if (response.success) {
        setTeachers(response.data?.teachers || [])
        setTotal(response.data?.total || 0)
      }
      return response
    } catch (err) {
      setError(err.message)
      toast.error('Failed to fetch teachers')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const getTeacher = useCallback(async (id) => {
    setLoading(true)
    try {
      const response = await teachersAPI.getById(id)
      return response?.data || null
    } catch (err) {
      toast.error('Failed to fetch teacher')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const createTeacher = useCallback(async (data) => {
    setLoading(true)
    try {
      const response = await teachersAPI.create(data)
      if (response.success) {
        toast.success('Teacher registered successfully')
        return response.data
      }
    } catch (err) {
      toast.error(err.message || 'Failed to register teacher')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const updateTeacher = useCallback(async (id, data) => {
    setLoading(true)
    try {
      const response = await teachersAPI.update(id, data)
      if (response.success) {
        toast.success('Teacher updated successfully')
        return response.data
      }
    } catch (err) {
      toast.error(err.message || 'Failed to update teacher')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const assignSubjects = useCallback(async (id, subjects) => {
    try {
      const response = await teachersAPI.assignSubjects(id, subjects)
      if (response.success) toast.success('Subjects assigned')
      return response?.success
    } catch (err) {
      toast.error('Failed to assign subjects')
      return false
    }
  }, [])

  const getWorkload = useCallback(async (id) => {
    setLoading(true)
    try {
      const response = await teachersAPI.getWorkload(id)
      return response?.data || null
    } catch (err) {
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    teachers,
    loading,
    error,
    total,
    fetchTeachers,
    getTeacher,
    createTeacher,
    updateTeacher,
    assignSubjects,
    getWorkload,
  }
}

export default useTeachers