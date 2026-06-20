import { useState, useCallback } from 'react'
import financialAPI from '../api/financial'
import toast from 'react-hot-toast'

/**
 * Custom hook for financial operations
 */
export function useFinancial() {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [total, setTotal] = useState(0)
  const [summary, setSummary] = useState(null)

  const fetchTransactions = useCallback(async (params = {}) => {
    setLoading(true)
    try {
      const response = await financialAPI.listTransactions(params)
      if (response.success) {
        setTransactions(response.data?.transactions || [])
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

  const createTransaction = useCallback(async (data) => {
    setLoading(true)
    try {
      const response = await financialAPI.createTransaction(data)
      if (response.success) {
        toast.success('Transaction recorded successfully')
        return response.data
      }
    } catch (err) {
      toast.error(err.message || 'Failed to record transaction')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const getSummary = useCallback(async (params = {}) => {
    setLoading(true)
    try {
      const response = await financialAPI.getSummary(params)
      if (response.success) {
        setSummary(response.data)
      }
      return response?.data || null
    } catch (err) {
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const recordPayment = useCallback(async (data) => {
    setLoading(true)
    try {
      const response = await financialAPI.recordPayment(data)
      if (response.success) {
        toast.success('Payment recorded successfully')
        return response.data
      }
    } catch (err) {
      toast.error(err.message || 'Failed to record payment')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const getStudentPayments = useCallback(async (studentId, params = {}) => {
    setLoading(true)
    try {
      const response = await financialAPI.getStudentPayments(studentId, params)
      return response?.data || null
    } catch (err) {
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const getBudgetSummary = useCallback(async (params = {}) => {
    setLoading(true)
    try {
      const response = await financialAPI.getBudgetSummary(params)
      return response?.data || null
    } catch (err) {
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const getFeeCollection = useCallback(async (params = {}) => {
    setLoading(true)
    try {
      const response = await financialAPI.getFeeCollectionReport(params)
      return response?.data || null
    } catch (err) {
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    transactions,
    loading,
    error,
    total,
    summary,
    fetchTransactions,
    createTransaction,
    getSummary,
    recordPayment,
    getStudentPayments,
    getBudgetSummary,
    getFeeCollection,
  }
}

export default useFinancial