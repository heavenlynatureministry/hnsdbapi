import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import financialAPI from '../../api/financial'
import PageHeader from '../../components/common/PageHeader'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import FormSelect from '../../components/common/FormSelect'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import { ArrowLeft, Download, BarChart3, TrendingUp, TrendingDown, Calendar } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts'
import { exportToPDF } from '../../utils/exportPDF'
import toast from 'react-hot-toast'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

function getCurrentAcademicYear() {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const startYear = month === 1 ? year - 1 : year
  return `${startYear}/${startYear + 1}`
}

function getCurrentTerm() {
  const month = new Date().getMonth() + 1
  if (month >= 2 && month <= 4) return 'Term 1'
  if (month >= 5 && month <= 7) return 'Term 2'
  if (month >= 9 && month <= 11) return 'Term 3'
  return 'Term 2'
}

const currentYear = getCurrentAcademicYear()
const currentTerm = getCurrentTerm()

const ACADEMIC_YEAR_OPTIONS = [
  { value: currentYear, label: currentYear },
  { value: `${new Date().getFullYear() - 1}/${new Date().getFullYear()}`, label: `${new Date().getFullYear() - 1}/${new Date().getFullYear()}` },
]

const TERM_OPTIONS = [
  { value: '', label: 'All Terms' },
  { value: 'Term 1', label: 'Term 1' },
  { value: 'Term 2', label: 'Term 2' },
  { value: 'Term 3', label: 'Term 3' },
]

