import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import studentsAPI from '../../api/students'
import classesAPI from '../../api/classes'
import { exportTestimonial } from '../../utils/exportTestimonial'
import PageHeader from '../../components/common/PageHeader'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import FormInput from '../../components/common/FormInput'
import FormSelect from '../../components/common/FormSelect'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import Badge from '../../components/common/Badge'
import { ArrowLeft, Save, Plus, Trash2, Award, Printer } from 'lucide-react'
import toast from 'react-hot-toast'

const SUBJECT_OPTIONS = [
  { value: '', label: '-- Select Subject --' },
  { value: 'Mathematics', label: 'Mathematics' },
  { value: 'English Language', label: 'English Language' },
  { value: 'Science', label: 'Science' },
  { value: 'Social Studies', label: 'Social Studies' },
  { value: 'Christian Religious Education', label: 'CRE' },
  { value: 'Islamic Religious Education', label: 'IRE' },
  { value: 'Biology', label: 'Biology' },
  { value: 'Chemistry', label: 'Chemistry' },
  { value: 'Physics', label: 'Physics' },
  { value: 'Geography', label: 'Geography' },
  { value: 'History', label: 'History' },
  { value: 'Commerce', label: 'Commerce' },
  { value: 'Accounting', label: 'Accounting' },
  { value: 'Agriculture', label: 'Agriculture' },
  { value: 'Computer Studies', label: 'Computer Studies' },
  { value: 'Physical Education', label: 'Physical Education' },
  { value: 'Literature in English', label: 'Literature in English' },
  { value: 'Kiswahili', label: 'Kiswahili' },
  { value: 'Arabic Language', label: 'Arabic Language' },
  { value: 'French Language', label: 'French Language' },
  { value: 'Fine Art', label: 'Fine Art' },
  { value: 'Additional Mathematics', label: 'Additional Mathematics' },
]

