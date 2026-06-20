import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import PageHeader from '../../components/common/PageHeader'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import FormSelect from '../../components/common/FormSelect'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import { ArrowLeft, Download, BarChart3, TrendingUp, TrendingDown } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts'
import toast from 'react-hot-toast'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

function FinancialReports() {
  const navigate = useNavigate()
  const { updatePageTitle, updateBreadcrumbs } = useApp()
  const [loading, setLoading] = useState(false)
  const [generated, setGenerated] = useState(false)
  const [reportType, setReportType] = useState('income_statement')
  const [reportData, setReportData] = useState(null)

  useEffect(() => {
    updatePageTitle('Financial Reports')
    updateBreadcrumbs([{ label: 'Dashboard', path: '/dashboard' }, { label: 'Financial', path: '/financial' }, { label: 'Reports' }])
  }, [])

  const handleGenerate = async () => {
    setLoading(true)
    setTimeout(() => {
      setReportData({
        total_income: 450000, total_expenses: 320000, net_income: 130000,
        income_by_category: [
          { name: 'Tuition Fees', value: 250000 }, { name: 'Registration', value: 50000 },
          { name: 'Transport', value: 60000 }, { name: 'Donations', value: 45000 }, { name: 'Other', value: 45000 },
        ],
        expenses_by_category: [
          { name: 'Salaries', value: 180000 }, { name: 'Utilities', value: 35000 },
          { name: 'Supplies', value: 40000 }, { name: 'Maintenance', value: 30000 },
          { name: 'Food Program', value: 20000 }, { name: 'Other', value: 15000 },
        ],
        monthly_trend: [
          { month: 'Sep', income: 80000, expense: 55000 },
          { month: 'Oct', income: 75000, expense: 52000 },
          { month: 'Nov', income: 70000, expense: 58000 },
          { month: 'Dec', income: 65000, expense: 48000 },
          { month: 'Jan', income: 85000, expense: 56000 },
          { month: 'Feb', income: 75000, expense: 51000 },
        ],
        top_expenses: [
          { description: 'Staff Salaries', amount: 180000, category: 'salaries' },
          { description: 'Classroom Supplies', amount: 40000, category: 'supplies' },
          { description: 'Electricity Bill', amount: 20000, category: 'utilities' },
        ],
      })
      setLoading(false)
      setGenerated(true)
    }, 1000)
  }

  return (
    <div className="space-y-6 max-w-5xl animate-fade-in-up">
      <PageHeader
        title="Financial Reports"
        actions={<button onClick={() => navigate('/financial')} className="btn btn-secondary"><ArrowLeft size={18} /> Back</button>}
      />

      <Card>
        <div className="flex items-end gap-4">
          <FormSelect label="Report Type" value={reportType} onChange={(e) => setReportType(e.target.value)}
            options={[
              { value: 'income_statement', label: 'Income Statement' },
              { value: 'expense_analysis', label: 'Expense Analysis' },
              { value: 'revenue_analysis', label: 'Revenue Analysis' },
            ]} />
          <Button onClick={handleGenerate} variant="primary" loading={loading} icon={<BarChart3 size={18} />}>Generate</Button>
          {generated && <Button variant="secondary" icon={<Download size={18} />}>Export PDF</Button>}
        </div>
      </Card>

      {loading && <LoadingSpinner />}

      {generated && reportData && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Total Income', value: `SSP ${reportData.total_income.toLocaleString()}`, icon: TrendingUp, color: 'text-green-600' },
              { label: 'Total Expenses', value: `SSP ${reportData.total_expenses.toLocaleString()}`, icon: TrendingDown, color: 'text-red-600' },
              { label: 'Net Income', value: `SSP ${reportData.net_income.toLocaleString()}`, icon: BarChart3, color: 'text-primary-600' },
            ].map((stat, i) => (
              <div key={i} className="stat-card">
                <div className="flex items-center gap-2 mb-2"><stat.icon size={16} className={stat.color} /></div>
                <div className={`stat-card-value text-lg ${stat.color}`}>{stat.value}</div>
                <div className="stat-card-label">{stat.label}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly Trend */}
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

            {/* Income Distribution */}
            <Card title="Income by Category">
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={reportData.income_by_category} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {reportData.income_by_category.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Expense Distribution */}
            <Card title="Expenses by Category">
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={reportData.expenses_by_category} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {reportData.expenses_by_category.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Top Expenses */}
            <Card title="Top Expenses">
              <div className="space-y-3">
                {reportData.top_expenses.map((expense, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{expense.description}</p>
                      <p className="text-xs text-gray-500 capitalize">{expense.category?.replace('_', ' ')}</p>
                    </div>
                    <span className="font-bold text-red-600">SSP {expense.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}

export default FinancialReports