import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import PageHeader from '../../components/common/PageHeader'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import FormSelect from '../../components/common/FormSelect'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import Badge from '../../components/common/Badge'
import { ArrowLeft, Download, DollarSign, TrendingUp, TrendingDown } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { exportToPDF } from '../../utils/exportPDF'

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
    updateBreadcrumbs([{ label: 'Dashboard', path: '/dashboard' }, { label: 'Reports', path: '/reports' }, { label: 'Financial' }])
  }, [])

  const handleGenerate = async () => {
    setLoading(true)
    setTimeout(() => {
      setReportData({
        total_income: 450000,
        total_expenses: 320000,
        net_income: 130000,
        profit_margin: 28.9,
        income_by_category: [
          { name: 'Tuition Fees', value: 250000 }, { name: 'Registration', value: 50000 },
          { name: 'Transport', value: 60000 }, { name: 'Donations', value: 45000 },
          { name: 'Other', value: 45000 },
        ],
        expenses_by_category: [
          { name: 'Salaries', value: 180000 }, { name: 'Utilities', value: 35000 },
          { name: 'Supplies', value: 40000 }, { name: 'Maintenance', value: 30000 },
          { name: 'Food Program', value: 20000 }, { name: 'Other', value: 15000 },
        ],
        monthly_breakdown: [
          { month: 'Sep', income: 80000, expense: 55000 },
          { month: 'Oct', income: 75000, expense: 52000 },
          { month: 'Nov', income: 70000, expense: 58000 },
          { month: 'Dec', income: 65000, expense: 48000 },
          { month: 'Jan', income: 85000, expense: 56000 },
          { month: 'Feb', income: 75000, expense: 51000 },
        ],
        collection_rate: 78,
        outstanding_fees: 65000,
      })
      setLoading(false)
      setGenerated(true)
    }, 1000)
  }

  const handleExportPDF = () => {
    exportToPDF(reportRef.current, `Financial_Report_${filters.academic_year.replace('/', '_')}_${filters.term.replace(' ', '_')}`)
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

      {generated && reportData && (
        <div ref={reportRef} className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Income', value: `SSP ${reportData.total_income.toLocaleString()}`, color: 'text-green-600', icon: TrendingUp },
              { label: 'Total Expenses', value: `SSP ${reportData.total_expenses.toLocaleString()}`, color: 'text-red-600', icon: TrendingDown },
              { label: 'Net Income', value: `SSP ${reportData.net_income.toLocaleString()}`, color: 'text-primary-600', icon: DollarSign },
              { label: 'Profit Margin', value: `${reportData.profit_margin}%`, color: 'text-emerald-600', icon: TrendingUp },
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

            <Card title="Fee Collection Status">
              <div className="space-y-4">
                <div className="text-center">
                  <p className="text-4xl font-bold text-primary-600">{reportData.collection_rate}%</p>
                  <p className="text-sm text-gray-500">Collection Rate</p>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                  <div className="bg-primary-600 h-4 rounded-full" style={{ width: `${reportData.collection_rate}%` }} />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-green-600">Collected: SSP {(reportData.total_income * reportData.collection_rate / 100).toLocaleString()}</span>
                  <span className="text-red-600">Outstanding: SSP {reportData.outstanding_fees.toLocaleString()}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}

export default FinancialReport
