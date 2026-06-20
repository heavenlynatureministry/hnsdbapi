import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import PageHeader from '../../components/common/PageHeader'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import FormInput from '../../components/common/FormInput'
import FormSelect from '../../components/common/FormSelect'
import Badge from '../../components/common/Badge'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import EmptyState from '../../components/common/EmptyState'
import { ArrowLeft, Download, Printer, GraduationCap, CheckCircle, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'

function ReportCard() {
  const navigate = useNavigate()
  const { updatePageTitle, updateBreadcrumbs } = useApp()
  const [loading, setLoading] = useState(false)
  const [generated, setGenerated] = useState(false)
  const [filters, setFilters] = useState({ student_id: '', academic_year: '2024/2025', term: 'Term 1' })
  const [reportCard, setReportCard] = useState(null)

  useEffect(() => {
    updatePageTitle('Report Cards')
    updateBreadcrumbs([{ label: 'Dashboard', path: '/dashboard' }, { label: 'Exams', path: '/exams' }, { label: 'Report Cards' }])
  }, [])

  const handleGenerate = async () => {
    if (!filters.student_id) { toast.error('Please select a student'); return }
    setLoading(true)
    setTimeout(() => {
      setReportCard({
        student: { name: 'Abraham Kuol', id_number: 'HNS-2024-0001', gender: 'Male', age: 10 },
        class: { name: 'P5', level: 'primary', academic_year: '2024/2025', term: 'Term 1' },
        subjects: [
          { subject_name: 'English', total_score: 82, total_max: 100, average_percentage: 82, grade: 'A', exams: [{ exam_name: 'Mid-Term', score: 80 }, { exam_name: 'End Term', score: 84 }] },
          { subject_name: 'Mathematics', total_score: 75, total_max: 100, average_percentage: 75, grade: 'B', exams: [{ exam_name: 'Mid-Term', score: 72 }, { exam_name: 'End Term', score: 78 }] },
          { subject_name: 'Science', total_score: 70, total_max: 100, average_percentage: 70, grade: 'B', exams: [{ exam_name: 'Mid-Term', score: 68 }, { exam_name: 'End Term', score: 72 }] },
          { subject_name: 'Social Studies', total_score: 85, total_max: 100, average_percentage: 85, grade: 'A', exams: [{ exam_name: 'Mid-Term', score: 82 }, { exam_name: 'End Term', score: 88 }] },
          { subject_name: 'Religious Education', total_score: 90, total_max: 100, average_percentage: 90, grade: 'A', exams: [{ exam_name: 'Mid-Term', score: 88 }, { exam_name: 'End Term', score: 92 }] },
        ],
        overall: { total_score: 402, total_max: 500, percentage: 80.4, grade: 'A' },
        attendance: { present: 45, total: 49, rate: 91.8 },
        class_teacher_remarks: 'Good performance. Keep up the hard work.',
        head_teacher_remarks: 'Satisfactory. Continue to strive for excellence.',
      })
      setLoading(false)
      setGenerated(true)
    }, 1000)
  }

  const getGradeBadge = (grade) => {
    const variants = { A: 'success', B: 'info', C: 'warning', D: 'warning', F: 'danger' }
    return <Badge variant={variants[grade] || 'gray'}>{grade}</Badge>
  }

  return (
    <div className="space-y-6 max-w-4xl animate-fade-in-up">
      <PageHeader
        title="Student Report Card"
        actions={<button onClick={() => navigate('/exams')} className="btn btn-secondary"><ArrowLeft size={18} /> Back</button>}
      />

      <Card>
        <div className="flex flex-col sm:flex-row items-end gap-4">
          <div className="flex-1 w-full">
            <FormSelect label="Student" name="student_id" value={filters.student_id} onChange={(e) => setFilters(prev => ({ ...prev, student_id: e.target.value }))}
              options={[{ value: '', label: 'Select Student' }, { value: 's1', label: 'Abraham Kuol (P5)' }, { value: 's2', label: 'Achol Deng (P2)' }]} />
          </div>
          <FormSelect label="Term" value={filters.term} onChange={(e) => setFilters(prev => ({ ...prev, term: e.target.value }))}
            options={[{ value: 'Term 1', label: 'Term 1' }, { value: 'Term 2', label: 'Term 2' }, { value: 'Term 3', label: 'Term 3' }]} />
          <FormSelect label="Year" value={filters.academic_year} onChange={(e) => setFilters(prev => ({ ...prev, academic_year: e.target.value }))}
            options={[{ value: '2024/2025', label: '2024/2025' }]} />
          <Button onClick={handleGenerate} variant="primary" loading={loading} icon={<GraduationCap size={18} />}>Generate</Button>
        </div>
      </Card>

      {loading && <LoadingSpinner />}

      {generated && reportCard && (
        <div className="space-y-6 print:space-y-4">
          {/* Report Card Header */}
          <Card className="print:shadow-none print:border">
            <div className="text-center border-b border-gray-200 dark:border-gray-700 pb-4 mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Heavenly Nature Nursery & Primary School</h2>
              <p className="text-sm text-gray-500">Nurturing Right Leaders</p>
              <h3 className="text-lg font-semibold mt-2">Student Report Card</h3>
              <p className="text-sm text-gray-500">{reportCard.class.academic_year} - {reportCard.class.term}</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div><span className="text-gray-500">Name:</span> <span className="font-medium">{reportCard.student.name}</span></div>
              <div><span className="text-gray-500">ID:</span> <span className="font-medium">{reportCard.student.id_number}</span></div>
              <div><span className="text-gray-500">Class:</span> <span className="font-medium">{reportCard.class.name}</span></div>
              <div><span className="text-gray-500">Gender:</span> <span className="font-medium">{reportCard.student.gender}</span></div>
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
                  {reportCard.subjects.map((subject, i) => (
                    <tr key={i}>
                      <td className="font-medium">{subject.subject_name}</td>
                      <td className="text-center">{subject.total_score}/{subject.total_max}</td>
                      <td className="text-center font-semibold">{subject.average_percentage}%</td>
                      <td className="text-center">{getGradeBadge(subject.grade)}</td>
                      <td className="text-center">
                        {subject.average_percentage >= 50 ? <CheckCircle size={16} className="text-green-500 inline" /> : <XCircle size={16} className="text-red-500 inline" />}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 dark:bg-gray-800 font-bold">
                    <td>Overall</td>
                    <td className="text-center">{reportCard.overall.total_score}/{reportCard.overall.total_max}</td>
                    <td className="text-center">{reportCard.overall.percentage}%</td>
                    <td className="text-center">{getGradeBadge(reportCard.overall.grade)}</td>
                    <td className="text-center">
                      {reportCard.overall.percentage >= 50 ? <CheckCircle size={16} className="text-green-500 inline" /> : <XCircle size={16} className="text-red-500 inline" />}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>

          {/* Attendance & Remarks */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:gap-4">
            <Card className="print:shadow-none print:border">
              <h4 className="font-semibold mb-2">Attendance</h4>
              <div className="text-center">
                <p className="text-3xl font-bold text-primary-600">{reportCard.attendance.rate}%</p>
                <p className="text-sm text-gray-500">{reportCard.attendance.present} of {reportCard.attendance.total} days present</p>
              </div>
            </Card>
            <Card className="print:shadow-none print:border">
              <h4 className="font-semibold mb-2">Remarks</h4>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-gray-500">Class Teacher:</p>
                  <p className="italic">{reportCard.class_teacher_remarks}</p>
                </div>
                <div>
                  <p className="text-gray-500">Head Teacher:</p>
                  <p className="italic">{reportCard.head_teacher_remarks}</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end no-print">
            <Button variant="secondary" icon={<Printer size={18} />} onClick={() => window.print()}>Print</Button>
            <Button variant="primary" icon={<Download size={18} />}>Download PDF</Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default ReportCard