import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import examsAPI from '../../api/exams'
import studentsAPI from '../../api/students'
import PageHeader from '../../components/common/PageHeader'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import FormSelect from '../../components/common/FormSelect'
import Badge from '../../components/common/Badge'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import EmptyState from '../../components/common/EmptyState'
import { ArrowLeft, Download, Printer, GraduationCap, CheckCircle, XCircle } from 'lucide-react'
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

function ReportCard() {
  const navigate = useNavigate()
  const reportRef = useRef(null)
  const { updatePageTitle, updateBreadcrumbs } = useApp()
  const [loading, setLoading] = useState(false)
  const [generated, setGenerated] = useState(false)
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [students, setStudents] = useState([])
  
  const [filters, setFilters] = useState({
    student_id: '',
    academic_year: currentYear,
    term: currentTerm,
  })
  
  const [reportCard, setReportCard] = useState(null)

  useEffect(() => {
    updatePageTitle('Report Cards')
    updateBreadcrumbs([
      { label: 'Dashboard', path: '/dashboard' },
      { label: 'Exams', path: '/exams' },
      { label: 'Report Cards' },
    ])
    fetchStudents()
  }, [])

  const fetchStudents = async () => {
    setLoadingStudents(true)
    try {
      const response = await studentsAPI.getAll({ status: 'active', limit: 200 })
      console.log('Students API response:', response)

      let studentList = []

      if (response?.data?.students) {
        studentList = response.data.students
      } else if (response?.data?.data) {
        studentList = response.data.data
      } else if (Array.isArray(response?.data)) {
        studentList = response.data
      } else if (response?.students) {
        studentList = response.students
      } else if (Array.isArray(response)) {
        studentList = response
      } else if (response?.data && typeof response.data === 'object') {
        const data = response.data
        if (Array.isArray(data.students)) studentList = data.students
        else if (Array.isArray(data.data)) studentList = data.data
        else if (Array.isArray(data)) studentList = data
      }

      if (Array.isArray(studentList) && studentList.length > 0) {
        console.log('Students loaded:', studentList.length)
        setStudents(studentList)
      } else {
        console.warn('No students found')
        setStudents([])
      }
    } catch (error) {
      console.error('Failed to fetch students:', error)
      setStudents([])
    } finally {
      setLoadingStudents(false)
    }
  }

  const handleGenerate = async () => {
    if (!filters.student_id) {
      toast.error('Please select a student')
      return
    }

    setLoading(true)
    setReportCard(null)
    setGenerated(false)

    try {
      const response = await examsAPI.generateReportCard({
        student_id: filters.student_id,
        academic_year: filters.academic_year,
        term: filters.term,
      })

      console.log('Report card response:', response)

      if (response?.success && response.data) {
        // Transform API data to match display format
        const data = response.data
        setReportCard({
          student: {
            name: data.student_name || 'Unknown',
            id_number: data.student_id || '',
            gender: data.gender || 'N/A',
          },
          class: {
            name: data.class_name || 'N/A',
            academic_year: data.academic_year || filters.academic_year,
            term: data.term || filters.term,
          },
          subjects: (data.results || data.subjects || []).map(s => ({
            subject_name: s.subject || s.subject_name || 'Unknown',
            total_score: s.score || 0,
            total_max: s.max_score || 100,
            average_percentage: s.percentage || s.average_percentage || 0,
            grade: s.grade || 'N/A',
          })),
          overall: {
            total_score: data.total_score || 0,
            total_max: data.total_max || 0,
            percentage: data.average_percentage || 0,
            grade: data.grade || 'N/A',
          },
          attendance: data.attendance ? {
            rate: data.attendance.attendance_rate || 0,
            present: data.attendance.present_days || 0,
            total: data.attendance.total_days || 0,
          } : null,
          class_teacher_remarks: data.class_teacher_remarks || '',
          head_teacher_remarks: data.head_teacher_remarks || '',
        })
        setGenerated(true)
      } else if (response?.data) {
        const data = response.data
        setReportCard({
          student: {
            name: data.student_name || 'Unknown',
            id_number: data.student_id || '',
            gender: data.gender || 'N/A',
          },
          class: {
            name: data.class_name || 'N/A',
            academic_year: data.academic_year || filters.academic_year,
            term: data.term || filters.term,
          },
          subjects: (data.results || data.subjects || []).map(s => ({
            subject_name: s.subject || s.subject_name || 'Unknown',
            total_score: s.score || 0,
            total_max: s.max_score || 100,
            average_percentage: s.percentage || s.average_percentage || 0,
            grade: s.grade || 'N/A',
          })),
          overall: {
            total_score: data.total_score || 0,
            total_max: data.total_max || 0,
            percentage: data.average_percentage || 0,
            grade: data.grade || 'N/A',
          },
          attendance: data.attendance ? {
            rate: data.attendance.attendance_rate || 0,
            present: data.attendance.present_days || 0,
            total: data.attendance.total_days || 0,
          } : null,
          class_teacher_remarks: data.class_teacher_remarks || '',
          head_teacher_remarks: data.head_teacher_remarks || '',
        })
        setGenerated(true)
      } else {
        toast.error('Failed to generate report card. No data available.')
      }
    } catch (error) {
      console.error('Failed to generate report card:', error)
      if (error.status === 0) {
        toast.error('Server is starting up. Please try again in 30 seconds.')
      } else {
        toast.error(error.message || 'Failed to generate report card')
      }
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const handleDownloadPDF = () => {
    if (reportRef.current && reportCard) {
      const name = (reportCard.student?.name || 'Student').replace(/\s+/g, '_')
      const term = (reportCard.class?.term || 'Term').replace(/\s+/g, '_')
      exportToPDF(reportRef.current, `Report_Card_${name}_${term}`)
    }
  }

  const getGradeBadge = (grade) => {
    const variants = { A: 'success', B: 'info', C: 'warning', D: 'warning', F: 'danger' }
    return <Badge variant={variants[grade] || 'gray'}>{grade || 'N/A'}</Badge>
  }

  const studentOptions = [
    { value: '', label: loadingStudents ? 'Loading students...' : `-- Select Student (${students.length} available) --` },
    ...students.map(s => ({
      value: s._id || s.id || s.student_id || '',
      label: `${s.first_name || ''} ${s.last_name || ''}`.trim() || s.email || `Student ${s.student_id_number || ''}`,
    })).filter(opt => opt.value),
  ]

  return (
    <div className="space-y-6 max-w-4xl animate-fade-in-up">
      <PageHeader
        title="Student Report Card"
        subtitle={`Generate and print student report cards • ${currentYear}`}
        actions={
          <button onClick={() => navigate('/exams')} className="btn btn-secondary">
            <ArrowLeft size={18} /> Back
          </button>
        }
      />

      <Card>
        <div className="flex flex-col sm:flex-row items-end gap-4">
          <div className="flex-1 w-full">
            <FormSelect
              label="Student"
              name="student_id"
              value={filters.student_id}
              onChange={(e) => setFilters(prev => ({ ...prev, student_id: e.target.value }))}
              options={studentOptions}
              disabled={loadingStudents}
            />
            {students.length === 0 && !loadingStudents && (
              <p className="text-xs text-yellow-600 mt-1">No students found. Please enroll students first.</p>
            )}
          </div>
          <FormSelect
            label="Term"
            value={filters.term}
            onChange={(e) => setFilters(prev => ({ ...prev, term: e.target.value }))}
            options={TERM_OPTIONS}
          />
          <FormSelect
            label="Academic Year"
            value={filters.academic_year}
            onChange={(e) => setFilters(prev => ({ ...prev, academic_year: e.target.value }))}
            options={ACADEMIC_YEAR_OPTIONS}
          />
          <Button
            onClick={handleGenerate}
            variant="primary"
            loading={loading}
            icon={<GraduationCap size={18} />}
            disabled={!filters.student_id}
          >
            Generate
          </Button>
        </div>
      </Card>

      {loading && <LoadingSpinner />}

      {!loading && !generated && (
        <EmptyState
          icon={<GraduationCap size={48} />}
          title="Generate Report Card"
          description="Select a student, term, and academic year to generate their report card."
        />
      )}

      {generated && reportCard && (
        <div ref={reportRef} className="space-y-6 print:space-y-4">
          {/* Report Card Header */}
          <Card className="print:shadow-none print:border">
            <div className="text-center border-b border-gray-200 dark:border-gray-700 pb-4 mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Heavenly Nature Nursery & Primary School
              </h2>
              <p className="text-sm text-gray-500">Nurturing Right Leaders</p>
              <h3 className="text-lg font-semibold mt-2">Student Report Card</h3>
              <p className="text-sm text-gray-500">
                {reportCard.class?.academic_year} • {reportCard.class?.term}
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div>
                <span className="text-gray-500">Name:</span>{' '}
                <span className="font-medium">{reportCard.student?.name || 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-500">ID:</span>{' '}
                <span className="font-medium">{reportCard.student?.id_number || 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-500">Class:</span>{' '}
                <span className="font-medium">{reportCard.class?.name || 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-500">Gender:</span>{' '}
                <span className="font-medium">{reportCard.student?.gender || 'N/A'}</span>
              </div>
            </div>
          </Card>

          {/* Subject Grades */}
          <Card className="print:shadow-none print:border">
            {(reportCard.subjects || []).length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No exam results available for this student.</p>
                <p className="text-sm">Enter exam results to see subject grades.</p>
              </div>
            ) : (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Subject</th>
                      <th className="text-center">Score</th>
                      <th className="text-center">Average</th>
                      <th className="text-center">Grade</th>
                      <th className="text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(reportCard.subjects || []).map((subject, i) => (
                      <tr key={i}>
                        <td className="font-medium">{subject.subject_name}</td>
                        <td className="text-center">
                          {subject.total_score}/{subject.total_max}
                        </td>
                        <td className="text-center font-semibold">
                          {subject.average_percentage}%
                        </td>
                        <td className="text-center">{getGradeBadge(subject.grade)}</td>
                        <td className="text-center">
                          {subject.average_percentage >= 50 ? (
                            <CheckCircle size={16} className="text-green-500 inline" />
                          ) : (
                            <XCircle size={16} className="text-red-500 inline" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {reportCard.overall && reportCard.overall.total_max > 0 && (
                    <tfoot>
                      <tr className="bg-gray-50 dark:bg-gray-800 font-bold">
                        <td>Overall</td>
                        <td className="text-center">
                          {reportCard.overall.total_score}/{reportCard.overall.total_max}
                        </td>
                        <td className="text-center">{reportCard.overall.percentage}%</td>
                        <td className="text-center">{getGradeBadge(reportCard.overall.grade)}</td>
                        <td className="text-center">
                          {reportCard.overall.percentage >= 50 ? (
                            <CheckCircle size={16} className="text-green-500 inline" />
                          ) : (
                            <XCircle size={16} className="text-red-500 inline" />
                          )}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            )}
          </Card>

          {/* Attendance & Remarks */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:gap-4">
            {reportCard.attendance && (
              <Card className="print:shadow-none print:border">
                <h4 className="font-semibold mb-2">Attendance</h4>
                <div className="text-center">
                  <p className="text-3xl font-bold text-primary-600">
                    {reportCard.attendance.rate}%
                  </p>
                  <p className="text-sm text-gray-500">
                    {reportCard.attendance.present} of {reportCard.attendance.total} days present
                  </p>
                </div>
              </Card>
            )}
            <Card className="print:shadow-none print:border">
              <h4 className="font-semibold mb-2">Remarks</h4>
              <div className="space-y-3 text-sm">
                {reportCard.class_teacher_remarks ? (
                  <div>
                    <p className="text-gray-500">Class Teacher:</p>
                    <p className="italic">{reportCard.class_teacher_remarks}</p>
                  </div>
                ) : (
                  <p className="text-gray-400 italic">No remarks yet.</p>
                )}
                {reportCard.head_teacher_remarks ? (
                  <div>
                    <p className="text-gray-500">Head Teacher:</p>
                    <p className="italic">{reportCard.head_teacher_remarks}</p>
                  </div>
                ) : (
                  <p className="text-gray-400 italic">No remarks yet.</p>
                )}
              </div>
            </Card>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end no-print">
            <Button variant="secondary" icon={<Printer size={18} />} onClick={handlePrint}>
              Print
            </Button>
            <Button variant="primary" icon={<Download size={18} />} onClick={handleDownloadPDF}>
              Download PDF
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default ReportCard
