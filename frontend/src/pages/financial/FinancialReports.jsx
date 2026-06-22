import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import financialAPI from '../../api/financial'
import PageHeader from '../../components/common/PageHeader'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import FormSelect from '../../components/common/FormSelect'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import { ArrowLeft, Download, BarChart3, TrendingUp, TrendingDown } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts'
import { exportToPDF } from '../../utils/exportPDF'
import toast from 'react-hot-toast'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

function FinancialReports() {
  const navigate = useNavigate()
  const reportRef = useRef(null)
  const { updatePageTitle, updateBreadcrumbs } = useApp()
  const [loading, setLoading] = useState(false)
  const [generated, setGenerated] = useState(false)
  const [reportType, setReportType] = useState('income_statement')
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
      const response = await financialAPI.getFinancialReport({ report_type: reportType })
      if (response?.success && response.data) {
        setReportData(response.data)
        setGenerated(true)
      } else if (response?.data) {
        setReportData(response.data)
        setGenerated(true)
      } else {
        toast.error('Failed to generate report')
      }
    } catch (error) {
      console.error('Failed to generate report:', error)
      toast.error(error.message || 'Failed to generate report')
    } finally {
      setLoading(false)
    }
  }

  const handleExportPDF = () => {
    if (reportRef.current) {
      exportToPDF(reportRef.current, `Financial_Report_${reportType}_${new Date().toISOString().split('T')[0]}`)
    }
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
          {generated && <Button onClick={handleExportPDF} variant="secondary" icon={<Download size={18} />}>Export PDF</Button>}
        </div>
      </Card>

      {loading && <LoadingSpinner />}

      {generated && reportData && (
        <div ref={reportRef} className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Total Income', value: `SSP ${(reportData.total_income || 0).toLocaleString()}`, icon: TrendingUp, color: 'text-green-600' },
              { label: 'Total Expenses', value: `SSP ${(reportData.total_expenses || 0).toLocaleString()}`, icon: TrendingDown, color: 'text-red-600' },
              { label: 'Net Income', value: `SSP ${(reportData.net_income || 0).toLocaleString()}`, icon: BarChart3, color: 'text-primary-600' },
            ].map((stat, i) => (
              <div key={i} className="stat-card">
                <div className="flex items-center gap-2 mb-2"><stat.icon size={16} className={stat.color} /></div>
                <div className={`stat-card-value text-lg ${stat.color}`}>{stat.value}</div>
                <div className="stat-card-label">{stat.label}</div>
              </div>
            ))}
          </div>

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
            </div>
          )}

          {reportData.expenses_by_category && reportData.top_expenses && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

              <Card title="Top Expenses">
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
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default FinancialReports
