import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import PageHeader from '../../components/common/PageHeader'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import { ArrowLeft, Download, Users, TrendingUp, TrendingDown } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']
const GENDER_COLORS = ['#3b82f6', '#ec4899']

function EnrollmentReport() {
  const navigate = useNavigate()
  const { updatePageTitle, updateBreadcrumbs } = useApp()
  const [loading, setLoading] = useState(false)
  const [generated, setGenerated] = useState(false)
  const [reportData, setReportData] = useState(null)

  useEffect(() => {
    updatePageTitle('Enrollment Report')
    updateBreadcrumbs([{ label: 'Dashboard', path: '/dashboard' }, { label: 'Reports', path: '/reports' }, { label: 'Enrollment' }])
  }, [])

  const handleGenerate = async () => {
    setLoading(true)
    setTimeout(() => {
      setReportData({
        total_active: 180,
        total_graduated: 45,
        new_enrollments: 35,
        by_class: [
          { name: 'Baby', count: 15 }, { name: 'Middle', count: 18 }, { name: 'Top', count: 20 },
          { name: 'P1', count: 22 }, { name: 'P2', count: 20 }, { name: 'P3', count: 18 },
          { name: 'P4', count: 16 }, { name: 'P5', count: 14 }, { name: 'P6', count: 15 },
          { name: 'P7', count: 12 }, { name: 'P8', count: 10 },
        ],
        by_gender: [{ name: 'Male', value: 95 }, { name: 'Female', value: 85 }],
        by_type: [
          { name: 'Street Child', value: 45 }, { name: 'Abundant', value: 60 },
          { name: 'Orphan', value: 50 }, { name: 'Other', value: 25 },
        ],
        trends: [
          { year: 2020, enrollment: 120 }, { year: 2021, enrollment: 140 },
          { year: 2022, enrollment: 155 }, { year: 2023, enrollment: 170 },
          { year: 2024, enrollment: 180 },
        ],
        retention_rate: 92,
        dropout_rate: 8,
      })
      setLoading(false)
      setGenerated(true)
    }, 1000)
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border">
          <p className="font-medium text-sm">{label}</p>
          {payload.map((entry, i) => (
            <p key={i} className="text-xs" style={{ color: entry.color }}>{entry.name}: {entry.value}</p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-6 max-w-5xl animate-fade-in-up">
      <PageHeader
        title="Enrollment Report"
        actions={
          <button onClick={() => navigate('/reports')} className="btn btn-secondary">
            <ArrowLeft size={18} /> Back
          </button>
        }
      />

      <Card>
        <div className="flex gap-3">
          <Button onClick={handleGenerate} variant="primary" loading={loading} icon={<Users size={18} />}>Generate Report</Button>
          {generated && <Button variant="secondary" icon={<Download size={18} />}>Export PDF</Button>}
        </div>
      </Card>

      {loading && <LoadingSpinner />}

      {generated && reportData && (
        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Active', value: reportData.total_active, color: 'text-blue-600' },
              { label: 'New Enrollments', value: reportData.new_enrollments, color: 'text-green-600' },
              { label: 'Graduated', value: reportData.total_graduated, color: 'text-purple-600' },
              { label: 'Retention Rate', value: `${reportData.retention_rate}%`, color: 'text-emerald-600' },
            ].map((stat, i) => (
              <div key={i} className="stat-card">
                <div className={`stat-card-value ${stat.color}`}>{stat.value}</div>
                <div className="stat-card-label">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Enrollment by Class */}
            <Card title="Enrollment by Class">
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reportData.by_class}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" name="Students" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Gender Distribution */}
            <Card title="Gender Distribution">
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={reportData.by_gender} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                      {reportData.by_gender.map((_, i) => <Cell key={i} fill={GENDER_COLORS[i]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* By Type */}
            <Card title="Students by Type">
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={reportData.by_type} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                      {reportData.by_type.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Enrollment Trend */}
            <Card title="Enrollment Trend (5 Years)">
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={reportData.trends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="enrollment" name="Students" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}

export default EnrollmentReport