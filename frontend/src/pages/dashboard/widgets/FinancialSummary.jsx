import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { DollarSign, ArrowRight, TrendingUp, TrendingDown } from 'lucide-react'

function FinancialSummary({ data }) {
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setSummary({
        balance: 250000,
        income_this_month: 150000,
        expenses_this_month: 85000,
        collection_rate: 78,
        pending_payments: 45000,
      })
      setLoading(false)
    }, 500)
  }, [])

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
        {/* Balance */}
        <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
          <p className="text-xs text-gray-500 dark:text-gray-400">Current Balance</p>
          <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
            SSP {summary?.balance?.toLocaleString()}
          </p>
        </div>

        {/* Income */}
        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div>
            <p className="text-xs text-gray-500">Income This Month</p>
            <p className="font-semibold text-green-600">SSP {summary?.income_this_month?.toLocaleString()}</p>
          </div>
          <TrendingUp size={20} className="text-green-500" />
        </div>

        {/* Expenses */}
        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div>
            <p className="text-xs text-gray-500">Expenses This Month</p>
            <p className="font-semibold text-red-600">SSP {summary?.expenses_this_month?.toLocaleString()}</p>
          </div>
          <TrendingDown size={20} className="text-red-500" />
        </div>

        {/* Collection Rate */}
        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-gray-500">Fee Collection Rate</p>
            <span className="text-sm font-semibold text-primary-600">{summary?.collection_rate}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-primary-600 h-2 rounded-full transition-all"
              style={{ width: `${summary?.collection_rate}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            SSP {summary?.pending_payments?.toLocaleString()} pending
          </p>
        </div>
      </div>
    </div>
  )
}

export default FinancialSummary