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
      const response = await attendanceAPI.getAnalytics({ period })
      
      if (response?.success && response.data) {
        setReportData(response.data)
        setGenerated(true)
      } else if (response?.data) {
        setReportData(response.data)
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
              { value: 'custom', label: 'Custom' },
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

      {generated && reportData && (
        <div ref={reportRef} className="space-y-6">
          {/* Alert Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Overall Rate', value: `${reportData.overall_rate}%`, icon: TrendingUp, color: 'bg-blue-100 text-blue-600' },
              { label: 'Chronic Absentees', value: reportData.alerts?.chronic_absentees || 0, icon: AlertTriangle, color: 'bg-red-100 text-red-600' },
              { label: 'Consecutive Alerts', value: reportData.alerts?.consecutive_absences || 0, icon: Clock, color: 'bg-yellow-100 text-yellow-600' },
              { label: 'Total Records', value: (reportData.total_records || 0).toLocaleString(), icon: Calendar, color: 'bg-purple-100 text-purple-600' },
            ].map((stat, i) => (
              <div key={i} className="stat-card">
                <div className={`stat-card-icon ${stat.color}`}><stat.icon size={20} /></div>
                <div className="stat-card-value">{stat.value}</div>
                <div className="stat-card-label">{stat.label}</div>
              </div>
            ))}
          </div>

          {reportData.monthly_trend && reportData.status_distribution && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card title="Monthly Attendance Trend">
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={reportData.monthly_trend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} domain={[80, 100]} unit="%" />
                      <Tooltip />
                      <Line type="monotone" dataKey="rate" name="Attendance Rate" stroke="#3b82f6" strokeWidth={3} dot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card title="Status Distribution">
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={reportData.status_distribution} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {reportData.status_distribution.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>
          )}

          {reportData.by_class && reportData.by_day_of_week && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card title="Attendance by Class">
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={reportData.by_class} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis type="number" domain={[80, 95]} tick={{ fontSize: 12 }} unit="%" />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={50} />
                      <Tooltip />
                      <Bar dataKey="rate" name="Attendance Rate" fill="#3b82f6" radius={[0, 4, 4, 0]}>
                        {reportData.by_class.map((_, i) => (
                          <Cell key={i} fill={reportData.by_class[i].rate >= 90 ? '#10b981' : reportData.by_class[i].rate >= 85 ? '#f59e0b' : '#ef4444'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card title="Attendance by Day of Week">
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={Object.entries(reportData.by_day_of_week).map(([day, rate]) => ({ day, rate }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} domain={[80, 95]} unit="%" />
                      <Tooltip />
                      <Bar dataKey="rate" name="Attendance Rate" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>
          )}

          {reportData.risk_distribution && (
            <Card title="Student Risk Distribution">
              <div className="grid grid-cols-4 gap-4 text-center">
                {[
                  { label: 'Low Risk', value: reportData.risk_distribution.low, color: 'bg-green-100 text-green-600', desc: '> 85% attendance' },
                  { label: 'Medium', value: reportData.risk_distribution.medium, color: 'bg-yellow-100 text-yellow-600', desc: '75-85% attendance' },
                  { label: 'High', value: reportData.risk_distribution.high, color: 'bg-orange-100 text-orange-600', desc: '65-75% attendance' },
                  { label: 'Critical', value: reportData.risk_distribution.critical, color: 'bg-red-100 text-red-600', desc: '< 65% attendance' },
                ].map((risk, i) => (
                  <div key={i} className={`p-4 rounded-lg ${risk.color} bg-opacity-20`}>
                    <p className="text-2xl font-bold">{risk.value}</p>
                    <p className="text-sm font-medium">{risk.label}</p>
                    <p className="text-xs mt-1">{risk.desc}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card title="Recommendations">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { icon: AlertTriangle, color: 'text-red-600', text: `Follow up with ${reportData.alerts?.chronic_absentees || 0} students identified as chronic absentees` },
                { icon: TrendingDown, color: 'text-yellow-600', text: 'Wednesday shows lowest attendance - consider scheduling engaging activities' },
                { icon: TrendingUp, color: 'text-green-600', text: 'Identify and share best practices from highest performing classes' },
                { icon: Clock, color: 'text-blue-600', text: `${reportData.alerts?.consecutive_absences || 0} students with consecutive absences need immediate intervention` },
              ].map((rec, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <rec.icon size={20} className={`${rec.color} flex-shrink-0 mt-0.5`} />
                  <p className="text-sm">{rec.text}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

export default AttendanceAnalytics
