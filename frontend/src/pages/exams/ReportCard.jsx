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
import { 
  ArrowLeft, Download, Printer, GraduationCap, CheckCircle, XCircle, 
  Calendar, FileText, Shield, ExternalLink, Award, BookOpen, FileCheck 
} from 'lucide-react'
import { exportToPDF } from '../../utils/exportPDF'
import { exportReportCard, exportAnnualReportCard } from '../../utils/exportReportCard'
import { exportNurseryCertificate } from '../../utils/exportNurseryCertificate'
import { exportTestimonial } from '../../utils/exportTestimonial'
import { exportCertificate } from '../../utils/exportCertificate'
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
  const [reportType, setReportType] = useState('term') // 'term', 'annual', 'testimonial', 'certificate'
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [students, setStudents] = useState([])
  
  const [filters, setFilters] = useState({
    student_id: '',
    academic_year: currentYear,
    term: currentTerm,
  })
  
  const [reportCard, setReportCard] = useState(null)
  const [annualReport, setAnnualReport] = useState(null)
  const [testimonialData, setTestimonialData] = useState(null)
  const [certificateData, setCertificateData] = useState(null)
  const [graduationType, setGraduationType] = useState(null)

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
      let studentList = []
      if (response?.data?.students) studentList = response.data.students
      else if (response?.data?.data) studentList = response.data.data
      else if (Array.isArray(response?.data)) studentList = response.data
      else if (response?.students) studentList = response.students
      else if (Array.isArray(response)) studentList = response
      else if (response?.data && typeof response.data === 'object') {
        const data = response.data
        if (Array.isArray(data.students)) studentList = data.students
        else if (Array.isArray(data.data)) studentList = data.data
        else if (Array.isArray(data)) studentList = data
      }
      if (Array.isArray(studentList) && studentList.length > 0) {
        setStudents(studentList)
      } else {
        setStudents([])
      }
    } catch (error) {
      console.error('Failed to fetch students:', error)
      setStudents([])
    } finally {
      setLoadingStudents(false)
    }
  }

  const getSelectedStudent = () => {
    return students.find(s => (s._id || s.id) === filters.student_id)
  }

  const isEligibleForTestimonial = () => {
    const student = getSelectedStudent()
    if (!student) return false
    const className = (student.class_name || student.class || '').toLowerCase()
    return className.includes('p8') || className.includes('primary 8') || 
           className.includes('s4') || className.includes('senior 4')
  }

  const isEligibleForCertificate = () => {
    const student = getSelectedStudent()
    if (!student) return false
    const className = (student.class_name || student.class || '').toLowerCase()
    return className.includes('nursery') || className.includes('baby') || 
           className.includes('kindergarten') || className.includes('top')
  }

  const handleGenerate = async () => {
    if (!filters.student_id) {
      toast.error('Please select a student')
      return
    }
    setLoading(true)
    setReportCard(null)
    setAnnualReport(null)
    setTestimonialData(null)
    setCertificateData(null)
    setGenerated(false)
    setGraduationType(null)

    try {
      if (reportType === 'annual') {
        const response = await examsAPI.generateAnnualReportCard({
          student_id: filters.student_id,
          academic_year: filters.academic_year,
        })
        let resultData = null
        if (response?.data?.success && response?.data?.data) resultData = response.data.data
        else if (response?.data?.data) resultData = response.data.data
        else if (response?.success && response?.data) resultData = response.data
        else if (response?.data?.success) resultData = response.data
        else if (response?.data) resultData = response.data

        if (resultData && resultData.student) {
          setAnnualReport({
            student: resultData.student,
            term1: resultData.term1, term2: resultData.term2, term3: resultData.term3,
            annual_summary: resultData.annual_summary || null,
            academic_year: resultData.academic_year || filters.academic_year,
            school: resultData.school || {},
            verify_url: resultData.verify_url || '',
          })
          const gType = resultData.graduation_type || null
          setGraduationType(gType)
          setGenerated(true)
          if (gType === 'nursery') toast.success('Nursery Certificate generated!')
          else if (gType === 'primary_testimonial') toast.success('Primary Testimonial generated!')
          else if (gType === 'secondary_testimonial') toast.success('Secondary Testimonial generated!')
          else toast.success('Annual report generated successfully!')
        } else {
          toast.error('No data returned from server.')
        }
      } else if (reportType === 'testimonial') {
        // Fetch testimonial/exam entry data
        const response = await studentsAPI.getStudentExamEntry(filters.student_id)
        let resultData = null
        if (response?.data?.success && response?.data?.data) resultData = response.data.data
        else if (response?.data) resultData = response.data
        else if (response?.success && response?.data) resultData = response.data

        if (resultData) {
          const student = getSelectedStudent()
          setTestimonialData({
            student: {
              first_name: student?.first_name || resultData.student_name?.split(' ')[0] || '',
              last_name: student?.last_name || resultData.student_name?.split(' ').slice(1).join(' ') || '',
              class_name: student?.class_name || '',
              student_id: student?.student_id || '',
            },
            academic_year: resultData.academic_year || filters.academic_year,
            index_number: resultData.index_number || '',
            centre_number: resultData.centre_number || '',
            section: resultData.section || '',
            subjects: resultData.subjects || [],
            total_score: resultData.total_score || 0,
            percentage: resultData.percentage || 0,
            result: resultData.result || 'N/A',
            verify_url: resultData.verify_url || '',
          })
          setGenerated(true)
          toast.success('Testimonial loaded successfully!')
        } else {
          toast.error('No exam entry found. Please create a testimonial entry first.')
        }
      } else if (reportType === 'certificate') {
        // Fetch annual report for nursery certificate
        const response = await examsAPI.generateAnnualReportCard({
          student_id: filters.student_id,
          academic_year: filters.academic_year,
        })
        let resultData = null
        if (response?.data?.success && response?.data?.data) resultData = response.data.data
        else if (response?.data?.data) resultData = response.data.data
        else if (response?.success && response?.data) resultData = response.data
        else if (response?.data?.success) resultData = response.data
        else if (response?.data) resultData = response.data

        if (resultData && resultData.student) {
          setCertificateData({
            student: resultData.student,
            term1: resultData.term1,
            term2: resultData.term2,
            term3: resultData.term3,
            annual_summary: resultData.annual_summary || null,
            academic_year: resultData.academic_year || filters.academic_year,
            school: resultData.school || {},
            verify_url: resultData.verify_url || '',
          })
          setGenerated(true)
          toast.success('Certificate data loaded successfully!')
        } else {
          toast.error('No data returned from server.')
        }
      } else {
        // Single term report
        const response = await examsAPI.generateReportCard({
          student_id: filters.student_id,
          academic_year: filters.academic_year,
          term: filters.term,
        })
        let resultData = null
        if (response?.data?.success && response?.data?.data) resultData = response.data.data
        else if (response?.data?.data) resultData = response.data.data
        else if (response?.success && response?.data) resultData = response.data
        else if (response?.data?.success) resultData = response.data
        else if (response?.data) resultData = response.data

        if (resultData) {
          setReportCard({
            student: resultData.student || { 
              name: resultData.student_name || 'Unknown', 
              student_id: resultData.student_id || '', 
              class_name: resultData.class_name || '' 
            },
            results: resultData.results || {
              subjects: (resultData.subjects || []).map(s => ({ 
                name: s.subject || s.subject_name || s.name || 'Unknown', 
                score: s.score || 0, 
                max_score: s.max_score || 100, 
                percentage: s.percentage || s.average_percentage || 0, 
                grade: s.grade || 'N/A' 
              })),
              total_score: resultData.total_score || 0, 
              total_max: resultData.total_max || 0,
              percentage: resultData.average_percentage || resultData.percentage || 0, 
              grade: resultData.grade || 'N/A',
              position: resultData.position || 'N/A', 
              out_of: resultData.out_of || 'N/A',
              result: resultData.result || 'N/A', 
              remarks: resultData.remarks || '', 
              conduct: resultData.conduct || 'Good',
            },
            term: resultData.term || filters.term, 
            academic_year: resultData.academic_year || filters.academic_year,
            verify_url: resultData.verify_url || '', 
            attendance: resultData.attendance || null, 
            school: resultData.school || {},
          })
          setGenerated(true)
          toast.success('Report card generated successfully!')
        } else {
          toast.error('No data returned from server.')
        }
      }
    } catch (error) {
      console.error('Failed to generate:', error)
      if (error?.status === 0 || error?.code === 'ERR_NETWORK') toast.error('Cannot connect to server.')
      else if (error?.response?.status === 404) toast.error('Student not found.')
      else if (error?.response?.status === 500) toast.error(`Server error: ${error?.response?.data?.detail || 'Internal error'}`)
      else toast.error(error?.response?.data?.detail || error?.message || 'Failed to generate')
    } finally {
      setLoading(false)
    }
  }

  // Print Handlers
  const handlePrint = () => {
    if (reportType === 'term' && reportCard) {
      exportReportCard({
        student: reportCard.student, results: reportCard.results,
        term: reportCard.term, academic_year: reportCard.academic_year,
        school: reportCard.school, verify_url: reportCard.verify_url,
      }, 'portrait')
    } else if (reportType === 'annual' && annualReport) {
      if (graduationType === 'nursery') {
        exportNurseryCertificate({
          student: annualReport.student,
          term1: annualReport.term1, term2: annualReport.term2, term3: annualReport.term3,
          annual_summary: annualReport.annual_summary,
          academic_year: annualReport.academic_year,
          school: annualReport.school, verify_url: annualReport.verify_url,
        })
      } else {
        exportAnnualReportCard({
          student: annualReport.student,
          term1: annualReport.term1, term2: annualReport.term2, term3: annualReport.term3,
          annual_summary: annualReport.annual_summary,
          academic_year: annualReport.academic_year,
          school: annualReport.school, verify_url: annualReport.verify_url,
        }, 'portrait')
      }
    } else if (reportType === 'testimonial' && testimonialData) {
      exportTestimonial(testimonialData, 'portrait')
    } else if (reportType === 'certificate' && certificateData) {
      exportCertificate(certificateData, 'portrait')
    }
  }

  const handlePrintPortrait = () => {
    if (reportType === 'term' && reportCard) {
      exportReportCard({
        student: reportCard.student, results: reportCard.results,
        term: reportCard.term, academic_year: reportCard.academic_year,
        school: reportCard.school, verify_url: reportCard.verify_url,
      }, 'portrait')
    } else if (reportType === 'annual' && annualReport) {
      handlePrintAnnual('portrait')
    } else if (reportType === 'testimonial' && testimonialData) {
      exportTestimonial(testimonialData, 'portrait')
    } else if (reportType === 'certificate' && certificateData) {
      exportCertificate(certificateData, 'portrait')
    }
  }

  const handlePrintLandscape = () => {
    if (reportType === 'term' && reportCard) {
      exportReportCard({
        student: reportCard.student, results: reportCard.results,
        term: reportCard.term, academic_year: reportCard.academic_year,
        school: reportCard.school, verify_url: reportCard.verify_url,
      }, 'landscape')
    } else if (reportType === 'annual' && annualReport) {
      handlePrintAnnual('landscape')
    } else if (reportType === 'testimonial' && testimonialData) {
      exportTestimonial(testimonialData, 'landscape')
    } else if (reportType === 'certificate' && certificateData) {
      exportCertificate(certificateData, 'landscape')
    }
  }

  const handlePrintAnnual = (orientation) => {
    if (annualReport) {
      if (graduationType === 'nursery') {
        exportNurseryCertificate({
          student: annualReport.student,
          term1: annualReport.term1, term2: annualReport.term2, term3: annualReport.term3,
          annual_summary: annualReport.annual_summary,
          academic_year: annualReport.academic_year,
          school: annualReport.school, verify_url: annualReport.verify_url,
        })
      } else {
        exportAnnualReportCard({
          student: annualReport.student,
          term1: annualReport.term1, term2: annualReport.term2, term3: annualReport.term3,
          annual_summary: annualReport.annual_summary,
          academic_year: annualReport.academic_year,
          school: annualReport.school, verify_url: annualReport.verify_url,
        }, orientation)
      }
    }
  }

  const getGradeBadge = (grade) => {
    const variants = { A: 'success', B: 'info', C: 'warning', D: 'warning', F: 'danger' }
    return <Badge variant={variants[grade] || 'gray'}>{grade || 'N/A'}</Badge>
  }

  const getAnnualTitle = () => {
    if (graduationType === 'nursery') return 'THE CERTIFICATE OF NURSERY EDUCATION'
    if (graduationType === 'primary_testimonial') return 'PRIMARY LEAVING TESTIMONIAL'
    if (graduationType === 'secondary_testimonial') return 'SECONDARY LEAVING TESTIMONIAL'
    return 'ANNUAL ACADEMIC REPORT CARD'
  }

  const studentOptions = [
    { value: '', label: loadingStudents ? 'Loading students...' : `-- Select Student (${students.length} available) --` },
    ...students.map(s => {
      const hnsId = s.student_id || s.student_id_number || s.id_number || s.admission_number || ''
      const name = `${s.first_name || ''} ${s.last_name || ''}`.trim()
      return { value: s._id || s.id || s.student_id || '', label: `${name} - ${hnsId || s._id || ''}` }
    }).filter(opt => opt.value),
  ]

  return (
    <div className="space-y-6 max-w-4xl animate-fade-in-up">
      <PageHeader 
        title="Student Report Cards & Certificates" 
        subtitle={`Generate and print reports, testimonials, and certificates • ${currentYear}`}
        actions={
          <button onClick={() => navigate('/exams')} className="btn btn-secondary">
            <ArrowLeft size={18} /> Back
          </button>
        }
      />

      {/* Report Type Selection */}
      <Card>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
          <button 
            onClick={() => { setReportType('term'); setGenerated(false); setReportCard(null); setAnnualReport(null); setTestimonialData(null); setCertificateData(null) }}
            className={`p-3 rounded-lg text-sm font-medium transition-all text-center ${
              reportType === 'term' 
                ? 'bg-primary-600 text-white shadow-md' 
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <FileText size={20} className="mx-auto mb-1" /> 
            Single Term
          </button>
          <button 
            onClick={() => { setReportType('annual'); setGenerated(false); setReportCard(null); setAnnualReport(null); setTestimonialData(null); setCertificateData(null) }}
            className={`p-3 rounded-lg text-sm font-medium transition-all text-center ${
              reportType === 'annual' 
                ? 'bg-green-600 text-white shadow-md' 
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Calendar size={20} className="mx-auto mb-1" /> 
            Annual Report
          </button>
          <button 
            onClick={() => { setReportType('testimonial'); setGenerated(false); setReportCard(null); setAnnualReport(null); setTestimonialData(null); setCertificateData(null) }}
            disabled={!isEligibleForTestimonial()}
            className={`p-3 rounded-lg text-sm font-medium transition-all text-center ${
              reportType === 'testimonial' 
                ? 'bg-purple-600 text-white shadow-md' 
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 hover:bg-gray-200'
            } ${!isEligibleForTestimonial() ? 'opacity-50 cursor-not-allowed' : ''}`}
            title={!isEligibleForTestimonial() ? 'Only available for P8 and S4 students' : 'Testimonial for P8/S4 students'}
          >
            <Award size={20} className="mx-auto mb-1" /> 
            Testimonial
            <span className="block text-xs opacity-75">P8 & S4</span>
          </button>
          <button 
            onClick={() => { setReportType('certificate'); setGenerated(false); setReportCard(null); setAnnualReport(null); setTestimonialData(null); setCertificateData(null) }}
            disabled={!isEligibleForCertificate()}
            className={`p-3 rounded-lg text-sm font-medium transition-all text-center ${
              reportType === 'certificate' 
                ? 'bg-amber-600 text-white shadow-md' 
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 hover:bg-gray-200'
            } ${!isEligibleForCertificate() ? 'opacity-50 cursor-not-allowed' : ''}`}
            title={!isEligibleForCertificate() ? 'Only available for Nursery students' : 'Certificate of Nursery Education'}
          >
            <BookOpen size={20} className="mx-auto mb-1" /> 
            Certificate
            <span className="block text-xs opacity-75">Nursery</span>
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
          </div>
          {(reportType === 'term') && (
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
            variant="primary" 
            loading={loading} 
            icon={<GraduationCap size={18} />}
            disabled={!filters.student_id}
            style={reportType === 'annual' ? { background: '#059669' } : 
                   reportType === 'testimonial' ? { background: '#7c3aed' } : 
                   reportType === 'certificate' ? { background: '#d97706' } : {}}
          >
            Generate {reportType === 'term' ? 'Report' : 
                     reportType === 'annual' ? 'Annual Report' : 
                     reportType === 'testimonial' ? 'Testimonial' : 'Certificate'}
          </Button>
        </div>
      </Card>

      {loading && <LoadingSpinner />}
      
      {!loading && !generated && (
        <EmptyState 
          icon={<GraduationCap size={48} />} 
          title="Generate Report Card"
          description={`Select a student${reportType === 'term' ? ', term,' : ''} and click Generate to create a ${reportType === 'term' ? 'term report' : reportType === 'annual' ? 'annual report' : reportType === 'testimonial' ? 'testimonial' : 'nursery certificate'}.`} 
        />
      )}

      {/* SINGLE TERM REPORT CARD */}
      {generated && reportCard && reportType === 'term' && (
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
              <h3 className="text-lg font-semibold mt-2">ACADEMIC REPORT CARD</h3>
              <p className="text-sm text-gray-500">{reportCard.academic_year} • {reportCard.term}</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm mb-4">
              <div><span className="text-gray-500">Name:</span> <span className="font-medium">{reportCard.student?.name || 'N/A'}</span></div>
              <div><span className="text-gray-500">Pupil's ID:</span> <span className="font-medium font-mono">{reportCard.student?.student_id || 'N/A'}</span></div>
              <div><span className="text-gray-500">Class:</span> <span className="font-medium">{reportCard.student?.class_name || 'N/A'}</span></div>
              <div><span className="text-gray-500">Conduct:</span> <span className="font-medium">{reportCard.results?.conduct || 'Good'}</span></div>
            </div>

            {/* Subjects Table */}
            <table className="w-full border-collapse mb-4">
              <thead>
                <tr className="bg-primary-700 text-white">
                  <th className="p-2 text-left text-xs uppercase">Subject</th>
                  <th className="p-2 text-center text-xs uppercase w-20">Marks</th>
                  <th className="p-2 text-left text-xs uppercase w-24">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {(reportCard.results?.subjects || []).map((s, i) => (
                  <tr key={i} className="border-b border-gray-200 dark:border-gray-700">
                    <td className="p-2 font-medium">{s.name}</td>
                    <td className="p-2 text-center">{s.score || 0}</td>
                    <td className="p-2">{getGradeBadge(s.grade)}</td>
                  </tr>
                ))}
                <tr className="font-bold bg-blue-50 dark:bg-blue-900/20">
                  <td className="p-2">TOTAL</td>
                  <td className="p-2 text-center">{reportCard.results?.total_score || 0}</td>
                  <td className="p-2">{reportCard.results?.result || 'N/A'}</td>
                </tr>
              </tbody>
            </table>

            {/* Summary */}
            <div className="grid grid-cols-2 gap-2 text-sm mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded">
              <div><strong>Percentage:</strong> {reportCard.results?.percentage || 0}%</div>
              <div><strong>Position:</strong> {reportCard.results?.position || 'N/A'}</div>
              <div><strong>Out of:</strong> {reportCard.results?.out_of || 'N/A'}</div>
              <div>
                <strong>Result:</strong>{' '}
                <span className={reportCard.results?.result === 'Pass' ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                  {reportCard.results?.result || 'N/A'}
                </span>
              </div>
            </div>

            {/* Verification */}
            {reportCard.verify_url && (
              <div className="text-xs text-blue-600 text-center mt-2 flex items-center justify-center gap-1">
                <Shield size={12} /> Verify: {reportCard.verify_url}
              </div>
            )}
          </Card>

          {/* Print Buttons */}
          <div className="flex gap-3 justify-end no-print">
            <Button variant="secondary" icon={<Printer size={18} />} onClick={handlePrint}>🖨️ Print</Button>
            <Button variant="primary" icon={<Download size={18} />} onClick={handlePrintPortrait}>📄 Portrait</Button>
            <Button variant="primary" icon={<Download size={18} />} onClick={handlePrintLandscape} style={{ background: '#059669' }}>🖼️ Landscape</Button>
          </div>
        </div>
      )}

      {/* ANNUAL REPORT / CERTIFICATE / TESTIMONIAL */}
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
              <h3 className="text-xl font-bold mt-2">{getAnnualTitle()}</h3>
              <p className="text-sm text-gray-500">{annualReport.academic_year}</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm mb-4">
              <div><span className="text-gray-500">Name:</span> <span className="font-medium">{annualReport.student?.name || 'N/A'}</span></div>
              <div><span className="text-gray-500">Pupil's ID:</span> <span className="font-medium font-mono">{annualReport.student?.student_id || 'N/A'}</span></div>
              <div><span className="text-gray-500">Class:</span> <span className="font-medium">{annualReport.student?.class_name || 'N/A'}</span></div>
              <div><span className="text-gray-500">Conduct:</span> <span className="font-medium">{annualReport.student?.conduct || 'Good'}</span></div>
            </div>

            {/* Subjects Table for 3 Terms */}
            <table className="w-full border-collapse mb-4 text-sm">
              <thead>
                <tr className="bg-primary-700 text-white">
                  <th className="p-2 text-left text-xs uppercase">Subject</th>
                  <th className="p-2 text-center text-xs uppercase">Term I</th>
                  <th className="p-2 text-center text-xs uppercase">Term II</th>
                  <th className="p-2 text-center text-xs uppercase">Term III</th>
                </tr>
              </thead>
              <tbody>
                {getAllAnnualSubjects(annualReport).map((subject, i) => {
                  const t1Subj = (annualReport.term1?.subjects || []).find(s => s.name === subject)
                  const t2Subj = (annualReport.term2?.subjects || []).find(s => s.name === subject)
                  const t3Subj = (annualReport.term3?.subjects || []).find(s => s.name === subject)
                  return (
                    <tr key={i} className="border-b border-gray-200 dark:border-gray-700">
                      <td className="p-2 font-medium">{subject}</td>
                      <td className="p-2 text-center">{t1Subj?.score || '-'}</td>
                      <td className="p-2 text-center">{t2Subj?.score || '-'}</td>
                      <td className="p-2 text-center">{t3Subj?.score || '-'}</td>
                    </tr>
                  )
                })}
                <tr className="font-bold bg-blue-50 dark:bg-blue-900/20">
                  <td className="p-2">TOTAL</td>
                  <td className="p-2 text-center">{annualReport.term1?.total_score || '-'}</td>
                  <td className="p-2 text-center">{annualReport.term2?.total_score || '-'}</td>
                  <td className="p-2 text-center">{annualReport.term3?.total_score || '-'}</td>
                </tr>
              </tbody>
            </table>

            {/* Annual Summary */}
            {annualReport.annual_summary && (
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded mb-4 text-sm">
                <p><strong>Average:</strong> {annualReport.annual_summary.average_percentage || 'N/A'}%</p>
                <p><strong>Grade:</strong> {annualReport.annual_summary.grade || 'N/A'}</p>
                <p>
                  <strong>Status:</strong>{' '}
                  <span className={annualReport.annual_summary.promotion_status === 'Promoted' ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                    {annualReport.annual_summary.promotion_status || 'N/A'}
                  </span>
                </p>
                {annualReport.annual_summary.next_class && (
                  <p><strong>Next Class:</strong> {annualReport.annual_summary.next_class}</p>
                )}
              </div>
            )}

            {/* Verification */}
            {annualReport.verify_url && (
              <div className="text-xs text-blue-600 text-center mt-2 flex items-center justify-center gap-1">
                <Shield size={12} /> Verify: {annualReport.verify_url}
              </div>
            )}
          </Card>

          <div className="flex gap-3 justify-end no-print">
            <Button variant="secondary" icon={<Printer size={18} />} onClick={handlePrint}>🖨️ Print</Button>
            <Button variant="primary" icon={<Download size={18} />} onClick={handlePrintPortrait}>📄 Portrait</Button>
            <Button variant="primary" icon={<Download size={18} />} onClick={handlePrintLandscape} style={{ background: '#059669' }}>🖼️ Landscape</Button>
          </div>
        </div>
      )}

      {/* TESTIMONIAL PREVIEW */}
      {generated && testimonialData && reportType === 'testimonial' && (
        <div ref={reportRef} className="space-y-6 print:space-y-4">
          <Card className="print:shadow-none print:border border-2 border-purple-300">
            <div className="text-center border-b border-gray-200 dark:border-gray-700 pb-4 mb-4">
              <img 
                src="/letter-head.jpg" 
                alt="School Letterhead" 
                className="max-w-full h-auto mx-auto mb-2" 
                style={{ maxHeight: '80px' }} 
                onError={(e) => { e.target.style.display = 'none' }} 
              />
              <h3 className="text-xl font-bold mt-2 text-purple-700">TESTIMONIAL</h3>
              <p className="text-sm text-gray-500">{testimonialData.academic_year}</p>
            </div>

            <div className="text-center mb-4">
              <p className="text-sm mb-2">This is to certify that</p>
              <p className="text-lg font-bold uppercase">
                {testimonialData.student?.first_name} {testimonialData.student?.last_name}
              </p>
              <p className="text-sm mt-1">
                Has sat for the <strong>{
                  testimonialData.student?.class_name?.toLowerCase().includes('s4') 
                    ? 'South Sudan Certificate of Secondary Education' 
                    : 'Certificate of Primary Education'
                }</strong>
              </p>
              {testimonialData.section && (
                <p className="text-sm">in the <strong>{testimonialData.section} Section</strong></p>
              )}
            </div>

            <div className="text-sm text-center mb-4 p-2 bg-gray-50 dark:bg-gray-800 rounded">
              <span><strong>Index Number:</strong> {testimonialData.index_number || 'N/A'}</span>
              <span className="mx-4">|</span>
              <span><strong>Centre Number:</strong> {testimonialData.centre_number || 'N/A'}</span>
            </div>

            {/* Subjects Table */}
            <table className="w-full border-collapse mb-4">
              <thead>
                <tr className="bg-purple-700 text-white">
                  <th className="p-2 text-left text-xs uppercase">Subject</th>
                  <th className="p-2 text-center text-xs uppercase w-20">Marks</th>
                  <th className="p-2 text-center text-xs uppercase w-20">Grade</th>
                </tr>
              </thead>
              <tbody>
                {(testimonialData.subjects || []).map((s, i) => (
                  <tr key={i} className="border-b border-gray-200 dark:border-gray-700">
                    <td className="p-2 font-medium">{s.name}</td>
                    <td className="p-2 text-center">{s.score || 0}</td>
                    <td className="p-2 text-center">{getGradeBadge(s.grade)}</td>
                  </tr>
                ))}
                <tr className="font-bold bg-purple-50 dark:bg-purple-900/20">
                  <td className="p-2">TOTAL</td>
                  <td className="p-2 text-center">{testimonialData.total_score || 0}</td>
                  <td className="p-2 text-center"></td>
                </tr>
              </tbody>
            </table>

            {/* Summary */}
            <div className="grid grid-cols-2 gap-2 text-sm mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded">
              <div><strong>Percentage:</strong> {testimonialData.percentage || 0}%</div>
              <div>
                <strong>Result:</strong>{' '}
                <span className={testimonialData.result === 'Pass' ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                  {testimonialData.result || 'N/A'}
                </span>
              </div>
            </div>

            {/* Signatures */}
            <div className="flex justify-between mt-8 text-sm">
              <div className="text-center"><div className="border-b border-black w-32 mb-1"></div>Director of Studies</div>
              <div className="text-center"><div className="border-b border-black w-32 mb-1"></div>Head Teacher</div>
              <div className="text-center"><div className="border-b border-black w-32 mb-1"></div>Parent/Guardian</div>
            </div>

            {testimonialData.verify_url && (
              <div className="text-xs text-blue-600 text-center mt-4 flex items-center justify-center gap-1">
                <Shield size={12} /> Verify: {testimonialData.verify_url}
              </div>
            )}
          </Card>

          <div className="flex gap-3 justify-end no-print">
            <Button variant="secondary" icon={<Printer size={18} />} onClick={handlePrint}>🖨️ Print</Button>
            <Button variant="primary" icon={<Download size={18} />} onClick={handlePrintPortrait} style={{ background: '#7c3aed' }}>📄 Portrait</Button>
            <Button variant="primary" icon={<Download size={18} />} onClick={handlePrintLandscape} style={{ background: '#a855f7' }}>🖼️ Landscape</Button>
          </div>
        </div>
      )}

      {/* NURSERY CERTIFICATE PREVIEW */}
      {generated && certificateData && reportType === 'certificate' && (
        <div ref={reportRef} className="space-y-6 print:space-y-4">
          <Card className="print:shadow-none print:border border-4 border-double border-amber-400">
            <div className="text-center border-b border-gray-200 dark:border-gray-700 pb-4 mb-4">
              <img 
                src="/letter-head.jpg" 
                alt="School Letterhead" 
                className="max-w-full h-auto mx-auto mb-2" 
                style={{ maxHeight: '80px' }} 
                onError={(e) => { e.target.style.display = 'none' }} 
              />
              <h3 className="text-xl font-bold mt-2 text-amber-700">THE CERTIFICATE OF NURSERY EDUCATION</h3>
              <p className="text-sm text-gray-500">{certificateData.academic_year}</p>
            </div>

            <div className="text-center mb-4">
              <p className="text-sm mb-2">This is to certify that</p>
              <p className="text-lg font-bold uppercase">
                {certificateData.student?.first_name || certificateData.student?.name?.split(' ')[0] || ''}{' '}
                {certificateData.student?.last_name || certificateData.student?.name?.split(' ').slice(1).join(' ') || ''}
              </p>
              <p className="text-sm mt-1">Has sat for the <strong>Certificate of Nursery Education</strong></p>
              <p className="text-xs text-gray-500 mt-1">
                <strong>Pupil's ID:</strong> {certificateData.student?.student_id || 'N/A'}
              </p>
            </div>

            {/* Subjects Table for 3 Terms */}
            <table className="w-full border-collapse mb-4 text-sm">
              <thead>
                <tr className="bg-amber-600 text-white">
                  <th className="p-2 text-left text-xs uppercase">Subject</th>
                  <th className="p-2 text-center text-xs uppercase">Term I</th>
                  <th className="p-2 text-center text-xs uppercase">Term II</th>
                  <th className="p-2 text-center text-xs uppercase">Term III</th>
                </tr>
              </thead>
              <tbody>
                {getAllAnnualSubjects(certificateData).map((subject, i) => {
                  const t1Subj = (certificateData.term1?.subjects || []).find(s => s.name === subject)
                  const t2Subj = (certificateData.term2?.subjects || []).find(s => s.name === subject)
                  const t3Subj = (certificateData.term3?.subjects || []).find(s => s.name === subject)
                  return (
                    <tr key={i} className="border-b border-gray-200 dark:border-gray-700">
                      <td className="p-2 font-medium">{subject}</td>
                      <td className="p-2 text-center">{t1Subj?.score || '-'}</td>
                      <td className="p-2 text-center">{t2Subj?.score || '-'}</td>
                      <td className="p-2 text-center">{t3Subj?.score || '-'}</td>
                    </tr>
                  )
                })}
                <tr className="font-bold bg-amber-50 dark:bg-amber-900/20">
                  <td className="p-2">TOTAL</td>
                  <td className="p-2 text-center">{certificateData.term1?.total_score || '-'}</td>
                  <td className="p-2 text-center">{certificateData.term2?.total_score || '-'}</td>
                  <td className="p-2 text-center">{certificateData.term3?.total_score || '-'}</td>
                </tr>
              </tbody>
            </table>

            {/* Summary */}
            {certificateData.annual_summary && (
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded mb-4 text-sm">
                <p><strong>Average:</strong> {certificateData.annual_summary.average_percentage || 'N/A'}%</p>
                <p><strong>Result:</strong> <span className="text-green-600 font-bold">Pass</span></p>
                <p><strong>Promoted to:</strong> <span className="text-green-600 font-bold">P1</span></p>
              </div>
            )}

            {/* Signatures */}
            <div className="flex justify-between mt-8 text-sm">
              <div className="text-center"><div className="border-b border-black w-32 mb-1"></div>Director of Studies</div>
              <div className="text-center"><div className="border-b border-black w-32 mb-1"></div>Head Teacher</div>
              <div className="text-center"><div className="border-b border-black w-32 mb-1"></div>Parent/Guardian</div>
            </div>

            {certificateData.verify_url && (
              <div className="text-xs text-blue-600 text-center mt-4 flex items-center justify-center gap-1">
                <Shield size={12} /> Verify: {certificateData.verify_url}
              </div>
            )}
          </Card>

          <div className="flex gap-3 justify-end no-print">
            <Button variant="secondary" icon={<Printer size={18} />} onClick={handlePrint}>🖨️ Print</Button>
            <Button variant="primary" icon={<Download size={18} />} onClick={handlePrintPortrait} style={{ background: '#d97706' }}>📄 Portrait</Button>
            <Button variant="primary" icon={<Download size={18} />} onClick={handlePrintLandscape} style={{ background: '#f59e0b' }}>🖼️ Landscape</Button>
          </div>
        </div>
      )}
    </div>
  )
}

function getAllAnnualSubjects(annualReport) {
  const subjects = new Set()
  ;['term1', 'term2', 'term3'].forEach(termKey => {
    const term = annualReport[termKey]
    if (term?.subjects) term.subjects.forEach(s => { if (s.name) subjects.add(s.name) })
  })
  return Array.from(subjects)
}

export default ReportCard
