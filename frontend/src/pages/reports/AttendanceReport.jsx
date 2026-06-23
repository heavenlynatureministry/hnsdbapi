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
import { ArrowLeft, Download, ClipboardCheck, TrendingUp, TrendingDown } from 'lucide-react'
import { exportToPDF } from '../../utils/exportPDF'
import toast from 'react-hot-toast'

function AttendanceReport() {
  const navigate = useNavigate()
  const reportRef = useRef(null)
  const { updatePageTitle, updateBreadcrumbs } = useApp()
  const [loading, setLoading] = useState(false)
  const [generated, setGenerated] = useState(false)

  const [filters, setFilters] = useState({
    class_id: '',
    academic_year: '2024/2025',
    term: 'Term 1',
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
  }, [])

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
      exportToPDF(reportRef.current, `Attendance_Report_${filters.academic_year.replace('/', '_')}_${filters.term.replace(' ', '_')}`)
    }
  }

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

      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <FormSelect label="Report Type" value={filters.report_type} onChange={(e) => setFilters(prev => ({ ...prev, report_type: e.target.value }))}
            options={[{ value: 'overview', label: 'Overview' }, { value: 'by_class', label: 'By Class' }, { value: 'chronic', label: 'Chronic Absentees' }]} />
          <FormSelect label="Class" value={filters.class_id} onChange={(e) => setFilters(prev => ({ ...prev, class_id: e.target.value }))}
            options={[{ value: '', label: 'All Classes' }, { value: 'p5', label: 'P5' }]} />
          <FormSelect label="Academic Year" value={filters.academic_year} onChange={(e) => setFilters(prev => ({ ...prev, academic_year: e.target.value }))}
            options={[{ value: '2024/2025', label: '2024/2025' }]} />
          <FormSelect label="Term" value={filters.term} onChange={(e) => setFilters(prev => ({ ...prev, term: e.target.value }))}
            options={[{ value: 'Term 1', label: 'Term 1' }, { value: 'Term 2', label: 'Term 2' }]} />
        </div>
        <div className="flex gap-3 mt-4">
          <Button onClick={handleGenerate} variant="primary" loading={loading} icon={<ClipboardCheck size={18} />}>Generate Report</Button>
          {generated && <Button onClick={handleExportPDF} variant="secondary" icon={<Download size={18} />}>Export PDF</Button>}
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
          <Card>
            <div className="text-center mb-4">
              <p className="text-4xl font-bold text-primary-600">{reportData.attendance_rate || reportData.overall_rate || 0}%</p>
              <p className="text-sm text-gray-500">Overall Attendance Rate</p>
              <p className="text-xs text-gray-400 mt-1">{(reportData.total_records || 0).toLocaleString()} total records</p>
            </div>
            {reportData.status_summary && (
              <div className="grid grid-cols-4 gap-3 text-center">
                {Object.entries(reportData.status_summary).map(([status, data]) => (
                  <div key={status} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-lg font-bold capitalize">{status}</p>
                    <p className="text-2xl font-bold text-primary-600">{data.percentage || 0}%</p>
                    <p className="text-xs text-gray-500">{data.count || 0} days</p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {reportData.daily_trend && reportData.daily_trend.length > 0 && (
            <Card title="Daily Trend (Last 10 School Days)">
              <div className="flex items-end gap-1 h-32">
                {reportData.daily_trend.map((day, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-xs font-medium">{day.rate || 0}%</span>
                    <div className="w-full bg-primary-600 rounded-t" style={{ height: `${Math.min(day.rate || 0, 100)}%` }} />
                    <span className="text-xs text-gray-500">{day.date ? new Date(day.date).getDate() : '-'}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card title="Chronic Absentees (Below 75%)">
            {!reportData.chronic_absentees || reportData.chronic_absentees.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No chronic absentees found.</p>
            ) : (
              <div className="space-y-2">
                {reportData.chronic_absentees.map((student, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <div>
                      <p className="font-medium">{student.student_name}</p>
                      <p className="text-xs text-gray-500">{student.class_name} • {student.days_missed || 0} days missed</p>
                    </div>
                    <Badge variant="danger">{student.rate || 0}%</Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  )
}

export default AttendanceReport
