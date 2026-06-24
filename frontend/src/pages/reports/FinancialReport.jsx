import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import reportsAPI from '../../api/reports'
import PageHeader from '../../components/common/PageHeader'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import FormSelect from '../../components/common/FormSelect'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import Badge from '../../components/common/Badge'
import { ArrowLeft, Download, DollarSign, TrendingUp, TrendingDown } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { exportToPDF } from '../../utils/exportPDF'
import toast from 'react-hot-toast'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']

function FinancialReport() {
  const navigate = useNavigate()
  const reportRef = useRef(null)
  const { updatePageTitle, updateBreadcrumbs } = useApp()
  const [loading, setLoading] = useState(false)
  const [generated, setGenerated] = useState(false)

  const [filters, setFilters] = useState({
    academic_year: '2024/2025',
    term: 'Term 1',
    report_type: 'summary',
  })

  const [reportData, setReportData] = useState(null)

  useEffect(() => {
    updatePageTitle('Financial Report')
    updateBreadcrumbs([
      { label: 'Dashboard', path: '/dashboard' },
      { label: 'Reports', path: '/reports' },
      { label: 'Financial' },
    ])
  }, [])

  const handleGenerate = async () => {
    setLoading(true)
    setReportData(null)
    setGenerated(false)
    
    try {
      const response = await reportsAPI.getFinancialSummary({
        academic_year: filters.academic_year,
      })
      
      if (response?.success && response.data) {
        setReportData(response.data)
        setGenerated(true)
      } else if (response?.data) {
        setReportData(response.data)
        setGenerated(true)
      } else {
        toast.error('Failed to generate report. No data available.')
      }
    } catch (error) {
      console.error('Failed to generate financial report:', error)
      if (error.status === 0) {
        toast.error('Server is starting up. Please try again in 30 seconds.')
      } else {
        toast.error(error.message || 'Failed to generate report')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleExportPDF = () => {
    if (reportRef.current) {
      exportToPDF(reportRef.current, `Financial_Report_${filters.academic_year.replace('/', '_')}_${filters.term.replace(' ', '_')}`)
    }
  }

  return (
    <div className="space-y-6 max-w-5xl animate-fade-in-up">
      <PageHeader
        title="Financial Report"
        actions={
          <button onClick={() => navigate('/reports')} className="btn btn-secondary">
            <ArrowLeft size={18} /> Back
          </button>
        }
      />

      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FormSelect label="Report Type" value={filters.report_type} onChange={(e) => setFilters(prev => ({ ...prev, report_type: e.target.value }))}
            options={[{ value: 'summary', label: 'Summary' }, { value: 'income_statement', label: 'Income Statement' }, { value: 'fee_collection', label: 'Fee Collection' }]} />
          <FormSelect label="Academic Year" value={filters.academic_year} onChange={(e) => setFilters(prev => ({ ...prev, academic_year: e.target.value }))}
            options={[{ value: '2024/2025', label: '2024/2025' }]} />
          <FormSelect label="Term" value={filters.term} onChange={(e) => setFilters(prev => ({ ...prev, term: e.target.value }))}
            options={[{ value: 'Term 1', label: 'Term 1' }, { value: 'Term 2', label: 'Term 2' }]} />
        </div>
        <div className="flex gap-3 mt-4">
          <Button onClick={handleGenerate} variant="primary" loading={loading} icon={<DollarSign size={18} />}>Generate Report</Button>
          {generated && <Button onClick={handleExportPDF} variant="secondary" icon={<Download size={18} />}>Export PDF</Button>}
        </div>
      </Card>

      {loading && <LoadingSpinner />}

      {!loading && !generated && (
        <div className="text-center py-12">
          <DollarSign size={48} className="text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Select filters and click "Generate Report" to view financial data.</p>
        </div>
      )}

      {generated && reportData && (
        <div ref={reportRef} className="space-y-6">
          {/* Report Title - visible in print only */}
          <div className="hidden print:block text-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">Financial Report</h2>
            <p className="text-sm text-gray-500">
              {filters.academic_year} • {filters.term} • {filters.report_type === 'summary' ? 'Summary' : filters.report_type === 'income_statement' ? 'Income Statement' : 'Fee Collection'}
            </p>
            <hr className="mt-3 border-gray-300" />
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Income', value: `SSP ${(reportData.total_income || 0).toLocaleString()}`, color: 'text-green-600', icon: TrendingUp },
              { label: 'Total Expenses', value: `SSP ${(reportData.total_expenses || 0).toLocaleString()}`, color: 'text-red-600', icon: TrendingDown },
              { label: 'Net Income', value: `SSP ${(reportData.balance || reportData.net_income || 0).toLocaleString()}`, color: 'text-primary-600', icon: DollarSign },
              { label: 'Profit Margin', value: `${reportData.profit_margin || 0}%`, color: 'text-emerald-600', icon: TrendingUp },
            ].map((stat, i) => (
              <div key={i} className="stat-card">
                <div className="flex items-center gap-2 mb-2">
                  <stat.icon size={16} className={stat.color} />
                </div>
                <div className={`stat-card-value ${stat.color}`}>{stat.value}</div>
                <div className="stat-card-label">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Charts */}
          {reportData.monthly_breakdown && reportData.income_by_category && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card title="Monthly Income vs Expenses">
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={reportData.monthly_breakdown}>
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

          {reportData.expenses_by_category && (
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

              {reportData.collection_rate !== undefined && (
                <Card title="Fee Collection Status">
                  <div className="space-y-4">
                    <div className="text-center">
                      <p className="text-4xl font-bold text-primary-600">{reportData.collection_rate || 0}%</p>
                      <p className="text-sm text-gray-500">Collection Rate</p>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                      <div className="bg-primary-600 h-4 rounded-full" style={{ width: `${Math.min(reportData.collection_rate || 0, 100)}%` }} />
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-green-600">Collected: SSP {(((reportData.total_income || 0) * (reportData.collection_rate || 0) / 100)).toLocaleString()}</span>
                      <span className="text-red-600">Outstanding: SSP {(reportData.outstanding_fees || 0).toLocaleString()}</span>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default FinancialReport
