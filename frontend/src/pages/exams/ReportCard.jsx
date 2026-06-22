import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import examsAPI from '../../api/exams'
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

function ReportCard() {
  const navigate = useNavigate()
  const reportRef = useRef(null)
  const { updatePageTitle, updateBreadcrumbs } = useApp()
  const [loading, setLoading] = useState(false)
  const [generated, setGenerated] = useState(false)
  const [filters, setFilters] = useState({ student_id: '', academic_year: '2024/2025', term: 'Term 1' })
  const [reportCard, setReportCard] = useState(null)

  useEffect(() => {
    updatePageTitle('Report Cards')
    updateBreadcrumbs([
      { label: 'Dashboard', path: '/dashboard' },
      { label: 'Exams', path: '/exams' },
      { label: 'Report Cards' },
    ])
  }, [])

  const handleGenerate = async () => {
    if (!filters.student_id) {
      toast.error('Please select a student')
      return
    }
    
    setLoading(true)
    setReportCard(null)
    setGenerated(false)
    
    try {
      const response = await examsAPI.generateReportCard(filters)
      
      if (response?.success && response.data) {
        setReportCard(response.data)
        setGenerated(true)
      } else if (response?.data) {
        setReportCard(response.data)
        setGenerated(true)
      } else {
        toast.error(response?.message || 'Failed to generate report card')
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
      exportToPDF(
        reportRef.current,
        `Report_Card_${reportCard.student?.name?.replace(/\s+/g, '_')}_${reportCard.class?.term?.replace(/\s+/g, '_')}`
      )
    }
  }

  const getGradeBadge = (grade) => {
    const variants = { A: 'success', B: 'info', C: 'warning', D: 'warning', F: 'danger' }
    return <Badge variant={variants[grade] || 'gray'}>{grade}</Badge>
  }

  return (
    <div className="space-y-6 max-w-4xl animate-fade-in-up">
      <PageHeader
        title="Student Report Card"
        subtitle="Generate and print student report cards"
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
              options={[
                { value: '', label: 'Select Student' },
                { value: 's1', label: 'Abraham Kuol (P5)' },
                { value: 's2', label: 'Achol Deng (P2)' },
              ]}
            />
          </div>
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
          <FormSelect
            label="Year"
            value={filters.academic_year}
            onChange={(e) => setFilters(prev => ({ ...prev, academic_year: e.target.value }))}
            options={[
              { value: '2024/2025', label: '2024/2025' },
              { value: '2023/2024', label: '2023/2024' },
            ]}
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
                {reportCard.class?.academic_year} - {reportCard.class?.term}
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div>
                <span className="text-gray-500">Name:</span>{' '}
                <span className="font-medium">{reportCard.student?.name}</span>
              </div>
              <div>
                <span className="text-gray-500">ID:</span>{' '}
                <span className="font-medium">{reportCard.student?.id_number}</span>
              </div>
              <div>
                <span className="text-gray-500">Class:</span>{' '}
                <span className="font-medium">{reportCard.class?.name}</span>
              </div>
              <div>
                <span className="text-gray-500">Gender:</span>{' '}
                <span className="font-medium">{reportCard.student?.gender}</span>
              </div>
            </div>
          </Card>

          {/* Subject Grades */}
          <Card className="print:shadow-none print:border">
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
                {reportCard.overall && (
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
                {reportCard.class_teacher_remarks && (
                  <div>
                    <p className="text-gray-500">Class Teacher:</p>
                    <p className="italic">{reportCard.class_teacher_remarks}</p>
                  </div>
                )}
                {reportCard.head_teacher_remarks && (
                  <div>
                    <p className="text-gray-500">Head Teacher:</p>
                    <p className="italic">{reportCard.head_teacher_remarks}</p>
                  </div>
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
