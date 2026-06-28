import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import reportsAPI from '../../api/reports'
import PageHeader from '../../components/common/PageHeader'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import { ArrowLeft, Download, FileText, GraduationCap, Users, ClipboardCheck, DollarSign, TrendingUp } from 'lucide-react'
import { exportToPDF } from '../../utils/exportPDF'
import toast from 'react-hot-toast'

function getCurrentAcademicYear() {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const startYear = month === 1 ? year - 1 : year
  return `${startYear}/${startYear + 1}`
}

const currentYear = getCurrentAcademicYear()

function AnnualReport() {
  const navigate = useNavigate()
  const reportRef = useRef(null)
  const { updatePageTitle, updateBreadcrumbs } = useApp()
  const [loading, setLoading] = useState(false)
  const [generated, setGenerated] = useState(false)
  const [reportData, setReportData] = useState(null)

  useEffect(() => {
    updatePageTitle('Annual School Report')
    updateBreadcrumbs([
      { label: 'Dashboard', path: '/dashboard' },
      { label: 'Reports', path: '/reports' },
      { label: 'Annual Report' },
    ])
  }, [])

  const handleGenerate = async () => {
    setLoading(true)
    setReportData(null)
    setGenerated(false)
    
    try {
      const response = await reportsAPI.getAnnualReport()
      
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
      console.error('Failed to generate annual report:', error)
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
    if (reportRef.current && reportData) {
      const year = (reportData.academic_year || currentYear).replace('/', '_')
      exportToPDF(reportRef.current, `Annual_Report_${year}`)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl animate-fade-in-up">
      <PageHeader
        title="Annual School Report"
        subtitle={`Comprehensive yearly report for ${currentYear}`}
        actions={
          <button onClick={() => navigate('/reports')} className="btn btn-secondary">
            <ArrowLeft size={18} /> Back
          </button>
        }
      />

      <Card>
        <div className="flex gap-3">
          <Button onClick={handleGenerate} variant="primary" loading={loading} icon={<FileText size={18} />}>
            Generate Annual Report
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
          <FileText size={48} className="text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Click "Generate Annual Report" to view the comprehensive yearly report.</p>
        </div>
      )}

      {generated && reportData && (
        <div ref={reportRef} className="space-y-6">
          {/* Report Title - visible in print only */}
          <div className="hidden print:block text-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">Annual School Report</h2>
            <p className="text-sm text-gray-500">
              {reportData.academic_year || currentYear} Academic Year
            </p>
            <hr className="mt-3 border-gray-300" />
          </div>

          {/* Header Card */}
          <Card title={`Annual Report - ${reportData.academic_year || currentYear}`}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Students', value: reportData.enrollment?.total_students || 0, icon: GraduationCap, color: 'text-blue-600' },
                { label: 'Teachers', value: reportData.staff?.total_teachers || 0, icon: Users, color: 'text-green-600' },
                { label: 'Attendance Rate', value: `${reportData.attendance?.attendance_rate || 0}%`, icon: ClipboardCheck, color: 'text-purple-600' },
                { label: 'Balance', value: `SSP ${(reportData.financial?.balance || 0).toLocaleString()}`, icon: DollarSign, color: 'text-orange-600' },
              ].map((stat, i) => (
                <div key={i} className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <stat.icon size={20} className={`mx-auto mb-2 ${stat.color}`} />
                  <p className="text-2xl font-bold text-primary-600">{stat.value}</p>
                  <p className="text-xs text-gray-500">{stat.label}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Enrollment Section */}
          <Card title="Enrollment" icon={<GraduationCap size={20} />}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-xl font-bold text-primary-600">{reportData.enrollment?.total_students || 0}</p>
                <p className="text-xs text-gray-500">Total Students</p>
              </div>
              <div>
                <p className="text-xl font-bold text-green-600">{reportData.enrollment?.new_enrollments || 0}</p>
                <p className="text-xs text-gray-500">New Enrollments</p>
              </div>
              <div>
                <p className="text-xl font-bold text-blue-600">{reportData.enrollment?.total_classes || 0}</p>
                <p className="text-xs text-gray-500">Classes</p>
              </div>
              <div>
                <p className="text-xl font-bold text-purple-600">{reportData.enrollment?.occupancy_rate || 0}%</p>
                <p className="text-xs text-gray-500">Occupancy Rate</p>
              </div>
            </div>
          </Card>

          {/* Staff Section */}
          <Card title="Staff" icon={<Users size={20} />}>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xl font-bold text-primary-600">{reportData.staff?.total_teachers || 0}</p>
                <p className="text-xs text-gray-500">Teachers</p>
              </div>
              <div>
                <p className="text-xl font-bold text-green-600">{reportData.staff?.total_staff || 0}</p>
                <p className="text-xs text-gray-500">Total Staff</p>
              </div>
              <div>
                <p className="text-xl font-bold text-blue-600">{reportData.staff?.student_teacher_ratio || 'N/A'}</p>
                <p className="text-xs text-gray-500">Student:Teacher Ratio</p>
              </div>
            </div>
          </Card>

          {/* Attendance Section */}
          <Card title="Attendance" icon={<ClipboardCheck size={20} />}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-xl font-bold text-primary-600">{reportData.attendance?.total_records || 0}</p>
                <p className="text-xs text-gray-500">Total Records</p>
              </div>
              <div>
                <p className="text-xl font-bold text-green-600">{reportData.attendance?.present_count || 0}</p>
                <p className="text-xs text-gray-500">Present</p>
              </div>
              <div>
                <p className="text-xl font-bold text-red-600">{(reportData.attendance?.total_records || 0) - (reportData.attendance?.present_count || 0)}</p>
                <p className="text-xs text-gray-500">Absent</p>
              </div>
              <div>
                <p className="text-xl font-bold text-purple-600">{reportData.attendance?.attendance_rate || 0}%</p>
                <p className="text-xs text-gray-500">Attendance Rate</p>
              </div>
            </div>
          </Card>

          {/* Financial Section */}
          <Card title="Financial" icon={<DollarSign size={20} />}>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xl font-bold text-green-600">SSP {(reportData.financial?.total_income || 0).toLocaleString()}</p>
                <p className="text-xs text-gray-500">Total Income</p>
              </div>
              <div>
                <p className="text-xl font-bold text-red-600">SSP {(reportData.financial?.total_expenses || 0).toLocaleString()}</p>
                <p className="text-xs text-gray-500">Total Expenses</p>
              </div>
              <div>
                <p className={`text-xl font-bold ${(reportData.financial?.balance || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  SSP {(reportData.financial?.balance || 0).toLocaleString()}
                </p>
                <p className="text-xs text-gray-500">Balance</p>
              </div>
            </div>
          </Card>

          {/* Generated Info */}
          <Card>
            <div className="text-center text-sm text-gray-500">
              <p>Report generated on {reportData.generated_at ? new Date(reportData.generated_at).toLocaleString() : new Date().toLocaleString()}</p>
              <p>Academic Year: {reportData.academic_year || currentYear} • Term: {reportData.current_term || 'N/A'}</p>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

export default AnnualReport