function FinancialReports() {
  const navigate = useNavigate()
  const reportRef = useRef(null)
  const { updatePageTitle, updateBreadcrumbs } = useApp()
  const [loading, setLoading] = useState(false)
  const [generated, setGenerated] = useState(false)
  const [reportType, setReportType] = useState('income_statement')
  const [academicYear, setAcademicYear] = useState(currentYear)
  const [term, setTerm] = useState('')
  const [reportData, setReportData] = useState(null)

  useEffect(() => {
    updatePageTitle('Financial Reports')
    updateBreadcrumbs([
      { label: 'Dashboard', path: '/dashboard' },
      { label: 'Financial', path: '/financial' },
      { label: 'Reports' },
    ])
  }, [])

  const handleGenerate = async () => {
    setLoading(true)
    setReportData(null)
    try {
      // Get summary data
      const summaryResponse = await financialAPI.getSummary({ academic_year: academicYear })
      const summaryData = summaryResponse?.data || summaryResponse || {}
      
      // Get transactions for the year
      const transactionsResponse = await financialAPI.listTransactions({ 
        academic_year: academicYear,
        limit: 500 
      })
      const transactions = transactionsResponse?.data?.transactions || transactionsResponse?.data || []
      
      // Process data for reports
      const incomeTransactions = transactions.filter(t => t.transaction_type === 'income')
      const expenseTransactions = transactions.filter(t => t.transaction_type === 'expense')
      
      const totalIncome = incomeTransactions.reduce((s, t) => s + (t.amount || 0), 0)
      const totalExpenses = expenseTransactions.reduce((s, t) => s + (t.amount || 0), 0)
      const netIncome = totalIncome - totalExpenses
      
      // Income by category
      const incomeByCategory = {}
      incomeTransactions.forEach(t => {
        const cat = t.category || 'other'
        incomeByCategory[cat] = (incomeByCategory[cat] || 0) + (t.amount || 0)
      })
      
      // Expenses by category
      const expensesByCategory = {}
      expenseTransactions.forEach(t => {
        const cat = t.category || 'other'
        expensesByCategory[cat] = (expensesByCategory[cat] || 0) + (t.amount || 0)
      })
      
      // Monthly trend
      const monthlyData = {}
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      months.forEach(m => { monthlyData[m] = { month: m, income: 0, expense: 0 } })
      
      transactions.forEach(t => {
        if (t.transaction_date) {
          const d = new Date(t.transaction_date)
          const m = months[d.getMonth()]
          if (m && monthlyData[m]) {
            if (t.transaction_type === 'income') monthlyData[m].income += (t.amount || 0)
            else monthlyData[m].expense += (t.amount || 0)
          }
        }
      })
      
      const monthlyTrend = Object.values(monthlyData)
      
      // Top expenses
      const topExpenses = [...expenseTransactions]
        .sort((a, b) => (b.amount || 0) - (a.amount || 0))
        .slice(0, 10)
      
      setReportData({
        total_income: totalIncome,
        total_expenses: totalExpenses,
        net_income: netIncome,
        academic_year: academicYear,
        term: term || 'All Terms',
        income_by_category: Object.entries(incomeByCategory).map(([name, value]) => ({ name: name.replace(/_/g, ' '), value })),
        expenses_by_category: Object.entries(expensesByCategory).map(([name, value]) => ({ name: name.replace(/_/g, ' '), value })),
        monthly_trend: monthlyTrend,
        top_expenses: topExpenses.map(t => ({
          description: t.description,
          category: t.category,
          amount: t.amount,
        })),
      })
      
      setGenerated(true)
    } catch (error) {
      console.error('Failed to generate report:', error)
      toast.error(error.message || 'Failed to generate report')
    } finally {
      setLoading(false)
    }
  }

  const handleExportPDF = () => {
    if (reportRef.current) {
      const date = new Date().toISOString().split('T')[0]
      exportToPDF(reportRef.current, `Financial_Report_${reportType}_${academicYear.replace('/', '-')}_${date}`)
    }
  }

  return (
    <div className="space-y-6 max-w-5xl animate-fade-in-up">
      <PageHeader
        title="Financial Reports"
        actions={<button onClick={() => navigate('/financial')} className="btn btn-secondary"><ArrowLeft size={18} /> Back</button>}
      />

      <Card>
        <div className="flex flex-wrap items-end gap-4">
          <FormSelect 
            label="Report Type" 
            value={reportType} 
            onChange={(e) => setReportType(e.target.value)}
            options={[
              { value: 'income_statement', label: 'Income Statement' },
              { value: 'expense_analysis', label: 'Expense Analysis' },
              { value: 'revenue_analysis', label: 'Revenue Analysis' },
            ]} 
          />
          <FormSelect 
            label="Academic Year" 
            value={academicYear} 
            onChange={(e) => setAcademicYear(e.target.value)}
            options={ACADEMIC_YEAR_OPTIONS} 
          />
          <FormSelect 
            label="Term" 
            value={term} 
            onChange={(e) => setTerm(e.target.value)}
            options={TERM_OPTIONS} 
          />
          <Button onClick={handleGenerate} variant="primary" loading={loading} icon={<BarChart3 size={18} />}>
            Generate Report
          </Button>
          {generated && (
            <Button onClick={handleExportPDF} variant="secondary" icon={<Download size={18} />}>
              Export PDF
            </Button>
          )}
        </div>
      </Card>

      {loading && <LoadingSpinner />}

      {generated && reportData && (
        <div ref={reportRef} className="space-y-6">
          {/* Report Header */}
          <div className="text-center border-b pb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Financial Report</h2>
            <p className="text-sm text-gray-500">
              {reportType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} • 
              Academic Year {reportData.academic_year} • 
              {reportData.term}
            </p>
            <p className="text-xs text-gray-400">Generated on {new Date().toLocaleDateString()}</p>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Total Income', value: `SSP ${(reportData.total_income || 0).toLocaleString()}`, icon: TrendingUp, color: 'text-green-600 bg-green-100' },
              { label: 'Total Expenses', value: `SSP ${(reportData.total_expenses || 0).toLocaleString()}`, icon: TrendingDown, color: 'text-red-600 bg-red-100' },
              { label: 'Net Income', value: `SSP ${(reportData.net_income || 0).toLocaleString()}`, icon: BarChart3, color: `${(reportData.net_income >= 0 ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100')}` },
            ].map((stat, i) => (
              <div key={i} className="stat-card">
                <div className={`stat-card-icon ${stat.color}`}><stat.icon size={20} /></div>
                <div className="stat-card-value text-lg">{stat.value}</div>
                <div className="stat-card-label">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Charts */}
          {reportData.monthly_trend && reportData.income_by_category && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card title="Monthly Income vs Expenses">
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={reportData.monthly_trend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="expense" name="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card title="Income by Category">
                <div className="h-72">
                  {reportData.income_by_category.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={reportData.income_by_category} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                          {reportData.income_by_category.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">No income data available</div>
                  )}
                </div>
              </Card>
            </div>
          )}

          {reportData.expenses_by_category && reportData.top_expenses && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card title="Expenses by Category">
                <div className="h-72">
                  {reportData.expenses_by_category.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={reportData.expenses_by_category} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                          {reportData.expenses_by_category.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">No expense data available</div>
                  )}
                </div>
              </Card>

              <Card title="Top Expenses">
                {reportData.top_expenses.length > 0 ? (
                  <div className="space-y-3">
                    {reportData.top_expenses.map((expense, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div>
                          <p className="font-medium text-sm">{expense.description}</p>
                          <p className="text-xs text-gray-500 capitalize">{expense.category?.replace(/_/g, ' ')}</p>
                        </div>
                        <span className="font-bold text-red-600">SSP {(expense.amount || 0).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-32 text-gray-500">No expenses recorded</div>
                )}
              </Card>
            </div>
          )}

          {/* Empty State */}
          {!reportData.monthly_trend && !reportData.income_by_category && (
            <Card>
              <div className="text-center py-8 text-gray-500">
                <BarChart3 size={48} className="mx-auto mb-4 opacity-50" />
                <p>No financial data found for {reportData.academic_year}</p>
                <p className="text-sm">Record transactions to see reports here.</p>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}

export default FinancialReports
