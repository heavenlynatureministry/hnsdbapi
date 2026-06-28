import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import reportsAPI from '../../api/reports'
import PageHeader from '../../components/common/PageHeader'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import FormSelect from '../../components/common/FormSelect'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import { ArrowLeft, Download, DollarSign, TrendingUp, TrendingDown } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { exportToPDF } from '../../utils/exportPDF'
import toast from 'react-hot-toast'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']

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
  { value: 'Term 1', label: 'Term 1' },
  { value: 'Term 2', label: 'Term 2' },
  { value: 'Term 3', label: 'Term 3' },
]

function FinancialReport() {
  const navigate = useNavigate()
  const reportRef = useRef(null)
  const { updatePageTitle, updateBreadcrumbs } = useApp()
  const [loading, setLoading] = useState(false)
  const [generated, setGenerated] = useState(false)

  const [filters, setFilters] = useState({
    academic_year: currentYear,
    term: currentTerm,
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
        const data = response.data
        
        // Transform API data for charts
        const formattedData = {
          ...data,
          academic_year: data.academic_year || filters.academic_year,
          profit_margin: data.total_income > 0 
            ? Math.round(((data.total_income - data.total_expenses) / data.total_income) * 100) 
            : 0,
          // Format category data for pie charts
          income_by_category: data.income_by_category 
            ? Object.entries(data.income_by_category).map(([name, value]) => ({
                name: name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                value
              }))
            : [],
          expenses_by_category: data.expenses_by_category 
            ? Object.entries(data.expenses_by_category).map(([name, value]) => ({
                name: name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                value
              }))
            : [],
          // Payment info
          total_collected: data.payments?.total_collected || 0,
          total_payments: data.payments?.total_count || 0,
          collection_rate: data.total_income > 0 
            ? Math.round(((data.payments?.total_collected || 0) / data.total_income) * 100) 
            : 0,
        }
        
        setReportData(formattedData)
        setGenerated(true)
      } else if (response?.data) {
        const data = response.data
        setReportData({
          ...data,
          academic_year: data.academic_year || filters.academic_year,
          income_by_category: data.income_by_category 
            ? Object.entries(data.income_by_category).map(([name, value]) => ({
                name: name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), value
              })) : [],
          expenses_by_category: data.expenses_by_category 
            ? Object.entries(data.expenses_by_category).map(([name, value]) => ({
                name: name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), value
              })) : [],
        })
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
      const year = filters.academic_year.replace('/', '_')
      const term = filters.term.replace(' ', '_')
      exportToPDF(reportRef.current, `Financial_Report_${year}_${term}`)
    }
  }

  return (
    <div className="space-y-6 max-w-5xl animate-fade-in-up">
      <PageHeader
        title="Financial Report"
        subtitle={`Academic Year ${currentYear}`}
        actions={
          <button onClick={() => navigate('/reports')} className="btn btn-secondary">
            <ArrowLeft size={18} /> Back
          </button>
        }
      />

      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FormSelect 
            label="Report Type" 
            value={filters.report_type} 
            onChange={(e) => setFilters(prev => ({ ...prev, report_type: e.target.value }))}
            options={[
              { value: 'summary', label: 'Summary' },
              { value: 'income_statement', label: 'Income Statement' },
              { value: 'fee_collection', label: 'Fee Collection' },
            ]} 
          />
          <FormSelect 
            label="Academic Year" 
            value={filters.academic_year} 
            onChange={(e) => setFilters(prev => ({ ...prev, academic_year: e.target.value }))}
            options={ACADEMIC_YEAR_OPTIONS} 
          />
          <FormSelect 
            label="Term" 
            value={filters.term} 
            onChange={(e) => setFilters(prev => ({ ...prev, term: e.target.value }))}
            options={TERM_OPTIONS} 
          />
        </div>
        <div className="flex gap-3 mt-4">
          <Button onClick={handleGenerate} variant="primary" loading={loading} icon={<DollarSign size={18} />}>
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

      {!loading && !generated && (
        <div className="text-center py-12">
          <DollarSign size={48} className="text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Select filters and click "Generate Report" to view financial data.</p>
        </div>
      )}

      {generated && reportData && (
        <div ref={reportRef} className="space-y-6">
          {/* Report Title */}
          <div className="hidden print:block text-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">Financial Report</h2>
            <p className="text-sm text-gray-500">
              {reportData.academic_year || filters.academic_year} • {filters.term}
            </p>
            <hr className="mt-3 border-gray-300" />
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Income', value: `SSP ${(reportData.total_income || 0).toLocaleString()}`, color: 'text-green-600 bg-green-100', icon: TrendingUp },
              { label: 'Total Expenses', value: `SSP ${(reportData.total_expenses || 0).toLocaleString()}`, color: 'text-red-600 bg-red-100', icon: TrendingDown },
              { label: 'Balance', value: `SSP ${(reportData.balance || 0).toLocaleString()}`, color: `${(reportData.balance || 0) >= 0 ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100'}`, icon: DollarSign },
              { label: 'Payments', value: `${(reportData.total_payments || 0).toLocaleString()}`, color: 'text-blue-600 bg-blue-100', icon: DollarSign },
            ].map((stat, i) => (
              <div key={i} className="stat-card">
                <div className={`stat-card-icon ${stat.color}`}><stat.icon size={20} /></div>
                <div className="stat-card-value text-sm">{stat.value}</div>
                <div className="stat-card-label">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Collection Rate */}
          {reportData.collection_rate !== undefined && (
            <Card title="Fee Collection">
              <div className="text-center mb-4">
                <p className="text-4xl font-bold text-primary-600">{reportData.collection_rate || 0}%</p>
                <p className="text-sm text-gray-500">Collection Rate</p>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 mb-3">
                <div 
                  className="bg-primary-600 h-4 rounded-full" 
                  style={{ width: `${Math.min(reportData.collection_rate || 0, 100)}%` }} 
                />
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-green-600 font-medium">
                  Collected: SSP {(reportData.total_collected || 0).toLocaleString()}
                </span>
                <span className="text-red-600 font-medium">
                  Outstanding: SSP {((reportData.total_income || 0) - (reportData.total_collected || 0)).toLocaleString()}
                </span>
              </div>
            </Card>
          )}

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Income by Category */}
            <Card title="Income by Category">
              <div className="h-72">
                {reportData.income_by_category && reportData.income_by_category.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie 
                        data={reportData.income_by_category} 
                        cx="50%" cy="50%" 
                        outerRadius={90} 
                        dataKey="value" 
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {reportData.income_by_category.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">No income data</div>
                )}
              </div>
            </Card>

            {/* Expenses by Category */}
            <Card title="Expenses by Category">
              <div className="h-72">
                {reportData.expenses_by_category && reportData.expenses_by_category.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie 
                        data={reportData.expenses_by_category} 
                        cx="50%" cy="50%" 
                        outerRadius={90} 
                        dataKey="value" 
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {reportData.expenses_by_category.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">No expense data</div>
                )}
              </div>
            </Card>
          </div>

          {/* Empty State */}
          {(!reportData.income_by_category || reportData.income_by_category.length === 0) && 
           (!reportData.expenses_by_category || reportData.expenses_by_category.length === 0) && (
            <Card>
              <div className="text-center py-8 text-gray-500">
                <DollarSign size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">No financial data available for {reportData.academic_year || filters.academic_year}.</p>
                <p className="text-xs">Record transactions to see financial reports.</p>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}

export default FinancialReport
