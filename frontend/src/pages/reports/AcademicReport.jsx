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
import { ArrowLeft, Download, BarChart3, GraduationCap, TrendingUp } from 'lucide-react'
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

function AcademicReport() {
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
      // Use the comprehensive annual report endpoint
      const response = await reportsAPI.getAnnualReport({
        academic_year: filters.academic_year,
      })
      
      if (response?.success && response.data) {
        const data = response.data
        // Transform data for display
        setReportData({
          class_name: filters.class_id ? 'Selected Class' : 'All Classes',
          class_level: 'All Levels',
          total_students: data.enrollment?.total_students || 0,
          overall_pass_rate: data.attendance?.attendance_rate || 0,
          class_average: data.enrollment?.occupancy_rate || 0,
          subjects: [],
          top_students: [],
          academic_summary: data,
        })
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
          {/* Report Title */}
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
                <p className="text-xs text-gray-500">Attendance Rate</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-green-600">{reportData.class_average || 0}%</p>
                <p className="text-xs text-gray-500">Occupancy Rate</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-purple-600">{reportData.total_students || 0}</p>
                <p className="text-xs text-gray-500">Students</p>
              </div>
            </div>
          </Card>

          {/* Academic Summary from Annual Report */}
          {reportData.academic_summary && (
            <Card title="Academic Year Summary">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-primary-600">{reportData.academic_summary.enrollment?.total_students || 0}</p>
                  <p className="text-xs text-gray-500">Total Students</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">{reportData.academic_summary.staff?.total_teachers || 0}</p>
                  <p className="text-xs text-gray-500">Teachers</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-600">{reportData.academic_summary.enrollment?.total_classes || 0}</p>
                  <p className="text-xs text-gray-500">Classes</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-purple-600">
                    {reportData.academic_summary.staff?.student_teacher_ratio || 'N/A'}
                  </p>
                  <p className="text-xs text-gray-500">Student:Teacher</p>
                </div>
              </div>
            </Card>
          )}

          {/* Empty State for Subjects */}
          {(reportData.subjects || []).length === 0 && (
            <Card>
              <div className="text-center py-8 text-gray-500">
                <GraduationCap size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">Subject performance data is not yet available.</p>
                <p className="text-xs">Enter exam results to see subject breakdowns.</p>
              </div>
            </Card>
          )}

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
        </div>
      )}
    </div>
  )
}

export default AcademicReport
