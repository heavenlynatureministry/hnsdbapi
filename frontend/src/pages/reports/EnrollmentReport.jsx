import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import reportsAPI from '../../api/reports'
import PageHeader from '../../components/common/PageHeader'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import { ArrowLeft, Download, Users, GraduationCap } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { exportToPDF } from '../../utils/exportPDF'
import toast from 'react-hot-toast'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']
const GENDER_COLORS = ['#3b82f6', '#ec4899']

function getCurrentAcademicYear() {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const startYear = month === 1 ? year - 1 : year
  return `${startYear}/${startYear + 1}`
}

const currentYear = getCurrentAcademicYear()

function EnrollmentReport() {
  const navigate = useNavigate()
  const reportRef = useRef(null)
  const { updatePageTitle, updateBreadcrumbs } = useApp()
  const [loading, setLoading] = useState(false)
  const [generated, setGenerated] = useState(false)
  const [reportData, setReportData] = useState(null)

  useEffect(() => {
    updatePageTitle('Enrollment Report')
    updateBreadcrumbs([
      { label: 'Dashboard', path: '/dashboard' },
      { label: 'Reports', path: '/reports' },
      { label: 'Enrollment' },
    ])
  }, [])

  const handleGenerate = async () => {
    setLoading(true)
    setReportData(null)
    setGenerated(false)
    
    try {
      const response = await reportsAPI.getEnrollmentSummary()
      
      if (response?.success && response.data) {
        // Transform API data for charts
        const data = response.data
        const formattedData = {
          ...data,
          academic_year: data.academic_year || currentYear,
          // Format by_gender for pie chart
          by_gender: data.by_gender ? Object.entries(data.by_gender).map(([name, value]) => ({ name, value })) : [],
          // Format by_type for pie chart
          by_type: data.by_type ? Object.entries(data.by_type).map(([name, value]) => ({
            name: name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            value
          })) : [],
          // Format by_class for bar chart
          by_class: data.by_class ? data.by_class.map(c => ({
            name: c.class_name || 'Unknown',
            count: c.count || 0,
            level: c.class_level || '',
          })) : [],
        }
        setReportData(formattedData)
        setGenerated(true)
      } else if (response?.data) {
        const data = response.data
        setReportData({
          ...data,
          academic_year: data.academic_year || currentYear,
          by_gender: data.by_gender ? Object.entries(data.by_gender).map(([name, value]) => ({ name, value })) : [],
          by_type: data.by_type ? Object.entries(data.by_type).map(([name, value]) => ({
            name: name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            value
          })) : [],
          by_class: data.by_class ? data.by_class.map(c => ({ name: c.class_name || 'Unknown', count: c.count || 0 })) : [],
        })
        setGenerated(true)
      } else {
        toast.error('Failed to generate report. No data available.')
      }
    } catch (error) {
      console.error('Failed to generate enrollment report:', error)
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
      exportToPDF(reportRef.current, `Enrollment_Report_${currentYear.replace('/', '_')}`)
    }
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
        subtitle={`Academic Year ${currentYear}`}
        actions={
          <button onClick={() => navigate('/reports')} className="btn btn-secondary">
            <ArrowLeft size={18} /> Back
          </button>
        }
      />

      <Card>
        <div className="flex gap-3">
          <Button onClick={handleGenerate} variant="primary" loading={loading} icon={<Users size={18} />}>
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
          <Users size={48} className="text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Click "Generate Report" to view enrollment data.</p>
        </div>
      )}

      {generated && reportData && (
        <div ref={reportRef} className="space-y-6">
          {/* Report Title */}
          <div className="hidden print:block text-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">Enrollment Report</h2>
            <p className="text-sm text-gray-500">{reportData.academic_year || currentYear} Academic Year</p>
            <hr className="mt-3 border-gray-300" />
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Active', value: (reportData.total_active || 0).toLocaleString(), icon: Users, color: 'text-blue-600 bg-blue-100' },
              { label: 'New Enrollments', value: (reportData.new_enrollments || 0).toLocaleString(), icon: GraduationCap, color: 'text-green-600 bg-green-100' },
              { label: 'Classes', value: (reportData.by_class?.length || 0).toLocaleString(), icon: Users, color: 'text-purple-600 bg-purple-100' },
              { label: 'Academic Year', value: reportData.academic_year || currentYear, icon: GraduationCap, color: 'text-orange-600 bg-orange-100' },
            ].map((stat, i) => (
              <div key={i} className="stat-card">
                <div className={`stat-card-icon ${stat.color}`}><stat.icon size={20} /></div>
                <div className="stat-card-value text-sm">{stat.value}</div>
                <div className="stat-card-label">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* By Class Bar Chart */}
            {reportData.by_class && reportData.by_class.length > 0 && (
              <Card title="Enrollment by Class">
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={reportData.by_class}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="count" name="Students" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            )}

            {/* Gender Distribution Pie Chart */}
            {reportData.by_gender && reportData.by_gender.length > 0 && (
              <Card title="Gender Distribution">
                <div className="h-72">
                  {reportData.by_gender.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie 
                          data={reportData.by_gender} 
                          cx="50%" cy="50%" 
                          outerRadius={90} 
                          dataKey="value" 
                          label={({ name, value }) => `${name}: ${value}`}
                        >
                          {reportData.by_gender.map((_, i) => (
                            <Cell key={i} fill={GENDER_COLORS[i % GENDER_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">No gender data</div>
                  )}
                </div>
              </Card>
            )}

            {/* Student Type Pie Chart */}
            {reportData.by_type && reportData.by_type.length > 0 && (
              <Card title="Students by Type">
                <div className="h-72">
                  {reportData.by_type.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie 
                          data={reportData.by_type} 
                          cx="50%" cy="50%" 
                          outerRadius={90} 
                          dataKey="value" 
                          label={({ name, value }) => `${name}: ${value}`}
                        >
                          {reportData.by_type.map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">No type data</div>
                  )}
                </div>
              </Card>
            )}

            {/* Empty State */}
            {(!reportData.by_class || reportData.by_class.length === 0) && 
             (!reportData.by_gender || reportData.by_gender.length === 0) && 
             (!reportData.by_type || reportData.by_type.length === 0) && (
              <Card className="lg:col-span-2">
                <div className="text-center py-8 text-gray-500">
                  <Users size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No enrollment data available for charts.</p>
                  <p className="text-xs">Enroll students to see statistics.</p>
                </div>
              </Card>
            )}
          </div>

          {/* Data Table */}
          {reportData.by_class && reportData.by_class.length > 0 && (
            <Card title="Class Enrollment Details">
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Class</th>
                      <th>Level</th>
                      <th>Students</th>
                      <th>% of Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.by_class.map((cls, i) => {
                      const pct = reportData.total_active > 0 
                        ? Math.round((cls.count / reportData.total_active) * 100) 
                        : 0
                      return (
                        <tr key={i}>
                          <td className="font-medium">{cls.name}</td>
                          <td className="capitalize">{cls.level || 'N/A'}</td>
                          <td>{cls.count}</td>
                          <td>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                <div className="bg-primary-600 h-2 rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-xs">{pct}%</span>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}

export default EnrollmentReport
