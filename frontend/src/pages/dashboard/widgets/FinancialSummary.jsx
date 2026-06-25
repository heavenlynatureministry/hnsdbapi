import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import financialAPI from '../../../api/financial'
import { DollarSign, ArrowRight, TrendingUp, TrendingDown } from 'lucide-react'

function FinancialSummary({ data }) {
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchFinancialSummary()
  }, [])

  const fetchFinancialSummary = async () => {
    setLoading(true)
    try {
      // Try to use passed data first
      if (data && Object.keys(data).length > 0) {
        setSummary(data)
        setLoading(false)
        return
      }

      const response = await financialAPI.getSummary()
      if (response?.success && response.data) {
        setSummary(response.data)
      } else if (response?.data) {
        setSummary(response.data)
      }
    } catch (error) {
      console.error('Failed to fetch financial summary:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="card">
        <div className="skeleton h-4 w-32 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-12 w-full" />
          ))}
        </div>
      </div>
    )
  }

  // Map backend field names to expected values
  const balance = summary?.balance || 0
  const totalIncome = summary?.income?.total || summary?.total_income || 0
  const totalExpenses = summary?.expense?.total || summary?.total_expenses || 0
  const collectionRate = summary?.collection_rate || 0
  const pendingPayments = summary?.pending_payments || 0

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <DollarSign size={18} className="text-emerald-600" />
          Financial Summary
        </h3>
        <Link to="/financial" className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1">
          View All <ArrowRight size={14} />
        </Link>
      </div>

      <div className="space-y-3">
        <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
          <p className="text-xs text-gray-500 dark:text-gray-400">Current Balance</p>
          <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
            SSP {balance.toLocaleString()}
          </p>
        </div>

        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div>
            <p className="text-xs text-gray-500">Total Income</p>
            <p className="font-semibold text-green-600">SSP {totalIncome.toLocaleString()}</p>
          </div>
          <TrendingUp size={20} className="text-green-500" />
        </div>

        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div>
            <p className="text-xs text-gray-500">Total Expenses</p>
            <p className="font-semibold text-red-600">SSP {totalExpenses.toLocaleString()}</p>
          </div>
          <TrendingDown size={20} className="text-red-500" />
        </div>

        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-gray-500">Fee Collection Rate</p>
            <span className="text-sm font-semibold text-primary-600">{collectionRate}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-primary-600 h-2 rounded-full transition-all"
              style={{ width: `${Math.min(collectionRate, 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            SSP {pendingPayments.toLocaleString()} pending
          </p>
        </div>
      </div>
    </div>
  )
}

export default FinancialSummary
