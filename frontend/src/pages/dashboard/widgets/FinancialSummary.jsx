import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import financialAPI from '../../../api/financial'
import { DollarSign, ArrowRight, TrendingUp, TrendingDown, Loader2 } from 'lucide-react'

function FinancialSummary({ data }) {
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetchFinancialSummary()
  }, [])

  const fetchFinancialSummary = async () => {
    setLoading(true)
    setError(false)
    
    try {
      // ✅ Primary: Use the same dashboard endpoint as the financial page
      const response = await financialAPI.getDashboard()
      
      if (response?.success && response.data) {
        const d = response.data
        setSummary({
          balance: d.net_balance || 0,
          total_income: d.total_income || 0,
          total_expenses: d.total_expenses || 0,
          student_payments: d.student_payments || 0,
          student_payments_count: d.student_payments_count || 0,
          donations_income: d.donations_income || 0,
          pending_approvals: d.pending_approvals || 0,
          current_term: d.current_term || '',
          academic_year: d.academic_year || '',
        })
        setLoading(false)
        return
      }
      
      // Fallback: Try summary endpoint
      const summaryResponse = await financialAPI.getSummary()
      if (summaryResponse?.success && summaryResponse.data) {
        const s = summaryResponse.data
        setSummary({
          balance: s.balance || 0,
          total_income: s.income?.total || s.total_income || 0,
          total_expenses: s.expense?.total || s.total_expenses || 0,
          student_payments: s.student_payments || 0,
          student_payments_count: 0,
          donations_income: s.donations_income || 0,
          pending_approvals: s.pending_payments || 0,
          current_term: '',
          academic_year: s.academic_year || '',
        })
        setLoading(false)
        return
      }
      
      setError(true)
    } catch (error) {
      console.error('Failed to fetch financial summary:', error)
      // Don't show error for auth issues — user might not have finance access
      if (error?.status === 401 || error?.status === 403) {
        setSummary({ balance: 0, total_income: 0, total_expenses: 0, student_payments: 0 })
      } else {
        setError(true)
      }
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <DollarSign size={18} className="text-emerald-600" />
            Financial Summary
          </h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 size={24} className="animate-spin text-gray-400" />
        </div>
      </div>
    )
  }

  // Show data even if zero — it means the API worked but there's no data yet
  const hasData = summary !== null

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

      {error ? (
        <div className="text-center py-4 text-gray-500">
          <DollarSign size={28} className="mx-auto mb-2 opacity-50" />
          <p className="text-xs">Could not load financial data</p>
          <Link to="/financial" className="text-xs text-primary-600 hover:underline mt-1 inline-block">
            Open Financial Dashboard
          </Link>
        </div>
      ) : hasData ? (
        <div className="space-y-2.5">
          {/* Current Balance */}
          <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
            <p className="text-xs text-gray-500 dark:text-gray-400">Current Balance</p>
            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
              SSP {Number(summary.balance || 0).toLocaleString()}
            </p>
            {summary.academic_year && (
              <p className="text-xs text-gray-400 mt-0.5">{summary.academic_year}{summary.current_term ? ` • ${summary.current_term}` : ''}</p>
            )}
          </div>

          {/* Total Income */}
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div>
              <p className="text-xs text-gray-500">Total Income</p>
              <p className="font-semibold text-green-600">SSP {Number(summary.total_income || 0).toLocaleString()}</p>
            </div>
            <TrendingUp size={20} className="text-green-500" />
          </div>

          {/* Total Expenses */}
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div>
              <p className="text-xs text-gray-500">Total Expenses</p>
              <p className="font-semibold text-red-600">SSP {Number(summary.total_expenses || 0).toLocaleString()}</p>
            </div>
            <TrendingDown size={20} className="text-red-500" />
          </div>

          {/* Student Payments */}
          <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div>
              <p className="text-xs text-gray-500">Student Payments</p>
              <p className="font-semibold text-blue-600">SSP {Number(summary.student_payments || 0).toLocaleString()}</p>
            </div>
            <div className="text-right">
              <DollarSign size={20} className="text-blue-500" />
              {summary.student_payments_count > 0 && (
                <p className="text-xs text-gray-400">{summary.student_payments_count} payments</p>
              )}
            </div>
          </div>

          {/* Donations */}
          <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <div>
              <p className="text-xs text-gray-500">Donations & Other</p>
              <p className="font-semibold text-purple-600">SSP {Number(summary.donations_income || 0).toLocaleString()}</p>
            </div>
            <DollarSign size={20} className="text-purple-500" />
          </div>

          {/* Net Balance Summary */}
          <div className="p-2 text-center text-xs text-gray-500">
            Net: SSP {Number((summary.total_income || 0) - (summary.total_expenses || 0)).toLocaleString()}
            {summary.pending_approvals > 0 && (
              <span className="text-yellow-600 ml-2">• {summary.pending_approvals} pending</span>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-4 text-gray-500">
          <p className="text-xs">No financial data available</p>
        </div>
      )}
    </div>
  )
}

export default FinancialSummary
