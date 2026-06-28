import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import reportsAPI from '../../api/reports'
import classesAPI from '../../api/classes'
import PageHeader from '../../components/common/PageHeader'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import FormSelect from '../../components/common/FormSelect'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import Badge from '../../components/common/Badge'
import { ArrowLeft, Download, ClipboardCheck, TrendingUp, TrendingDown } from 'lucide-react'
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
    report_type: 'overview',
  })

  const [reportData, setReportData] = useState(null)

  useEffect(() => {
    updatePageTitle('Attendance Report')
    updateBreadcrumbs([
      { label: 'Dashboard', path: '/dashboard' },
      { label: 'Reports', path: '/reports' },
      { label: 'Attendance' },
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
    setGenerated(false)
    
    try {
      const response = await reportsAPI.getAttendanceOverview({
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
        toast.error('Failed to generate report. No data available.')
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
    const total = Object.values(reportData.status_summary).reduce((s, c) => s + c, 0) || 1
    return Object.entries(reportData.status_summary).map(([status, count]) => ({
      status,
      count,
      percentage: Math.round((count / total) * 100),
    }))
  }

  // Format monthly breakdown for daily trend
  const formatDailyTrend = () => {
    if (!reportData?.monthly_breakdown) return []
    return Object.entries(reportData.monthly_breakdown).map(([date, data]) => ({
      date,
      rate: data.total > 0 ? Math.round(((data.present + data.late) / data.total) * 100) : 0,
      present: data.present || 0,
      absent: data.absent || 0,
      total: data.total || 0,
    }))
  }

  const statusData = formatStatusSummary()
  const dailyTrend = formatDailyTrend()

  return (
    <div className="space-y-6 max-w-4xl animate-fade-in-up">
      <PageHeader
        title="Attendance Report"
        actions={
          <button onClick={() => navigate('/reports')} className="btn btn-secondary">
            <ArrowLeft size={18} /> Back
          </button>
        }
      />

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <FormSelect 
            label="Report Type" 
            value={filters.report_type} 
            onChange={(e) => setFilters(prev => ({ ...prev, report_type: e.target.value }))}
            options={[
              { value: 'overview', label: 'Overview' },
              { value: 'by_class', label: 'By Class' },
              { value: 'chronic', label: 'Chronic Absentees' },
            ]} 
          />
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
        </div>
        <div className="flex gap-3 mt-4">
          <Button onClick={handleGenerate} variant="primary" loading={loading} icon={<ClipboardCheck size={18} />}>
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
          <ClipboardCheck size={48} className="text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Select filters and click "Generate Report" to view attendance data.</p>
        </div>
      )}

      {generated && reportData && (
        <div ref={reportRef} className="space-y-6">
          {/* Report Title */}
          <div className="hidden print:block text-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">Attendance Report</h2>
            <p className="text-sm text-gray-500">
              {filters.academic_year} • {filters.term} • {filters.report_type === 'overview' ? 'Overview' : filters.report_type === 'by_class' ? 'By Class' : 'Chronic Absentees'}
            </p>
            <hr className="mt-3 border-gray-300" />
          </div>

          {/* Overall Rate */}
          <Card>
            <div className="text-center mb-4">
              <p className="text-4xl font-bold text-primary-600">
                {reportData.attendance_rate || 0}%
              </p>
              <p className="text-sm text-gray-500">Overall Attendance Rate</p>
              <p className="text-xs text-gray-400 mt-1">
                {reportData.academic_year || filters.academic_year} • {reportData.term || filters.term} • {(reportData.total_records || 0).toLocaleString()} total records
              </p>
            </div>

            {/* Status Summary */}
            {statusData.length > 0 && (
              <div className="grid grid-cols-4 gap-3 text-center">
                {statusData.map((item) => (
                  <div key={item.status} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-xs text-gray-500 capitalize mb-1">{item.status}</p>
                    <p className="text-2xl font-bold text-primary-600">{item.percentage}%</p>
                    <p className="text-xs text-gray-500">{item.count.toLocaleString()} days</p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Monthly Trend */}
          {dailyTrend.length > 0 && (
            <Card title="Monthly Breakdown">
              <div className="space-y-3">
                {dailyTrend.map((day, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-24">{day.date}</span>
                    <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-6 overflow-hidden">
                      <div
                        className="bg-primary-600 h-full rounded-full flex items-center justify-end pr-2"
                        style={{ width: `${Math.min(day.rate, 100)}%` }}
                      >
                        {day.rate > 15 && (
                          <span className="text-xs text-white font-medium">{day.rate}%</span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-gray-500 w-16 text-right">{day.present}/{day.total}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Empty State for No Data */}
          {statusData.length === 0 && dailyTrend.length === 0 && (
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
