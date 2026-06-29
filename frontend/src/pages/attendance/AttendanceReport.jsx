import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import attendanceAPI from '../../api/attendance'
import classesAPI from '../../api/classes'
import PageHeader from '../../components/common/PageHeader'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import FormSelect from '../../components/common/FormSelect'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import Badge from '../../components/common/Badge'
import { 
  ArrowLeft, Download, ClipboardCheck, CheckCircle, 
  XCircle, AlertTriangle, Clock, TrendingUp 
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { exportToPDF } from '../../utils/exportPDF'
import toast from 'react-hot-toast'

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

function AttendanceReport() {
  const navigate = useNavigate()
  const reportRef = useRef(null)
  const { updatePageTitle, updateBreadcrumbs } = useApp()
  const [loading, setLoading] = useState(false)
  const [generated, setGenerated] = useState(false)
  const [classOptions, setClassOptions] = useState([])
  const [loadingClasses, setLoadingClasses] = useState(false)

  const [filters, setFilters] = useState({
    class_id: '',
    academic_year: currentYear,
    term: currentTerm,
  })

  const [reportData, setReportData] = useState(null)

  useEffect(() => {
    updatePageTitle('Attendance Report')
    updateBreadcrumbs([
      { label: 'Dashboard', path: '/dashboard' },
      { label: 'Attendance', path: '/attendance' },
      { label: 'Report' },
    ])
    fetchClasses()
  }, [])

  const fetchClasses = async () => {
    setLoadingClasses(true)
    try {
      const response = await classesAPI.getAll({ status: 'active' })
      let classesArray = response?.data || response || []
      if (!Array.isArray(classesArray)) {
        classesArray = classesArray?.classes || classesArray?.data || []
      }
      const options = [{ value: '', label: 'All Classes' }]
      classesArray.forEach(c => {
        options.push({
          value: c._id || c.id || '',
          label: c.class_name || c.name || `${c.class_level || ''} ${c.class_name || ''}`.trim(),
        })
      })
      setClassOptions(options)
    } catch (error) {
      console.error('Failed to fetch classes:', error)
      setClassOptions([{ value: '', label: 'All Classes' }])
    } finally {
      setLoadingClasses(false)
    }
  }

  const handleGenerate = async () => {
    setLoading(true)
    setReportData(null)

    try {
      const response = await attendanceAPI.generateReport({
        class_id: filters.class_id || undefined,
        academic_year: filters.academic_year,
        term: filters.term,
      })

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
      console.error('Failed to generate attendance report:', error)
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
      exportToPDF(reportRef.current, `Attendance_Report_${year}_${term}`)
    }
  }

  // Format status summary for display
  const formatStatusSummary = () => {
    if (!reportData?.status_summary) return []
    const total = Object.values(reportData.status_summary).reduce((s, c) => s + (c?.count || c || 0), 0) || 1
    return Object.entries(reportData.status_summary).map(([status, data]) => {
      const count = typeof data === 'object' ? data.count : data
      return {
        status,
        count,
        percentage: Math.round((count / total) * 100),
      }
    })
  }

  const statusData = formatStatusSummary()

  return (
    <div className="space-y-6 max-w-5xl animate-fade-in-up">
      <PageHeader
        title="Attendance Report"
        subtitle={`Academic Year ${currentYear}`}
        actions={
          <button onClick={() => navigate('/attendance')} className="btn btn-secondary">
            <ArrowLeft size={18} /> Back
          </button>
        }
      />

      <Card>
        <div className="flex flex-col sm:flex-row items-end gap-4">
          <FormSelect
            label="Class"
            value={filters.class_id}
            onChange={(e) => setFilters(prev => ({ ...prev, class_id: e.target.value }))}
            options={classOptions}
            disabled={loadingClasses}
            placeholder={loadingClasses ? 'Loading...' : 'All Classes'}
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
          <Button onClick={handleGenerate} variant="primary" loading={loading} icon={<ClipboardCheck size={18} />}>
            Generate
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
          <ClipboardCheck size={48} className="text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Select filters and click "Generate" to view attendance report.</p>
        </div>
      )}

      {generated && reportData && (
        <div ref={reportRef} className="space-y-6">
          {/* Overall Rate */}
          <Card>
            <div className="text-center">
              <p className="text-5xl font-bold text-primary-600">
                {reportData.attendance_rate || reportData.overall_rate || 0}%
              </p>
              <p className="text-gray-500 mt-1">Overall Attendance Rate</p>
              <p className="text-xs text-gray-400">
                {filters.academic_year} • {filters.term} • {(reportData.total_records || 0).toLocaleString()} total records
              </p>
            </div>
            {statusData.length > 0 && (
              <div className="grid grid-cols-4 gap-3 mt-6">
                {[
                  { label: 'Present', icon: CheckCircle, color: 'text-green-600' },
                  { label: 'Absent', icon: XCircle, color: 'text-red-600' },
                  { label: 'Excused', icon: AlertTriangle, color: 'text-yellow-600' },
                  { label: 'Late', icon: Clock, color: 'text-blue-600' },
                ].map((stat) => {
                  const data = statusData.find(s => s.status === stat.label.toLowerCase()) || { percentage: 0, count: 0 }
                  return (
                    <div key={stat.label} className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <stat.icon size={20} className={`${stat.color} mx-auto mb-1`} />
                      <p className={`text-lg font-bold ${stat.color}`}>{data.percentage}%</p>
                      <p className="text-xs text-gray-500">{stat.label} ({data.count})</p>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>

          {/* Empty State */}
          {statusData.length === 0 && (
            <Card>
              <div className="text-center py-8 text-gray-500">
                <ClipboardCheck size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">No attendance data found for the selected period.</p>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}

export default AttendanceReport