function TestimonialForm() {
  const { studentId } = useParams()
  const navigate = useNavigate()
  const { updatePageTitle, updateBreadcrumbs } = useApp()
  
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [saving, setSaving] = useState(false)
  const [studentData, setStudentData] = useState(null)
  const [classData, setClassData] = useState(null)
  const [examEntry, setExamEntry] = useState({
    academic_year: '2026/2027',
    index_number: '',
    centre_number: '',
    section: '',
    subjects: [
      { name: 'Mathematics', score: '', grade: '' },
      { name: 'English Language', score: '', grade: '' },
      { name: 'Science', score: '', grade: '' },
      { name: 'Social Studies', score: '', grade: '' },
    ]
  })

  useEffect(() => {
    updatePageTitle('Testimonial Form')
    updateBreadcrumbs([
      { label: 'Dashboard', path: '/dashboard' },
      { label: 'Report Cards', path: '/report' },
      { label: 'Testimonial' },
    ])
    if (studentId) fetchStudentData()
  }, [studentId])

  const fetchStudentData = async () => {
    setFetching(true)
    try {
      const response = await studentsAPI.getById(studentId)
      if (response?.success && response.data) {
        setStudentData(response.data)
        // Fetch class info
        const classId = response.data.class_id || response.data.class
        if (classId) {
          const classRes = await classesAPI.getById(classId)
          if (classRes?.success) setClassData(classRes.data)
        }
        // Check for existing exam entry
        const examRes = await studentsAPI.getStudentExamEntry(studentId)
        if (examRes?.success && examRes.data) {
          setExamEntry(examRes.data)
        }
      }
    } catch (error) {
      console.error('Failed to fetch student:', error)
      toast.error('Failed to load student data')
    } finally {
      setFetching(false)
    }
  }

  const isSecondary = () => {
    const level = (classData?.class_level || classData?.name || '').toLowerCase()
    return level.includes('s4') || level.includes('senior 4')
  }

  const addSubject = () => {
    setExamEntry(prev => ({
      ...prev,
      subjects: [...prev.subjects, { name: '', score: '', grade: '' }]
    }))
  }

  const removeSubject = (index) => {
    setExamEntry(prev => ({
      ...prev,
      subjects: prev.subjects.filter((_, i) => i !== index)
    }))
  }

  const updateSubject = (index, field, value) => {
    setExamEntry(prev => {
      const updated = [...prev.subjects]
      updated[index] = { ...updated[index], [field]: value }
      if (field === 'score' && value !== '') {
        const score = parseInt(value)
        if (score >= 80) updated[index].grade = 'A'
        else if (score >= 70) updated[index].grade = 'B'
        else if (score >= 60) updated[index].grade = 'C'
        else if (score >= 50) updated[index].grade = 'D'
        else updated[index].grade = 'F'
      }
      return { ...prev, subjects: updated }
    })
  }

  const calculateTotals = () => {
    const total = examEntry.subjects.reduce((sum, s) => sum + (parseInt(s.score) || 0), 0)
    const count = examEntry.subjects.filter(s => s.score !== '').length
    const pct = count > 0 ? (total / (count * 100) * 100).toFixed(1) : 0
    return { total, pct, result: pct >= 50 ? 'Pass' : 'Fail' }
  }

  const handleSave = async () => {
    if (!examEntry.index_number || !examEntry.centre_number) {
      toast.error('Please enter index number and centre number')
      return
    }
    setSaving(true)
    try {
      const response = await studentsAPI.saveExamEntry(studentId, examEntry)
      if (response?.success) {
        toast.success('Exam entry saved successfully!')
      } else {
        toast.error(response?.message || 'Failed to save')
      }
    } catch (error) {
      console.error('Save error:', error)
      toast.error('Failed to save exam entry')
    } finally {
      setSaving(false)
    }
  }

  const handlePrint = () => {
    if (!studentData) return
    const { total, pct, result } = calculateTotals()
    exportTestimonial({
      student: studentData,
      academic_year: examEntry.academic_year,
      index_number: examEntry.index_number,
      centre_number: examEntry.centre_number,
      section: isSecondary() ? examEntry.section : '',
      subjects: examEntry.subjects.filter(s => s.name && s.score !== ''),
      total_score: total,
      percentage: pct,
      result: result,
    })
  }

  const totals = calculateTotals()

  if (fetching) return <LoadingSpinner fullScreen />

  return (
    <div className="space-y-6 max-w-4xl animate-fade-in-up">
      <PageHeader
        title="Testimonial Form"
        subtitle={studentData ? `${studentData.first_name} ${studentData.last_name} - ${classData?.class_name || ''}` : ''}
        actions={
          <div className="flex gap-2">
            <button onClick={() => navigate('/report')} className="btn btn-secondary">
              <ArrowLeft size={18} /> Back
            </button>
            <Button onClick={handlePrint} variant="secondary" icon={<Printer size={18} />}>
              Preview & Print
            </Button>
            <Button onClick={handleSave} variant="primary" loading={saving} icon={<Save size={18} />}>
              Save Entry
            </Button>
          </div>
        }
      />

      {/* Student Info & Exam Details */}
      <Card title="Exam Entry Details">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <FormSelect
            label="Academic Year"
            value={examEntry.academic_year}
            onChange={(e) => setExamEntry(prev => ({ ...prev, academic_year: e.target.value }))}
            options={[
              { value: '2026/2027', label: '2026/2027' },
              { value: '2025/2026', label: '2025/2026' },
              { value: '2024/2025', label: '2024/2025' },
            ]}
          />
          <FormInput
            label="Index Number"
            type="text"
            value={examEntry.index_number}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '')
              if (val.length <= 9) setExamEntry(prev => ({ ...prev, index_number: val }))
            }}
            placeholder="6-9 digits"
            maxLength={9}
          />
          <FormInput
            label="Centre Number"
            type="text"
            value={examEntry.centre_number}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '')
              if (val.length <= 9) setExamEntry(prev => ({ ...prev, centre_number: val }))
            }}
            placeholder="6-9 digits"
            maxLength={9}
          />
          {isSecondary() && (
            <FormSelect
              label="Section"
              value={examEntry.section}
              onChange={(e) => setExamEntry(prev => ({ ...prev, section: e.target.value }))}
              options={[
                { value: '', label: '-- Select --' },
                { value: 'Science', label: 'Science Section' },
                { value: 'Arts', label: 'Arts Section' },
              ]}
            />
          )}
        </div>

        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200">
          <p className="text-sm font-medium text-blue-800">
            {isSecondary() ? 'South Sudan Certificate of Secondary Education (CSE)' : 'Certificate of Primary Education (PLE)'}
          </p>
          <p className="text-xs text-blue-600 mt-1">
            This testimonial is for {studentData?.first_name} {studentData?.last_name} in {classData?.class_name || 'N/A'}
          </p>
        </div>
      </Card>

      {/* Subjects Table */}
      <Card 
        title="Subject Results"
        actions={
          <Button onClick={addSubject} variant="secondary" size="sm" icon={<Plus size={14} />}>
            Add Subject
          </Button>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left p-2 text-sm font-medium">Subject</th>
                <th className="text-center p-2 text-sm font-medium w-24">Score</th>
                <th className="text-center p-2 text-sm font-medium w-20">Grade</th>
                <th className="text-center p-2 text-sm font-medium w-16">Action</th>
              </tr>
            </thead>
            <tbody>
              {examEntry.subjects.map((subject, index) => (
                <tr key={index} className="border-b border-gray-100 dark:border-gray-800">
                  <td className="p-2">
                    <FormSelect
                      value={subject.name}
                      onChange={(e) => updateSubject(index, 'name', e.target.value)}
                      options={SUBJECT_OPTIONS}
                      placeholder="Select subject"
                    />
                  </td>
                  <td className="p-2">
                    <FormInput
                      type="number"
                      value={subject.score}
                      onChange={(e) => {
                        const val = e.target.value
                        if (val === '' || (parseInt(val) >= 0 && parseInt(val) <= 100)) {
                          updateSubject(index, 'score', val)
                        }
                      }}
                      placeholder="0-100"
                      min={0}
                      max={100}
                    />
                  </td>
                  <td className="p-2 text-center">
                    <Badge variant={subject.grade === 'A' ? 'success' : subject.grade === 'F' ? 'danger' : 'info'}>
                      {subject.grade || '-'}
                    </Badge>
                  </td>
                  <td className="p-2 text-center">
                    <button
                      onClick={() => removeSubject(index)}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-xs text-gray-500">Total Score</p>
              <p className="text-lg font-bold">{totals.total}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Percentage</p>
              <p className="text-lg font-bold">{totals.pct}%</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Result</p>
              <p className={`text-lg font-bold ${totals.result === 'Pass' ? 'text-green-600' : 'text-red-600'}`}>
                {totals.result}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Subjects</p>
              <p className="text-lg font-bold">{examEntry.subjects.filter(s => s.score !== '').length}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-3 justify-end">
        <Button onClick={handlePrint} variant="secondary" icon={<Printer size={18} />} size="lg">
          Preview & Print Testimonial
        </Button>
        <Button onClick={handleSave} variant="primary" loading={saving} icon={<Save size={18} />} size="lg">
          {saving ? 'Saving...' : 'Save Exam Entry'}
        </Button>
      </div>
    </div>
  )
}

export default TestimonialForm
