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
import { ArrowLeft, Download, Printer, GraduationCap, CheckCircle, XCircle, Calendar, FileText } from 'lucide-react'
import { exportToPDF } from '../../utils/exportPDF'
import { exportAnnualReportCard } from '../../utils/exportReportCard'
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
  const [reportType, setReportType] = useState('term') // 'term' or 'annual'
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [students, setStudents] = useState([])
  
  const [filters, setFilters] = useState({
    student_id: '',
    academic_year: currentYear,
    term: currentTerm,
  })
  
  const [reportCard, setReportCard] = useState(null)
  const [annualReport, setAnnualReport] = useState(null)

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
    setAnnualReport(null)
    setGenerated(false)

    try {
      if (reportType === 'annual') {
        // Generate annual report card
        const response = await examsAPI.generateAnnualReportCard({
          student_id: filters.student_id,
          academic_year: filters.academic_year,
        })

        console.log('Annual report card response:', response)

        if (response?.success && response.data) {
          const data = response.data
          setAnnualReport({
            student: data.student,
            term1: data.term1,
            term2: data.term2,
            term3: data.term3,
            academic_year: data.academic_year,
            school: data.school,
          })
          setGenerated(true)
        } else if (response?.data) {
          const data = response.data
          setAnnualReport({
            student: data.student,
            term1: data.term1,
            term2: data.term2,
            term3: data.term3,
            academic_year: data.academic_year,
            school: data.school,
          })
          setGenerated(true)
        } else {
          toast.error('Failed to generate annual report card')
        }
      } else {
        // Generate single-term report card
        const response = await examsAPI.generateReportCard({
          student_id: filters.student_id,
          academic_year: filters.academic_year,
          term: filters.term,
        })

        console.log('Report card response:', response)

        if (response?.success && response.data) {
          const data = response.data
          setReportCard({
            student: data.student || {
              name: data.student_name || 'Unknown',
              student_id: data.student_id || '',
            },
            results: data.results || {
              subjects: (data.subjects || []).map(s => ({
                name: s.subject || s.subject_name || 'Unknown',
                score: s.score || 0,
                max_score: s.max_score || 100,
                percentage: s.percentage || s.average_percentage || 0,
                grade: s.grade || 'N/A',
              })),
              total_score: data.total_score || 0,
              total_max: data.total_max || 0,
              percentage: data.average_percentage || 0,
              grade: data.grade || 'N/A',
              position: data.position || 'N/A',
              out_of: data.out_of || 'N/A',
              result: data.result || 'N/A',
              remarks: data.remarks || '',
              conduct: data.conduct || 'Good',
            },
            term: data.term || filters.term,
            academic_year: data.academic_year || filters.academic_year,
            attendance: data.attendance || null,
            school: data.school || {},
          })
          setGenerated(true)
        } else if (response?.data) {
          const data = response.data
          setReportCard({
            student: data.student || {
              name: data.student_name || 'Unknown',
              student_id: data.student_id || '',
            },
            results: data.results || {
              subjects: (data.subjects || []).map(s => ({
                name: s.subject || s.subject_name || 'Unknown',
                score: s.score || 0,
                max_score: s.max_score || 100,
                percentage: s.percentage || s.average_percentage || 0,
                grade: s.grade || 'N/A',
              })),
              total_score: data.total_score || 0,
              total_max: data.total_max || 0,
              percentage: data.average_percentage || 0,
              grade: data.grade || 'N/A',
              position: data.position || 'N/A',
              out_of: data.out_of || 'N/A',
              result: data.result || 'N/A',
              remarks: data.remarks || '',
              conduct: data.conduct || 'Good',
            },
            term: data.term || filters.term,
            academic_year: data.academic_year || filters.academic_year,
            attendance: data.attendance || null,
            school: data.school || {},
          })
          setGenerated(true)
        } else {
          toast.error('Failed to generate report card')
        }
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
      const term = (reportCard.term || 'Term').replace(/\s+/g, '_')
      exportToPDF(reportRef.current, `Report_Card_${name}_${term}`)
    }
  }

  const handlePrintAnnual = () => {
    if (annualReport) {
      exportAnnualReportCard({
        student: annualReport.student,
        term1: annualReport.term1,
        term2: annualReport.term2,
        term3: annualReport.term3,
        academic_year: annualReport.academic_year,
        school: annualReport.school,
      })
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
        title="Student Report Cards"
        subtitle={`Generate and print report cards • ${currentYear}`}
        actions={
          <button onClick={() => navigate('/exams')} className="btn btn-secondary">
            <ArrowLeft size={18} /> Back
          </button>
        }
      />

      {/* Report Type Selector */}
      <Card>
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => { setReportType('term'); setGenerated(false); setReportCard(null); setAnnualReport(null) }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              reportType === 'term' ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600'
            }`}
          >
            <FileText size={16} className="inline mr-1" /> Single Term
          </button>
          <button
            onClick={() => { setReportType('annual'); setGenerated(false); setReportCard(null); setAnnualReport(null) }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              reportType === 'annual' ? 'bg-green-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600'
            }`}
          >
            <Calendar size={16} className="inline mr-1" /> Annual Report
          </button>
        </div>

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
          {reportType === 'term' && (
            <FormSelect
              label="Term"
              value={filters.term}
              onChange={(e) => setFilters(prev => ({ ...prev, term: e.target.value }))}
              options={TERM_OPTIONS}
            />
          )}
          <FormSelect
            label="Academic Year"
            value={filters.academic_year}
            onChange={(e) => setFilters(prev => ({ ...prev, academic_year: e.target.value }))}
            options={ACADEMIC_YEAR_OPTIONS}
          />
          <Button
            onClick={handleGenerate}
            variant={reportType === 'annual' ? 'primary' : 'primary'}
            loading={loading}
            icon={<GraduationCap size={18} />}
            disabled={!filters.student_id}
            style={reportType === 'annual' ? { background: '#059669' } : {}}
          >
            {reportType === 'annual' ? 'Generate Annual' : 'Generate'}
          </Button>
        </div>
      </Card>

      {loading && <LoadingSpinner />}

      {!loading && !generated && (
        <EmptyState
          icon={<GraduationCap size={48} />}
          title="Generate Report Card"
          description={`Select a student${reportType === 'term' ? ', term,' : ''} and academic year to generate their report card.`}
        />
      )}

      {/* Single Term Report Card */}
      {generated && reportCard && reportType === 'term' && (
        <div ref={reportRef} className="space-y-6 print:space-y-4">
          {/* Report Card Header with Letterhead */}
          <Card className="print:shadow-none print:border">
            <div className="text-center border-b border-gray-200 dark:border-gray-700 pb-4 mb-4">
              <img 
                src="/letter-head.jpg" 
                alt="School Letterhead" 
                className="max-w-full h-auto mx-auto mb-2"
                style={{ maxHeight: '80px' }}
                onError={(e) => { e.target.style.display = 'none' }}
              />
              <h3 className="text-lg font-semibold mt-2">ACADEMIC REPORT CARD</h3>
              <p className="text-sm text-gray-500">
                {reportCard.academic_year} • {reportCard.term}
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div>
                <span className="text-gray-500">Name:</span>{' '}
                <span className="font-medium">{reportCard.student?.name || 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-500">Pupil's ID:</span>{' '}
                <span className="font-medium">{reportCard.student?.student_id || 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-500">Class:</span>{' '}
                <span className="font-medium">{reportCard.student?.class_name || 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-500">Conduct:</span>{' '}
                <span className="font-medium">{reportCard.results?.conduct || 'Good'}</span>
              </div>
            </div>
          </Card>

          {/* Subject Grades */}
          <Card className="print:shadow-none print:border">
            {(reportCard.results?.subjects || []).length === 0 ? (
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
                      <th className="text-center">Percentage</th>
                      <th className="text-center">Grade</th>
                      <th className="text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(reportCard.results?.subjects || []).map((subject, i) => (
                      <tr key={i}>
                        <td className="font-medium">{subject.name}</td>
                        <td className="text-center">
                          {subject.score}/{subject.max_score}
                        </td>
                        <td className="text-center font-semibold">
                          {subject.percentage}%
                        </td>
                        <td className="text-center">{getGradeBadge(subject.grade)}</td>
                        <td className="text-center">
                          {subject.percentage >= 50 ? (
                            <CheckCircle size={16} className="text-green-500 inline" />
                          ) : (
                            <XCircle size={16} className="text-red-500 inline" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 dark:bg-gray-800 font-bold">
                      <td>TOTAL</td>
                      <td className="text-center">
                        {reportCard.results?.total_score}/{reportCard.results?.total_max}
                      </td>
                      <td className="text-center">{reportCard.results?.percentage}%</td>
                      <td className="text-center">{getGradeBadge(reportCard.results?.grade)}</td>
                      <td className="text-center">
                        {reportCard.results?.percentage >= 50 ? (
                          <CheckCircle size={16} className="text-green-500 inline" />
                        ) : (
                          <XCircle size={16} className="text-red-500 inline" />
                        )}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </Card>

          {/* Summary & Remarks */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:gap-4">
            <Card className="print:shadow-none print:border">
              <h4 className="font-semibold mb-3">Summary</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Percentage:</span>
                  <span className="font-bold">{reportCard.results?.percentage}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Position in Class:</span>
                  <span className="font-bold">{reportCard.results?.position || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Out of:</span>
                  <span className="font-bold">{reportCard.results?.out_of || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Result:</span>
                  <span className="font-bold">{reportCard.results?.result || 'N/A'}</span>
                </div>
              </div>
            </Card>
            <Card className="print:shadow-none print:border">
              <h4 className="font-semibold mb-2">Remarks</h4>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-gray-500 font-medium">Director of Studies:</p>
                  <p className="italic">{reportCard.results?.remarks || 'No remarks yet.'}</p>
                </div>
                {reportCard.attendance && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-gray-500 font-medium">Attendance:</p>
                    <p className="font-bold text-primary-600">{reportCard.attendance.attendance_rate}%</p>
                    <p className="text-xs">{reportCard.attendance.present_days} of {reportCard.attendance.total_days} days</p>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Signatures */}
          <Card className="print:shadow-none print:border">
            <div className="flex justify-between text-sm text-center pt-4">
              <div className="w-2/5">
                <div className="border-b border-black mb-1 h-8">&nbsp;</div>
                <p className="font-medium">Director of Studies</p>
              </div>
              <div className="w-2/5">
                <div className="border-b border-black mb-1 h-8">&nbsp;</div>
                <p className="font-medium">Head Teacher</p>
              </div>
            </div>
            <p className="text-xs text-center text-gray-500 mt-4">
              Next Academic Year will Commence on: January {String(parseInt(reportCard.academic_year?.split('/')[1] || '2027'))}
            </p>
          </Card>

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

      {/* Annual Report Card */}
      {generated && annualReport && reportType === 'annual' && (
        <div ref={reportRef} className="space-y-6 print:space-y-4">
          <Card className="print:shadow-none print:border">
            <div className="text-center border-b border-gray-200 dark:border-gray-700 pb-4 mb-4">
              <img 
                src="/letter-head.jpg" 
                alt="School Letterhead" 
                className="max-w-full h-auto mx-auto mb-2"
                style={{ maxHeight: '80px' }}
                onError={(e) => { e.target.style.display = 'none' }}
              />
              <h3 className="text-xl font-bold mt-2">ANNUAL ACADEMIC REPORT CARD</h3>
              <p className="text-sm text-gray-500">{annualReport.academic_year}</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div>
                <span className="text-gray-500">Name:</span>{' '}
                <span className="font-medium">{annualReport.student?.name || 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-500">Pupil's ID:</span>{' '}
                <span className="font-medium">{annualReport.student?.student_id || 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-500">Class:</span>{' '}
                <span className="font-medium">{annualReport.student?.class_name || 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-500">Conduct:</span>{' '}
                <span className="font-medium">{annualReport.student?.conduct || 'Good'}</span>
              </div>
            </div>
          </Card>

          {/* Annual Subject Table - 3 Terms in columns */}
          <Card className="print:shadow-none print:border overflow-x-auto">
            <div className="table-container">
              <table className="table text-xs">
                <thead>
                  <tr>
                    <th>SUBJECTS</th>
                    <th className="text-center">TERM I<br/>Score</th>
                    <th className="text-center">Grade</th>
                    <th className="text-center">TERM II<br/>Score</th>
                    <th className="text-center">Grade</th>
                    <th className="text-center">TERM III<br/>Score</th>
                    <th className="text-center">Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {getAllAnnualSubjects(annualReport).map((subject, i) => {
                    const t1 = annualReport.term1?.subjects?.find(s => s.name === subject) || {}
                    const t2 = annualReport.term2?.subjects?.find(s => s.name === subject) || {}
                    const t3 = annualReport.term3?.subjects?.find(s => s.name === subject) || {}
                    return (
                      <tr key={i}>
                        <td className="font-medium">{subject}</td>
                        <td className="text-center">{t1.score || '-'}</td>
                        <td className="text-center">{t1.grade ? getGradeBadge(t1.grade) : '-'}</td>
                        <td className="text-center">{t2.score || '-'}</td>
                        <td className="text-center">{t2.grade ? getGradeBadge(t2.grade) : '-'}</td>
                        <td className="text-center">{t3.score || '-'}</td>
                        <td className="text-center">{t3.grade ? getGradeBadge(t3.grade) : '-'}</td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 dark:bg-gray-800 font-bold">
                    <td>TOTAL</td>
                    <td className="text-center" colSpan={2}>
                      {annualReport.term1 ? `${annualReport.term1.total_score}/${annualReport.term1.total_max}` : '-'}
                    </td>
                    <td className="text-center" colSpan={2}>
                      {annualReport.term2 ? `${annualReport.term2.total_score}/${annualReport.term2.total_max}` : '-'}
                    </td>
                    <td className="text-center" colSpan={2}>
                      {annualReport.term3 ? `${annualReport.term3.total_score}/${annualReport.term3.total_max}` : '-'}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>

          {/* Term Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {['term1', 'term2', 'term3'].map((termKey, idx) => {
              const term = annualReport[termKey]
              const termLabel = `Term ${idx + 1}`
              return (
                <Card key={termKey} className="print:shadow-none print:border">
                  <h4 className="font-semibold mb-2 text-sm">{termLabel}</h4>
                  {term ? (
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span>Percentage:</span>
                        <span className="font-bold">{term.percentage}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Position:</span>
                        <span>{term.position || 'N/A'}/{term.out_of || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Grade:</span>
                        <span>{getGradeBadge(term.grade)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Result:</span>
                        <span className={term.result === 'Pass' ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                          {term.result || 'N/A'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-400 text-xs">No data</p>
                  )}
                </Card>
              )
            })}
          </div>

          {/* Remarks & Signatures */}
          <Card className="print:shadow-none print:border">
            <div className="mb-4">
              <h4 className="font-semibold text-sm">Director of Studies' Remarks:</h4>
              <p className="text-sm italic">
                {annualReport.term3?.remarks || annualReport.term2?.remarks || annualReport.term1?.remarks || 'No remarks.'}
              </p>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              <strong>Next Academic Year Commences on:</strong> January {String(parseInt(annualReport.academic_year?.split('/')[1] || '2027'))}
            </p>
            <div className="flex justify-between text-sm text-center pt-4 border-t">
              <div className="w-1/4">
                <div className="border-b border-black mb-1 h-8">&nbsp;</div>
                <p className="font-medium">Director of Studies</p>
              </div>
              <div className="w-1/4">
                <div className="border-b border-black mb-1 h-8">&nbsp;</div>
                <p className="font-medium">Head Teacher</p>
              </div>
              <div className="w-1/4">
                <div className="border-b border-black mb-1 h-8">&nbsp;</div>
                <p className="font-medium">Parent/Guardian</p>
              </div>
            </div>
          </Card>

          {/* Actions */}
          <div className="flex gap-3 justify-end no-print">
            <Button variant="secondary" icon={<Printer size={18} />} onClick={handlePrint}>
              Print
            </Button>
            <Button 
              variant="primary" 
              icon={<Download size={18} />} 
              onClick={handlePrintAnnual}
              style={{ background: '#059669' }}
            >
              Print Annual (Landscape)
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Get all unique subjects across all 3 terms
 */
function getAllAnnualSubjects(annualReport) {
  const subjects = new Set()
  ;['term1', 'term2', 'term3'].forEach(termKey => {
    const term = annualReport[termKey]
    if (term?.subjects) {
      term.subjects.forEach(s => {
        if (s.name) subjects.add(s.name)
      })
    }
  })
  return Array.from(subjects)
}

export default ReportCard
