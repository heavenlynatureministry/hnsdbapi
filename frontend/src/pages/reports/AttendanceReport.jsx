import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import PageHeader from '../../components/common/PageHeader'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import FormSelect from '../../components/common/FormSelect'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import Badge from '../../components/common/Badge'
import { ArrowLeft, Download, ClipboardCheck, TrendingUp, TrendingDown } from 'lucide-react'
import { exportToPDF } from '../../utils/exportPDF'

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
    updateBreadcrumbs([{ label: 'Dashboard', path: '/dashboard' }, { label: 'Reports', path: '/reports' }, { label: 'Attendance' }])
  }, [])

  const handleGenerate = async () => {
    setLoading(true)
    setTimeout(() => {
      setReportData({
        overall_rate: 88.5,
        total_records: 1250,
        status_summary: { present: { count: 980, percentage: 78.4 }, absent: { count: 150, percentage: 12 }, excused: { count: 75, percentage: 6 }, late: { count: 45, percentage: 3.6 } },
        daily_trend: [
          { date: '2024-01-15', rate: 92 }, { date: '2024-01-16', rate: 88 }, { date: '2024-01-17', rate: 85 },
          { date: '2024-01-18', rate: 90 }, { date: '2024-01-19', rate: 87 }, { date: '2024-01-22', rate: 91 },
          { date: '2024-01-23', rate: 86 }, { date: '2024-01-24', rate: 89 }, { date: '2024-01-25', rate: 93 },
          { date: '2024-01-26', rate: 84 },
        ],
        by_class: [
          { class_name: 'P3', rate: 92 }, { class_name: 'P4', rate: 88 }, { class_name: 'P5', rate: 85 },
          { class_name: 'P6', rate: 90 }, { class_name: 'P7', rate: 87 },
        ],
        chronic_absentees: [
          { student_name: 'John Smith', class_name: 'P5', rate: 65, days_missed: 18 },
          { student_name: 'Mary Jane', class_name: 'P6', rate: 70, days_missed: 15 },
        ],
      })
      setLoading(false)
      setGenerated(true)
    }, 1000)
  }

  const handleExportPDF = () => {
    exportToPDF(reportRef.current, `Attendance_Report_${filters.academic_year.replace('/', '_')}_${filters.term.replace(' ', '_')}`)
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

      {generated && reportData && (
        <div ref={reportRef} className="space-y-6">
          <Card>
            <div className="text-center mb-4">
              <p className="text-4xl font-bold text-primary-600">{reportData.overall_rate}%</p>
              <p className="text-sm text-gray-500">Overall Attendance Rate</p>
              <p className="text-xs text-gray-400 mt-1">{reportData.total_records.toLocaleString()} total records</p>
            </div>
            <div className="grid grid-cols-4 gap-3 text-center">
              {Object.entries(reportData.status_summary).map(([status, data]) => (
                <div key={status} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-lg font-bold capitalize">{status}</p>
                  <p className="text-2xl font-bold text-primary-600">{data.percentage}%</p>
                  <p className="text-xs text-gray-500">{data.count} days</p>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Daily Trend (Last 10 School Days)">
            <div className="flex items-end gap-1 h-32">
              {reportData.daily_trend.map((day, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs font-medium">{day.rate}%</span>
                  <div className="w-full bg-primary-600 rounded-t" style={{ height: `${day.rate}%` }} />
                  <span className="text-xs text-gray-500">{new Date(day.date).getDate()}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Chronic Absentees (Below 75%)">
            {reportData.chronic_absentees.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No chronic absentees found.</p>
            ) : (
              <div className="space-y-2">
                {reportData.chronic_absentees.map((student, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <div>
                      <p className="font-medium">{student.student_name}</p>
                      <p className="text-xs text-gray-500">{student.class_name} • {student.days_missed} days missed</p>
                    </div>
                    <Badge variant="danger">{student.rate}%</Badge>
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
