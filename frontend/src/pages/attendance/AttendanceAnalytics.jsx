import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import attendanceAPI from '../../api/attendance'
import PageHeader from '../../components/common/PageHeader'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import FormSelect from '../../components/common/FormSelect'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import Badge from '../../components/common/Badge'
import { 
  ArrowLeft, Download, TrendingUp, TrendingDown, 
  Users, AlertTriangle, CheckCircle, BarChart3,
  Calendar, Clock
} from 'lucide-react'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Legend, LineChart, Line, PieChart, Pie, Cell 
} from 'recharts'
import { exportToPDF } from '../../utils/exportPDF'
import toast from 'react-hot-toast'

const COLORS = ['#10b981', '#ef4444', '#f59e0b', '#3b82f6']

function AttendanceAnalytics() {
  const navigate = useNavigate()
  const reportRef = useRef(null)
  const { updatePageTitle, updateBreadcrumbs } = useApp()
  const [loading, setLoading] = useState(false)
  const [generated, setGenerated] = useState(false)
  const [period, setPeriod] = useState('term')
  const [reportData, setReportData] = useState(null)

  useEffect(() => {
    updatePageTitle('Attendance Analytics')
    updateBreadcrumbs([
      { label: 'Dashboard', path: '/dashboard' },
      { label: 'Attendance', path: '/attendance' },
      { label: 'Analytics' },
    ])
  }, [])

  const handleGenerate = async () => {
    setLoading(true)
    setReportData(null)
    
    try {
      // Use the analytics overview endpoint
      const response = await attendanceAPI.getAnalytics({ period })
      
      console.log('Analytics response:', response)

      if (response?.success && response.data) {
        const data = response.data
        
        // Transform API data for display
        setReportData({
          overall_rate: data.attendance_rate || 0,
          total_records: data.total_records || 0,
          alerts: {
            chronic_absentees: data.status_summary?.absent || 0,
            consecutive_absences: data.status_summary?.absent || 0,
          },
          status_distribution: data.status_summary ? 
            Object.entries(data.status_summary).map(([name, value]) => ({
              name: name.charAt(0).toUpperCase() + name.slice(1),
              value: typeof value === 'object' ? value.count : value,
            })) : [],
          monthly_trend: [],
          by_class: [],
          by_day_of_week: {},
          risk_distribution: {
            low: data.status_summary?.present || 0,
            medium: data.status_summary?.late || 0,
            high: data.status_summary?.excused || 0,
            critical: data.status_summary?.absent || 0,
          },
        })
        setGenerated(true)
      } else if (response?.data) {
        const data = response.data
        setReportData({
          overall_rate: data.attendance_rate || 0,
          total_records: data.total_records || 0,
          alerts: { chronic_absentees: 0, consecutive_absences: 0 },
          status_distribution: [],
          monthly_trend: [],
          by_class: [],
          by_day_of_week: {},
          risk_distribution: { low: 0, medium: 0, high: 0, critical: 0 },
        })
        setGenerated(true)
      } else {
        toast.error('Failed to generate analytics')
      }
    } catch (error) {
      console.error('Failed to generate analytics:', error)
      if (error.status === 0) {
        toast.error('Server is starting up. Please try again in 30 seconds.')
      } else {
        toast.error(error.message || 'Failed to generate analytics')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleExportPDF = () => {
    if (reportRef.current) {
      exportToPDF(reportRef.current, `Attendance_Analytics_${period}_${new Date().toISOString().split('T')[0]}`)
    }
  }

  return (
    <div className="space-y-6 max-w-6xl animate-fade-in-up">
      <PageHeader
        title="Attendance Analytics"
        subtitle="Deep insights into attendance patterns"
        actions={
          <button onClick={() => navigate('/attendance')} className="btn btn-secondary">
            <ArrowLeft size={18} /> Back
          </button>
        }
      />

      <Card>
        <div className="flex items-end gap-4">
          <FormSelect
            label="Period"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            options={[
              { value: 'term', label: 'This Term' },
              { value: 'year', label: 'This Year' },
            ]}
          />
          <Button onClick={handleGenerate} variant="primary" loading={loading} icon={<BarChart3 size={18} />}>
            Generate Analytics
          </Button>
          {generated && (
            <Button onClick={handleExportPDF} variant="secondary" icon={<Download size={18} />}>
              Export
            </Button>
          )}
        </div>
      </Card>

      {loading && <LoadingSpinner />}

      {!loading && !generated && (
        <div className="text-center py-12">
          <BarChart3 size={48} className="text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Select a period and click "Generate Analytics" to view attendance data.</p>
        </div>
      )}

      {generated && reportData && (
        <div ref={reportRef} className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Overall Rate', value: `${reportData.overall_rate}%`, icon: TrendingUp, color: 'bg-blue-100 text-blue-600' },
              { label: 'Absentees', value: reportData.alerts?.chronic_absentees || 0, icon: AlertTriangle, color: 'bg-red-100 text-red-600' },
              { label: 'Total Records', value: (reportData.total_records || 0).toLocaleString(), icon: Calendar, color: 'bg-purple-100 text-purple-600' },
              { label: 'Status Types', value: (reportData.status_distribution || []).length, icon: BarChart3, color: 'bg-green-100 text-green-600' },
            ].map((stat, i) => (
              <div key={i} className="stat-card">
                <div className={`stat-card-icon ${stat.color}`}><stat.icon size={20} /></div>
                <div className="stat-card-value">{stat.value}</div>
                <div className="stat-card-label">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Status Distribution */}
          {reportData.status_distribution.length > 0 && (
            <Card title="Status Distribution">
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie 
                      data={reportData.status_distribution} 
                      cx="50%" cy="50%" 
                      outerRadius={90} 
                      dataKey="value" 
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {reportData.status_distribution.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          {/* Risk Distribution */}
          {reportData.risk_distribution && (
            <Card title="Attendance Distribution">
              <div className="grid grid-cols-4 gap-4 text-center">
                {[
                  { label: 'Present', value: reportData.risk_distribution.low, color: 'bg-green-100 text-green-600' },
                  { label: 'Late', value: reportData.risk_distribution.medium, color: 'bg-yellow-100 text-yellow-600' },
                  { label: 'Excused', value: reportData.risk_distribution.high, color: 'bg-orange-100 text-orange-600' },
                  { label: 'Absent', value: reportData.risk_distribution.critical, color: 'bg-red-100 text-red-600' },
                ].map((risk, i) => (
                  <div key={i} className={`p-4 rounded-lg ${risk.color} bg-opacity-20`}>
                    <p className="text-2xl font-bold">{risk.value}</p>
                    <p className="text-sm font-medium">{risk.label}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Empty State */}
          {reportData.status_distribution.length === 0 && (
            <Card>
              <div className="text-center py-8 text-gray-500">
                <BarChart3 size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">No attendance data found for the selected period.</p>
                <p className="text-xs">Mark attendance to see analytics.</p>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}

export default AttendanceAnalytics
