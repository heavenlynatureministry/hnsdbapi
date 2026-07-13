import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import financialAPI from '../../../api/financial'
import { DollarSign, ArrowRight, TrendingUp, TrendingDown } from 'lucide-react'

function FinancialSummary({ data }) {
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetchFinancialSummary()
  }, [data])

  const fetchFinancialSummary = async () => {
    setLoading(true)
    setError(false)
    try {
      // Try to use passed data first
      if (data && Object.keys(data).length > 0) {
        setSummary(data)
        setLoading(false)
        return
      }

      // Try dashboard endpoint first (more comprehensive)
      let response = null
      try {
        response = await financialAPI.getDashboard()
      } catch (dashError) {
        console.warn('Dashboard endpoint failed, trying summary...')
      }

      if (response?.success && response.data) {
        const d = response.data
        setSummary({
          balance: d.net_balance || 0,
          income: { total: d.total_income || 0 },
          expense: { total: d.total_expenses || 0 },
          collection_rate: d.student_payments > 0 && d.total_income > 0 
            ? Math.round((d.student_payments / d.total_income) * 100) 
            : 0,
          pending_payments: d.pending_approvals || 0,
          student_payments: d.student_payments || 0,
          donations_income: d.donations_income || 0,
        })
        setLoading(false)
        return
      }

      // Fallback to summary endpoint
      try {
        response = await financialAPI.getSummary()
      } catch (summaryError) {
        console.error('Summary endpoint also failed:', summaryError)
        setError(true)
        setLoading(false)
        return
      }

      if (response?.success && response.data) {
        const s = response.data
        setSummary({
          balance: s.balance || 0,
          income: { total: s.income?.total || s.total_income || 0 },
          expense: { total: s.expense?.total || s.total_expenses || 0 },
          collection_rate: s.collection_rate || 0,
          pending_payments: s.pending_payments || 0,
          student_payments: s.student_payments || 0,
          donations_income: s.donations_income || 0,
        })
      } else if (response?.data) {
        const s = response.data
        setSummary({
          balance: s.balance || 0,
          income: { total: s.income?.total || s.total_income || 0 },
          expense: { total: s.expense?.total || s.total_expenses || 0 },
          collection_rate: s.collection_rate || 0,
          pending_payments: s.pending_payments || 0,
        })
      } else {
        setError(true)
      }
    } catch (error) {
      console.error('Failed to fetch financial summary:', error)
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="skeleton h-5 w-36" />
          <div className="skeleton h-4 w-16" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-12 w-full rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  if (error || !summary) {
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
        <div className="text-center py-6 text-gray-500">
          <DollarSign size={32} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm">Financial data unavailable</p>
          <Link to="/financial" className="text-xs text-primary-600 hover:underline mt-1 inline-block">
            Go to Financial Dashboard
          </Link>
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
  const studentPayments = summary?.student_payments || 0
  const donationsIncome = summary?.donations_income || 0

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
            SSP {Number(balance).toLocaleString()}
          </p>
        </div>

        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div>
            <p className="text-xs text-gray-500">Total Income</p>
            <p className="font-semibold text-green-600">SSP {Number(totalIncome).toLocaleString()}</p>
          </div>
          <TrendingUp size={20} className="text-green-500" />
        </div>

        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div>
            <p className="text-xs text-gray-500">Total Expenses</p>
            <p className="font-semibold text-red-600">SSP {Number(totalExpenses).toLocaleString()}</p>
          </div>
          <TrendingDown size={20} className="text-red-500" />
        </div>

        {/* Student Payments detail */}
        {studentPayments > 0 && (
          <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div>
              <p className="text-xs text-gray-500">Student Payments</p>
              <p className="font-semibold text-blue-600">SSP {Number(studentPayments).toLocaleString()}</p>
            </div>
            <DollarSign size={20} className="text-blue-500" />
          </div>
        )}

        {/* Donations detail */}
        {donationsIncome > 0 && (
          <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <div>
              <p className="text-xs text-gray-500">Donations & Other Income</p>
              <p className="font-semibold text-purple-600">SSP {Number(donationsIncome).toLocaleString()}</p>
            </div>
            <DollarSign size={20} className="text-purple-500" />
          </div>
        )}

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
          {pendingPayments > 0 && (
            <p className="text-xs text-gray-500 mt-1">
              SSP {Number(pendingPayments).toLocaleString()} pending
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default FinancialSummary
