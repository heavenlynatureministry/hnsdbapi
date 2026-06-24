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
import { ArrowLeft, Download, BarChart3, GraduationCap, TrendingUp } from 'lucide-react'
import { exportToPDF } from '../../utils/exportPDF'
import toast from 'react-hot-toast'

function AcademicReport() {
  const navigate = useNavigate()
  const reportRef = useRef(null)
  const { updatePageTitle, updateBreadcrumbs } = useApp()
  const [loading, setLoading] = useState(false)
  const [generated, setGenerated] = useState(false)

  const [filters, setFilters] = useState({
    class_id: '',
    academic_year: '2024/2025',
    term: 'Term 1',
    report_type: 'class_performance',
  })

  const [reportData, setReportData] = useState(null)

  useEffect(() => {
    updatePageTitle('Academic Report')
    updateBreadcrumbs([
      { label: 'Dashboard', path: '/dashboard' },
      { label: 'Reports', path: '/reports' },
      { label: 'Academic' },
    ])
  }, [])

  const handleGenerate = async () => {
    setLoading(true)
    setReportData(null)
    setGenerated(false)
    
    try {
      const response = await reportsAPI.getOverview({
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
        toast.error('Failed to generate report. No data available.')
      }
    } catch (error) {
      console.error('Failed to generate academic report:', error)
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
      exportToPDF(reportRef.current, `Academic_Report_${filters.academic_year.replace('/', '_')}_${filters.term.replace(' ', '_')}`)
    }
  }

  const getGradeColor = (grade) => {
    const colors = { A: 'bg-green-500', B: 'bg-blue-500', C: 'bg-yellow-500', D: 'bg-orange-500', F: 'bg-red-500' }
    return colors[grade] || 'bg-gray-500'
  }

  return (
    <div className="space-y-6 max-w-4xl animate-fade-in-up">
      <PageHeader
        title="Academic Performance Report"
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
              { value: 'class_performance', label: 'Class Performance' },
              { value: 'student_performance', label: 'Student Performance' },
              { value: 'subject_analysis', label: 'Subject Analysis' },
            ]}
          />
          <FormSelect
            label="Class"
            value={filters.class_id}
            onChange={(e) => setFilters(prev => ({ ...prev, class_id: e.target.value }))}
            options={[
              { value: '', label: 'All Classes' },
              { value: 'p5', label: 'P5' },
              { value: 'p6', label: 'P6' },
            ]}
          />
          <FormSelect
            label="Academic Year"
            value={filters.academic_year}
            onChange={(e) => setFilters(prev => ({ ...prev, academic_year: e.target.value }))}
            options={[
              { value: '2024/2025', label: '2024/2025' },
              { value: '2023/2024', label: '2023/2024' },
            ]}
          />
          <FormSelect
            label="Term"
            value={filters.term}
            onChange={(e) => setFilters(prev => ({ ...prev, term: e.target.value }))}
            options={[
              { value: 'Term 1', label: 'Term 1' },
              { value: 'Term 2', label: 'Term 2' },
              { value: 'Term 3', label: 'Term 3' },
            ]}
          />
        </div>
        <div className="flex gap-3 mt-4">
          <Button onClick={handleGenerate} variant="primary" loading={loading} icon={<BarChart3 size={18} />}>
            Generate Report
          </Button>
          {generated && (
            <Button onClick={handleExportPDF} variant="secondary" icon={<Download size={18} />}>
              Export PDF
            </Button>
          )}
        </div>
      </Card>

      {/* Report Results */}
      {loading && <LoadingSpinner />}

      {!loading && !generated && (
        <div className="text-center py-12">
          <BarChart3 size={48} className="text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Select filters and click "Generate Report" to view academic data.</p>
        </div>
      )}

      {generated && reportData && (
        <div ref={reportRef} className="space-y-6">
          {/* Report Title - visible in print only */}
          <div className="hidden print:block text-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">Academic Performance Report</h2>
            <p className="text-sm text-gray-500">
              {reportData.class_name || 'All Classes'} • {filters.academic_year} • {filters.term}
            </p>
            <hr className="mt-3 border-gray-300" />
          </div>

          {/* Overview */}
          <Card>
            <div className="text-center mb-4">
              <h3 className="text-lg font-semibold">
                {reportData.class_name || 'All Classes'} ({reportData.class_level || 'All Levels'})
              </h3>
              <p className="text-sm text-gray-500">{filters.academic_year} - {filters.term}</p>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-3xl font-bold text-primary-600">{reportData.overall_pass_rate || 0}%</p>
                <p className="text-xs text-gray-500">Pass Rate</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-green-600">{reportData.class_average || 0}%</p>
                <p className="text-xs text-gray-500">Class Average</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-purple-600">{reportData.total_students || 0}</p>
                <p className="text-xs text-gray-500">Students</p>
              </div>
            </div>
          </Card>

          {/* Subject Breakdown */}
          {(reportData.subjects || []).length > 0 && (
            <Card title="Subject Performance">
              <div className="space-y-4">
                {reportData.subjects.map((subject, i) => (
                  <div key={i} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">{subject.subject_name}</h4>
                      <Badge variant={subject.pass_rate >= 80 ? 'success' : subject.pass_rate >= 60 ? 'warning' : 'danger'}>
                        {subject.pass_rate || 0}% Pass
                      </Badge>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-center text-sm mb-3">
                      <div><p className="font-bold">{subject.average_score || 0}%</p><p className="text-xs text-gray-500">Average</p></div>
                      <div><p className="font-bold text-green-600">{subject.highest || 0}%</p><p className="text-xs text-gray-500">Highest</p></div>
                      <div><p className="font-bold text-red-600">{subject.lowest || 0}%</p><p className="text-xs text-gray-500">Lowest</p></div>
                      <div><p className="font-bold">{subject.pass_rate || 0}%</p><p className="text-xs text-gray-500">Pass Rate</p></div>
                    </div>
                    {subject.grade_distribution && (
                      <>
                        <div className="flex gap-1 h-6 rounded-full overflow-hidden">
                          {Object.entries(subject.grade_distribution).map(([grade, count]) => (
                            <div
                              key={grade}
                              className={`${getGradeColor(grade)} flex items-center justify-center text-xs text-white font-medium`}
                              style={{ width: `${(count / (reportData.total_students || 1)) * 100}%` }}
                              title={`Grade ${grade}: ${count} students`}
                            >
                              {count > 2 && grade}
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-4 mt-2 text-xs text-gray-500">
                          {Object.entries(subject.grade_distribution).map(([grade, count]) => (
                            <span key={grade}>{grade}: {count}</span>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Top Students */}
          {(reportData.top_students || []).length > 0 && (
            <Card title="Top Performers">
              <div className="space-y-2">
                {reportData.top_students.map((student, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-600 font-bold text-sm">
                        {i + 1}
                      </span>
                      <span className="font-medium">{student.student_name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-primary-600">{student.overall_percentage || 0}%</span>
                      <Badge variant="success">{student.grade || 'N/A'}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}

export default AcademicReport
